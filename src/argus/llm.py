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
from typing import Any

from anthropic import AsyncAnthropic
from anthropic.types import Message

from .config import Settings


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
    """Async-context-manager shim. Bedrock invoke here is non-streaming, so we
    fetch the full message on enter and expose it via get_final_message(); the
    async iterator yields no deltas (token-level streaming is anthropic-only)."""

    def __init__(self, adapter: BedrockAdapter, kwargs: dict[str, Any]) -> None:
        self._a = adapter
        self._kwargs = kwargs
        self._msg: Message | None = None

    async def __aenter__(self) -> "_BedrockStream":
        self._msg = await self._a.invoke(self._kwargs.pop("model"), self._kwargs)
        return self

    async def __aexit__(self, *exc: Any) -> bool:
        return False

    def __aiter__(self) -> "_BedrockStream":
        return self

    async def __anext__(self) -> Any:
        raise StopAsyncIteration

    async def get_final_message(self) -> Message:
        assert self._msg is not None
        return self._msg
