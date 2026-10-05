from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.db.database import get_db
from app.db.models import User, LoginLog
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    AuthResponse,
)
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(
    req: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    # 检查用户名或邮箱是否已注册
    result = await db.execute(
        select(User).where(
            or_(User.username == req.username, User.email == req.email)
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名或邮箱已被注册",
        )

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(user.id)
    return {
        "code": 0,
        "data": AuthResponse(
            access_token=token,
            user_id=user.id,
            username=user.username,
        ).model_dump(),
        "message": "ok",
    }


@router.post("/login")
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.username == req.username)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )

    token = create_access_token(user.id)

    # 记录登录日志
    login_log = LoginLog(
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(login_log)
    await db.commit()

    return {
        "code": 0,
        "data": AuthResponse(
            access_token=token,
            user_id=user.id,
            username=user.username,
        ).model_dump(),
        "message": "ok",
    }
