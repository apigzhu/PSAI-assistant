import sys
import os

# 将 backend 目录加入 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

# 测试前强制使用 SQLite（无需启动 PostgreSQL）
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"

# 清理旧测试数据库（确保每次测试从头开始）
db_path = os.path.join(os.path.dirname(__file__), "..", "test.db")
if os.path.exists(db_path):
    os.remove(db_path)


import pytest


@pytest.fixture
def anyio_backend():
    return "asyncio"
