import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Float, Integer, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class LearningPath(Base):
    """学习路径——用户的学习目标与进度"""
    __tablename__ = "learning_paths"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    goal: Mapped[str] = mapped_column(Text, default="")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    milestones: Mapped[str] = mapped_column(
        Text, default="[]"
    )  # JSON: [{name, status, order}]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class TutorRole(Base):
    """导师角色——AI 的学习指导人格"""
    __tablename__ = "tutor_roles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(100), default="")
    avatar_style: Mapped[str] = mapped_column(
        String(50), default="socratic"
    )  # 用于前端 SVG 头像风格选择
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    theme_color: Mapped[str] = mapped_column(String(7), default="#3A7B7D")
    tags: Mapped[str] = mapped_column(String(200), default="[]")  # JSON array
    description: Mapped[str] = mapped_column(String(300), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_default: Mapped[bool] = mapped_column(default=False)
