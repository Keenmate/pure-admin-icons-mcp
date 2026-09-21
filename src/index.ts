#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.ICONS_API || "https://icons.pureadmin.io";

// Rewrites the public /icons/{set}/{style}/{filename} path used in search
// result URLs to /api/download/{set}/{style}/{filename}, which serves the
// same SVG but also records the download in icons.pureadmin.io stats.
// Passes through anything that doesn't match either shape unchanged.
function rewriteToTrackedDownload(url: string): string {
  if (url.startsWith("/icons/")) {
    return "/api/download/" + url.slice("/icons/".length);
  }
  if (/^https?:\/\/[^/]+\/icons\//.test(url)) {
    return url.replace(/(^https?:\/\/[^/]+)\/icons\//, "$1/api/download/");
  }
  return url;
}

const server = new McpServer({
  name: "pure-admin-icons",
  version: "1.1.0",
});

// --- Tools ---

server.tool(
  "get_usage_guide",
  `Read this first if you're unsure how to use these tools.

Returns a comprehensive guide explaining how to search icons effectively, what
icon sets are available, how to filter results, and how to retrieve SVG content.
Includes tips for choosing the right icon set and style for your use case.

Call this tool at the start of a conversation when the user asks about icons,
or whenever you're not sure which tool or parameters to use.`,
  {},
  async () => {
    try {
      const res = await fetch(`${API_BASE}/llms.txt`);
      if (res.ok) {
        const text = await res.text();
        return { content: [{ type: "text", text }] };
      }
    } catch {
      // fall through to fallback
    }
    return {
      content: [
        {
          type: "text",
          text: [
            "icons.pureadmin.io — Icon search across many open-source icon libraries",
            "",
            "ICON SETS:",
            "  Call list_icon_sets for the full current list (FluentUI, Material Symbols,",
            "  Phosphor, Tabler, Lucide, Solar, Font Awesome, Heroicons, Remix, Carbon,",
            "  Bootstrap, Simple Icons, MingCute, ...) with each set's styles, sizes,",
            "  color methods, license, and icon count.",
            "",
            "TOOLS:",
            "  search_icons      — Find icons by name. Supports filters: set, style, size, limit.",
            "  get_icon_detail   — Full metadata for one icon by ID (sizes, identifiers, color method).",
            "  get_icon_svg      — Fetch raw SVG markup from a URL.",
            "  get_icons_zip     — Bundle many icons into one ZIP (raw SVG, or rasterized PNG at given sizes).",
            "  list_icon_sets    — List all available sets with their styles, sizes, and counts.",
            "",
            "WORKFLOW:",
            "  1. Call search_icons with a query (e.g., 'calendar')",
            "  2. Pick an icon ID from results, call get_icon_detail for full info",
            "  3. Use the svg_url from results with get_icon_svg to get the actual SVG markup",
            "",
            "TIPS:",
            "  - Search by concept, not exact name: 'pencil', 'notification', 'chart'",
            "  - Filter by set when the user mentions a specific library (e.g., 'heroicons calendar')",
            "  - 'outline' and 'stroke-based' icons (Lucide, Tabler outline, Heroicons outline) use CSS stroke for color",
            "  - 'filled' and 'solid' icons use CSS fill for color",
            "  - FluentUI 'color' style is multicolor (gradients) — not recolorable",
            "  - Each icon's style_color_method tells you which CSS property to use",
          ].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "search_icons",
  `Search tens of thousands of open-source SVG icons across many icon sets (FluentUI, Material Symbols, Phosphor, Tabler, Lucide, Solar, Font Awesome, Heroicons, and more).

Returns a list of matching icons with names, styles, platform identifiers, and SVG URLs.
Use format="text" for a concise listing, or format="json" for full metadata.

Tips:
- Search by concept, not exact name: "pencil", "notification", "chart"
- Filter by icon set to narrow results: set="heroicons" or set="fontawesome"
- Filter by style: style="outline", style="solid", style="filled", style="brands"
- Each result includes an svg_url you can pass to get_icon_svg to retrieve the actual SVG
- If unsure which set/style to use, call get_usage_guide first`,
  {
    query: z.string().describe("Search term (e.g., 'calendar', 'arrow', 'user')"),
    set: z
      .string()
      .optional()
      .describe(
        "Filter by icon set code (e.g. fluentui, material, phosphor, tabler, lucide, solar, mingcute). Call list_icon_sets for the full current list."
      ),
    style: z
      .string()
      .optional()
      .describe(
        "Filter by style: regular, filled, outline, solid, color, light, brands"
      ),
    size: z
      .enum(["16", "20", "24", "28", "32", "48"])
      .optional()
      .describe("Filter by size in pixels"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe("Max results (default: 20, max: 100)"),
    format: z
      .enum(["text", "json", "compact"])
      .optional()
      .default("text")
      .describe(
        "Response format: text (concise, best for AI), json (full metadata), compact (minimal)"
      ),
  },
  async ({ query, set, style, size, limit, format }) => {
    try {
      const params = new URLSearchParams({
        q: query,
        format: format ?? "text",
        limit: String(limit ?? 20),
      });
      if (set) params.append("set", set);
      if (style) params.append("style", style);
      if (size) params.append("size", size);

      const res = await fetch(`${API_BASE}/api/icons/search?${params}`);
      if (!res.ok)
        return {
          content: [
            { type: "text", text: `Error: HTTP ${res.status} from API` },
          ],
          isError: true,
        };

      const text = await res.text();
      return {
        content: [
          {
            type: "text",
            text:
              text ||
              "No icons found. Try a different search term or remove filters.",
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching icons: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_icon_detail",
  `Get full details for a specific icon by ID.

Returns metadata including all available sizes, filenames, platform identifiers
(iOS, Android, React, Vue, Svelte), categories, search phrases, and SVG URLs.
Also includes style_color_method ("fill", "stroke", or "multicolor") indicating
how to set the icon color via CSS.

Use icon IDs from search_icons results.
If unsure how to use this output, call get_usage_guide for the full workflow.`,
  {
    id: z.number().describe("Icon ID from search results"),
  },
  async ({ id }) => {
    try {
      const res = await fetch(`${API_BASE}/api/icons/${id}`);
      if (!res.ok) {
        if (res.status === 404)
          return {
            content: [{ type: "text", text: `Icon with ID ${id} not found.` }],
            isError: true,
          };
        return {
          content: [
            { type: "text", text: `Error: HTTP ${res.status} from API` },
          ],
          isError: true,
        };
      }

      const data = await res.json();
      const icon = data.icon;

      // Format a readable summary
      const lines = [
        `${icon.name} (${icon.icon_set} / ${icon.style})`,
        `Color method: ${icon.style_color_method || "unknown"}`,
        `Sizes: ${icon.sizes.join(", ")}px`,
        "",
        "SVG URLs:",
        ...icon.svg_urls.map(
          (s: { size: number; url: string }) =>
            `  ${s.size}px: ${API_BASE}${s.url}`
        ),
      ];

      if (icon.ios && Object.keys(icon.ios).length > 0) {
        lines.push("", "iOS identifiers:");
        for (const [sz, id] of Object.entries(icon.ios))
          lines.push(`  ${sz}px: ${id}`);
      }

      if (icon.android && Object.keys(icon.android).length > 0) {
        lines.push("", "Android identifiers:");
        for (const [sz, id] of Object.entries(icon.android))
          lines.push(`  ${sz}px: ${id}`);
      }

      if (icon.phrases && icon.phrases.length > 0) {
        lines.push(
          "",
          "Search phrases:",
          ...icon.phrases.map(
            (p: { phrase: string; source: string }) =>
              `  ${p.phrase} (${p.source})`
          )
        );
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching icon: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_icon_svg",
  `Fetch the raw SVG content of an icon.

Pass an SVG URL from search results or icon detail. Returns the SVG markup
that can be used directly in HTML, saved to a file, or embedded in components.

Accepts both relative URLs (/icons/...) and full URLs. Internally routes
through /api/download/... so each retrieval is recorded as a download in
the icons.pureadmin.io usage stats.

For the full search → detail → svg workflow, call get_usage_guide first.`,
  {
    url: z
      .string()
      .describe("SVG URL from search results (e.g., /icons/heroicons/outline/arrow-right-24.svg)"),
  },
  async ({ url }) => {
    try {
      // Search results surface /icons/{set}/{style}/{filename} for direct render
      // (which is intentionally untracked — used by <img> tags). When the AI
      // explicitly fetches an SVG via this tool, that's a deliberate download,
      // so we route through /api/download/... which records an icon_metric row.
      const trackedUrl = rewriteToTrackedDownload(url);
      const fullUrl = trackedUrl.startsWith("http") ? trackedUrl : `${API_BASE}${trackedUrl}`;
      const res = await fetch(fullUrl);
      if (!res.ok)
        return {
          content: [
            {
              type: "text",
              text: `Error fetching SVG: HTTP ${res.status}. Check the URL is correct.`,
            },
          ],
          isError: true,
        };

      const svg = await res.text();
      return { content: [{ type: "text", text: svg }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching SVG: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "get_icons_zip",
  `Bundle multiple icons into a single downloadable ZIP archive.

Give a list of icons as {set, name, style} triples (use search_icons /
get_icon_detail to find them). Choose a format:
- "svg" (default): the raw source SVGs.
- "png": rasterized PNGs — pass "sizes" (pixels) to control the output sizes.

Returns the ZIP as a base64 resource (mimeType application/zip). Entries are
namespaced set/style/name[-size], plus a manifest.json listing any icons that
could not be resolved. Per-request limits apply (a huge icons × sizes batch is
rejected), so keep batches reasonable.`,
  {
    icons: z
      .array(
        z.object({
          set: z.string().describe("Icon set code, e.g. lucide, fluentui, tabler"),
          name: z.string().describe("Icon name as shown in search results"),
          style: z.string().describe("Style code, e.g. outline, filled, regular"),
        })
      )
      .min(1)
      .describe("Icons to bundle, as {set, name, style} triples"),
    format: z
      .enum(["svg", "png"])
      .optional()
      .default("svg")
      .describe("svg = raw source SVGs; png = rasterized (uses sizes)"),
    sizes: z
      .array(z.number().int().positive())
      .optional()
      .describe("PNG output sizes in pixels (default [24]); ignored for svg"),
  },
  async ({ icons, format, sizes }) => {
    try {
      const fmt = format ?? "svg";
      const endpoint = fmt === "png" ? "/api/icons/png-zip" : "/api/icons/svg-zip";
      const body: Record<string, unknown> =
        fmt === "png" ? { icons, sizes: sizes && sizes.length ? sizes : [24] } : { icons };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let detail = "";
        try {
          detail = JSON.stringify(await res.json());
        } catch {
          detail = await res.text().catch(() => "");
        }
        return {
          content: [
            {
              type: "text",
              text: `Error creating ZIP: HTTP ${res.status}${detail ? ` — ${detail}` : ""}`,
            },
          ],
          isError: true,
        };
      }

      const buf = Buffer.from(await res.arrayBuffer());
      return {
        content: [
          {
            type: "text",
            text: `Bundled ${icons.length} requested ${fmt.toUpperCase()} icon(s) into a ZIP (${buf.length} bytes). Entries are namespaced set/style/name${fmt === "png" ? "-size" : ""}; a manifest.json inside lists any icons that couldn't be resolved.`,
          },
          {
            type: "resource",
            resource: {
              uri: `icons://export/pure-admin-icons-${fmt}s.zip`,
              mimeType: "application/zip",
              blob: buf.toString("base64"),
            },
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating ZIP: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_icon_sets",
  `List all available icon sets with metadata.

Returns each icon set's name, available styles, sizes, color methods, license, and icon count.
Useful for discovering what's available before searching.
For a guided introduction to all tools, call get_usage_guide instead.`,
  {},
  async () => {
    try {
      const res = await fetch(`${API_BASE}/api/icon-sets`);
      if (!res.ok)
        return {
          content: [
            { type: "text", text: `Error: HTTP ${res.status} from API` },
          ],
          isError: true,
        };

      const data = await res.json();
      const lines = data.icon_sets.map(
        (s: {
          code: string;
          title: string;
          styles: string[];
          sizes: number[];
          style_color_methods: Record<string, string>;
          icon_count: number;
          license: string;
        }) =>
          [
            `${s.title} (${s.code}) — ${s.icon_count} icons`,
            `  Styles: ${s.styles.join(", ")}`,
            `  Sizes: ${s.sizes.join(", ")}px`,
            `  Color methods: ${Object.entries(s.style_color_methods).map(([k, v]) => `${k}=${v}`).join(", ")}`,
            `  License: ${s.license}`,
          ].join("\n")
      );

      return { content: [{ type: "text", text: lines.join("\n\n") }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing icon sets: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// --- Resources ---

server.resource("api-docs", "icons://docs", async (uri) => {
  try {
    const res = await fetch(`${API_BASE}/llms.txt`);
    const text = await res.text();
    return {
      contents: [{ uri: uri.href, mimeType: "text/plain", text }],
    };
  } catch {
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: [
            "icons.pureadmin.io API",
            "",
            "Search: GET /api/icons/search?q={query}&set={set}&style={style}&size={size}&limit={n}&format={text|json|compact}",
            "Detail: GET /api/icons/{id}",
            "Sets:   GET /api/icon-sets",
            "SVG:    GET /icons/{set}/{style}/{filename}.svg",
            "Health: GET /api/health",
            "",
            "Icon sets: see GET /api/icon-sets (many sets incl. fluentui, material, phosphor, tabler, lucide, solar, mingcute, ...)",
            "Styles: outline, filled, thin, light, regular, bold, rounded, sharp, duotone, line-duotone, broken, color, brands (varies by set)",
            "Sizes: 16, 20, 24, 28, 32, 48 (varies by set; most sets are scalable)",
          ].join("\n"),
        },
      ],
    };
  }
});

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pure Admin Icons MCP server running");
}

main().catch(console.error);
