from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(get_settings().database_url, echo=False)
async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

_db_initialized = False


async def init_db():
    """初始化数据库表结构（幂等，可多次调用）"""
    global _db_initialized
    if _db_initialized:
        return
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _db_initialized = True


async def get_db() -> AsyncSession:
    """获取数据库会话（自动确保表已创建）"""
    await init_db()
    async with async_session() as session:
        yield session
