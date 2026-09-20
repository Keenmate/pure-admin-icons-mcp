---
description: Prepare @keenmate/pure-admin-icons-mcp for npm publish — verify registry sync, bump version, finalize CHANGELOG/README, build, validate, commit
argument-hint: rc|release|patch|minor|major
---

# /publish — prepare an npm release of @keenmate/pure-admin-icons-mcp

You are preparing this package for `npm publish`. **Do not run `npm publish`** — the user logs in and publishes manually (interactive prompt + 2FA).

This command follows the canonical `/publish` structure defined in the BlissFramework component guidelines at
`web-components/publish-command.md`, adapted for this **stdio MCP server** (not a web component). Sections marked
**[canonical]** mirror that shared structure and should stay aligned with every other KeenMate package's `/publish`;
sections marked **[per-repo]** are customized for this repo's layout, build, tests, and CHANGELOG convention.

## Argument [canonical]

The release type: **$ARGUMENTS**

Must be one of:

- `rc` — ship a release-candidate.
  - If `CURRENT_VERSION` is `X.Y.Z-rcN`, `NEW_VERSION = X.Y.Z-rc(N+1)` (bump the rc counter — we're iterating the same rc cycle).
  - If `CURRENT_VERSION` is a plain `X.Y.Z`, **default to** `NEW_VERSION = X.(Y+1).0-rc1` (next minor, rc1) and **ask the user to confirm** before mutating files. If they want a different base (patch/major) for the rc cycle, re-compute. Don't pick silently.
- `release` — promote a WIP rc to a final release. `X.Y.Z-rcN` → `X.Y.Z`. If `CURRENT_VERSION` is already a plain release, stop and ask (they probably wanted `patch`/`minor`/`major`).
- `patch` — SemVer patch bump. Drops any `-rcN` suffix. `1.0.1` → `1.0.2`.
- `minor` — SemVer minor bump. Drops `-rcN`. Resets patch.
- `major` — SemVer major bump. Drops `-rcN`. Resets minor and patch.

If missing or invalid, stop and ask the user which one to use (don't guess).

## Repo layout [per-repo]

Single npm package, published from the repo root:

- **`./package.json`** — `version` field is the source of truth. `files: ["dist"]` restricts the upload to the build output. Note the `description` field is user-facing on npmjs.com — keep it in sync with the actual set list (it currently overclaims "FluentUI, Font Awesome, Heroicons, Lucide & Tabler"; the catalog is now 13 sets).
- **`./CHANGELOG.md`** — at the root. Keep-a-Changelog shape with an `## [Unreleased]` section at the top (may not exist on first run — see bootstrap note).
- **`./README.md`** — at the root. Carries `## What's New in vX.Y.Z` sections near the top (one per release, the **two most recent** retained). Existing sections may use lowercase `## What's new in ...` — normalize the case to `## What's New in ...` when you next touch one.
- **`./src/index.ts`** — TypeScript source. The whole server is this one file.
- **`./dist/`** — gitignored. Produced by `npm run build` (`tsc`) → `dist/index.js` (the `bin` entry) + `dist/index.d.ts`. Never staged; rebuilt at publish time via `prepublishOnly`.
- **`./LICENSE`** — **currently missing.** `package.json` declares `"license": "MIT"` but there is no LICENSE file, so npm publishes without one. Flag this in the report; ideally add an MIT LICENSE before the next publish.

The package is consumed primarily via `npx -y @keenmate/pure-admin-icons-mcp` from MCP client configs, so post-publish consumers must wait for the npx cache to expire or clear it. Mentioned again in the report.

## CHANGELOG convention [per-repo]

This repo uses the Keep-a-Changelog shape with a `[PUBLISHED]` marker (**not** the dated-WIP-heading convention some other KeenMate packages use):

- **`## [Unreleased]`** — always present at the very top. Active work accumulates here under `### Added` / `### Changed` / `### Fixed` / `### Removed`. No date, no version.
- **`## [X.Y.Z] - YYYY-MM-DD [PUBLISHED]`** — past releases confirmed on npmjs.com. The `[PUBLISHED]` tag is what `/publish` writes to mark a version as having actually shipped.

```
## [Unreleased]

### Added
- Something the next release will ship.

## [1.1.0] - 2026-05-31 [PUBLISHED]

### Added
- ...
```

Publishing means:

1. Renaming `## [Unreleased]` → `## [NEW_VERSION] - <today> [PUBLISHED]` (in place — bullet content carries over unchanged).
2. Inserting a fresh empty `## [Unreleased]` block above it (empty `### Added` / `### Changed` / `### Fixed`) so the next dev cycle has somewhere to land.

**Bootstrap (first ever /publish run, no CHANGELOG.md):** create it with the two-block shape — an empty `## [Unreleased]` at top, then `## [CURRENT_VERSION] - <today> [PUBLISHED]` for the version already on npm, with a single `- Initial release.` bullet under `### Added` if you have nothing better. Confirm with the user before writing if unsure of the baseline content, then continue the normal flow.

## Resolve versions [canonical]

- `CURRENT_VERSION` — `version` from `./package.json`.
- `CHANGELOG_LATEST_PUBLISHED` — the topmost `## [X.Y.Z] - YYYY-MM-DD [PUBLISHED]` entry in `./CHANGELOG.md` (after bootstrap if needed).
- `NPM_LATEST` — `dist-tags.latest` from `https://registry.npmjs.org/@keenmate/pure-admin-icons-mcp` (resolved in step 0).
- `NEW_VERSION` — computed from the argument:

| Argument | Logic |
|---|---|
| `rc` | `X.Y.Z-rcN` → `X.Y.Z-rc(N+1)`. Plain `X.Y.Z` → default `X.(Y+1).0-rc1`, **confirm first**. |
| `release` | `X.Y.Z-rcN` → `X.Y.Z`. Otherwise stop. |
| `patch` | Strip any `-rcN`, then bump patch. |
| `minor` | Strip any `-rcN`, then bump minor, reset patch. |
| `major` | Strip any `-rcN`, then bump major, reset minor and patch. |

## Steps (in order)

### 0. npm registry sync check (PREREQUISITE) [per-repo]

Verify the local CHANGELOG and `package.json` agree with what's actually on npmjs.com — a guard against drift (e.g. a version `[PUBLISHED]`-tagged locally but never pushed to npm).

- Fetch `https://registry.npmjs.org/@keenmate/pure-admin-icons-mcp` and parse `dist-tags.latest` → `NPM_LATEST`.
  - 404 → first-time publish; skip the comparison and go to step 1.
  - Transient/network failure → stop and ask whether to retry or proceed without the check.
- Compare `NPM_LATEST` with `CHANGELOG_LATEST_PUBLISHED`:
  - **Match** → continue.
  - **CHANGELOG ahead of npm** (CHANGELOG claims a `[PUBLISHED]` version npm doesn't have) → CHANGELOG is overclaiming. Stop: list every `[PUBLISHED]` version newer than `NPM_LATEST` and ask whether to (a) publish those first, or (b) un-mark them (drop `[PUBLISHED]`, optionally merge bullets back into `[Unreleased]`). Don't auto-fix — it's a writing decision.
  - **npm ahead of CHANGELOG** → npm has a version not reflected locally. Stop and ask the user to add a `## [NPM_LATEST] - <publish-date> [PUBLISHED]` heading before rerunning.
- Sanity-check `CURRENT_VERSION` against the others: expected `CURRENT_VERSION == NPM_LATEST == CHANGELOG_LATEST_PUBLISHED` for a plain release, or `CURRENT_VERSION` an rc whose base is newer (when iterating rcs). If it's at neither, stop and report — something was hand-edited.

### 1. Sanity checks [canonical]

- Run `git status`. The repo intentionally keeps `.claude/` untracked and `dist/` gitignored — those are fine. If there are **other** uncommitted changes that aren't `package.json`, `CHANGELOG.md`, `README.md`, or `src/**`, list them and ask before continuing. (Typical case: substantive source changes belonging in this release that haven't been committed yet — confirm they're intended for this version before bumping.)
- **Verify the new version isn't already on npm.** Run `npm view @keenmate/pure-admin-icons-mcp@<NEW_VERSION> version 2>/dev/null` — if it returns the version, that version is already published; **stop** (bumping over it fails at publish time and pollutes the commit).
- Confirm the `## [Unreleased]` section has at least one bullet of substantive content under `### Added` / `### Changed` / `### Fixed` / `### Removed`. If empty, stop — nothing meaningful to release.
- Confirm `./README.md` has a `## What's New in vNEW_VERSION` section. If missing, draft one from the CHANGELOG and get approval before continuing:
  - Read the `[Unreleased]` section, distill to **3–5 scannable bullets** covering the Added/Changed themes (paraphrase — What's New is the highlight reel, not the exhaustive CHANGELOG). Pure internal refactors and Fixed-only entries don't need coverage, though a headline bug fix worth advertising does.
  - **Canonical "What's New" format:**
    - **Heading:** `## What's New in vNEW_VERSION` — lowercase `v`, no backticks around the version, no date.
    - **Each bullet:** `- **<area or tool> — <one-line headline>** — <prose, 2–5 sentences>`. Bold-wrapped lead phrase, then a true em-dash (` — `, U+2014 with surrounding spaces), then prose explaining *what changed*, *why*, and *what surface is affected* (concrete tool / param / file names inline). Plain hyphens or en-dashes are wrong.
    - **No `### ` sub-headings** inside a What's New section — a flat bullet list.
  - Show the user the proposed draft as plain markdown. Ask whether to (a) insert as-is, (b) edit, or (c) abort so they write it themselves. Only proceed once approved; insert directly above the current top `## What's New in ...` heading. Do not silently insert — the voice is the user's call.

### 2. Bump version (if needed) [canonical]

If `NEW_VERSION` ≠ `CURRENT_VERSION`, edit `./package.json`: `"version": "CURRENT_VERSION"` → `"version": "NEW_VERSION"`. Don't touch anything else. **Do not run `npm version <bump>`** — it also creates a git tag, and tagging waits until after a successful publish (step 11).

### 3. Finalize CHANGELOG [per-repo]

In `./CHANGELOG.md`:

- Rename `## [Unreleased]` → `## [NEW_VERSION] - YYYY-MM-DD [PUBLISHED]` (today's date from system context; don't guess).
- Leave the bullet content under the renamed heading untouched.
- Insert a fresh `## [Unreleased]` block at the very top with empty `### Added` / `### Changed` / `### Fixed` subsections.

### 4. Update README "What's New" — only if version changed [canonical]

In `./README.md`:

- If the existing top `## What's New in vX.Y.Z` differs from `NEW_VERSION` (e.g. promoting `-rcN` → release), rename its heading to `## What's New in vNEW_VERSION` (no content rewrite — it was curated for this release). Normalize the heading case to `What's New` while you're there.
- Count the `## What's New in vX.Y.Z` headings; if more than **two**, delete the oldest so only the two most recent remain. Don't touch publish content on the retained older one.

### 5. Validate README reflects the release [canonical]

Read the finalized CHANGELOG section and the matching `What's New in vNEW_VERSION`. Every **Added**/**Changed** bullet that's a user-facing feature or behavior change should have a paraphrased hit in What's New. Pure internal refactors and Fixed-only entries don't need coverage (headline bug fixes worth advertising do). Add missing bullets; if the section exceeds ~5 bullets, condense — it should be scannable.

### 6. Validate CHANGELOG entries match recent work [canonical]

Find the previous `[PUBLISHED]` version in CHANGELOG and locate its release commit (subject usually starts `v<previous-version>`). Run `git log --oneline <previous-publish-commit>..HEAD` to list commits since (skip this if you bootstrapped CHANGELOG this run). Also check `git status`/`git diff` for uncommitted source work.

For every substantive commit or change, verify the section now under the renamed heading mentions it. If something significant is missing, **stop and ask** — don't invent entries. Pure example/doc tweaks and trivial typo fixes don't need entries.

### 7. Run tests [per-repo]

This repo has **no automated test suite** yet — the gate is a clean typecheck plus a smoke check that the server actually starts:

- The `npm run build` (`tsc`) in step 8 doubles as the typecheck gate — any TS error stops the release there.
- Smoke check: spawn the built server and confirm it comes up over stdio without crashing, e.g. send an MCP `initialize` + `tools/list` request to `node dist/index.js` and confirm the five tools (`get_usage_guide`, `search_icons`, `get_icon_detail`, `get_icon_svg`, `list_icon_sets`) are advertised. If you can't run an interactive smoke, at minimum `node -e "import('./dist/index.js')"` must not throw.

If the smoke check fails, **stop and report** — don't proceed to commit. (When a real test suite lands, wire it in here as the primary gate.)

### 8. Build the package [per-repo]

Run `npm run build` (`tsc`). Then smoke-check the artifacts:

- `dist/index.js` exists and is non-empty, and starts with the `#!/usr/bin/env node` shebang (required for the `bin` entry to be executable via `npx`).
- `dist/index.d.ts` exists.

If the build errors, stop and report.

### 9. Verify the package contents [per-repo]

Run `npm pack --dry-run` and confirm the file list includes only:

- `dist/` (built JS + `.d.ts`)
- `package.json`
- `README.md`
- `LICENSE` — **currently absent** (see Repo layout). npm will warn "no license file"; note it in the report and add an MIT LICENSE before publishing if possible.

If anything private leaked in (`src/`, `tsconfig.json`, `.claude/`, `node_modules/`, `*.ts` sources), stop and report — the `files` array in `package.json` controls this and the leak needs fixing before publish.

### 10. Commit [canonical]

Stage: `./package.json`, `./CHANGELOG.md`, `./README.md`. **Do not stage `dist/`** — it's gitignored and rebuilt on publish.

Commit message format:

```
vNEW_VERSION — <one-line summary of the headline change>

<2–4 grouped bullets paraphrased from the CHANGELOG section — Added, Fixed,
Changed, etc. Terse; full prose lives in the CHANGELOG.>

Co-Authored-By: <match the trailer in recent commits>
```

Match whatever `Co-Authored-By` convention shows in `git log -5` — don't introduce or strip one against local style.

### 11. Report [canonical]

Report back with:

- The new version number (`vX.Y.Z` or `vX.Y.Z-rcN`)
- The commit SHA
- A note if step 0 surfaced registry drift the user had to resolve, if CHANGELOG was bootstrapped, or if the LICENSE file / stale `package.json` description still needs attention.
- The exact publish commands. **Pick the right one for the arg type:**
  - For `rc` (pre-release):
    ```
    npm login          # if not already logged in
    npm publish --tag rc
    ```
    The `--tag rc` is critical — without it npm assigns the `latest` dist-tag, making the pre-release the default `npx` install for everyone. With it, `latest` stays put and consumers opt in via `@rc`.
  - For `release` / `patch` / `minor` / `major` (stable):
    ```
    npm login          # if not already logged in
    npm publish --access public
    ```
    No `--tag` needed — it lands as `latest`.
- After a successful publish: `git tag vNEW_VERSION` then `git push origin <branch> vNEW_VERSION`.
- **npx cache note:** consumers install via `npx -y @keenmate/pure-admin-icons-mcp`, which caches packages. After publishing, end users may need to clear `~/.npm/_npx` or wait for expiry (and restart the MCP host process) before the new version is picked up.
- A reminder that the CHANGELOG `[PUBLISHED]` tag and `package.json` version are already written — if `npm publish` fails, revert both (rename the heading back to `## [Unreleased]`, restore the version) before retrying, since the registry refuses to re-publish the same version. The freshly-inserted empty `## [Unreleased]` block can stay either way.

## Things not to do [canonical]

- **Do not run `npm publish`.** The user publishes manually after `npm login` (+ 2FA).
- **Do not run `npm version <bump>`.** It edits `package.json` **and** creates a git tag in one step — tagging waits until after a successful publish.
- **Do not push to git remote, and do not tag.** The commit stays local until the user pushes; tagging follows a successful publish (a failed publish would otherwise orphan the tag).
- **Do not skip the npm sync check (step 0).** Drift between CHANGELOG and the registry is the most common source of confused future publishes.
- **Do not create a second `## [Unreleased]`** or leave none — after finalizing there must be exactly one, empty, at the top.
- **Do not retro-fix older CHANGELOG sections** or touch their publish dates — only finalize the section you're shipping.
- **Do not silently insert a drafted What's New section** — present it and wait for approval; the voice is the user's call.
- **Do not keep more than two `## What's New in vX.Y.Z` sections** in the README — step 4 trims older ones.
- **Do not skip the build step** — without it `dist/` is stale (or absent) and the publish ships outdated or broken artifacts.
- **Do not skip the smoke check** — with no test suite it's the only gate that catches a server that won't start.
- **Do not invent CHANGELOG entries** to cover commits you find — ask the user if something's missing.
- **Do not bump if there's nothing meaningful in `[Unreleased]`** — stop and explain.

### Repo-specific don'ts [per-repo]

- **Do not stage `dist/`** — gitignored, rebuilt on publish.
- **Do not include `src/`, `tsconfig.json`, or `.claude/` in the published package** — `files: ["dist"]` should keep the upload scoped to `dist/`; if `npm pack --dry-run` shows otherwise, fix `package.json` rather than continuing.
- **Do not let the stale `package.json` `description` ship silently** — if it still lists only the old five sets, flag it (or fix it) as part of the release.
