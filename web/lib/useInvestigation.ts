"use client";

import { useCallback, useReducer, useRef } from "react";
import { API_BASE, postDecision } from "./api";
import { streamSSE, type StreamHandle } from "./sse";
import type {
  AgentName,
  ArgusEvent,
  Hypothesis,
  Recall,
  Report,
} from "./types";

export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  agent: AgentName;
  result?: { text: string; is_error: boolean };
  seq: number;
}

export interface ResponseAction {
  action_id?: string;
  desc: string;
  input?: Record<string, unknown>;
  status: "proposed" | "executed" | "skipped";
  result?: Record<string, unknown>;
  name?: string;
}

export interface ResponseState {
  status: "idle" | "running" | "done" | "error";
  streamId?: string;
  caseId?: string;
  caseKey?: string;
  actions: ResponseAction[];
  summary?: string;
}

export interface InvestigationState {
  status: "idle" | "running" | "done" | "error";
  mode: "single" | "multi";
  startedAt?: number;
  finishedAt?: number;
  lastEventAt?: number;
  // reasoning (keyed by agent; "" = single agent / orchestrator)
  thinking: Record<string, string>;
  answer: Record<string, string>;
  specialists: Record<string, "running" | "done">;
  activeAgents: AgentName[];
  // SPL / tool feed
  toolCalls: ToolCallRecord[];
  // ledgers
  hypotheses: Record<string, Hypothesis>;
  recalls: Recall[];
  continuation?: { reason: string; verdict: string; confidence: number };
  // result
  report?: Report;
  error?: string;
  response: ResponseState;
}

function initial(): InvestigationState {
  return {
    status: "idle",
    mode: "single",
    thinking: {},
    answer: {},
    specialists: {},
    activeAgents: [""],
    toolCalls: [],
    hypotheses: {},
    recalls: [],
    response: { status: "idle", actions: [] },
  };
}

export function useInvestigation() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const ref = useRef<InvestigationState>(initial());
  const seq = useRef(0);
  const toolIndex = useRef<Record<string, ToolCallRecord>>({});
  const handle = useRef<StreamHandle | null>(null);
  const respHandle = useRef<StreamHandle | null>(null);
  const raf = useRef<number | null>(null);

  // rAF-batch renders so token-by-token deltas don't thrash React.
  const render = useCallback(() => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      force();
    });
  }, []);

  const apply = useCallback(
    (ev: ArgusEvent) => {
      const s = ref.current;
      s.lastEventAt = Date.now();
      switch (ev.type) {
        case "multi_start":
          s.mode = "multi";
          s.activeAgents = ev.agents;
          ev.agents.forEach((a) => (s.specialists[a] = "running"));
          break;
        case "specialist_started":
          s.specialists[ev.agent] = "running";
          break;
        case "specialist_done":
          s.specialists[ev.agent] = "done";
          break;
        case "thinking":
          s.thinking[ev.agent] = (s.thinking[ev.agent] ?? "") + ev.text;
          break;
        case "text":
          s.answer[ev.agent] = (s.answer[ev.agent] ?? "") + ev.text;
          break;
        case "tool_call": {
          const rec: ToolCallRecord = {
            id: ev.id,
            name: ev.name,
            input: ev.input,
            agent: ev.agent,
            seq: seq.current++,
          };
          toolIndex.current[ev.id] = rec;
          s.toolCalls.push(rec);
          break;
        }
        case "tool_result": {
          const rec = toolIndex.current[ev.id];
          if (rec) rec.result = { text: ev.text, is_error: ev.is_error };
          break;
        }
        case "recall":
          s.recalls.push(ev.recall);
          break;
        case "hypothesis":
          if (ev.hypothesis?.id) s.hypotheses[ev.hypothesis.id] = ev.hypothesis;
          break;
        case "continuation":
          s.continuation = { reason: ev.reason, verdict: ev.verdict, confidence: ev.confidence };
          break;
        case "report":
          s.report = ev.report;
          // The engine reconciles still-open hypotheses at synthesis; those final
          // confirmed/refuted statuses ride in report.hypotheses and are NOT
          // re-emitted as hypothesis events. Merge them so the ledger shows the
          // resolved verdict, not the mid-run guess.
          for (const h of ev.report.hypotheses ?? []) {
            if (h?.id) s.hypotheses[h.id] = { ...s.hypotheses[h.id], ...h };
          }
          break;
        case "done":
          s.status = "done";
          s.finishedAt = Date.now();
          break;
        case "error":
          s.status = "error";
          s.error = ev.text;
          break;
        case "stream_end":
          if (s.status === "running") {
            s.status = s.report ? "done" : "error";
            s.finishedAt = Date.now();
          }
          break;
        default:
          break;
      }
      render();
    },
    [render],
  );

  const run = useCallback(
    (alert: string, opts: { multi?: boolean; maxTurns?: number } = {}) => {
      handle.current?.abort();
      ref.current = initial();
      ref.current.status = "running";
      ref.current.mode = opts.multi ? "multi" : "single";
      ref.current.startedAt = Date.now();
      ref.current.activeAgents = opts.multi ? [] : [""];
      seq.current = 0;
      toolIndex.current = {};
      force();
      handle.current = streamSSE(
        `${API_BASE}/api/investigate`,
        { alert, multi: !!opts.multi, max_turns: opts.maxTurns ?? 12 },
        apply,
        (err) => {
          ref.current.status = "error";
          ref.current.error = String(err);
          force();
        },
      );
    },
    [apply],
  );

  const stop = useCallback(() => {
    handle.current?.abort();
    respHandle.current?.abort();
    if (ref.current.status === "running") ref.current.status = "done";
    force();
  }, []);

  // ---- Response phase ----
  const applyResponse = useCallback(
    (ev: ArgusEvent) => {
      const r = ref.current.response;
      switch (ev.type) {
        case "stream_open":
          if (ev.stream_id) r.streamId = ev.stream_id;
          break;
        case "case_created":
          r.caseId = ev.case_id;
          r.caseKey = ev.key;
          break;
        case "action_proposed":
          r.actions.push({
            action_id: ev.action_id,
            desc: ev.desc,
            input: ev.input,
            status: "proposed",
          });
          break;
        case "action_executed": {
          // Match by desc regardless of status — decide() may have optimistically
          // flipped it already — so we finalize in place instead of duplicating.
          const a = r.actions.find((x) => x.desc === ev.desc);
          if (a) {
            a.status = "executed";
            a.result = ev.result;
            a.name = ev.action;
          } else {
            r.actions.push({ desc: ev.desc, status: "executed", result: ev.result, name: ev.action });
          }
          break;
        }
        case "action_skipped": {
          const a = r.actions.find((x) => x.desc === ev.desc);
          if (a) {
            a.status = "skipped";
            a.name = ev.action;
          } else {
            r.actions.push({ desc: ev.desc, status: "skipped", name: ev.action });
          }
          break;
        }
        case "response_done":
          r.summary = ev.summary;
          r.status = "done";
          break;
        case "error":
          r.status = "error";
          break;
        case "stream_end":
          if (r.status === "running") r.status = "done";
          break;
        default:
          break;
      }
      render();
    },
    [render],
  );

  const respond = useCallback(
    (mode: "approve" | "auto" = "approve") => {
      const report = ref.current.report;
      if (!report) return;
      respHandle.current?.abort();
      ref.current.response = { status: "running", actions: [] };
      force();
      respHandle.current = streamSSE(
        `${API_BASE}/api/respond`,
        { report, mode },
        applyResponse,
        () => {
          ref.current.response.status = "error";
          force();
        },
      );
    },
    [applyResponse],
  );

  const decide = useCallback(async (actionId: string, approved: boolean) => {
    const r = ref.current.response;
    const a = r.actions.find((x) => x.action_id === actionId);
    if (a) {
      // optimistic: the authoritative executed/skipped event will follow
      a.status = approved ? "executed" : "skipped";
      force();
    }
    if (r.streamId) await postDecision(r.streamId, actionId, approved);
  }, []);

  return { state: ref.current, run, stop, respond, decide };
}
