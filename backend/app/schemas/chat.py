from pydantic import BaseModel
from datetime import datetime


class CreateSessionRequest(BaseModel):
    title: str = "新对话"


class SessionResponse(BaseModel):
    id: str
    title: str
    created_at: datetime


class SendMessageRequest(BaseModel):
    content: str
