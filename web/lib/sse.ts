// A minimal SSE client built on fetch + ReadableStream. Unlike EventSource it
// supports POST bodies and AbortController cancellation — both of which the
// investigate/respond streams need. It parses the `data:` lines of each SSE
// frame and hands the decoded JSON to `onEvent`.

import type { ArgusEvent } from "./types";

export interface StreamHandle {
  /** Stop the stream and close the underlying connection. */
  abort: () => void;
  /** Resolves when the stream finishes (or is aborted). */
  done: Promise<void>;
}

export function streamSSE(
  url: string,
  body: unknown,
  onEvent: (ev: ArgusEvent) => void,
  onError?: (err: unknown) => void,
): StreamHandle {
  const controller = new AbortController();

  const done = (async () => {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`stream failed: ${resp.status} ${resp.statusText}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE frames are separated by a blank line; servers may use LF or CRLF
      // (sse-starlette uses CRLF). Match either form for both the frame
      // boundary and the per-line split. Each frame may have several `data:`
      // lines that concatenate into one payload.
      const boundary = /\r?\n\r?\n/;
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });

        let m: RegExpExecArray | null;
        while ((m = boundary.exec(buffer)) !== null) {
          const frame = buffer.slice(0, m.index);
          buffer = buffer.slice(m.index + m[0].length);
          const dataLines = frame
            .split(/\r?\n/)
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).replace(/^ /, ""));
          if (!dataLines.length) continue;
          const payload = dataLines.join("\n");
          try {
            onEvent(JSON.parse(payload) as ArgusEvent);
          } catch {
            // ignore keepalive / non-JSON frames
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") onError?.(err);
    }
  })();

  return { abort: () => controller.abort(), done };
}
