# Detection-As-Code Proof

Argus does not stop at a report. For confirmed true positives, the response
phase can deploy a new read-only Splunk saved search that catches the same
behavior in the future.

This doc covers the proof path: validate before saving, list what Argus wrote,
then run those detections on demand.

## What Changed

`ResponseEngine.deploy_detection()` now performs two checks before saving:

1. Static safety check: rejects mutating SPL commands such as `outputlookup`,
   `delete`, `collect`, or script execution.
2. MCP dry-run: executes the generated SPL through the Splunk MCP Server with a
   small row limit. If Splunk rejects the search, Argus refuses to deploy it.

The deployment result includes a `dry_run` block so the UI/API/CLI can show that
the generated detection was actually accepted by Splunk.

## List Deployed Detections

```bash
uv run argus detections
```

## Run Deployed Detections Now

```bash
uv run argus detections --run
```

Filter by name/description:

```bash
uv run argus detections --run --name AWS
```

Override the time window:

```bash
uv run argus detections --run --earliest 0 --latest now
```

The same proof path is available over the API:

```bash
curl -s 'http://127.0.0.1:8010/api/detections/run?name=AWS&earliest=0&latest=now'
```

and through the Argus MCP server as `argus_run_detections`.

It is also visible in the dashboard under **SOC proof**, where an operator can
run Argus-authored detections through MCP and inspect returned match rows.

## Demo Beat

1. Run an investigation with response enabled.
2. Approve the `deploy_detection` action.
3. Show the response result includes `dry_run.checked=true` and `dry_run.ok=true`.
4. Run `uv run argus detections`.
5. Run `uv run argus detections --run --earliest 0`.
6. Show returned matches on the BOTS data.
