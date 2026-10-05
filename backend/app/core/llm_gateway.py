from typing import AsyncIterator
from dataclasses import dataclass, asdict
from litellm import acompletion
from app.config import get_settings


@dataclass
class ChatMessage:
    role: str
    content: str


def _to_dict_list(messages: list) -> list[dict]:
    """统一处理 messages 格式：支持 ChatMessage 对象或 dict"""
    result = []
    for m in messages:
        if isinstance(m, dict):
            result.append(m)
        else:
            result.append(asdict(m))
    return result


class LLMGateway:
    """LLM 网关——统一管理多模型调用与流式对话"""

    def __init__(self, model: str | None = None, temperature: float | None = None):
        settings = get_settings()
        self.model = model or settings.llm_default_model
        self.api_key = settings.llm_api_key
        self.base_url = settings.llm_base_url or None
        self.temperature = temperature

    def _build_kwargs(self) -> dict:
        kwargs = {"model": self.model, "api_key": self.api_key}
        if self.base_url:
            kwargs["api_base"] = self.base_url
        if self.temperature is not None:
            kwargs["temperature"] = self.temperature
        return kwargs

    async def chat(self, messages: list) -> str:
        """非流式对话，返回完整回复"""
        kwargs = self._build_kwargs()
        kwargs["messages"] = _to_dict_list(messages)
        resp = await acompletion(**kwargs)
        return resp.choices[0].message.content or ""

    async def chat_stream(
        self, messages: list
    ) -> AsyncIterator[str]:
        """流式对话，逐 chunk 产出内容"""
        kwargs = self._build_kwargs()
        kwargs["messages"] = _to_dict_list(messages)
        kwargs["stream"] = True

        response = await acompletion(**kwargs)
        async for chunk in response:
            if delta := chunk.choices[0].delta.content:
                yield delta

    def get_model_name(self) -> str:
        return self.model
