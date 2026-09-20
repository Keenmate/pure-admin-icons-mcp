# Changelog

All notable changes to `@keenmate/pure-admin-icons-mcp` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed
- Docs refresh: the `search_icons` description, the `get_usage_guide` fallback text, and the API resource fallback no longer hard-code the old five-set list — they point to `list_icon_sets` / `GET /api/icon-sets` for the live catalog (now 13 sets, incl. Material, Phosphor, Remix, Carbon, Bootstrap, Simple Icons, Solar, MingCute). Updated the README set list accordingly.

### Fixed
- `search_icons` only accepted the original five sets in its `set` filter (a Zod enum), rejecting all newer sets client-side. It's now a free-form string, so any set code — `material`, `phosphor`, `remix`, `carbon`, `bootstrap`, `simpleicons`, `solar`, `mingcute`, … — can be used as a filter.
- npm audit: cleared all 7 advisories (transitive `@modelcontextprotocol/sdk` HTTP-transport deps — hono, express, express-rate-limit, ip-address, qs) via `npm audit fix` → 0 vulnerabilities. This server uses the stdio transport, so those code paths were never exercised.

## [1.0.1] - 2026-05-31 [PUBLISHED]

### Changed
- `get_icon_svg` now routes URL fetches through `/api/download/...` so each explicit SVG retrieval is recorded in icons.pureadmin.io usage stats. Direct `/icons/...` URLs returned in search results stay untracked (those are used by `<img>` rendering); only deliberate tool calls count as downloads. Accepts both relative and absolute URLs.
- Documented the existing `get_usage_guide` tool in the README tool table.

## [1.0.0] - 2026-04-08 [PUBLISHED]

### Added
- Initial release. MCP server exposing `get_usage_guide`, `search_icons`, `get_icon_detail`, `get_icon_svg`, and `list_icon_sets` against icons.pureadmin.io.
