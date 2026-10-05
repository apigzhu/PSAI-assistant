import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class KnowledgeNode(Base):
    """知识图谱节点——表示一个概念/术语/公式"""
    __tablename__ = "knowledge_nodes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(
        String(50), default="concept"
    )  # concept | term | formula | method
    description: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class KnowledgeEdge(Base):
    """知识图谱边——概念间的关系"""
    __tablename__ = "knowledge_edges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_nodes.id"), nullable=False
    )
    target_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("knowledge_nodes.id"), nullable=False
    )
    relation: Mapped[str] = mapped_column(
        String(50), default="related_to"
    )  # prerequisite | derived_from | related_to | example_of | part_of
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
