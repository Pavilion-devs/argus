"""Runtime configuration, loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- Claude / Anthropic ---
    anthropic_api_key: str = Field("", alias="ANTHROPIC_API_KEY")
    model: str = Field("claude-opus-4-8", alias="ARGUS_MODEL")

    # --- Splunk MCP Server ---
    splunk_mcp_url: str = Field(
        "https://localhost:8089/services/mcp", alias="SPLUNK_MCP_URL"
    )
    splunk_token: str = Field("", alias="SPLUNK_TOKEN")
    splunk_verify_ssl: bool = Field(False, alias="SPLUNK_VERIFY_SSL")
    request_timeout: float = Field(120.0, alias="ARGUS_TIMEOUT")

    # --- Optional integrations (real response / enrichment) ---
    slack_webhook_url: str = Field("", alias="SLACK_WEBHOOK_URL")
    vt_api_key: str = Field("", alias="VT_API_KEY")
    abuseipdb_api_key: str = Field("", alias="ABUSEIPDB_API_KEY")
    jira_base_url: str = Field("", alias="JIRA_BASE_URL")
    jira_email: str = Field("", alias="JIRA_EMAIL")
    jira_api_token: str = Field("", alias="JIRA_API_TOKEN")
    jira_project_key: str = Field("SOC", alias="JIRA_PROJECT_KEY")

    @property
    def splunk_base_url(self) -> str:
        """The splunkd management base URL (e.g. https://localhost:8089),
        derived from the MCP endpoint, for direct REST calls (KV store)."""
        url = self.splunk_mcp_url
        marker = "/services/"
        if marker in url:
            return url.split(marker, 1)[0]
        return url.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
