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
    model: str = Field("claude-sonnet-4-6", alias="ARGUS_MODEL")

    # --- Provider: "anthropic" (direct API) or "bedrock" (AWS, via boto3) ---
    provider: str = Field("anthropic", alias="ARGUS_PROVIDER")
    aws_bearer_token_bedrock: str = Field("", alias="AWS_BEARER_TOKEN_BEDROCK")
    aws_region: str = Field("us-west-2", alias="AWS_REGION")

    # Maps our friendly model names to Bedrock inference-profile IDs.
    _BEDROCK_MODEL_IDS = {
        "claude-sonnet-4-6": "global.anthropic.claude-sonnet-4-6",
        "claude-opus-4-6": "global.anthropic.claude-opus-4-6-v1",
        "claude-haiku-4-5": "anthropic.claude-haiku-4-5-20251001-v1:0",
    }

    @property
    def resolved_model(self) -> str:
        """The model identifier to send on the wire for the active provider."""
        if self.provider == "bedrock":
            return self._BEDROCK_MODEL_IDS.get(
                self.model, f"global.anthropic.{self.model}"
            )
        return self.model

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
