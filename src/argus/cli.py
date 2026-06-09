"""Argus command-line interface."""
from __future__ import annotations

import asyncio
import json

import typer
from rich.console import Console
from rich.json import JSON
from rich.table import Table

from .agent import Investigator
from .config import get_settings
from .mcp_client import SplunkMCPClient

app = typer.Typer(help="Argus — autonomous SOC investigation agent", no_args_is_help=True)
console = Console()


def _client() -> SplunkMCPClient:
    s = get_settings()
    if not s.splunk_token:
        console.print("[red]SPLUNK_TOKEN is not set.[/red] Create a token in Splunk "
                      "(Settings > Tokens) and add it to .env")
        raise typer.Exit(1)
    return SplunkMCPClient(
        s.splunk_mcp_url, s.splunk_token, s.splunk_verify_ssl, s.request_timeout
    )


@app.command()
def check() -> None:
    """Connect to the Splunk MCP server and list available tools."""

    async def run() -> None:
        s = get_settings()
        async with _client() as c:
            console.print(f"[green]✓ Connected[/green] to {s.splunk_mcp_url}")
            si = c.server_info.get("serverInfo", {})
            if si:
                console.print(f"  server: {si.get('name')} {si.get('version')}")
            table = Table("Tool", "Description")
            for t in c.tools.values():
                table.add_row(t.name, (t.description or "").strip()[:90])
            console.print(table)

    asyncio.run(run())


@app.command()
def query(
    spl: str = typer.Argument(..., help="SPL to execute"),
    earliest: str = typer.Option("-24h", help="Earliest time"),
    latest: str = typer.Option("now", help="Latest time"),
    limit: int = typer.Option(100, help="Max rows"),
) -> None:
    """Run an SPL query through the MCP server (the agent's workhorse)."""

    async def run() -> None:
        async with _client() as c:
            res = await c.run_query(spl, earliest, latest, limit)
            console.print(c.text_content(res))

    asyncio.run(run())


@app.command(name="tool")
def call_tool(
    name: str = typer.Argument(..., help="MCP tool name, e.g. get_indexes"),
    args_json: str = typer.Option("{}", "--args", help="Tool arguments as JSON"),
) -> None:
    """Call any MCP tool by name with JSON arguments."""

    async def run() -> None:
        async with _client() as c:
            resolved = c.resolve_tool(name)
            if resolved not in c.tools:
                console.print(f"[red]Unknown tool '{name}'.[/red] Available: "
                              f"{', '.join(c.tools)}")
                raise typer.Exit(1)
            res = await c.call_tool(resolved, json.loads(args_json))
            text = c.text_content(res)
            try:
                console.print(JSON(text))
            except Exception:
                console.print(text)

    asyncio.run(run())


@app.command()
def investigate(
    alert: str = typer.Argument(..., help="The alert / question to investigate"),
    max_turns: int = typer.Option(12, help="Max agent turns"),
    respond: bool = typer.Option(False, "--respond", help="Run the response/containment phase"),
    auto: bool = typer.Option(False, "--auto", help="Auto-execute response actions (no prompts)"),
) -> None:
    """Run a full autonomous SOC investigation on an alert (optionally respond)."""

    async def approver(desc: str, _args: dict) -> bool:
        console.print(f"\n[bold yellow]⚠ Proposed action:[/bold yellow] {desc}")
        ans = await asyncio.to_thread(input, "   Approve? [y/N] ")
        return ans.strip().lower() in ("y", "yes")

    async def run() -> None:
        async with _client() as c:
            inv = Investigator(c)
            report = None
            async for ev in inv.investigate(alert, max_turns=max_turns):
                kind = ev["type"]
                if kind == "thinking":
                    console.print(f"[dim]{ev['text']}[/dim]", end="")
                elif kind == "text":
                    console.print(ev["text"], end="")
                elif kind == "tool_call":
                    console.print(
                        f"\n[bold cyan]→ {ev['name']}[/bold cyan] "
                        f"[dim]{json.dumps(ev['input'])[:200]}[/dim]"
                    )
                elif kind == "tool_result":
                    tag = "[red]✗ error[/red]" if ev["is_error"] else "[green]✓[/green]"
                    console.print(f"  {tag} [dim]{ev['text'][:200].strip()}[/dim]")
                elif kind == "report":
                    report = ev["report"]
                    console.print("\n[bold]── Incident Report ──[/bold]")
                    console.print(JSON(json.dumps(ev["report"])))
                elif kind == "error":
                    console.print(f"[red]{ev['text']}[/red]")

            if respond and report:
                console.print("\n[bold]── Response Phase ──[/bold]")
                mode = "auto" if auto else "approve"
                async for ev in inv.respond(report, mode=mode, approver=approver):
                    kind = ev["type"]
                    if kind == "case_created":
                        console.print(f"[blue]📁 case {ev['case_id']} recorded (key {ev['key']})[/blue]")
                    elif kind == "action_executed":
                        r = ev["result"]
                        ok = r.get("ok")
                        tag = "[green]✓ executed[/green]" if ok else (
                            "[yellow]skipped[/yellow]" if r.get("skipped") else "[red]failed[/red]"
                        )
                        console.print(f"  {tag} [bold]{ev['desc']}[/bold] [dim]{json.dumps(r)[:160]}[/dim]")
                    elif kind == "action_skipped":
                        console.print(f"  [yellow]⊘ skipped[/yellow] {ev['desc']}")
                    elif kind == "response_done":
                        console.print(f"[bold green]✓ Response complete:[/bold green] {ev['summary']}")

    asyncio.run(run())


if __name__ == "__main__":
    app()
