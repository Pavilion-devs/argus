export type DocPage = {
  title: string;
  slug: string;
  summary: string;
};

export type DocGroup = {
  title: string;
  items: DocPage[];
};

/** Sidebar structure. Drives the sidebar, ⌘K search, and prev/next footer. */
export const docsNav: DocGroup[] = [
  {
    title: "Getting started",
    items: [
      {
        title: "Overview",
        slug: "/docs",
        summary: "What Argus is and its one rule: every verdict grounded in real Splunk evidence.",
      },
      {
        title: "Quickstart",
        slug: "/docs/quickstart",
        summary: "Run your first grounded investigation on BOTS v3 in a few minutes.",
      },
      {
        title: "Installation & setup",
        slug: "/docs/setup",
        summary: "Python and uv, the model provider, and connecting the Splunk MCP Server.",
      },
    ],
  },
  {
    title: "Core concepts",
    items: [
      {
        title: "How Argus works",
        slug: "/docs/how-it-works",
        summary: "The plan, act, observe, re-plan investigation loop.",
      },
      {
        title: "Grounding & evidence",
        slug: "/docs/grounding",
        summary: "Every claim links to the exact SPL and the exact events behind it.",
      },
    ],
  },
  {
    title: "Using Argus",
    items: [
      {
        title: "CLI reference",
        slug: "/docs/cli",
        summary: "investigate, multi-agent mode, gated response, detections, and the Argus MCP server.",
      },
      {
        title: "Response & containment",
        slug: "/docs/response",
        summary: "The gated write path: blocklist, cases, detection-as-code, and approval.",
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        title: "Splunk MCP Server",
        slug: "/docs/integrations/splunk-mcp",
        summary: "The read path. Argus runs all investigation SPL through the MCP Server.",
      },
      {
        title: "Splunk REST & KV-store",
        slug: "/docs/integrations/splunk-rest",
        summary: "The write path: KV collections and the blocklist-enforcement correlation search.",
      },
      {
        title: "Splunk alert action",
        slug: "/docs/integrations/alert-action",
        summary: "Trigger an Argus investigation from any Splunk saved search.",
      },
      {
        title: "Argus MCP server",
        slug: "/docs/integrations/argus-mcp",
        summary: "Expose Argus as MCP tools so other SOC copilots can call it.",
      },
      {
        title: "Threat intel",
        slug: "/docs/integrations/threat-intel",
        summary: "Live indicator enrichment with AbuseIPDB, VirusTotal, and ip-api.",
      },
    ],
  },
  {
    title: "Reference",
    items: [
      {
        title: "Configuration",
        slug: "/docs/configuration",
        summary: "Environment variables for the model provider, Splunk, and threat intel.",
      },
      {
        title: "Evaluation",
        slug: "/docs/evaluation",
        summary: "The benchmark, metrics, and results: measured honestly, not asserted.",
      },
    ],
  },
  {
    title: "Resources",
    items: [
      {
        title: "Architecture",
        slug: "/docs/architecture",
        summary: "The full end-to-end Argus architecture, in one diagram.",
      },
    ],
  },
];

/** Flattened, ordered list for prev/next navigation and search. */
export const flatDocs = docsNav.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.title })),
);
