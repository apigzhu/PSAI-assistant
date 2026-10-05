# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PIAS (Personalized Intelligent Assistant System) — 个性化智慧助理系统。A full-stack AI learning assistant with multi-turn chat, tutor personas, knowledge graphs, and learning path planning.

## Tech Stack

- **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL (asyncpg), Redis, litellm, python-jose (JWT), passlib+bcrypt
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS 3, Zustand, React Router DOM, Axios
- **Testing:** pytest + pytest-asyncio + httpx (ASGITransport for in-process FastAPI tests)
- **Infra:** Docker Compose (PostgreSQL 15 + Redis 7 + backend)

## Development Commands

```bash
# Backend
cd backend
pip install -e ".[dev]"        # Install deps
uvicorn app.main:app --reload   # Dev server on :8000

# Frontend
cd frontend
npm install                     # Install deps
npm run dev                     # Dev server on :5173 (proxies /api to :8000)
npm run build                   # Production build

# Tests (root dir)
pytest                          # All tests (auto-uses SQLite via conftest.py)
pytest tests/test_auth.py       # Single file
pytest -k "test_login"          # Keyword filter

# Full stack
docker-compose up               # PostgreSQL + Redis + Backend

# Lint/format
ruff check backend/             # Lint
ruff format backend/            # Format
```

## Code Architecture

```
├── backend/app/
│   ├── main.py                 # FastAPI app, lifespan, router registration
│   ├── config.py               # Pydantic Settings (env vars)
│   ├── api/                    # Routers (auth, chat, knowledge, tutors, learning)
│   ├── core/                   # deps (auth), security (JWT/bcrypt), llm_gateway (litellm),
│   │                           # working_memory (sliding window),
│   │                           # exceptions (global handlers)
│   ├── db/                     # database.py (async engine, session), models.py (ORM)
│   ├── models/                 # knowledge.py (KnowledgeNode, KnowledgeEdge),
│   │                           # learning.py (LearningPath, TutorRole)
│   └── schemas/                # Pydantic models for request/response
│
├── frontend/src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Auth gate: LoginPage vs ChatPage
│   ├── api/client.ts           # Axios client + all API functions
│   ├── stores/authStore.ts     # Zustand auth store
│   ├── types/index.ts          # All TypeScript interfaces
│   ├── pages/                  # LoginPage, ChatPage, LearningPathPage,
│   │                           # KnowledgeGraphPage
│   └── components/             # ChatMessage, ChatInput, MemoryIndicator,
│                               # TutorSelector, KnowledgeGraph (force-directed SVG)
│
├── tests/                      # pytest tests (auto-use SQLite)
└── docs/superpowers/           # Feature specs & implementation plans
```

## Key Architecture Decisions

1. **API Response Format:** Every endpoint returns `{ "code": 0, "data": ..., "message": "ok" }`. Non-zero codes are handled by exception handlers in `exceptions.py`.

2. **Auth:** JWT tokens stored in localStorage under `pias_token`, `pias_username`, `pias_userId`. No auth router (React Router) — view switching via Zustand state. Axios interceptor handles 401 redirects.

3. **Database:** Dev/testing uses SQLite (`pias_dev.db` / `test.db`) via conftest.py overriding `DATABASE_URL`. Production uses PostgreSQL via Docker Compose. Tables auto-created on startup (`init_db()`).

4. **LLM Gateway:** Unified via litellm — supports any provider by changing `LLM_BASE_URL` and `LLM_API_KEY`. Default model: `gpt-4o-mini`. Streaming via SSE.

5. **Working Memory:** In-memory sliding window (128K tokens default). Token estimation: Chinese chars × 2, English chars × 0.3. Will be migrated to Redis.

6. **Spaced Repetition:** (removed — review cards feature deleted)

7. **Design System:** "Layered Intelligence" — teal (#3A7B7D) primary, copper (#D4956B) secondary. Dark mode via CSS variables + `[data-theme="dark"]` attribute. Glass morphism sidebar, 3D card flip, gradient accents.

8. **Memory System:** 4 levels — semantic (knowledge), insight (new connections), personal (personalized), connecting (linking). Shown as colored bars on AI responses.

## Important Patterns

- **Tests require `@pytest.mark.asyncio`** on every async test function.
- **All datetime columns** use `DateTime(timezone=True)` with `server_default=func.now()`.
- **UUIDs** as string primary keys (`String(36)`, `default=lambda: str(uuid.uuid4())`).
- **Frontend views:** No router lib — `ViewType` union controls which page renders inside ChatPage.
- **Error handling:** Three global FastAPI exception handlers cover Exception, HTTPException, and ValidationError.
- **LLM JSON extraction:** Always strip ```json code fences before `json.loads()`.
- **SM-2 quality scale:** 5=perfect, 4=correct with hesitation, 3=correct but hard, 2=wrong but familiar, 1=wrong unfamiliar, 0=completely forgotten.

## Design Tokens (Tailwind)

| Token | Value | Usage |
|-------|-------|-------|
| teal-500 | `#3A7B7D` | Primary brand, buttons, active states |
| copper-500 | `#D4956B` | Secondary accent, AI avatar |
| violet-500 | `#7C3AED` | Knowledge graph formula nodes |
| paper | `var(--color-paper)` | `#F0F2F5` light / `#0f1117` dark |
| ink | `var(--color-ink)` | `#161B2D` light / `#e4e7ed` dark |

## Feature Plan (In Progress)

See `docs/superpowers/plans/2026-07-02-personal-center.md` — Personal Center feature with profile management, password change, preferences, login history, data export, and account deletion. Not yet implemented.
