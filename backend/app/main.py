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
from app.api.quiz import router as quiz_router
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
app.include_router(quiz_router)


@app.get("/health")
async def health():
    return {"code": 0, "data": {"status": "ok"}, "message": "ok"}
