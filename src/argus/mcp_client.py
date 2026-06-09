"""
Async client for the Splunk MCP Server.

The Splunk MCP Server (Splunkbase app 7931) exposes a JSON-RPC 2.0 endpoint at
`/services/mcp` on the management port (8089). It is plain request/response HTTP
(no SSE). Auth is a Splunk bearer token validated against
`services/authentication/current-context`.

All of Argus's interaction with Splunk goes through this client.
"""
from __future__ import annotations

import itertools
from dataclasses import dataclass
from typing import Any

import httpx

PROTOCOL_VERSION = "2025-06-18"
CLIENT_INFO = {"name": "argus-soc-agent", "version": "0.1.0"}


class MCPError(Exception):
    """A JSON-RPC error returned by the MCP server."""

    def __init__(self, code: int | None, message: str, data: Any = None) -> None:
        super().__init__(f"MCP error {code}: {message}")
        self.code = code
        self.message = message
        self.data = data


class MCPToolError(Exception):
    """A tool executed but returned isError=true (e.g. SPL rejected by safe-SPL)."""


@dataclass
class MCPTool:
    name: str
    description: str
    input_schema: dict[str, Any]


class SplunkMCPClient:
    """Minimal, robust MCP client tailored to the Splunk MCP Server."""

    def __init__(
        self,
        url: str,
        token: str,
        verify_ssl: bool = False,
        timeout: float = 120.0,
    ) -> None:
        self._url = url
        self._client = httpx.AsyncClient(
            verify=verify_ssl,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        self._ids = itertools.count(1)
        self._session_id: str | None = None
        self.server_info: dict[str, Any] = {}
        self.tools: dict[str, MCPTool] = {}

    # ---- low-level JSON-RPC -------------------------------------------------
    async def _rpc(
        self, method: str, params: dict | None = None, *, notification: bool = False
    ) -> Any:
        body: dict[str, Any] = {"jsonrpc": "2.0", "method": method}
        if not notification:
            body["id"] = next(self._ids)
        if params is not None:
            body["params"] = params

        headers: dict[str, str] = {}
        if self._session_id:
            headers["Mcp-Session-Id"] = self._session_id

        resp = await self._client.post(self._url, json=body, headers=headers)

        sid = resp.headers.get("Mcp-Session-Id")
        if sid:
            self._session_id = sid

        if notification:
            return None

        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and data.get("error"):
            err = data["error"]
            raise MCPError(err.get("code"), err.get("message", ""), err.get("data"))
        return data.get("result") if isinstance(data, dict) else data

    # ---- MCP lifecycle ------------------------------------------------------
    async def initialize(self) -> dict[str, Any]:
        result = await self._rpc(
            "initialize",
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": CLIENT_INFO,
            },
        )
        self.server_info = result or {}
        await self._rpc("notifications/initialized", notification=True)
        return self.server_info

    async def list_tools(self) -> dict[str, MCPTool]:
        result = await self._rpc("tools/list", {})
        tools: dict[str, MCPTool] = {}
        for t in (result or {}).get("tools", []):
            schema = t.get("inputSchema") or t.get("input_schema") or {}
            tools[t["name"]] = MCPTool(t["name"], t.get("description", ""), schema)
        self.tools = tools
        return tools

    async def call_tool(self, name: str, arguments: dict | None = None) -> dict[str, Any]:
        result = await self._rpc(
            "tools/call", {"name": name, "arguments": arguments or {}}
        )
        result = result or {}
        if result.get("isError"):
            raise MCPToolError(self.text_content(result) or f"Tool {name} failed")
        return result

    # ---- convenience --------------------------------------------------------
    @staticmethod
    def text_content(result: dict[str, Any] | None) -> str:
        parts = [
            block.get("text", "")
            for block in (result or {}).get("content", [])
            if block.get("type") == "text"
        ]
        return "\n".join(parts)

    def resolve_tool(self, logical: str) -> str:
        """Map a logical tool name to the server's actual name (e.g. run_query ->
        splunk_run_query)."""
        if logical in self.tools:
            return logical
        for name in self.tools:
            if name == logical or name.endswith("_" + logical) or name.endswith(logical):
                return name
        return logical

    def _arg_name(self, tool: str, candidates: tuple[str, ...]) -> str:
        """Find the real parameter name for a tool from its discovered schema."""
        spec = self.tools.get(tool)
        props = (spec.input_schema.get("properties") if spec else {}) or {}
        for cand in candidates:
            if cand in props:
                return cand
        for key, val in props.items():  # fallback: first string property
            if isinstance(val, dict) and val.get("type") == "string":
                return key
        return candidates[0]

    async def run_query(
        self,
        spl: str,
        earliest_time: str = "-24h",
        latest_time: str = "now",
        row_limit: int = 100,
    ) -> dict[str, Any]:
        """Execute an SPL search via the MCP run_query tool."""
        tool = self.resolve_tool("run_query")
        qarg = self._arg_name(tool, ("query", "search", "spl", "search_query"))
        args: dict[str, Any] = {
            qarg: spl,
            "earliest_time": earliest_time,
            "latest_time": latest_time,
            "row_limit": row_limit,
        }
        # Drop standard args the tool doesn't actually accept.
        spec = self.tools.get(tool)
        if spec and spec.input_schema.get("properties"):
            allowed = set(spec.input_schema["properties"])
            args = {k: v for k, v in args.items() if k in allowed or k == qarg}
        return await self.call_tool(tool, args)

    # ---- context manager ----------------------------------------------------
    async def aclose(self) -> None:
        await self._client.aclose()

    async def __aenter__(self) -> "SplunkMCPClient":
        await self.initialize()
        await self.list_tools()
        return self

    async def __aexit__(self, *exc: Any) -> None:
        await self.aclose()
