# 个人中心功能 — 设计文档

## 概述

为 PIAS 系统添加「个人中心」功能，允许用户查看和编辑个人资料、修改密码、管理偏好设置、查看登录历史、导出数据和注销账号。

## 导航集成

- 在侧边栏底部（退出登录按钮上方）添加一个固定按钮「个人中心」
- 点击后切换到 `profile` 视图
- 新增 ViewType: `'profile'`
- 在 `profile` 视图下，侧边栏保持显示但隐藏「新对话」按钮和会话列表

## 后端变更

### User 模型扩展

```python
# 现有字段不变，新增
avatar_url: str | None      # 头像 URL
preferences: dict | None    # JSON 字段，存储偏好设置（主题、通知等）
```

### 新增 LoginLog 模型

```python
class LoginLog(Base):
    __tablename__ = "login_logs"
    id: str               # UUID
    user_id: str          # FK to users.id
    ip_address: str | None
    user_agent: str | None
    login_at: datetime    # server_default=func.now()
```

### 新增 API 路由

编辑 `backend/app/api/auth.py` (或新建 `backend/app/api/profile.py`)：

| 方法 | 路径 | 功能 | 描述 |
|------|------|------|------|
| `GET` | `/api/auth/profile` | 获取资料 | 返回用户完整资料 + 注册时间 + 最近登录 |
| `PATCH` | `/api/auth/profile` | 修改资料 | 更新 username/email/avatar_url |
| `POST` | `/api/auth/change-password` | 修改密码 | 验证旧密码，更新新密码 |
| `GET` | `/api/auth/preferences` | 获取偏好 | 返回用户的偏好设置 JSON |
| `PUT` | `/api/auth/preferences` | 更新偏好 | 更新偏好设置 JSON |
| `GET` | `/api/auth/login-history` | 登录历史 | 分页返回登录记录 |
| `DELETE` | `/api/auth/account` | 注销账号 | 软删除或硬删除用户 |
| `GET` | `/api/auth/export-data` | 导出数据 | 打包返回用户所有数据 |

### 新增 Schema

```python
class ProfileUpdate(BaseModel):
    username: str | None = None
    email: str | None = None
    avatar_url: str | None = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserProfile(BaseModel):
    user_id: str
    username: str
    email: str
    avatar_url: str | None
    is_active: bool
    created_at: datetime
    last_login: datetime | None
```

### 数据导出格式

```json
{
  "user": { "username": "...", "email": "..." },
  "sessions": [...],
  "messages": [...],
  "learning_paths": [...]
}
```

### 登录日志记录

在 `login` 路由中记录登录事件到 `LoginLog` 表，捕获 IP 和 User-Agent。

## 前端变更

### 新增文件

- `frontend/src/pages/ProfilePage.tsx` — 个人中心主页面
- `frontend/src/components/ProfileSidebarButton.tsx` — (可选，可直接写在 ChatPage)

### 修改文件

- `frontend/src/types/index.ts` — 新增 `UserProfile`, `LoginRecord` 类型，扩展 ViewType
- `frontend/src/api/client.ts` — 新增 API 调用函数
- `frontend/src/App.tsx` — 无需修改（ChatPage 已经是登录后的主容器）
- `frontend/src/pages/ChatPage.tsx` — 添加 `profile` 视图、侧边栏按钮

### ProfilePage 内部结构

使用内联标签页切换：

1. **基本信息**
   - 头像展示（Gravatar 首字母，可点击切换）
   - 用户名（可编辑，保存按钮）
   - 邮箱（可编辑，保存按钮）
   - 注册时间（只读展示）
   - 最近登录时间（只读展示）

2. **安全设置**
   - 修改密码表单（旧密码、新密码、确认新密码）

3. **偏好设置**
   - 主题切换：亮色/暗色/跟随系统（先存后端，后续实现 CSS 变量切换）
   - 通知偏好：开关项（占位，后续实现）

4. **数据管理**
   - 「导出我的数据」按钮 → 下载 JSON
   - 「注销账号」按钮 → 二次确认弹窗 → 删除账号并退出

### 数据类型扩展

```typescript
type ViewType = 'chat' | 'learning' | 'review' | 'knowledge' | 'profile'

interface UserProfile {
  user_id: string
  username: string
  email: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  last_login: string | null
}

interface LoginRecord {
  id: string
  ip_address: string | null
  user_agent: string | null
  login_at: string
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  notifications: {
    email: boolean
    review_reminder: boolean
  }
}
```

## 实现顺序

1. 后端：User 模型扩展 + LoginLog 模型 + 数据库迁移
2. 后端：新增 API 路由（profile / change-password / login-history / preferences / account / export）
3. 后端：login 路由增加登录日志记录
4. 前端：扩展类型定义
5. 前端：扩展 API client
6. 前端：实现 ProfilePage 组件
7. 前端：ChatPage 集成（侧边栏按钮 + profile 视图）

## 错误处理

- 表单验证错误显示内联提示
- 修改密码时旧密码错误返回明确错误信息
- 删除账号需要二次确认，输入「确认删除」文本
- API 错误统一显示 toast 或内联消息
