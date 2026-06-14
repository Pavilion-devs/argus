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
