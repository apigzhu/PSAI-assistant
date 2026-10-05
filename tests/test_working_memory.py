import pytest
from app.core.working_memory import WorkingMemory


@pytest.fixture
def mem():
    return WorkingMemory(session_id="test-session", max_tokens=1000)


def test_init(mem):
    assert mem.session_id == "test-session"
    assert mem.max_tokens == 1000


def test_add_entry(mem):
    entry = mem.add_entry("user", "什么是矩阵乘法？")
    assert entry.role == "user"
    assert entry.token_estimate > 0


def test_get_context_messages(mem):
    mem.set_system_prompt("你是数学助教。")
    mem.add_entry("user", "你好")
    mem.add_entry("assistant", "有什么问题吗？")
    msgs = mem.get_context_messages()
    assert len(msgs) == 3
    assert msgs[0]["role"] == "system"
    assert msgs[0]["content"] == "你是数学助教。"
    assert msgs[1]["role"] == "user"
    assert msgs[2]["role"] == "assistant"


def test_token_limit(mem):
    mem.add_entry("user", "A" * 3000)
    mem.add_entry("assistant", "B" * 1000)
    usage = mem.get_token_usage()
    assert usage["total"] <= usage["max"]


def test_clear(mem):
    mem.add_entry("user", "test")
    mem.clear()
    assert len(mem.entries) == 0


def test_default_system_prompt(mem):
    assert "学习助理" in mem.get_system_prompt()


def test_to_dict(mem):
    mem.add_entry("user", "你好")
    data = mem.to_dict()
    assert data["session_id"] == "test-session"
    assert data["entry_count"] == 1


def test_multiple_entries(mem):
    mem.add_entry("user", "问题1")
    mem.add_entry("assistant", "回答1")
    mem.add_entry("user", "问题2")
    mem.add_entry("assistant", "回答2")
    assert mem.get_token_usage()["entry_count"] == 4


def test_estimate_tokens():
    mem = WorkingMemory("test")
    # 中文
    cn_tokens = mem._estimate_tokens("矩阵乘法")
    # 英文
    en_tokens = mem._estimate_tokens("hello")
    assert cn_tokens > en_tokens
