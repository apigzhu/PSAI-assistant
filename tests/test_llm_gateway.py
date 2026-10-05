import pytest
from app.core.llm_gateway import LLMGateway, ChatMessage


@pytest.mark.asyncio
async def test_chat_message_creation():
    msg = ChatMessage(role="user", content="你好")
    assert msg.role == "user"
    assert msg.content == "你好"


@pytest.mark.asyncio
async def test_gateway_initialization():
    gateway = LLMGateway(model="gpt-4o-mini")
    assert gateway.get_model_name() == "gpt-4o-mini"


@pytest.mark.asyncio
async def test_gateway_default_model():
    gateway = LLMGateway()
    assert gateway.get_model_name() is not None


@pytest.mark.asyncio
async def test_chat_stream_type():
    gateway = LLMGateway()
    stream = gateway.chat_stream(
        [ChatMessage(role="user", content="test")]
    )
    assert hasattr(stream, "__aiter__")


@pytest.mark.asyncio
async def test_chat_message_list():
    messages = [
        ChatMessage(role="system", content="你是一个助手"),
        ChatMessage(role="user", content="你好"),
    ]
    assert len(messages) == 2
    assert messages[0].role == "system"
    assert messages[1].role == "user"
