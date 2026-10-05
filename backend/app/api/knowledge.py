import json
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.database import get_db
from app.db.models import Session, User, Message
from app.models.knowledge import KnowledgeNode, KnowledgeEdge
from app.core.deps import get_current_user
from app.core.llm_gateway import LLMGateway
from pydantic import BaseModel

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


class ExtractRequest(BaseModel):
    session_id: str
    recent_content: str


class UpdateNodeRequest(BaseModel):
    label: str | None = None
    type: str | None = None
    description: str | None = None
    confidence: float | None = None


EXTRACT_SYSTEM_PROMPT = """你是一个知识图谱构建助手。从学习对话中提取关键概念及其关系。

请以 JSON 格式返回提取结果：
{
  "concepts": [
    {"label": "概念名称", "type": "concept|term|formula|method", "description": "简短定义"}
  ],
  "relations": [
    {"source": "概念名称", "target": "概念名称", "relation": "prerequisite|derived_from|related_to|example_of|part_of"}
  ]
}

规则：
1. 只提取明确提到的核心概念（2-6 个）
2. relation 必须从指定类型中选择
3. description 控制在 30 字以内
4. 如果内容不是学习相关，返回 {"concepts": [], "relations": []}
"""


async def extract_knowledge_from_session(
    session_id: str,
    db: AsyncSession,
) -> tuple[int, int]:
    """从会话的最新消息中提取知识并入库。返回 (节点数, 边数)"""
    # 获取会话最近的消息（最新 3000 字）
    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.desc())
        .limit(10)
    )
    messages = msg_result.scalars().all()
    if not messages:
        return 0, 0

    # 拼接最近内容
    lines = []
    for m in reversed(messages):
        lines.append(f"{m.role}: {m.content}")
    recent_content = "\n".join(lines)[:3000]

    if not recent_content.strip():
        return 0, 0

    # 调用 LLM 提取
    gateway = LLMGateway()
    try:
        resp = await gateway.chat([
            {"role": "system", "content": EXTRACT_SYSTEM_PROMPT},
            {"role": "user", "content": f"从以下对话中提取知识概念：\n\n{recent_content}"},
        ])

        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0]
        elif "```" in resp:
            resp = resp.split("```")[1].split("```")[0]

        data = json.loads(resp.strip())
    except Exception:
        return 0, 0

    concepts = data.get("concepts", [])
    relations = data.get("relations", [])

    if not concepts:
        return 0, 0

    # 入库
    node_map = {}
    for c in concepts:
        existing = await db.execute(
            select(KnowledgeNode).where(
                KnowledgeNode.session_id == session_id,
                KnowledgeNode.label == c["label"],
            )
        )
        node = existing.scalar_one_or_none()
        if not node:
            node = KnowledgeNode(
                session_id=session_id,
                label=c["label"],
                type=c.get("type", "concept"),
                description=c.get("description", ""),
            )
            db.add(node)
            await db.flush()
        node_map[c["label"]] = node.id

    for r in relations:
        src_id = node_map.get(r["source"])
        tgt_id = node_map.get(r["target"])
        if not src_id or not tgt_id:
            continue

        existing = await db.execute(
            select(KnowledgeEdge).where(
                KnowledgeEdge.session_id == session_id,
                KnowledgeEdge.source_id == src_id,
                KnowledgeEdge.target_id == tgt_id,
                KnowledgeEdge.relation == r["relation"],
            )
        )
        if not existing.scalar_one_or_none():
            edge = KnowledgeEdge(
                session_id=session_id,
                source_id=src_id,
                target_id=tgt_id,
                relation=r["relation"],
            )
            db.add(edge)

    await db.commit()
    return len(concepts), len(relations)


@router.post("/extract")
async def extract_knowledge(
    req: ExtractRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """从对话内容中提取知识图谱结构"""
    # 验证会话归属
    result = await db.execute(
        select(Session).where(
            Session.id == req.session_id, Session.user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="会话不存在")

    nodes, edges = await extract_knowledge_from_session(req.session_id, db)

    return {
        "code": 0,
        "data": {"nodes": nodes, "edges": edges},
        "message": "ok",
    }


@router.get("/graph/{session_id}")
async def get_graph(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定会话的知识图谱数据"""
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="会话不存在")

    nodes_result = await db.execute(
        select(KnowledgeNode).where(KnowledgeNode.session_id == session_id)
    )
    nodes = nodes_result.scalars().all()

    edges_result = await db.execute(
        select(KnowledgeEdge).where(KnowledgeEdge.session_id == session_id)
    )
    edges = edges_result.scalars().all()

    return {
        "code": 0,
        "data": {
            "nodes": [
                {
                    "id": n.id,
                    "label": n.label,
                    "type": n.type,
                    "description": n.description,
                    "confidence": n.confidence,
                }
                for n in nodes
            ],
            "edges": [
                {
                    "id": e.id,
                    "source": e.source_id,
                    "target": e.target_id,
                    "relation": e.relation,
                }
                for e in edges
            ],
        },
        "message": "ok",
    }


@router.get("/graph")
async def get_all_graph(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户所有会话的聚合知识图谱"""
    # 查所有节点
    all_nodes = {}
    for session in (await db.execute(
        select(Session).where(Session.user_id == user.id)
    )).scalars().all():
        nodes_result = await db.execute(
            select(KnowledgeNode).where(KnowledgeNode.session_id == session.id)
        )
        for n in nodes_result.scalars().all():
            if n.label not in all_nodes:
                all_nodes[n.label] = {
                    "id": n.id,
                    "label": n.label,
                    "type": n.type,
                    "description": n.description,
                    "confidence": n.confidence,
                    "sessions": [session.id],
                }
            else:
                all_nodes[n.label]["sessions"].append(session.id)

    # 查所有边（按标签匹配聚合）
    node_labels = {n["id"]: n["label"] for n in all_nodes.values()}
    all_edges_result = await db.execute(
        select(KnowledgeEdge).where(
            KnowledgeEdge.session_id.in_(
                select(Session.id).where(Session.user_id == user.id)
            )
        )
    )
    seen_edges = set()
    edges = []
    for e in all_edges_result.scalars().all():
        src_label = node_labels.get(e.source_id)
        tgt_label = node_labels.get(e.target_id)
        if not src_label or not tgt_label:
            continue
        edge_key = (src_label, tgt_label, e.relation)
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            # 找到对应节点 ID
            src_node = next((n for n in all_nodes.values() if n["label"] == src_label), None)
            tgt_node = next((n for n in all_nodes.values() if n["label"] == tgt_label), None)
            if src_node and tgt_node:
                edges.append({
                    "id": e.id,
                    "source": src_node["id"],
                    "target": tgt_node["id"],
                    "relation": e.relation,
                })

    # 统计
    type_counts = {}
    for n in all_nodes.values():
        t = n["type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    return {
        "code": 0,
        "data": {
            "nodes": list(all_nodes.values()),
            "edges": edges,
            "stats": {
                "total_nodes": len(all_nodes),
                "total_edges": len(edges),
                "by_type": type_counts,
                "session_count": len(set(
                    s_id for n in all_nodes.values() for s_id in n["sessions"]
                )),
            },
        },
        "message": "ok",
    }
