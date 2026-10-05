from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional


@dataclass
class MemoryEntry:
    """单条记忆条目"""
    role: str
    content: str
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    token_estimate: int = 0


class WorkingMemory:
    """
    工作记忆——管理当前会话的上下文窗口。

    采用滑动窗口策略：当 Token 总量超限时，
    自动丢弃最早的条目以控制上下文长度。
    """

    def __init__(self, session_id: str, max_tokens: int = 128000):
        self.session_id = session_id
        self.max_tokens = max_tokens
        self.entries: list[MemoryEntry] = []
        self._total_tokens = 0
        self._system_prompt: Optional[str] = None

    def set_system_prompt(self, prompt: str):
        self._system_prompt = prompt

    def get_system_prompt(self) -> str:
        return (
            self._system_prompt
            or "你是一个智慧学习助理，帮助大学生解答学习问题。"
        )

    def add_entry(self, role: str, content: str) -> MemoryEntry:
        """添加一条记忆条目，自动管理窗口大小"""
        token_count = self._estimate_tokens(content)
        entry = MemoryEntry(
            role=role, content=content, token_estimate=token_count
        )
        self.entries.append(entry)
        self._total_tokens += token_count

        # 滑动窗口：超出上限时丢弃最早条目
        while self._total_tokens > self.max_tokens and len(self.entries) > 1:
            removed = self.entries.pop(0)
            self._total_tokens -= removed.token_estimate

        return entry

    def get_context_messages(self) -> list[dict]:
        """获取用于 LLM 调用的消息列表"""
        messages = [
            {"role": "system", "content": self.get_system_prompt()}
        ]
        for entry in self.entries:
            messages.append({"role": entry.role, "content": entry.content})
        return messages

    def get_token_usage(self) -> dict:
        """获取当前 Token 使用情况"""
        return {
            "total": self._total_tokens,
            "max": self.max_tokens,
            "usage_ratio": round(
                self._total_tokens / self.max_tokens, 3
            ),
            "entry_count": len(self.entries),
        }

    def clear(self):
        """清空工作记忆"""
        self.entries.clear()
        self._total_tokens = 0

    def _estimate_tokens(self, text: str) -> int:
        """粗略估算 Token 数：中文字符 x2，英文字符 x0.3"""
        chinese_chars = sum(1 for c in text if "一" <= c <= "鿿")
        english_chars = len(text) - chinese_chars
        return int(chinese_chars * 2 + english_chars * 0.3)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "max_tokens": self.max_tokens,
            "total_tokens": self._total_tokens,
            "entry_count": len(self.entries),
            "entries": [asdict(e) for e in self.entries],
        }
