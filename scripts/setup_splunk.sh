#!/usr/bin/env bash
set -euo pipefail
#
# Installs the Splunk MCP Server app and the BOTS v3 dataset into the running
# argus-splunk container, restarts Splunk, and verifies.
#
# Prereqs (download into ./splunk/apps first):
#   - Splunk MCP Server  (Splunkbase app 7931)  ->  ./splunk/apps/*.tgz|*.spl
#   - BOTS v3 dataset     (github.com/splunk/botsv3)  ->  ./splunk/apps/botsv3.tgz
#
CONTAINER="argus-splunk"
PASS="${SPLUNK_PASSWORD:-Changeme123!}"
APPS_DIR="./splunk/apps"

echo "==> Checking container '${CONTAINER}' is running..."
docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$" || {
  echo "ERROR: ${CONTAINER} is not running. Start it with: docker compose up -d"; exit 1; }

shopt -s nullglob
pkgs=("${APPS_DIR}"/*.tgz "${APPS_DIR}"/*.spl)
if [ ${#pkgs[@]} -eq 0 ]; then
  echo "ERROR: No app packages found in ${APPS_DIR}/"
  echo "  - Splunk MCP Server (Splunkbase app 7931) -> ${APPS_DIR}/"
  echo "  - BOTS v3 (https://github.com/splunk/botsv3) -> ${APPS_DIR}/botsv3.tgz"
  exit 1
fi

for pkg in "${pkgs[@]}"; do
  base="$(basename "$pkg")"
  echo "==> Installing ${base} ..."
  # Normal Splunk apps install cleanly via the CLI. Pre-indexed dataset apps
  # (like BOTS) are simply extracted into etc/apps instead.
  if ! docker exec "${CONTAINER}" /opt/splunk/bin/splunk install app \
        "/tmp/argus-apps/${base}" -update 1 -auth "admin:${PASS}"; then
    echo "    CLI install failed for ${base}; extracting into etc/apps instead..."
    docker exec "${CONTAINER}" bash -lc "tar -xzf /tmp/argus-apps/${base} -C /opt/splunk/etc/apps/"
  fi
done

echo "==> Restarting Splunk (this takes a minute)..."
docker exec "${CONTAINER}" /opt/splunk/bin/splunk restart

echo "==> Verifying BOTS v3 data is searchable..."
docker exec "${CONTAINER}" /opt/splunk/bin/splunk search \
  'index=botsv3 earliest=0 | stats count' -auth "admin:${PASS}" -maxout 1 \
  || echo "    (could not confirm botsv3 yet — check Splunk Web)"

echo ""
echo "==> Done."
echo "    Splunk Web : http://localhost:8000   (admin / ${PASS})"
echo "    MCP endpoint: https://localhost:8089/services/mcp"
echo "    NEXT: create an auth token (Settings > Tokens) and put it in .env as SPLUNK_TOKEN"
