# @keenmate/pure-admin-icons-mcp

MCP server for searching open-source SVG icons from [icons.pureadmin.io](https://icons.pureadmin.io).

Search across 13 icon sets — **FluentUI**, **Material Symbols**, **Phosphor**, **Tabler**, **Lucide**, **Solar**, **Font Awesome**, **Heroicons**, **Remix**, **Carbon**, **Bootstrap**, **Simple Icons**, and **MingCute** — with a single tool. Get platform identifiers for iOS, Android, React, Vue, and Svelte. Call `list_icon_sets` for the live list with counts.

## What's New in v1.0.2

- **`search_icons` — filter by any icon set** — The `set` parameter was a fixed enum limited to the original five sets (`fluentui`, `fontawesome`, `heroicons`, `lucide`, `tabler`), which silently rejected everything added since. It's now a free-form string, so you can filter by `material`, `phosphor`, `remix`, `carbon`, `bootstrap`, `simpleicons`, `solar`, `mingcute`, and any future set. Call `list_icon_sets` for the current codes.
- **Docs & metadata — refreshed for the 13-set catalog** — Tool descriptions, the `get_usage_guide` fallback, the API resource fallback, the README, and the npm `package.json` description/keywords no longer hard-code the old five-set list; they point to `list_icon_sets` / `GET /api/icon-sets` for the live catalog and name the current sets (FluentUI, Material Symbols, Phosphor, Tabler, Lucide, Solar, and more).
- **Security — zero known vulnerabilities** — `npm audit` flagged seven advisories in transitive `@modelcontextprotocol/sdk` HTTP-transport dependencies (hono, express, express-rate-limit, ip-address, qs); these were cleared via `npm audit fix`. This server uses the stdio transport, so those paths were never exercised, but the tree is now clean.
- **Licensing — MIT LICENSE now included** — The package declared `"license": "MIT"` but shipped without a LICENSE file; an MIT LICENSE (Keenmate s.r.o.) is now part of the package.

## What's New in v1.0.1

- `get_icon_svg` now routes through `/api/download/...` so each explicit fetch is counted in icons.pureadmin.io usage stats. Direct `/icons/...` URLs in search results stay untracked (those are for `<img>` rendering).
- Accepts both relative (`/icons/...`) and absolute URLs.
- README tool table now lists `get_usage_guide`.

## Tools

| Tool | Description |
|------|-------------|
| `get_usage_guide` | Read first if unsure how to use the server. Returns icon set overview, workflow, and tips. |
| `search_icons` | Search icons by name with filters for set, style, size. Returns names + SVG URLs. |
| `get_icon_detail` | Get full metadata for an icon: all sizes, platform identifiers, color method, phrases. |
| `get_icon_svg` | Fetch raw SVG content from a URL. |
| `list_icon_sets` | List all icon sets with styles, sizes, color methods, and counts. |

## Quick Start

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "icons": {
      "command": "npx",
      "args": ["-y", "@keenmate/pure-admin-icons-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add icons -- npx -y @keenmate/pure-admin-icons-mcp
```

## Example Queries

Once connected, ask Claude:

- "Search for calendar icons"
- "Find arrow icons from Heroicons"
- "Show me Font Awesome brand icons for social media"
- "Get the SVG for a pen icon in outline style"
- "What icon sets are available?"
- "Find a 16px solid checkmark icon"

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ICONS_API` | `https://icons.pureadmin.io` | API base URL |

## API Endpoints Used

- `GET /api/icons/search` — Search with filters (q, set, style, size, limit, format)
- `GET /api/icons/:id` — Icon detail with metadata
- `GET /api/icon-sets` — List icon sets
- `GET /icons/:set/:style/:filename` — SVG files
- `GET /llms.txt` — API documentation for LLMs

## Development

```bash
npm install
npm run dev     # Watch mode
npm run build   # Build
npm start       # Run locally
```

## License

MIT. Icon SVGs retain their original licenses.

Built by [KeenMate](https://keenmate.com).
