from argus.mcp_client import MCPTool, SplunkMCPClient


def test_resolve_tool_matches_suffix() -> None:
    client = SplunkMCPClient("https://splunk.example/services/mcp", "token")
    client.tools = {
        "splunk_run_query": MCPTool("splunk_run_query", "", {}),
        "splunk_get_indexes": MCPTool("splunk_get_indexes", "", {}),
    }

    assert client.resolve_tool("run_query") == "splunk_run_query"
    assert client.resolve_tool("get_indexes") == "splunk_get_indexes"


def test_arg_name_prefers_schema_property() -> None:
    client = SplunkMCPClient("https://splunk.example/services/mcp", "token")
    client.tools = {
        "splunk_run_query": MCPTool(
            "splunk_run_query",
            "",
            {"properties": {"search": {"type": "string"}, "row_limit": {"type": "integer"}}},
        )
    }

    assert client._arg_name("splunk_run_query", ("query", "search", "spl")) == "search"
