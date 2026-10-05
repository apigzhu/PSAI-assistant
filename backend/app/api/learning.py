import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import Session as ChatSession, User
from app.models.learning import LearningPath
from app.core.deps import get_current_user
from app.core.llm_gateway import LLMGateway
from pydantic import BaseModel

router = APIRouter(prefix="/api/learning", tags=["learning"])


class CreatePathRequest(BaseModel):
    goal: str


PATH_SYSTEM_PROMPT = """你是一个学习路径规划师。根据用户的学习目标，制定结构化的学习路径。

请以 JSON 格式返回：
{
  "title": "路径标题",
  "milestones": [
    {"name": "里程碑名称", "description": "包含什么", "order": 1}
  ]
}

规则：
1. title 控制在 20 字内
2. milestones 3-6 个，从基础到进阶排列
3. 每个里程碑描述 30 字内
"""


@router.post("/path")
async def create_path(
    req: CreatePathRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """根据学习目标生成学习路径"""
    gateway = LLMGateway()
    try:
        resp = await gateway.chat([
            {"role": "system", "content": PATH_SYSTEM_PROMPT},
            {"role": "user", "content": f"我想学习：{req.goal}"},
        ])

        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0]
        elif "```" in resp:
            resp = resp.split("```")[1].split("```")[0]

        data = json.loads(resp.strip())
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"路径生成失败: {str(e)}",
        )

    # 检查是否已有路径
    existing = await db.execute(
        select(LearningPath).where(
            LearningPath.user_id == user.id
        ).order_by(LearningPath.created_at.desc())
    )
    old_path = existing.scalar_one_or_none()
    if old_path:
        # 更新已有路径
        old_path.title = data.get("title", old_path.title)
        old_path.goal = req.goal
        old_path.milestones = json.dumps(data.get("milestones", []), ensure_ascii=False)
        old_path.progress = 0
        path = old_path
    else:
        path = LearningPath(
            user_id=user.id,
            title=data.get("title", "学习路径"),
            goal=req.goal,
            milestones=json.dumps(data.get("milestones", []), ensure_ascii=False),
        )
        db.add(path)

    await db.commit()
    await db.refresh(path)

    return {
        "code": 0,
        "data": {
            "id": path.id,
            "title": path.title,
            "goal": path.goal,
            "progress": path.progress,
            "milestones": json.loads(path.milestones),
        },
        "message": "ok",
    }


@router.get("/path")
async def get_path(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的学习路径"""
    result = await db.execute(
        select(LearningPath)
        .where(LearningPath.user_id == user.id)
        .order_by(LearningPath.created_at.desc())
    )
    path = result.scalar_one_or_none()

    if not path:
        return {
            "code": 0,
            "data": None,
            "message": "还没有学习路径",
        }

    return {
        "code": 0,
        "data": {
            "id": path.id,
            "title": path.title,
            "goal": path.goal,
            "progress": path.progress,
            "milestones": json.loads(path.milestones),
        },
        "message": "ok",
    }


@router.get("/path/{path_id}/progress")
async def get_path_progress(
    path_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取路径进度详情"""
    result = await db.execute(
        select(LearningPath).where(
            LearningPath.id == path_id,
            LearningPath.user_id == user.id,
        )
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="学习路径不存在")

    milestones = json.loads(path.milestones)
    completed = sum(1 for m in milestones if m.get("status") == "completed")

    return {
        "code": 0,
        "data": {
            "total_milestones": len(milestones),
            "completed": completed,
            "progress": path.progress,
        },
        "message": "ok",
    }


class ToggleMilestoneRequest(BaseModel):
    status: str  # "completed" | "pending"


@router.patch("/path/{path_id}/milestones/{index}")
async def toggle_milestone(
    path_id: str,
    index: int,
    req: ToggleMilestoneRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """标记里程碑为已完成/待开始，并重新计算进度"""
    result = await db.execute(
        select(LearningPath).where(
            LearningPath.id == path_id,
            LearningPath.user_id == user.id,
        )
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="学习路径不存在")

    milestones = json.loads(path.milestones)
    if index < 0 or index >= len(milestones):
        raise HTTPException(status_code=400, detail="里程碑索引不合法")

    milestones[index]["status"] = req.status

    # 重新计算进度
    completed = sum(1 for m in milestones if m.get("status") == "completed")
    path.progress = int((completed / len(milestones)) * 100) if milestones else 0
    path.milestones = json.dumps(milestones, ensure_ascii=False)

    await db.commit()

    return {
        "code": 0,
        "data": {
            "milestones": milestones,
            "progress": path.progress,
            "completed": completed,
            "total": len(milestones),
        },
        "message": "ok",
    }


CONTENT_SYSTEM_PROMPT = """你是一位学习内容专家。根据用户的学习目标和当前里程碑，生成详细的学习内容。

请以 JSON 格式返回：
{
  "explanation": "核心概念解释（150-300字）",
  "key_points": ["要点1", "要点2", "要点3"],
  "examples": ["示例1", "示例2"],
  "practice": "一道练习题或思考题，和对应的提示或参考答案"
}

规则：
1. explanation 要通俗易懂，适合初学者
2. key_points 3-5 个，每个 20 字以内
3. examples 与生活或实际场景相关
4. practice 要提供参考答案或提示
"""


@router.post("/path/{path_id}/milestones/{index}/content")
async def generate_milestone_content(
    path_id: str,
    index: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """生成里程碑的学习内容并缓存到里程碑中"""
    result = await db.execute(
        select(LearningPath).where(
            LearningPath.id == path_id,
            LearningPath.user_id == user.id,
        )
    )
    path = result.scalar_one_or_none()
    if not path:
        raise HTTPException(status_code=404, detail="学习路径不存在")

    milestones = json.loads(path.milestones)
    if index < 0 or index >= len(milestones):
        raise HTTPException(status_code=400, detail="里程碑索引不合法")

    milestone = milestones[index]

    # 如果已生成过内容，直接返回缓存
    if milestone.get("content"):
        return {
            "code": 0,
            "data": milestone["content"],
            "message": "ok",
        }

    gateway = LLMGateway()
    try:
        resp = await gateway.chat([
            {"role": "system", "content": CONTENT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"学习目标：{path.goal}\n\n"
                    f"当前里程碑：{milestone['name']}\n"
                    f"描述：{milestone.get('description', '')}\n\n"
                    f"请为这个里程碑生成学习内容。"
                ),
            },
        ])

        if "```json" in resp:
            resp = resp.split("```json")[1].split("```")[0]
        elif "```" in resp:
            resp = resp.split("```")[1].split("```")[0]

        content = json.loads(resp.strip())
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"内容生成失败: {str(e)}",
        )

    # 缓存到里程碑中
    milestone["content"] = content
    path.milestones = json.dumps(milestones, ensure_ascii=False)
    await db.commit()

    return {
        "code": 0,
        "data": content,
        "message": "ok",
    }
