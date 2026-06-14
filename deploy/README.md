# Argus VPS deployment

One Ubuntu 22.04 box (4 GB RAM, ~40 GB NVMe) co-locating **Splunk Enterprise**
(system of record + MCP server) with the **Argus FastAPI/SSE backend**. Caddy
terminates TLS for `api.tryargus.xyz` and streams SSE to the browser. Splunk's
`8089`/`8000` stay bound to localhost — only `80`/`443` are public.

```
  Vercel (Next.js)  ──HTTPS──►  api.tryargus.xyz
                                     │  Caddy :443 (TLS, flush_interval -1)
                                     ▼
                              argus serve :8010  (systemd: argus-backend)
                                     │  localhost
                                     ▼
                              Splunk :8089 (MCP) + KV store + BOTSv3
```

## Files
| File | Role |
|------|------|
| `push.sh` | Run on your Mac: rsync code + scp secrets, then run `provision.sh`. |
| `provision.sh` | Runs **on the VPS as root**: Splunk + apps + BOTS + token + backend + Caddy. |
| `Caddyfile` | TLS + SSE reverse proxy (`flush_interval -1`). |
| `argus-backend.service` | systemd unit for `argus serve` on `127.0.0.1:8010`. |
| `splunk/limits.conf`, `splunk/web.conf` | Low-memory tuning for the 4 GB box. |
| `vendor/` | Drop `splunk-mcp-server_*.tgz` here (Splunkbase app, not in git). |

## Prerequisites
1. VPS deployed: Ubuntu 22.04, **4 GB RAM**, **~40 GB NVMe**, SSH key `~/.ssh/id_ed25519`.
2. The **current Splunk Enterprise .deb URL** — grab the `wget` link from
   <https://www.splunk.com/en_us/download/splunk-enterprise.html> (Linux → .deb).

## Deploy
```bash
# from the repo root, on your Mac:
ARGUS_HOST=<vps-ip> ARGUS_USER=root \
SPLUNK_DEB_URL='<current .deb url>' \
API_DOMAIN=api.tryargus.xyz \
deploy/push.sh
```
Rsyncs the code, scp's `.env` (Bedrock creds) + the MCP app tarball, then
provisions everything and mints a fresh Splunk token straight into the backend
`.env`.

## DNS (after the box has a public IP)
In the **Vercel** dashboard (where `tryargus.xyz` lives), add one record:
```
A   api   <vps-ip>      (plain — no Vercel proxy/CDN on a raw A-record)
```
Caddy auto-issues a Let's Encrypt cert once it resolves.

## Verify
```bash
ssh -i ~/.ssh/id_ed25519 root@<vps-ip> 'curl -s localhost:8010/api/health | jq'
# expect: {"ok":true,"provider":"bedrock","mcp":"connected","mcp_tools":N,...}
curl -s https://api.tryargus.xyz/api/health | jq    # once DNS/TLS settle
```

## Frontend → Vercel (separate step)
Set the dashboard's API base to the backend **directly** (don't proxy SSE
through Vercel's rewrite — it buffers):
```
NEXT_PUBLIC_ARGUS_API=https://api.tryargus.xyz
```
Vercel project root dir = `web/`.

## Operating notes
- **Logs:** `journalctl -u argus-backend -e` · `journalctl -u caddy -e`
- **Restart backend:** `systemctl restart argus-backend`
- **Splunk is localhost-only.** To reach its UI/REST for debugging, SSH-tunnel:
  ```bash
  ssh -i ~/.ssh/id_ed25519 -L 8089:localhost:8089 -L 8000:localhost:8000 root@<vps-ip>
  ```
  (Splunk Web is **off** by default to save RAM — provision with `SPLUNK_WEB=1` to enable.)
- **Memory:** a 6 GB swapfile + capped search concurrency keep the 4 GB box stable.
  Watch with `free -h` and `journalctl -k | grep -i oom` during a live investigation.
