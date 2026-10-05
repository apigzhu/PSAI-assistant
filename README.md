# PIAS · 个性化智慧助理系统

**Personalized Intelligent Assistant System** —— 一个基于大语言模型的全栈 AI 学习助理，支持多轮对话、导师人设、学习路径规划、知识图谱、试题练习与错题集。

## ✨ 核心功能

- **多轮对话**：SSE 流式输出，滑动窗口工作记忆（默认 128K token 估算），长对话不丢上下文
- **导师人设**：内置多种导师角色（讲解式、苏格拉底式等），会话内一键切换
- **学习路径**：输入目标自动生成里程碑式学习计划，支持进度追踪与里程碑内容生成
- **知识图谱**：从对话中自动抽取知识点并生成力导向 SVG 图谱，支持全局图谱与单会话图谱
- **试题练习**：按主题自动生成测验并判分
- **错题集**：错题自动归档，支持按主题查看与删除
- **个人中心**：资料管理、修改密码、登录历史、数据导出、账号注销
- **四层记忆系统**：语义记忆 / 洞察记忆 / 个性化记忆 / 连接记忆，以彩色进度条可视化

## 🛠 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18 · TypeScript · Vite · TailwindCSS 3 · Zustand · Axios |
| 后端 | Python 3.11 · FastAPI · SQLAlchemy 2.0 (async) · Pydantic v2 |
| 数据库 | PostgreSQL（asyncpg）；开发 / 测试使用 SQLite |
| 缓存 | Redis |
| LLM | litellm 统一网关，兼容任意 OpenAI 风格接口，默认 `gpt-4o-mini` |
| 认证 | JWT（python-jose）+ bcrypt |
| 测试 | pytest + pytest-asyncio + httpx |
| 部署 | Docker Compose |

## 🏗 系统架构

```
┌──────────────────┐   /api (SSE)   ┌────────────────────────────────────┐
│   React SPA      │ ─────────────▶ │          FastAPI Backend           │
│   (Vite + TS)    │                │  ├─ API Routers（auth/chat/...）   │
└──────────────────┘                │  ├─ LLM Gateway（litellm）───────▶ │──▶ LLM Provider
                                    │  ├─ Working Memory（滑动窗口）      │
                                    │  └─ Auth（JWT）                    │
                                    └──────────┬──────────────┬──────────┘
                                               │              │
                                          PostgreSQL         Redis
```

## 🚀 快速开始

### Docker Compose（一键启动）

```bash
cp backend/.env.example backend/.env    # 填入 LLM_API_KEY / LLM_BASE_URL
docker compose up --build
```

- 后端 API：http://localhost:8000 （接口文档：http://localhost:8000/docs）
- 健康检查：`GET /health`

### 本地开发

```bash
# 后端
cd backend
pip install -e ".[dev]"
uvicorn app.main:app --reload          # 监听 :8000

# 前端
cd frontend
npm install
npm run dev                            # 监听 :5173，/api 代理到 :8000
```

## 📁 项目结构

```
├── backend/
│   └── app/
│       ├── api/            # 路由：auth / chat / knowledge / tutors / learning / profile / quiz
│       ├── core/           # deps / security / llm_gateway / working_memory / exceptions
│       ├── db/             # async engine、session、ORM models
│       ├── models/         # knowledge、learning 领域模型
│       └── schemas/        # Pydantic 请求 / 响应模型
├── frontend/
│   └── src/
│       ├── pages/          # Login / Chat / LearningPath / KnowledgeGraph / Profile / WrongAnswers
│       ├── components/     # ChatMessage / ChatInput / TutorSelector / KnowledgeGraph / ...
│       ├── api/client.ts   # Axios 客户端与全部接口封装
│       └── stores/         # Zustand 状态管理
├── tests/                  # pytest 测试（自动使用 SQLite）
├── docker-compose.yml      # PostgreSQL + Redis + Backend
└── docs/                   # 需求与实现文档
```

## 🔌 API 概览

- 统一响应格式：`{ "code": 0, "data": ..., "message": "ok" }`
- 认证方式：`Authorization: Bearer <JWT>`
- 主要接口：`/auth/*`、`/chat/*`、`/knowledge/*`、`/tutors/*`、`/learning/*`、`/profile/*`、`/quiz/*`

## 📸 界面预览

> 运行后可补充界面截图到本节，展示登录页、对话页、知识图谱与学习路径等界面。