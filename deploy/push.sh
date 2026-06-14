#!/usr/bin/env bash
set -euo pipefail
#
# Push the repo + secrets to the VPS and run provisioning. Run on your Mac from
# the repo root.
#
# Usage (this deployment — root login on the NAT'd box, SSH on 3722):
#   ARGUS_HOST=51.68.206.58 ARGUS_USER=root SSH_PORT=3722 SUDO= SKIP_CADDY=1 \
#   SPLUNK_DEB_URL='<current Splunk .deb url>' API_DOMAIN=api.tryargus.xyz \
#   deploy/push.sh
#
: "${ARGUS_HOST:?set ARGUS_HOST to the VPS public IP}"
: "${SPLUNK_DEB_URL:?set SPLUNK_DEB_URL — https://www.splunk.com/en_us/download/splunk-enterprise.html (Linux .deb wget link)}"
ARGUS_USER="${ARGUS_USER:-root}"
API_DOMAIN="${API_DOMAIN:-api.tryargus.xyz}"
APP_DIR="${APP_DIR:-/opt/argus}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
SSH_PORT="${SSH_PORT:-22}"
SUDO="${SUDO-sudo}"   # set SUDO= (empty) when logging in as root
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ARGUS_USER}@${ARGUS_HOST}"
SSH="ssh -i $SSH_KEY -p $SSH_PORT -o StrictHostKeyChecking=accept-new $DEST"

echo "==> Preparing $APP_DIR on $DEST"
$SSH "$SUDO mkdir -p $APP_DIR/deploy/vendor && $SUDO chown -R \$(id -un):\$(id -gn) $APP_DIR && (command -v rsync >/dev/null || ($SUDO apt-get update -qq && $SUDO apt-get install -y -qq rsync))"

echo "==> rsync code (excluding venvs, node_modules, build output, big tarballs)"
rsync -az --delete -e "ssh -i $SSH_KEY -p $SSH_PORT" \
  --exclude '.git' --exclude '.venv' --exclude 'node_modules' \
  --exclude 'web/.next' --exclude '__pycache__' --exclude '*.pyc' \
  --exclude 'splunk/apps/*.tgz' --exclude 'data/cases' \
  "$REPO/" "$DEST:$APP_DIR/"

echo "==> scp secrets (.env) + the Splunkbase MCP app (not in git)"
scp -i "$SSH_KEY" -P "$SSH_PORT" "$REPO/.env" "$DEST:$APP_DIR/.env"
scp -i "$SSH_KEY" -P "$SSH_PORT" "$REPO"/splunk/apps/splunk-mcp-server_*.tgz "$DEST:$APP_DIR/deploy/vendor/"

echo "==> Running provision.sh on the VPS"
$SSH "cd $APP_DIR && $SUDO env SPLUNK_DEB_URL='$SPLUNK_DEB_URL' API_DOMAIN='$API_DOMAIN' SKIP_CADDY='${SKIP_CADDY:-0}' SPLUNK_WEB='${SPLUNK_WEB:-0}' SWAP_GB='${SWAP_GB:-6}' bash deploy/provision.sh"
