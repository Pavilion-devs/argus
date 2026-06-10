#!/usr/bin/env bash
set -euo pipefail
#
# Native Splunk setup for Argus. Installs the MCP Server app, loads BOTS v3,
# installs the argus_response companion app, enables token auth, and mints an
# MCP token (audience=mcp). Run after Splunk Enterprise is installed and started.
#
# Usage:
#   SPLUNK_HOME=~/splunk SPLUNK_PW=Changeme123! \
#   MCP_APP=~/Downloads/splunk-mcp-server_120.tgz ./scripts/setup_splunk.sh
#
SPLUNK_HOME="${SPLUNK_HOME:-$HOME/splunk}"
SPLUNK_PW="${SPLUNK_PW:-Changeme123!}"
MCP_APP="${MCP_APP:-}"
SPLUNK="${SPLUNK_HOME}/bin/splunk"
MGMT="https://localhost:8089"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

[ -x "$SPLUNK" ] || { echo "ERROR: splunk not found at $SPLUNK (set SPLUNK_HOME)"; exit 1; }

if [ -n "$MCP_APP" ] && [ -f "$MCP_APP" ]; then
  echo "==> Installing MCP Server app from $MCP_APP"
  "$SPLUNK" install app "$MCP_APP" -update 1 -auth "admin:${SPLUNK_PW}" || true
fi

echo "==> Allowing plaintext tokens for the MCP server (local dev)"
mkdir -p "${SPLUNK_HOME}/etc/apps/Splunk_MCP_Server/local"
printf '[server]\nrequire_encrypted_token = false\nssl_verify = false\n' \
  > "${SPLUNK_HOME}/etc/apps/Splunk_MCP_Server/local/mcp.conf"

BOTS="${SPLUNK_HOME}/etc/apps/botsv3_data_set"
if [ ! -d "$BOTS" ]; then
  echo "==> Downloading + installing BOTS v3 (~320MB, pre-indexed)"
  TMP="$(mktemp -d)"
  curl -L --retry 3 -o "${TMP}/botsv3.tgz" \
    "https://botsdataset.s3.amazonaws.com/botsv3/botsv3_data_set.tgz"
  tar -xzf "${TMP}/botsv3.tgz" -C "${SPLUNK_HOME}/etc/apps/"
  rm -rf "$TMP"
else
  echo "==> BOTS v3 already installed"
fi

echo "==> Installing argus_response companion app"
cp -R "${REPO_DIR}/splunk/argus_response" "${SPLUNK_HOME}/etc/apps/"

echo "==> Restarting Splunk"
"$SPLUNK" restart >/dev/null

echo "==> Enabling token auth + minting an MCP token (audience=mcp)"
curl -sk -u "admin:${SPLUNK_PW}" -X POST \
  "${MGMT}/services/admin/token-auth/tokens_auth" -d disabled=false -o /dev/null
TOKEN=$(curl -sk -u "admin:${SPLUNK_PW}" -X POST "${MGMT}/services/authorization/tokens" \
  --data-urlencode name=admin --data-urlencode audience=mcp -d output_mode=json \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['entry'][0]['content']['token'])")

echo ""
echo "==> Done. Put this in your .env as SPLUNK_TOKEN:"
echo "SPLUNK_TOKEN=${TOKEN}"
echo ""
echo "Verify with: uv run argus check"
