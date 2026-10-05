import pytest
from unittest.mock import patch, AsyncMock
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_full_flow():
    """端到端测试：注册 → 登录 → 创建会话 → 获取会话列表 → 发送消息"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. 健康检查
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["data"]["status"] == "ok"

        # 2. 注册
        resp = await client.post(
            "/api/auth/register",
            json={
                "username": "e2euser",
                "email": "e2e@test.com",
                "password": "e2epass123",
            },
        )
        assert resp.status_code == 200
        token = resp.json()["data"]["access_token"]
        assert token != ""

        # 3. 获取用户信息
        client.headers.update({"Authorization": f"Bearer {token}"})
        resp = await client.get("/api/auth/profile")
        assert resp.json()["data"]["username"] == "e2euser"

        # 4. 创建会话
        resp = await client.post(
            "/api/chat/sessions", json={"title": "集成测试"}
        )
        assert resp.status_code == 200
        session_id = resp.json()["data"]["id"]

        # 5. 获取会话列表
        resp = await client.get("/api/chat/sessions")
        assert len(resp.json()["data"]) >= 1

        # 6. 发送消息——Mock LLM 网关避免实际 API 调用
        mock_stream = AsyncMock()
        mock_stream.__aiter__.return_value = iter(["模拟", "回复"])

        with patch(
            "app.api.chat.LLMGateway.chat_stream",
            return_value=mock_stream,
        ):
            resp = await client.post(
                f"/api/chat/sessions/{session_id}/messages",
                json={"content": "你好"},
            )
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers.get("content-type", "")

        # 7. 检查工作记忆
        resp = await client.get(
            f"/api/chat/sessions/{session_id}/memory"
        )
        assert resp.status_code == 200
        assert resp.json()["code"] == 0
        # 验证工作记忆中有用户消息
        assert resp.json()["data"]["entry_count"] >= 2  # 用户消息 + AI回复


@pytest.mark.asyncio
async def test_auth_required():
    """验证未登录用户无法访问受保护接口"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        assert (await client.get("/api/auth/profile")).status_code == 401
        assert (
            await client.post(
                "/api/chat/sessions", json={"title": "test"}
            )
        ).status_code == 401
        assert (
            await client.get("/api/chat/sessions")
        ).status_code == 401


@pytest.mark.asyncio
async def test_error_handling():
    """验证全局异常处理"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 404 路由
        resp = await client.get("/nonexistent-route")
        assert resp.status_code == 404

        # 422 参数校验失败
        resp = await client.post(
            "/api/auth/register",
            json={"username": "a", "email": "bad", "password": "12"},
        )
        assert resp.status_code == 422
