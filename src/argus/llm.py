"""
Provider-agnostic LLM client.

`make_llm_client(settings)` returns either:
  - the real `AsyncAnthropic` client (provider="anthropic"), or
  - a `BedrockAdapter` that speaks to AWS Bedrock via boto3 using a Bedrock API
    key (bearer token), exposing the same `.messages.stream/create/parse`
    surface our agent uses.

The Python `anthropic` SDK's Bedrock client is SigV4-only and does not accept a
bearer token, so we go through boto3's `bedrock-runtime` (which honors
`AWS_BEARER_TOKEN_BEDROCK`). Bedrock returns standard Anthropic Messages-API
JSON, so we parse it back into `anthropic.types.Message` for full fidelity.
"""
from __future__ import annotations

import asyncio
import json
import os
import threading
from types import SimpleNamespace
from typing import Any

from anthropic import AsyncAnthropic
from anthropic.types import Message

from .config import Settings


def _obj(d: Any) -> Any:
    """Recursively expose a dict as attribute-access (for stream events)."""
    if isinstance(d, dict):
        return SimpleNamespace(**{k: _obj(v) for k, v in d.items()})
    if isinstance(d, list):
        return [_obj(v) for v in d]
    return d


class _StreamAccumulator:
    """Reassembles a full Anthropic Message from streamed events (the same job the
    anthropic SDK does internally), including tool-call input and thinking signatures."""

    def __init__(self) -> None:
        self.message: dict[str, Any] = {}
        self._tool_json: dict[int, str] = {}

    def handle(self, ev: dict[str, Any]) -> None:
        t = ev.get("type")
        if t == "message_start":
            self.message = ev["message"]
            self.message.setdefault("content", [])
        elif t == "content_block_start":
            idx = ev["index"]
            block = dict(ev["content_block"])
            if block.get("type") == "text":
                block.setdefault("text", "")
            elif block.get("type") == "thinking":
                block.setdefault("thinking", "")
                block.setdefault("signature", "")
            elif block.get("type") == "tool_use":
                block.setdefault("input", {})
                self._tool_json[idx] = ""
            content = self.message.setdefault("content", [])
            while len(content) <= idx:
                content.append({})
            content[idx] = block
        elif t == "content_block_delta":
            idx = ev["index"]
            d = ev.get("delta", {})
            dt = d.get("type")
            blk = self.message["content"][idx]
            if dt == "text_delta":
                blk["text"] = blk.get("text", "") + d.get("text", "")
            elif dt == "thinking_delta":
                blk["thinking"] = blk.get("thinking", "") + d.get("thinking", "")
            elif dt == "signature_delta":
                blk["signature"] = blk.get("signature", "") + d.get("signature", "")
            elif dt == "input_json_delta":
                self._tool_json[idx] = self._tool_json.get(idx, "") + d.get("partial_json", "")
        elif t == "content_block_stop":
            idx = ev["index"]
            blk = self.message["content"][idx]
            if blk.get("type") == "tool_use":
                buf = self._tool_json.get(idx, "")
                blk["input"] = json.loads(buf) if buf.strip() else {}
        elif t == "message_delta":
            d = ev.get("delta", {})
            for k, v in d.items():
                self.message[k] = v
            if isinstance(ev.get("usage"), dict) and isinstance(self.message.get("usage"), dict):
                self.message["usage"].update(ev["usage"])

    def finalize(self) -> dict[str, Any]:
        return self.message


def make_llm_client(settings: Settings) -> Any:
    if settings.provider == "bedrock":
        return BedrockAdapter(settings)
    return AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=180.0, max_retries=2)


def _to_jsonable(obj: Any) -> Any:
    """Recursively convert anthropic content blocks (pydantic) to plain JSON."""
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json", exclude_none=True)
    if isinstance(obj, dict):
        return {k: _to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_jsonable(v) for v in obj]
    return obj


class _ParseResult:
    def __init__(self, parsed_output: Any) -> None:
        self.parsed_output = parsed_output


# Constraints Bedrock structured outputs rejects (the direct SDK strips these too).
_UNSUPPORTED_SCHEMA_KEYS = (
    "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum",
    "exclusiveMaximum", "multipleOf", "minItems", "maxItems", "pattern",
    "format", "default", "title",
)


def _make_strict(schema: Any) -> Any:
    """Make a pydantic JSON schema acceptable to Bedrock structured outputs:
    set additionalProperties=false on every object and drop unsupported keys."""
    if isinstance(schema, dict):
        schema = {k: v for k, v in schema.items() if k not in _UNSUPPORTED_SCHEMA_KEYS}
        if schema.get("type") == "object" or "properties" in schema:
            schema["additionalProperties"] = False
        for key in ("properties", "$defs", "definitions"):
            if isinstance(schema.get(key), dict):
                schema[key] = {k: _make_strict(v) for k, v in schema[key].items()}
        for key in ("items", "additionalItems", "not"):
            if key in schema:
                schema[key] = _make_strict(schema[key])
        for key in ("anyOf", "allOf", "oneOf", "prefixItems"):
            if isinstance(schema.get(key), list):
                schema[key] = [_make_strict(v) for v in schema[key]]
        return schema
    if isinstance(schema, list):
        return [_make_strict(v) for v in schema]
    return schema


class BedrockAdapter:
    """Minimal async client mirroring the bits of AsyncAnthropic that Argus uses."""

    def __init__(self, settings: Settings) -> None:
        import boto3  # imported lazily so the anthropic path needs no boto3

        if settings.aws_bearer_token_bedrock:
            os.environ["AWS_BEARER_TOKEN_BEDROCK"] = settings.aws_bearer_token_bedrock
        os.environ.setdefault("AWS_REGION", settings.aws_region)
        self._client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
        self.messages = _Messages(self)

    # ---- core invoke -------------------------------------------------------
    def _build_body(self, kwargs: dict[str, Any]) -> dict[str, Any]:
        body: dict[str, Any] = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": kwargs["max_tokens"],
            "messages": _to_jsonable(kwargs["messages"]),
        }
        for key in ("system", "tools", "thinking", "output_config", "tool_choice"):
            if kwargs.get(key) is not None:
                body[key] = _to_jsonable(kwargs[key])
        return body

    async def invoke(self, model_id: str, kwargs: dict[str, Any]) -> Message:
        body = json.dumps(self._build_body(kwargs))

        def _call() -> dict[str, Any]:
            resp = self._client.invoke_model(
                modelId=model_id, body=body,
                contentType="application/json", accept="application/json",
            )
            return json.loads(resp["body"].read())

        payload = await asyncio.to_thread(_call)
        return Message.model_validate(payload)


class _Messages:
    def __init__(self, adapter: BedrockAdapter) -> None:
        self._a = adapter

    def stream(self, **kwargs: Any) -> "_BedrockStream":
        return _BedrockStream(self._a, kwargs)

    async def create(self, **kwargs: Any) -> Message:
        return await self._a.invoke(kwargs.pop("model"), kwargs)

    async def parse(self, *, output_format: Any, **kwargs: Any) -> _ParseResult:
        schema = _make_strict(output_format.model_json_schema())
        kwargs["output_config"] = {
            "format": {"type": "json_schema", "schema": schema}
        }
        msg = await self._a.invoke(kwargs.pop("model"), kwargs)
        text = next((b.text for b in msg.content if b.type == "text"), "{}")
        return _ParseResult(output_format.model_validate_json(text))


class _BedrockStream:
    """Real token-by-token streaming over Bedrock's `invoke_model_with_response_stream`.

    Bedrock streams the same Anthropic SSE event JSON inside each chunk, so we parse
    those events, surface `content_block_delta`s to the async iterator, and accumulate
    the full Message for `get_final_message()`. boto3's event stream is synchronous, so
    a producer thread feeds an asyncio queue."""

    _SENTINEL = object()

    def __init__(self, adapter: BedrockAdapter, kwargs: dict[str, Any]) -> None:
        self._a = adapter
        self._kwargs = kwargs
        self._queue: asyncio.Queue[Any] = asyncio.Queue()
        self._acc = _StreamAccumulator()
        self._final: Message | None = None
        self._thread: threading.Thread | None = None

    async def __aenter__(self) -> "_BedrockStream":
        model_id = self._kwargs.pop("model")
        body = json.dumps(self._a._build_body(self._kwargs))
        loop = asyncio.get_running_loop()
        self._thread = threading.Thread(
            target=self._produce, args=(model_id, body, loop), daemon=True
        )
        self._thread.start()
        return self

    def _produce(self, model_id: str, body: str, loop: asyncio.AbstractEventLoop) -> None:
        try:
            resp = self._a._client.invoke_model_with_response_stream(
                modelId=model_id, body=body,
                contentType="application/json", accept="application/json",
            )
            for event in resp["body"]:
                chunk = event.get("chunk") if isinstance(event, dict) else None
                if not chunk:
                    continue
                data = json.loads(chunk["bytes"])
                loop.call_soon_threadsafe(self._queue.put_nowait, data)
        except Exception as exc:  # surface to the consumer
            loop.call_soon_threadsafe(self._queue.put_nowait, {"__error__": str(exc)})
        finally:
            loop.call_soon_threadsafe(self._queue.put_nowait, self._SENTINEL)

    async def __aexit__(self, *exc: Any) -> bool:
        return False

    def __aiter__(self) -> "_BedrockStream":
        return self

    async def __anext__(self) -> Any:
        while True:
            item = await self._queue.get()
            if item is self._SENTINEL:
                raise StopAsyncIteration
            if isinstance(item, dict) and "__error__" in item:
                raise RuntimeError(f"Bedrock stream error: {item['__error__']}")
            self._acc.handle(item)
            if item.get("type") == "content_block_delta":
                return _obj(item)

    async def get_final_message(self) -> Message:
        if self._final is None:
            self._final = Message.model_validate(self._acc.finalize())
        return self._final
