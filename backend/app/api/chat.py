import json
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import Session, User, Message
from app.models.learning import TutorRole
from app.core.deps import get_current_user
from app.core.llm_gateway import LLMGateway, ChatMessage
from app.core.working_memory import WorkingMemory
from app.schemas.chat import (
    CreateSessionRequest,
    SessionResponse,
    SendMessageRequest,
)
from app.api.knowledge import extract_knowledge_from_session

router = APIRouter(prefix="/api/chat", tags=["chat"])

# 内存中的工作记忆存储（后续会迁移到 Redis）
_active_memories: dict[str, WorkingMemory] = {}


def _get_memory(session_id: str) -> WorkingMemory:
    """获取或创建会话的工作记忆实例"""
    if session_id not in _active_memories:
        _active_memories[session_id] = WorkingMemory(session_id=session_id)
    return _active_memories[session_id]


@router.post("/sessions")
async def create_session(
    req: CreateSessionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新会话"""
    session = Session(user_id=user.id, title=req.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {
        "code": 0,
        "data": {
            "id": session.id,
            "title": session.title,
            "created_at": session.created_at.isoformat(),
        },
        "message": "ok",
    }


@router.get("/sessions")
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户的所有会话列表"""
    result = await db.execute(
        select(Session)
        .where(Session.user_id == user.id)
        .order_by(Session.updated_at.desc())
    )
    sessions = result.scalars().all()

    return {
        "code": 0,
        "data": [
            {
                "id": s.id,
                "title": s.title,
                "created_at": s.created_at.isoformat(),
            }
            for s in sessions
        ],
        "message": "ok",
    }


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: str,
    req: SendMessageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发送消息并获取 SSE 流式回复"""
    # 验证会话归属并获取会话信息
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在"
        )

    memory = _get_memory(session_id)

    # 如果该会话设置了导师，注入导师的 system prompt 和 temperature
    tutor_system_prompt = None
    tutor_temperature = None
    if session.tutor_name:
        tutor_result = await db.execute(
            select(TutorRole).where(TutorRole.name == session.tutor_name)
        )
        tutor = tutor_result.scalar_one_or_none()
        if tutor:
            tutor_system_prompt = tutor.system_prompt
            tutor_temperature = tutor.temperature
            memory.set_system_prompt(tutor_system_prompt)

    # 将用户消息保存到数据库和工作记忆
    memory.add_entry("user", req.content)
    db_user_msg = Message(session_id=session_id, role="user", content=req.content)
    db.add(db_user_msg)
    await db.commit()

    gateway = LLMGateway(temperature=tutor_temperature)

    async def event_stream():
        # 1. 发送用户消息确认
        yield f"data: {json.dumps({'type': 'user_message', 'content': req.content})}\n\n"

        # 2. 流式获取 AI 回复
        full_response = ""
        try:
            print(f"[chat] Starting LLM stream, messages count: {len(memory.get_context_messages())}")
            async for chunk in gateway.chat_stream(
                memory.get_context_messages()
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            print(f"[chat] LLM stream completed, total length: {len(full_response)}")
        except Exception as e:
            print(f"[chat] LLM stream error: {type(e).__name__}: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            return

        # 3. 将 AI 回复写入工作记忆和数据库
        memory.add_entry("assistant", full_response)
        db_assistant_msg = Message(session_id=session_id, role="assistant", content=full_response)
        db.add(db_assistant_msg)
        await db.commit()

        # 4. 自动提取知识图谱（静默执行，不阻塞流式响应）
        try:
            await extract_knowledge_from_session(session_id, db)
        except Exception:
            pass  # 提取失败不影响聊天流程

        # 5. 发送完成信号
        yield (
            f"data: {json.dumps({'type': 'done', 'full_content': full_response})}\n\n"
        )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取会话的消息历史"""
    # 验证会话归属
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在"
        )

    # 查询该会话的所有消息，按时间排序
    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )
    messages = msg_result.scalars().all()

    return {
        "code": 0,
        "data": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "message": "ok",
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除会话及其所有消息"""
    # 验证会话归属
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == user.id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在"
        )

    # 删除会话下的所有消息
    await db.execute(
        Message.__table__.delete().where(Message.session_id == session_id)
    )
    # 删除会话
    await db.delete(session)
    await db.commit()

    # 清理工作记忆
    _active_memories.pop(session_id, None)

    return {
        "code": 0,
        "data": {"id": session_id},
        "message": "会话已删除",
    }


@router.get("/sessions/{session_id}/memory")
async def get_session_memory(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取会话的工作记忆状态（调试用）"""
    result = await db.execute(
        select(Session).where(
            Session.id == session_id, Session.user_id == user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在"
        )

    memory = _get_memory(session_id)
    return {
        "code": 0,
        "data": memory.to_dict(),
        "message": "ok",
    }
