import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "test123456",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == 0
    assert "access_token" in data["data"]
    assert data["data"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_login(client: AsyncClient):
    # 先注册
    await client.post(
        "/api/auth/register",
        json={
            "username": "loginuser",
            "email": "login@example.com",
            "password": "pass123456",
        },
    )
    # 再登录
    resp = await client.post(
        "/api/auth/login",
        json={"username": "loginuser", "password": "pass123456"},
    )
    assert resp.status_code == 200
    assert resp.json()["code"] == 0
    assert resp.json()["data"]["access_token"] != ""


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "username": "loginfail",
            "email": "fail@example.com",
            "password": "correct123",
        },
    )
    resp = await client.post(
        "/api/auth/login",
        json={"username": "loginfail", "password": "wrongpass"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={
            "username": "dupuser",
            "email": "dup@example.com",
            "password": "pass123456",
        },
    )
    resp = await client.post(
        "/api/auth/register",
        json={
            "username": "dupuser",
            "email": "dup2@example.com",
            "password": "pass123456",
        },
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    resp = await client.post(
        "/api/auth/register",
        json={
            "username": "meuser",
            "email": "me@example.com",
            "password": "pass123456",
        },
    )
    token = resp.json()["data"]["access_token"]

    resp = await client.get(
        "/api/auth/profile", headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["username"] == "meuser"


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    resp = await client.get("/api/auth/profile")
    assert resp.status_code == 401
