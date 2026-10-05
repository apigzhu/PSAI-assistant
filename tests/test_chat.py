import pytest
from unittest.mock import patch, AsyncMock
from httpx import ASGITransport, AsyncClient
from app.main import app

_counter = 0


@pytest.fixture
async def auth_client():
    global _counter
    _counter += 1
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        suffix = _counter
        resp = await ac.post(
            "/api/auth/register",
            json={
                "username": f"chatuser{suffix}",
                "email": f"chat{suffix}@test.com",
                "password": "chatpass123",
            },
        )
        assert resp.status_code == 200, f"注册失败: {resp.text}"
        token = resp.json()["data"]["access_token"]
        ac.headers.update({"Authorization": f"Bearer {token}"})
        yield ac


@pytest.mark.asyncio
async def test_create_session(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/chat/sessions", json={"title": "数学答疑"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 0
    assert "id" in data["data"]
    assert data["data"]["title"] == "数学答疑"


@pytest.mark.asyncio
async def test_list_sessions(auth_client: AsyncClient):
    await auth_client.post(
        "/api/chat/sessions", json={"title": "会话1"}
    )
    await auth_client.post(
        "/api/chat/sessions", json={"title": "会话2"}
    )
    resp = await auth_client.get("/api/chat/sessions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 0
    assert len(data["data"]) >= 2


@pytest.mark.asyncio
async def test_send_message_returns_sse(auth_client: AsyncClient):
    """验证 SSE 流式响应的格式"""
    # Mock LLM 网关，避免实际调用 API
    mock_stream = AsyncMock()
    mock_stream.__aiter__.return_value = iter(["模拟", "回复", "内容"])

    with patch(
        "app.api.chat.LLMGateway.chat_stream",
        return_value=mock_stream,
    ):
        resp = await auth_client.post(
            "/api/chat/sessions", json={"title": "测试对话"}
        )
        session_id = resp.json()["data"]["id"]

        resp = await auth_client.post(
            f"/api/chat/sessions/{session_id}/messages",
            json={"content": "什么是矩阵乘法？"},
        )
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers.get("content-type", "")


@pytest.mark.asyncio
async def test_send_message_unauthorized():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/api/chat/sessions/nonexistent/messages",
            json={"content": "hello"},
        )
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_send_message_session_not_found(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/chat/sessions/nonexistent-id/messages",
        json={"content": "你好"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_session_belongs_to_user(auth_client: AsyncClient):
    resp = await auth_client.get(
        "/api/chat/sessions/fake-id/memory"
    )
    assert resp.status_code == 404
