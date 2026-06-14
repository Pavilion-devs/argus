#!/usr/bin/env bash
set -euo pipefail
#
# Argus VPS provisioning — Ubuntu 22.04, single dedicated 4 GB box.
#
# Co-locates Splunk Enterprise (the system of record + MCP server) with the
# Argus FastAPI/SSE backend. Caddy terminates TLS for the public API host and
# streams Server-Sent Events to the browser. Splunk's 8089/8000 stay bound to
# localhost — only Caddy's 80/443 are exposed.
#
# Run AS ROOT on the VPS, from the rsync'd repo dir (default /opt/argus):
#   cd /opt/argus && sudo SPLUNK_DEB_URL='<current .deb url>' deploy/provision.sh
#
# Prerequisites (handled by deploy/push.sh):
#   - repo rsync'd to $APP_DIR
#   - $APP_DIR/.env present (Bedrock creds — scp'd, never committed)
#   - $APP_DIR/deploy/vendor/splunk-mcp-server_*.tgz present (Splunkbase app)
#
# Everything is parameterized via env vars with sane defaults.

# ---- Parameters -------------------------------------------------------------
APP_DIR="${APP_DIR:-/opt/argus}"
SPLUNK_HOME="${SPLUNK_HOME:-/opt/splunk}"
SPLUNK_PW="${SPLUNK_PW:-Changeme123!}"
API_DOMAIN="${API_DOMAIN:-api.tryargus.xyz}"
SWAP_GB="${SWAP_GB:-6}"
SPLUNK_WEB="${SPLUNK_WEB:-0}"   # 1 = keep Splunk Web (8000) on (costs ~400 MB RAM)
BIND_HOST="${BIND_HOST:-127.0.0.1}"   # 0.0.0.0 when an upstream HAProxy/LB must reach the backend
SPLUNK_DEB_URL="${SPLUNK_DEB_URL:?set SPLUNK_DEB_URL to the current Splunk Enterprise .deb — https://www.splunk.com/en_us/download/splunk-enterprise.html}"
MCP_APP="${MCP_APP:-$(ls "$APP_DIR"/deploy/vendor/splunk-mcp-server_*.tgz 2>/dev/null | head -1)}"
BOTS_URL="${BOTS_URL:-https://botsdataset.s3.amazonaws.com/botsv3/botsv3_data_set.tgz}"
SPLUNK="${SPLUNK_HOME}/bin/splunk"
MGMT="https://localhost:8089"

echo "==> Argus provisioning (APP_DIR=$APP_DIR, domain=$API_DOMAIN, swap=${SWAP_GB}G)"
[ "$(id -u)" -eq 0 ] || { echo "ERROR: run as root"; exit 1; }
[ -f "$APP_DIR/.env" ] || { echo "ERROR: $APP_DIR/.env missing — scp it first (Bedrock creds)"; exit 1; }

# Upsert a KEY=VALUE into a .env-style file (replace in place or append).
upsert_env() {
  local k="$1" v="$2" f="$3"
  if grep -q "^${k}=" "$f" 2>/dev/null; then
    sed -i "s|^${k}=.*|${k}=${v}|" "$f"
  else
    echo "${k}=${v}" >> "$f"
  fi
}

# ---- 1. Base packages -------------------------------------------------------
echo "==> apt: base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget acl ufw ca-certificates gnupg jq rsync

# ---- 2. Swap — OOM safety net on a 4 GB box --------------------------------
if ! swapon --show | grep -q '/swapfile'; then
  echo "==> Creating ${SWAP_GB}G swapfile on NVMe"
  fallocate -l "${SWAP_GB}G" /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_GB*1024))
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  echo "==> swap already present"
fi

# ---- 3. Firewall — only SSH + HTTP(S); Splunk stays internal ---------------
echo "==> ufw: allow 22/80/443"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable

# ---- 4. Splunk Enterprise ---------------------------------------------------
id -u splunk >/dev/null 2>&1 || useradd -r -d "$SPLUNK_HOME" splunk

if [ ! -x "$SPLUNK" ]; then
  echo "==> Downloading + installing Splunk Enterprise"
  wget -q -O /tmp/splunk.deb "$SPLUNK_DEB_URL"
  dpkg -i /tmp/splunk.deb || apt-get install -f -y
  rm -f /tmp/splunk.deb

  echo "==> Seeding admin credentials"
  mkdir -p "${SPLUNK_HOME}/etc/system/local"
  cat > "${SPLUNK_HOME}/etc/system/local/user-seed.conf" <<EOF
[user_info]
USERNAME = admin
PASSWORD = ${SPLUNK_PW}
EOF
fi

# Low-memory tuning + raise file descriptors (before first start).
echo "==> Splunk low-memory tuning"
mkdir -p "${SPLUNK_HOME}/etc/system/local"
cp "$APP_DIR/deploy/splunk/limits.conf" "${SPLUNK_HOME}/etc/system/local/limits.conf"
if [ "$SPLUNK_WEB" = "1" ]; then
  rm -f "${SPLUNK_HOME}/etc/system/local/web.conf"
else
  cp "$APP_DIR/deploy/splunk/web.conf" "${SPLUNK_HOME}/etc/system/local/web.conf"
fi
cat > /etc/security/limits.d/99-splunk.conf <<'EOF'
splunk soft nofile 64000
splunk hard nofile 64000
splunk soft nproc 16000
splunk hard nproc 16000
EOF
chown -R splunk:splunk "$SPLUNK_HOME"

if ! sudo -u splunk "$SPLUNK" status >/dev/null 2>&1; then
  echo "==> Starting Splunk (first run: accept license, apply seed)"
  sudo -u splunk "$SPLUNK" start --accept-license --answer-yes --no-prompt
fi
"$SPLUNK" enable boot-start -user splunk >/dev/null 2>&1 || true

# ---- 5. Splunk MCP Server app ----------------------------------------------
if [ ! -d "${SPLUNK_HOME}/etc/apps/Splunk_MCP_Server" ]; then
  echo "==> Installing Splunk MCP Server app"
  [ -n "$MCP_APP" ] && [ -f "$MCP_APP" ] || { echo "ERROR: MCP app tarball missing under $APP_DIR/deploy/vendor/"; exit 1; }
  sudo -u splunk "$SPLUNK" install app "$MCP_APP" -update 1 -auth "admin:${SPLUNK_PW}"
fi
echo "==> Configuring MCP server (allow plaintext bearer tokens, local)"
mkdir -p "${SPLUNK_HOME}/etc/apps/Splunk_MCP_Server/local"
printf '[server]\nrequire_encrypted_token = false\nssl_verify = false\n' \
  > "${SPLUNK_HOME}/etc/apps/Splunk_MCP_Server/local/mcp.conf"
chown -R splunk:splunk "${SPLUNK_HOME}/etc/apps/Splunk_MCP_Server"

# ---- 6. Argus companion app (KV collections, saved searches, alert action) -
echo "==> Installing argus_response app"
rm -rf "${SPLUNK_HOME}/etc/apps/argus_response"
cp -R "${APP_DIR}/splunk/argus_response" "${SPLUNK_HOME}/etc/apps/"
chown -R splunk:splunk "${SPLUNK_HOME}/etc/apps/argus_response"

# ---- 7. BOTSv3 dataset (pre-indexed — drop-in, no re-ingest) ---------------
BOTS_DIR="${SPLUNK_HOME}/etc/apps/botsv3_data_set"
if [ ! -d "$BOTS_DIR" ]; then
  echo "==> Downloading BOTSv3 (~335 MB, pre-indexed) from S3"
  wget -q -O /tmp/botsv3.tgz "$BOTS_URL"
  tar -xzf /tmp/botsv3.tgz -C "${SPLUNK_HOME}/etc/apps/"
  rm -f /tmp/botsv3.tgz
  chown -R splunk:splunk "$BOTS_DIR"
else
  echo "==> BOTSv3 already present"
fi

echo "==> Restarting Splunk to load apps"
sudo -u splunk "$SPLUNK" restart >/dev/null

# ---- 8. Token auth + mint MCP token, wire into the backend .env ------------
# splunkd's REST/auth layer is not ready the instant `restart` returns — poll
# server/info until it answers 200 before minting, then retry the mint itself.
echo "==> Waiting for splunkd REST to be ready"
code=""
for _ in $(seq 1 40); do
  code=$(curl -sk -o /dev/null -w '%{http_code}' -u "admin:${SPLUNK_PW}" "${MGMT}/services/server/info?output_mode=json" || true)
  [ "$code" = "200" ] && break
  sleep 3
done
[ "$code" = "200" ] || { echo "ERROR: splunkd REST not ready (last=$code)"; exit 1; }

echo "==> Enabling token auth + minting MCP token (audience=mcp)"
curl -sk -u "admin:${SPLUNK_PW}" -X POST \
  "${MGMT}/services/admin/token-auth/tokens_auth" -d disabled=false -o /dev/null
TOKEN=""
for _ in $(seq 1 10); do
  TOKEN=$(curl -sk -u "admin:${SPLUNK_PW}" -X POST "${MGMT}/services/authorization/tokens" \
    --data-urlencode name=admin --data-urlencode audience=mcp -d output_mode=json \
    | jq -r '.entry[0].content.token')
  [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && break
  sleep 3
done
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] || { echo "ERROR: token mint failed"; exit 1; }

upsert_env SPLUNK_TOKEN      "$TOKEN"                                  "$APP_DIR/.env"
upsert_env SPLUNK_MCP_URL    "https://localhost:8089/services/mcp"     "$APP_DIR/.env"
upsert_env SPLUNK_VERIFY_SSL "false"                                   "$APP_DIR/.env"
upsert_env SPLUNK_PASSWORD   "$SPLUNK_PW"                              "$APP_DIR/.env"

# ---- 9. Argus backend (uv manages Python 3.12) -----------------------------
echo "==> Installing uv + syncing backend deps"
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
export PATH="$HOME/.local/bin:$PATH"
cd "$APP_DIR"
uv sync --no-dev --python 3.12   # pin: uv would otherwise grab the newest CPython (>=3.12)

echo "==> Installing + starting argus-backend.service (bind ${BIND_HOST})"
sed "s|--host 127.0.0.1|--host ${BIND_HOST}|" \
  "$APP_DIR/deploy/argus-backend.service" > /etc/systemd/system/argus-backend.service
systemctl daemon-reload
systemctl enable --now argus-backend

# ---- 10. Caddy — TLS + SSE reverse proxy -----------------------------------
# Skipped (SKIP_CADDY=1) when public ingress is handled upstream — e.g. a
# provider HAProxy fronting a NAT'd box that owns 80/443 on the shared IP.
if [ "${SKIP_CADDY:-0}" = "1" ]; then
  echo "==> Skipping Caddy (SKIP_CADDY=1) — ingress handled upstream"
else
if ! command -v caddy >/dev/null 2>&1; then
  echo "==> Installing Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
fi
echo "==> Writing Caddyfile for ${API_DOMAIN}"
sed "s/__API_DOMAIN__/${API_DOMAIN}/g" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl reload caddy 2>/dev/null || systemctl restart caddy
fi

# ---- 11. Health check -------------------------------------------------------
echo "==> Waiting for backend health (it boots in a few seconds)"
for _ in $(seq 1 20); do
  sleep 2
  curl -sf -m 10 http://127.0.0.1:8010/api/health >/dev/null 2>&1 && break
done
curl -s http://127.0.0.1:8010/api/health | jq . || echo "(backend not responding yet — check: journalctl -u argus-backend -e)"

cat <<EOF

==> Done.
   • Backend:  http://127.0.0.1:8010  (systemd: argus-backend)
   • Splunk:   https://127.0.0.1:8089 (localhost-only; Web $([ "$SPLUNK_WEB" = 1 ] && echo on || echo off))
   • Public:   https://${API_DOMAIN}  (once DNS + TLS settle)

   NEXT: add an A-record  ${API_DOMAIN} -> $(curl -s ifconfig.me 2>/dev/null || echo '<this box public IP>')
         in the Vercel DNS dashboard. Caddy auto-issues TLS once it resolves.
EOF
