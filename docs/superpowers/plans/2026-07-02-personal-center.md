# 个人中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete personal center with profile management, password change, preferences, login history, data export, and account deletion.

**Architecture:** Backend adds a `profile.py` router under `/api/auth/` for all user management endpoints. Frontend adds a `ProfilePage` component with tabbed sub-sections, integrated into the sidebar navigation as a new view type.

**Tech Stack:** FastAPI + SQLAlchemy (async), React + TypeScript + TailwindCSS + Zustand

## Global Constraints

- All API responses use `{ code: 0, data: ..., message: "ok" }` format
- Frontend uses Tailwind CSS with teal/copper color scheme (`#3A7B7D` primary)
- No router library — view switching via Zustand/state
- Auth via JWT stored in localStorage under `pias_` prefix keys
- All backend datetime fields use `DateTime(timezone=True)` with `server_default=func.now()`
- SQLite dev database (`pias_dev.db`) — recreating needed after model changes

---

### Task 1: Backend — Extend User model + add LoginLog model

**Files:**
- Modify: `backend/app/db/models.py`

**Interfaces:**
- Produces: Updated `User` model with `avatar_url` and `preferences` columns; new `LoginLog` model

- [ ] **Step 1: Modify models.py to add new columns and LoginLog model**

Write the updated `backend/app/db/models.py`:

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True, default=None)
    preferences: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), default="新对话")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class LoginLog(Base):
    __tablename__ = "login_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True, default=None
    )
    user_agent: Mapped[str | None] = mapped_column(
        String(512), nullable=True, default=None
    )
    login_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

- [ ] **Step 2: Recreate the dev database**

```bash
Remove-Item -Path "C:\Users\LENOVO\Desktop\pias\backend\pias_dev.db" -ErrorAction SilentlyContinue
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/db/models.py
git commit -m "feat: extend User model with avatar_url/preferences, add LoginLog model"
```

---

### Task 2: Backend — Add new Pydantic schemas

**Files:**
- Modify: `backend/app/schemas/auth.py`

**Interfaces:**
- Produces: `ProfileUpdate`, `ChangePasswordRequest`, `UserProfile`, `LoginRecord`, `UserPreferences` schemas

- [ ] **Step 1: Add new schemas to auth.py**

Append to `backend/app/schemas/auth.py`:

```python
from datetime import datetime
from typing import Optional


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("新密码长度不能少于 6 位")
        return v


class UserProfile(BaseModel):
    user_id: str
    username: str
    email: str
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class LoginRecord(BaseModel):
    id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    login_at: datetime


class UserPreferences(BaseModel):
    theme: str = "light"  # light | dark | system
    notifications: Optional[dict] = None
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/auth.py
git commit -m "feat: add profile-related Pydantic schemas"
```

---

### Task 3: Backend — Create profile API router

**Files:**
- Create: `backend/app/api/profile.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: New router with endpoints: GET/PATCH `/api/auth/profile`, POST `/api/auth/change-password`, GET/PUT `/api/auth/preferences`, GET `/api/auth/login-history`, DELETE `/api/auth/account`, GET `/api/auth/export-data`

- [ ] **Step 1: Create profile.py router**

Write `backend/app/api/profile.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import Optional
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

    messages_result = await db.execute(
        select(Message).where(Message.session_id.in_(session_ids))
    ) if session_ids else None
    messages = messages_result.scalars().all() if messages_result else []

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
```

- [ ] **Step 2: Register the new router in main.py**

Edit `backend/app/main.py` — add import and include:

```python
from app.api.profile import router as profile_router
```

and in the include section:

```python
app.include_router(profile_router)
```

So the complete updated file becomes:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.config import get_settings
from app.db.database import init_db
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.knowledge import router as knowledge_router
from app.api.tutors import router as tutors_router
from app.api.learning import router as learning_router
from app.api.profile import router as profile_router
from app.core.exceptions import (
    global_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

# 注册异常处理器
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# 注册路由
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(knowledge_router)
app.include_router(tutors_router)
app.include_router(learning_router)
app.include_router(profile_router)


@app.get("/health")
async def health():
    return {"code": 0, "data": {"status": "ok"}, "message": "ok"}
```

- [ ] **Step 3: Start the backend and verify endpoints work**

```bash
cd C:\Users\LENOVO\Desktop\pias\backend; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

And run the backend dev server (separate terminal). Then test:

```bash
# Test profile endpoint (need a token first)
# Register a test user
curl -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{\"username\":\"test\",\"email\":\"test@test.com\",\"password\":\"test123\"}'
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/profile.py backend/app/main.py
git commit -m "feat: add profile API router with account management endpoints"
```

---

### Task 4: Backend — Add login logging

**Files:**
- Modify: `backend/app/api/auth.py`

**Interfaces:**
- Consumes: `LoginLog` model from Task 1
- Produces: Login events recorded on every successful login

- [ ] **Step 1: Modify the login endpoint to log logins**

Edit `backend/app/api/auth.py` — add LoginLog import and log creation in the login route:

Add imports at the top:
```python
from app.db.models import LoginLog
from fastapi import Request
```

Change the `login` function signature to include `request: Request`:

```python
@router.post("/login")
async def login(
    req: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
```

After the token is created and before the return, add login log creation:

```python
    # 记录登录日志
    login_log = LoginLog(
        user_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(login_log)
    await db.commit()
```

The complete updated `login` function:

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/api/auth.py
git commit -m "feat: add login logging to track login history"
```

---

### Task 5: Frontend — Add TypeScript types

**Files:**
- Modify: `frontend/src/types/index.ts`

**Interfaces:**
- Produces: `UserProfile`, `LoginRecord`, `UserPreferences`, `LoginHistoryResponse` types; updated `ViewType`

- [ ] **Step 1: Add new types and update ViewType**

Edit `frontend/src/types/index.ts` — change ViewType to add `'profile'`:

```typescript
/** 导航视图 */
export type ViewType = 'chat' | 'learning' | 'review' | 'knowledge' | 'profile'
```

Add after the `KnowledgeGraph` interface section:

```typescript
// ========== 个人中心 ==========

export interface UserProfile {
  user_id: string
  username: string
  email: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
}

export interface LoginRecord {
  id: string
  ip_address: string | null
  user_agent: string | null
  login_at: string
}

export interface LoginHistoryResponse {
  items: LoginRecord[]
  total: number
  page: number
  page_size: number
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: Record<string, boolean> | null
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/types/index.ts
git commit -m "feat: add profile types and extend ViewType"
```

---

### Task 6: Frontend — Add API client functions

**Files:**
- Modify: `frontend/src/api/client.ts`

**Interfaces:**
- Consumes: types from Task 5
- Produces: API functions for all profile endpoints

- [ ] **Step 1: Add profile API calls**

Import the new types at the top of `client.ts` — add to the existing import line:

```typescript
import type {
  AuthResponse, UserInfo, Session, SSEChunk,
  LearningPath, Tutor, KnowledgeGraph,
  UserProfile, LoginHistoryResponse, UserPreferences,
} from '../types'
```

Add after the existing knowledge graph section:

```typescript
// ========== 个人中心 ==========

export async function getProfile(): Promise<UserProfile> {
  const resp = await api.get('/auth/profile')
  return resp.data.data
}

export async function updateProfile(data: {
  username?: string
  email?: string
  avatar_url?: string
}): Promise<UserProfile> {
  const resp = await api.patch('/auth/profile', data)
  return resp.data.data
}

export async function changePassword(
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await api.post('/auth/change-password', {
    old_password: oldPassword,
    new_password: newPassword,
  })
}

export async function getLoginHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<LoginHistoryResponse> {
  const resp = await api.get('/auth/login-history', {
    params: { page, page_size: pageSize },
  })
  return resp.data.data
}

export async function getPreferences(): Promise<UserPreferences> {
  const resp = await api.get('/auth/preferences')
  return resp.data.data
}

export async function updatePreferences(
  prefs: UserPreferences
): Promise<UserPreferences> {
  const resp = await api.put('/auth/preferences', prefs)
  return resp.data.data
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/account')
}

export async function exportData(): Promise<any> {
  const resp = await api.get('/auth/export-data')
  return resp.data.data
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/client.ts
git commit -m "feat: add profile API client functions"
```

---

### Task 7: Frontend — Create ProfilePage component

**Files:**
- Create: `frontend/src/pages/ProfilePage.tsx`

- [ ] **Step 1: Create ProfilePage.tsx**

```tsx
import { useState, useEffect, useRef } from 'react'
import {
  getProfile, updateProfile, changePassword, getLoginHistory,
  getPreferences, updatePreferences, deleteAccount, exportData,
} from '../api/client'
import type {
  UserProfile, LoginRecord, LoginHistoryResponse, UserPreferences,
} from '../types'
import { useAuthStore } from '../stores/authStore'

type ProfileTab = 'basic' | 'security' | 'preferences' | 'data'

function md5(input: string): string {
  // Simple string hash for Gravatar (in production use a real MD5)
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash).toString(16).padStart(32, '0')
}

function getGravatarUrl(email: string, size: number = 80): string {
  const hash = md5(email.trim().toLowerCase())
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`
}

function getInitialAvatar(name: string): string {
  return name.charAt(0).toUpperCase()
}

const TAB_ITEMS: { key: ProfileTab; label: string; icon: JSX.Element }[] = [
  {
    key: 'basic',
    label: '基本信息',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="5" r="3" />
        <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
  },
  {
    key: 'security',
    label: '安全设置',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="10" height="8" rx="1.5" />
        <path d="M5 7V4a3 3 0 016 0v3" />
      </svg>
    ),
  },
  {
    key: 'preferences',
    label: '偏好设置',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4" />
      </svg>
    ),
  },
  {
    key: 'data',
    label: '数据管理',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 1l-6 3v8l6 3 6-3V4l-6-3z" />
        <path d="M8 8l6-3M8 8v7" />
      </svg>
    ),
  },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ProfileTab>('basic')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { username, logout } = useAuthStore()

  // 基本信息编辑状态
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editAvatarUrl, setEditAvatarUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  // 修改密码状态
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // 偏好设置状态
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [savingPrefs, setSavingPrefs] = useState(false)

  // 登录历史状态
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)

  // 数据管理状态
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // 加载个人资料
  useEffect(() => {
    setLoading(true)
    Promise.all([getProfile(), getPreferences()])
      .then(([p, pref]) => {
        setProfile(p)
        setEditUsername(p.username)
        setEditEmail(p.email)
        setEditAvatarUrl(p.avatar_url || '')
        setPreferences(pref)
      })
      .catch(() => setError('加载个人资料失败'))
      .finally(() => setLoading(false))
  }, [])

  // 加载登录历史（切换标签或翻页时）
  useEffect(() => {
    if (activeTab === 'security') {
      getLoginHistory(historyPage)
        .then((data: LoginHistoryResponse) => {
          setLoginHistory(data.items)
          setHistoryTotal(data.total)
        })
        .catch(() => {})
    }
  }, [activeTab, historyPage])

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  // 保存基本信息
  const handleSaveProfile = async () => {
    clearMessages()
    setSavingProfile(true)
    try {
      const updated = await updateProfile({
        username: editUsername !== profile?.username ? editUsername : undefined,
        email: editEmail !== profile?.email ? editEmail : undefined,
        avatar_url: editAvatarUrl || undefined,
      })
      setProfile(updated)
      setSuccess('资料已更新')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '更新失败')
    } finally {
      setSavingProfile(false)
    }
  }

  // 修改密码
  const handleChangePassword = async () => {
    clearMessages()
    if (newPassword !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }
    if (newPassword.length < 6) {
      setError('新密码长度不能少于 6 位')
      return
    }
    setChangingPassword(true)
    try {
      await changePassword(oldPassword, newPassword)
      setSuccess('密码修改成功')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '密码修改失败')
    } finally {
      setChangingPassword(false)
    }
  }

  // 保存偏好设置
  const handleSavePreferences = async () => {
    if (!preferences) return
    clearMessages()
    setSavingPrefs(true)
    try {
      const updated = await updatePreferences(preferences)
      setPreferences(updated)
      setSuccess('偏好设置已保存')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '保存失败')
    } finally {
      setSavingPrefs(false)
    }
  }

  // 导出数据
  const handleExport = async () => {
    clearMessages()
    setExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pias-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess('数据已导出')
    } catch (e: any) {
      setError(e?.response?.data?.detail || '导出失败')
    } finally {
      setExporting(false)
    }
  }

  // 注销账号
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== '确认删除') return
    clearMessages()
    setDeleting(true)
    try {
      await deleteAccount()
      logout()
    } catch (e: any) {
      setError(e?.response?.data?.detail || '注销失败')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.15s]" />
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.3s]" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* 页面标题 */}
        <div className="mb-5">
          <h1 className="font-display text-xl font-bold text-ink">个人中心</h1>
          <p className="text-sm text-slate-400 mt-0.5">管理你的账号和个人偏好</p>
        </div>

        {/* 成功/错误提示 */}
        {error && (
          <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl text-sm text-green-600">
            {success}
          </div>
        )}

        {/* 标签页导航 */}
        <div className="flex gap-1 mb-5 p-1 bg-slate-50 rounded-xl border border-slate-100">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); clearMessages() }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200
                ${activeTab === tab.key
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ===== 基本信息 ===== */}
        {activeTab === 'basic' && profile && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 头像区域 */}
            <div className="flex items-center gap-4 p-5 bg-paper-light border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex-shrink-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="avatar"
                    className="w-16 h-16 rounded-full border-2 border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      const parent = (e.target as HTMLImageElement).parentElement
                      if (parent) {
                        const fallback = document.createElement('div')
                        fallback.className = 'w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold flex items-center justify-center'
                        fallback.textContent = getInitialAvatar(profile.username)
                        parent.appendChild(fallback)
                      }
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 text-white text-2xl font-bold flex items-center justify-center">
                    {getInitialAvatar(profile.username)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-ink truncate">{profile.username}</p>
                <p className="text-sm text-slate-400">{profile.email}</p>
                <p className="text-xs text-slate-400 mt-1">
                  注册于 {new Date(profile.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                {profile.last_login && (
                  <p className="text-xs text-slate-400">
                    最近登录：{new Date(profile.last_login).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            </div>

            {/* 头像 URL 设置 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                头像 URL
              </label>
              <p className="text-xs text-slate-400 mb-2">
                输入 Gravatar 或其他头像地址，留空使用首字母头像
              </p>
              <input
                type="text"
                value={editAvatarUrl}
                onChange={(e) => setEditAvatarUrl(e.target.value)}
                placeholder="https://www.gravatar.com/avatar/..."
                className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  transition-all duration-200 placeholder:text-slate-400"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditAvatarUrl(getGravatarUrl(profile.email))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500
                    hover:border-teal-300 hover:text-teal-600 transition-all"
                >
                  使用 Gravatar
                </button>
              </div>
            </div>

            {/* 用户名 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  transition-all duration-200"
              />
            </div>

            {/* 邮箱 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                邮箱
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                  focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500
                  transition-all duration-200"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200
                text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                transition-all duration-200 active:scale-[0.98]"
            >
              {savingProfile ? '保存中...' : '保存修改'}
            </button>
          </div>
        )}

        {/* ===== 安全设置 ===== */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 修改密码 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-4">修改密码</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">当前密码</label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">新密码</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="至少 6 位"
                    className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">确认新密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-slate-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200
                    text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                    transition-all duration-200 active:scale-[0.98]"
                >
                  {changingPassword ? '修改中...' : '修改密码'}
                </button>
              </div>
            </div>

            {/* 登录历史 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-4">登录历史</h3>

              {loginHistory.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">暂无登录记录</p>
              ) : (
                <div className="space-y-2">
                  {loginHistory.map((log) => (
                    <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-600 truncate">
                          {log.ip_address || '未知 IP'}
                        </p>
                        {log.user_agent && (
                          <p className="text-xs text-slate-400 truncate max-w-[250px]">
                            {log.user_agent}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                        {new Date(log.login_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 登录历史分页 */}
              {historyTotal > 20 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage <= 1}
                    className="text-xs text-slate-400 hover:text-teal-600 disabled:opacity-40 px-2 py-1"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-slate-400">
                    第 {historyPage} 页 / 共 {Math.ceil(historyTotal / 20)} 页
                  </span>
                  <button
                    onClick={() => setHistoryPage((p) => p + 1)}
                    disabled={historyPage >= Math.ceil(historyTotal / 20)}
                    className="text-xs text-slate-400 hover:text-teal-600 disabled:opacity-40 px-2 py-1"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 偏好设置 ===== */}
        {activeTab === 'preferences' && preferences && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 主题设置 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-4">主题</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'light' as const, label: '亮色模式', icon: '☀️' },
                  { key: 'dark' as const, label: '暗色模式', icon: '🌙' },
                  { key: 'system' as const, label: '跟随系统', icon: '💻' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPreferences({ ...preferences, theme: opt.key })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200
                      ${preferences.theme === opt.key
                        ? 'border-teal-500 bg-teal-50 text-teal-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 通知偏好（占位） */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-4">通知</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">邮件通知</p>
                    <p className="text-xs text-slate-400">接收学习提醒邮件</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications?.email ?? true}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        notifications: {
                          ...preferences.notifications as Record<string, boolean> || {},
                          email: e.target.checked,
                          review_reminder: (preferences.notifications as Record<string, boolean> || {}).review_reminder ?? true,
                        },
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">复习提醒</p>
                    <p className="text-xs text-slate-400">到复习时间时提醒</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.notifications?.review_reminder ?? true}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        notifications: {
                          ...preferences.notifications as Record<string, boolean> || {},
                          review_reminder: e.target.checked,
                          email: (preferences.notifications as Record<string, boolean> || {}).email ?? true,
                        },
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePreferences}
              disabled={savingPrefs}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200
                text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                transition-all duration-200 active:scale-[0.98]"
            >
              {savingPrefs ? '保存中...' : '保存偏好设置'}
            </button>
          </div>
        )}

        {/* ===== 数据管理 ===== */}
        {activeTab === 'data' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* 导出数据 */}
            <div className="bg-paper-light border border-slate-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-ink mb-2">导出我的数据</h3>
              <p className="text-sm text-slate-500 mb-4">
                导出你的所有对话记录、学习路径和复习数据为 JSON 文件
              </p>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full py-2.5 bg-paper border-2 border-slate-200 hover:border-teal-300
                  text-slate-600 hover:text-teal-600 rounded-xl text-sm font-medium
                  transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                    导出中...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 1v10M4 7l4 4 4-4M2 13v1a1 1 0 001 1h10a1 1 0 001-1v-1" />
                    </svg>
                    导出数据
                  </>
                )}
              </button>
            </div>

            {/* 注销账号 */}
            <div className="bg-paper-light border border-red-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-base text-red-600 mb-2">危险区域</h3>
              <p className="text-sm text-slate-500 mb-4">
                注销账号将永久删除你的所有数据，此操作不可撤销
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium
                    transition-all duration-200 active:scale-[0.98]"
                >
                  注销账号
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-600 font-medium">确定要注销账号吗？此操作不可撤销。</p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder='输入 "确认删除" 以继续'
                    className="w-full px-3 py-2 bg-paper border border-red-200 rounded-xl text-sm
                      focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500
                      transition-all duration-200 placeholder:text-slate-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleting(false) }}
                      className="flex-1 py-2.5 bg-paper border border-slate-200 text-slate-600 rounded-xl text-sm font-medium
                        transition-all duration-200 hover:bg-slate-50"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== '确认删除' || deleting}
                      className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-200
                        text-white disabled:text-slate-400 rounded-xl text-sm font-medium
                        transition-all duration-200 active:scale-[0.98]"
                    >
                      {deleting ? '注销中...' : '确认注销'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx
git commit -m "feat: add ProfilePage component with tabbed personal center UI"
```

---

### Task 8: Frontend — Integrate ProfilePage into ChatPage sidebar

**Files:**
- Modify: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: Add import and profile view to ChatPage**

Edit `frontend/src/pages/ChatPage.tsx`:

Add import at the top:
```tsx
import ProfilePage from '../pages/ProfilePage'
```

In the `renderContent` function, add the profile view case before the chat view:
```tsx
const renderContent = () => {
    if (currentView === 'learning') return <LearningPathPage />
    if (currentView === 'knowledge') return <KnowledgeGraphPage />
    if (currentView === 'profile') return <ProfilePage />
    // Chat view continues...
```

Add a personal center button in the sidebar, above the logout button. Find the logout section:

```tsx
          {/* 退出登录 */}
          <div className="p-3 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="w-full py-2 text-xs text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-50"
            >
              退出登录
            </button>
          </div>
```

Replace with:

```tsx
          {/* 底部按钮区域 */}
          <div className="p-3 border-t border-slate-100 space-y-1">
            <button
              onClick={() => setCurrentView(currentView === 'profile' ? 'chat' : 'profile')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200
                ${currentView === 'profile'
                  ? 'bg-teal-50 text-teal-700 font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="5" r="3" />
                <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              </svg>
              <span>个人中心</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M11 11l3-3-3-3M14 8H6" />
              </svg>
              <span>退出登录</span>
            </button>
          </div>
```

Also, when in profile view, hide the "新对话" button and session list. Update the condition in the sidebar that shows sessions:

```tsx
          {currentView === 'chat' && (
```

This is already there, so the sessions section only shows when `currentView === 'chat'`, which is correct — when on profile view, the sessions won't show.

The full set of changes to the `showSidebar &&` block: the sessions rendering is already gated on `currentView === 'chat'`, so the profile view naturally has the sidebar showing only the nav tabs and the bottom buttons. No extra changes needed there.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ChatPage.tsx
git commit -m "feat: integrate ProfilePage into sidebar navigation"
```
