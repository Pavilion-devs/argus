"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { api } from "@/lib/api";
import { verdictStyle } from "@/lib/format";
import type { DetectionRunResult, SplunkAlertJob } from "@/lib/types";

function StatusPill({ status }: { status: SplunkAlertJob["status"] }) {
  const map = {
    queued: { cls: "border-threat-medium/30 bg-threat-medium/10 text-threat-medium", icon: "solar:hourglass-linear" },
    running: { cls: "border-primary/30 bg-primary/10 text-primary-bright", icon: "solar:pulse-linear" },
    done: { cls: "border-confirm/30 bg-confirm/10 text-confirm", icon: "solar:check-circle-linear" },
    error: { cls: "border-refute/30 bg-refute/10 text-refute", icon: "solar:close-circle-linear" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${map.cls}`}>
      <Icon icon={map.icon} className="h-3.5 w-3.5" /> {status}
    </span>
  );
}

function AlertJobCard({ job }: { job: SplunkAlertJob }) {
  const report = job.report;
  const v = report ? verdictStyle(report.verdict) : null;
  return (
    <div className="rounded-xl border border-line/70 bg-surface-100/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={job.status} />
        {v && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${v.cls}`}>
            <Icon icon={v.icon} className="h-3.5 w-3.5" /> {v.label}
          </span>
        )}
        {report?.risk_score != null && <span className="chip tnum !py-0.5 text-[11px]">risk {report.risk_score}</span>}
      </div>
      <div className="mt-2 min-w-0">
        <div className="truncate text-sm font-medium text-zinc-100" title={job.search_name ?? ""}>
          {job.search_name || "Splunk alert job"}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[10px] text-zinc-600">
          <span>{job.job_id}</span>
          {job.sid && <span>sid={job.sid}</span>}
          {job.case_id && <span className="text-primary-bright">case={job.case_id}</span>}
        </div>
      </div>
      {report?.title && <p className="mt-3 text-[12px] leading-snug text-zinc-300">{report.title}</p>}
      {job.error && <p className="mt-3 text-[12px] leading-snug text-refute">{job.error}</p>}
    </div>
  );
}

function DetectionRunCard({ run }: { run: DetectionRunResult["runs"][number] }) {
  const matched = (run.match_count ?? 0) > 0;
  return (
    <div className={`rounded-xl border p-4 ${matched ? "border-confirm/30 bg-confirm/[0.06]" : "border-line/70 bg-surface-100/40"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon icon={matched ? "solar:shield-check-linear" : "solar:code-square-linear"} className={`h-4 w-4 ${matched ? "text-confirm" : "text-primary-bright"}`} />
            <h3 className="truncate text-sm font-medium text-zinc-100" title={run.name}>
              {run.name.replace(/^Argus - Auto:\s*/, "")}
            </h3>
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-600">
            {run.earliest ?? "default"} → {run.latest ?? "now"}
          </div>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${matched ? "border-confirm/30 text-confirm" : "border-line text-zinc-500"}`}>
          {run.match_count ?? 0} match{run.match_count === 1 ? "" : "es"}
        </span>
      </div>
      {run.error && <p className="mt-2 text-[12px] text-refute">{run.error}</p>}
      {run.matches && run.matches.length > 0 && (
        <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line/70 bg-ink/60 p-3 font-mono text-[10px] leading-relaxed text-zinc-300">
          {JSON.stringify(run.matches.slice(0, 3), null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function ProofPanel() {
  const [jobs, setJobs] = useState<SplunkAlertJob[]>([]);
  const [jobErr, setJobErr] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [filter, setFilter] = useState("web_admin");
  const [earliest, setEarliest] = useState("0");
  const [latest, setLatest] = useState("now");
  const [runs, setRuns] = useState<DetectionRunResult | null>(null);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const refreshJobs = () => {
    setJobsLoading(true);
    api
      .alertJobs()
      .then((d) => {
        setJobs(d.jobs ?? []);
        setJobErr(d.error ?? null);
      })
      .catch((e) => setJobErr(String(e)))
      .finally(() => setJobsLoading(false));
  };

  useEffect(() => {
    refreshJobs();
    const id = setInterval(refreshJobs, 5000);
    return () => clearInterval(id);
  }, []);

  const runDetections = () => {
    setRunning(true);
    setRunErr(null);
    api
      .runDetections({ name: filter.trim(), earliest: earliest.trim(), latest: latest.trim(), limit: 5 })
      .then(setRuns)
      .catch((e) => setRunErr(String(e)))
      .finally(() => setRunning(false));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:inbox-in-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Splunk alert jobs</span>
            <span className="text-[11px] text-zinc-600">· current bridge process</span>
          </div>
          <button onClick={refreshJobs} className="rounded-lg border border-line p-1.5 text-zinc-400 transition-colors hover:text-white">
            <Icon icon="solar:refresh-linear" className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-h-[42rem] flex-col gap-3 overflow-y-auto p-3">
          {jobsLoading && (
            <div className="flex items-center gap-2 p-4 text-sm text-zinc-600">
              <Icon icon="solar:spinner-linear" className="h-4 w-4 animate-spin-slow" /> loading alert jobs…
            </div>
          )}
          {!jobsLoading && jobs.length === 0 && (
            <div className="p-4 text-sm leading-relaxed text-zinc-500">
              No alert-action jobs are active in this Argus bridge process. Fire the packaged Splunk
              alert action or use the manual curl from the docs, then this panel will update.
            </div>
          )}
          {jobErr && <div className="p-4 text-sm text-refute">{jobErr}</div>}
          {jobs.map((j) => (
            <AlertJobCard key={j.job_id} job={j} />
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Icon icon="solar:shield-check-linear" className="h-4 w-4 text-primary-bright" />
            <span className="text-sm font-medium text-zinc-200">Detection proof</span>
            <span className="text-[11px] text-zinc-600">· run Argus detections now</span>
          </div>
          {runs && <span className="chip tnum">{runs.detections_matched}/{runs.detections_checked} matched</span>}
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-zinc-500">Name filter</span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-primary/50"
                placeholder="AWS, web_admin…"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-zinc-500">Earliest</span>
              <input
                value={earliest}
                onChange={(e) => setEarliest(e.target.value)}
                className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-primary/50"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] uppercase tracking-wider text-zinc-500">Latest</span>
              <input
                value={latest}
                onChange={(e) => setLatest(e.target.value)}
                className="w-full rounded-xl border border-line bg-ink/50 px-3 py-2 font-mono text-sm text-zinc-200 outline-none focus:border-primary/50"
              />
            </label>
          </div>
          <button onClick={runDetections} disabled={running} className="btn-primary w-full justify-center disabled:opacity-60">
            <Icon icon={running ? "solar:spinner-linear" : "solar:play-circle-linear"} className={`h-5 w-5 ${running ? "animate-spin-slow" : ""}`} />
            Run detections through MCP
          </button>
          {runErr && <div className="rounded-lg border border-refute/30 bg-refute/[0.06] p-3 text-sm text-refute">{runErr}</div>}
          {runs && (
            <div className="flex flex-col gap-3">
              {runs.runs.length === 0 && <div className="text-sm text-zinc-500">No deployed detections matched that filter.</div>}
              {runs.runs.map((r) => (
                <DetectionRunCard key={r.name} run={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
