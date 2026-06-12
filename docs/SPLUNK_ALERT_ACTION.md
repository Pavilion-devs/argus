# Splunk Alert Action Integration

Argus can be called directly from Splunk saved searches through the companion
`argus_response` app.

This creates the SOC-native demo path:

```text
Splunk saved search fires
  -> "Investigate with Argus" custom alert action
  -> argus serve webhook
  -> Argus investigates through the Splunk MCP Server
  -> Argus records a case in Splunk KV store
  -> optional auto-response writes blocklist/detections/tickets
```

## Requirements

- `argus serve` running where Splunk can reach it.
- The `splunk/argus_response` app installed in Splunk.
- `SPLUNK_TOKEN` configured for Argus, with MCP audience for investigation.
- Optional: `ARGUS_ALERT_TOKEN` in Argus and the same token configured on the
  Splunk alert action.

## Run Argus

```bash
uv run argus serve --host 127.0.0.1 --port 8010
```

If Splunk runs on another machine/container, bind to an address Splunk can reach
and configure the alert action URL accordingly.

## Install / Reload The Splunk App

```bash
cp -R splunk/argus_response $SPLUNK_HOME/etc/apps/
$SPLUNK_HOME/bin/splunk restart
```

The app provides:

- KV-store collections for cases and blocklist entries.
- Lookup definitions for those collections.
- `Argus - Threat Blocklist Enforcement`, the blocklist enforcement search.
- `Argus - Demo: AWS Credential Abuse Notable`, a disabled demo saved search.
- `Investigate with Argus`, a custom alert action.

## Configure A Saved Search

The packaged demo search is already wired:

```ini
action.argus_investigate = 1
action.argus_investigate.param.argus_url = http://127.0.0.1:8010/api/splunk/alert
action.argus_investigate.param.auto_respond = 0
action.argus_investigate.param.multi = 0
action.argus_investigate.param.max_turns = 8
```

For another saved search, add the same action fields. If `ARGUS_ALERT_TOKEN` is
set in Argus, also set:

```ini
action.argus_investigate.param.argus_token = <same token>
```

## Verify The Webhook Manually

```bash
curl -s http://127.0.0.1:8010/api/splunk/alert \
  -H 'Content-Type: application/json' \
  -d '{
    "search_name": "manual smoke test",
    "result": {
      "sourceIPAddress": "139.198.18.205",
      "userIdentity.userName": "web_admin",
      "count": "637"
    },
    "max_turns": 8
  }'
```

Argus returns a `job_id` immediately. Check status:

```bash
curl -s http://127.0.0.1:8010/api/splunk/alert/<job_id>
```

When the job finishes, the response includes the grounded report and a case id.
The recorded case is also visible through:

```bash
uv run argus cases
```

or the dashboard's Memory tab.

Alert-action jobs for the current Argus bridge process are visible in the
dashboard's **SOC proof** tab.

## Demo Beat

For the video, the clean sequence is:

1. Show the saved search in Splunk with the `Investigate with Argus` alert action.
2. Trigger/run the search.
3. Show Argus accepting the alert job.
4. Show the dashboard or CLI case memory with the resulting grounded case.
5. Open the report and click evidence to show the SPL/events behind the verdict.
