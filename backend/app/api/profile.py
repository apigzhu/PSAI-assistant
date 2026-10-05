from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.database import get_db
from app.db.models import User, LoginLog, Session as DbSession, Message
from app.schemas.auth import (
    ProfileUpdate,
    ChangePasswordRequest,
    UserProfile,
    LoginRecord,
    UserPreferences,
)
from app.core.security import hash_password, verify_password
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/profile")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 查询最近一次登录记录
    result = await db.execute(
        select(LoginLog)
        .where(LoginLog.user_id == user.id)
        .order_by(desc(LoginLog.login_at))
        .limit(1)
    )
    last_login_log = result.scalar_one_or_none()

    return {
        "code": 0,
        "data": UserProfile(
            user_id=user.id,
            username=user.username,
            email=user.email,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=last_login_log.login_at if last_login_log else None,
        ).model_dump(),
        "message": "ok",
    }


@router.patch("/profile")
async def update_profile(
    req: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 如果 username 被修改，检查唯一性
    if req.username is not None and req.username != user.username:
        existing = await db.execute(
            select(User).where(User.username == req.username)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="用户名已被使用",
            )
        user.username = req.username

    # 如果 email 被修改，检查唯一性
    if req.email is not None and req.email != user.email:
        existing = await db.execute(
            select(User).where(User.email == req.email)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="邮箱已被使用",
            )
        user.email = req.email

    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url

    await db.commit()
    await db.refresh(user)

    return {
        "code": 0,
        "data": UserProfile(
            user_id=user.id,
            username=user.username,
            email=user.email,
            avatar_url=user.avatar_url,
            is_active=user.is_active,
            created_at=user.created_at,
            last_login=None,
        ).model_dump(),
        "message": "ok",
    }


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(req.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="旧密码不正确",
        )

    user.hashed_password = hash_password(req.new_password)
    await db.commit()

    return {"code": 0, "data": None, "message": "密码修改成功"}


@router.get("/preferences")
async def get_preferences(
    user: User = Depends(get_current_user),
):
    prefs = user.preferences or {"theme": "light", "notifications": None}
    return {"code": 0, "data": prefs, "message": "ok"}


@router.put("/preferences")
async def update_preferences(
    req: UserPreferences,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.preferences = req.model_dump()
    await db.commit()
    return {"code": 0, "data": req.model_dump(), "message": "偏好已更新"}


@router.get("/login-history")
async def get_login_history(
    page: int = 1,
    page_size: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * page_size

    # 总条数
    count_result = await db.execute(
        select(LoginLog).where(LoginLog.user_id == user.id)
    )
    total = len(count_result.scalars().all())

    # 分页数据
    result = await db.execute(
        select(LoginLog)
        .where(LoginLog.user_id == user.id)
        .order_by(desc(LoginLog.login_at))
        .offset(offset)
        .limit(page_size)
    )
    logs = result.scalars().all()

    return {
        "code": 0,
        "data": {
            "items": [LoginRecord.model_validate(log).model_dump() for log in logs],
            "total": total,
            "page": page,
            "page_size": page_size,
        },
        "message": "ok",
    }


@router.delete("/account")
async def delete_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 删除关联数据
    await db.execute(
        select(LoginLog).where(LoginLog.user_id == user.id)
    )
    # 删除用户的登录日志
    login_logs = await db.execute(
        select(LoginLog).where(LoginLog.user_id == user.id)
    )
    for log in login_logs.scalars().all():
        await db.delete(log)

    # 删除用户的会话和消息
    sessions_result = await db.execute(
        select(DbSession).where(DbSession.user_id == user.id)
    )
    sessions = sessions_result.scalars().all()
    for s in sessions:
        msgs = await db.execute(
            select(Message).where(Message.session_id == s.id)
        )
        for m in msgs.scalars().all():
            await db.delete(m)
        await db.delete(s)

    # 硬删除用户数据
    await db.delete(user)
    await db.commit()
    return {"code": 0, "data": None, "message": "账号已注销"}


@router.get("/export-data")
async def export_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 查询用户的会话和消息
    sessions_result = await db.execute(
        select(DbSession).where(DbSession.user_id == user.id)
    )
    sessions = sessions_result.scalars().all()
    session_ids = [s.id for s in sessions]

    messages = []
    if session_ids:
        messages_result = await db.execute(
            select(Message).where(Message.session_id.in_(session_ids))
        )
        messages = messages_result.scalars().all()

    return {
        "code": 0,
        "data": {
            "user": {
                "username": user.username,
                "email": user.email,
                "created_at": user.created_at.isoformat(),
            },
            "sessions": [
                {"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()}
                for s in sessions
            ],
            "messages": [
                {
                    "id": m.id,
                    "session_id": m.session_id,
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat(),
                }
                for m in messages
            ],
        },
        "message": "ok",
    }
