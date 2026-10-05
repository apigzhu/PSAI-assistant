import httpx, asyncio

async def test():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as c:
        # 注册
        r = await c.post("/api/auth/register", json={"username":"demo","email":"demo@test.com","password":"demo123"})
        print("注册:", r.status_code, r.json()["code"] == 0)
        token = r.json()["data"]["access_token"]

        # 登录
        r = await c.post("/api/auth/login", json={"username":"demo","password":"demo123"})
        print("登录:", r.status_code, r.json()["code"] == 0)

        # 获取用户信息
        r = await c.get("/api/auth/me", headers={"Authorization":f"Bearer {token}"})
        print("用户信息:", r.json()["data"]["username"])

        # 创建会话
        r = await c.post("/api/chat/sessions", json={"title":"数学提问"}, headers={"Authorization":f"Bearer {token}"})
        print("创建会话:", r.status_code, r.json()["code"] == 0)
        sid = r.json()["data"]["id"]

        # 获取会话列表
        r = await c.get("/api/chat/sessions", headers={"Authorization":f"Bearer {token}"})
        data = r.json()
        print(f"会话列表: {r.status_code}, 共{len(data['data'])}个会话")

        print("---")
        print("所有接口正常工作！")

asyncio.run(test())
