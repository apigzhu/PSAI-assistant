import httpx, asyncio

async def test():
    # Test backend directly (port 8000)
    c = httpx.AsyncClient(base_url="http://localhost:8000")
    r = await c.post("/api/auth/register", json={"username":"demoproxy","email":"dp@test.com","password":"dp123456"})
    print(f"Backend register: {r.status_code}")
    if r.status_code == 200:
        token = r.json()["data"]["access_token"]
    else:
        r = await c.post("/api/auth/login", json={"username":"demoproxy","password":"dp123456"})
        token = r.json()["data"]["access_token"]
        print("Backend login ok")

    r = await c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"Backend me: {r.json()['data']['username']}")
    await c.aclose()

    # Test through proxy (port 5173)
    p = httpx.AsyncClient(base_url="http://localhost:5173")
    r = await p.get("/api/health")
    print(f"Proxy health: {r.json()}")

    r = await p.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"Proxy me: {r.json()['data']['username']}")
    await p.aclose()

    print("All good!")

asyncio.run(test())
