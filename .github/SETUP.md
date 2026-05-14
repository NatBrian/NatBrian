# SETUP — Profile README Pipeline

Maintainer reference for the auto-updating profile README. The rendered `README.md` is three hand-tuned SVGs plus a per-year repo list. Most of it is cron-driven; a small subset needs a local regenerate.

---

## 0. Deploy target

This tree is the contents of `NatBrian/NatBrian` — the special-name profile repo that GitHub renders at `github.com/NatBrian`. Pushing here triggers the workflow, which writes back to the same repo.

- The workflow updates `assets/archive.svg` and the repo bullets between marker comments in `README.md`.
- `terminal.svg`, `stack.svg`, and everything outside the markers in `README.md` are hand- or locally-managed and not touched by CI.

---

## 1. Setup

```bash
# Node 18+ required (native fetch).
node --version

# Installs tsx (only dev dep). Idempotent.
npm install
```

Running the cron generator locally (hits the GitHub API):

```bash
export REPO_OWNER=NatBrian
export GITHUB_TOKEN=<PAT with public_repo>   # optional, avoids the 60 req/hr unauthed limit
node .github/scripts/generate_readme.js
```

`npm run render` (terminal + stack) has no env requirements.

---

## 2. Common edits

| Goal | File / location | Run after |
|---|---|---|
| Add/change/remove a stack tile | `TOOLS` in `render-static.ts` | `npm run render` |
| Edit terminal lines | `entries` in `renderTerminal()` | `npm run render` |
| Change name / role / login | `CONFIG` in `render-static.ts` | `npm run render` |
| Hero anchor URLs (LinkedIn, repos) | top 3 lines of `README.md` | nothing |
| Cron schedule | `.github/workflows/update-readme.yml:5` | commit + push |
| Force archive refresh now | Actions → "Update README Repos List" → Run workflow | — |
| Archive layout (card size, gaps, fonts) | layout constants atop `buildArchiveSvg()` in `generate_readme.js` | next cron, or local run (§1) |
| Palette change | `C` object in **both** `render-static.ts` and `generate_readme.js` | `npm run render` + cron |

---

## 3. Layout

```
github-profile/
├── README.md                    rendered profile (top 3 SVGs + repo list)
├── package.json                 npm scripts: render, update-readme
├── assets/
│   ├── terminal.svg             manual — npm run render
│   ├── stack.svg                manual — npm run render
│   └── archive.svg              cron-generated
└── .github/
    ├── SETUP.md                 this file
    ├── workflows/
    │   └── update-readme.yml    cron + manual dispatch
    └── scripts/
        ├── generate_readme.js   archive.svg + repo bullets
        ├── render-static.ts     terminal.svg + stack.svg
        └── icon-cache/          fetched devicon SVGs (committed)
```

Gitignored: `node_modules/`, `package-lock.json`.

---

## 4. Outputs

| # | Artifact | Generator | Source | Trigger |
|---|---|---|---|---|
| 1 | `terminal.svg` | `renderTerminal()` | `entries` constant | `npm run render` |
| 2 | `stack.svg` | `renderStack()` | `TOOLS` constant | `npm run render` |
| 3 | `archive.svg` | `buildArchiveSvg()` | GitHub `/users/<owner>/repos` | cron + dispatch |
| 4 | Repo bullets in `<details>` | `buildMarkdown()` | same API | cron + dispatch |

The cron-managed region of `README.md` is delimited by `<!-- REPO_LIST_START -->` … `<!-- REPO_LIST_END -->`. Everything outside is hand-edited and preserved across runs.

`terminal.svg` and `stack.svg` are excluded from cron because their inputs are TypeScript constants. A daily run would produce identical bytes and a noisy zero-diff commit.

---

## 5. `generate_readme.js` (cron path)

Single Node 18+ script. Flow:

1. Reads `REPO_OWNER` from env (`${{ github.repository_owner }}` in CI).
2. Paginates `GET /users/<owner>/repos?per_page=100&sort=created`. Filters out forks and archived repos. Sorts within year by `pushed_at` desc.
3. `buildArchiveSvg(grouped)` — groups by year then month, renders one card per repo (name, language band, description), pulses the current year's badge, adds a 6-dash cyan beam around the rounded border, writes `assets/archive.svg`.
4. `buildMarkdown(grouped)` — reads `README.md`, replaces content between the marker comments with per-year `<details>` blocks of bullets formatted `[**name**](url) — description • \`lang\` • ★ N • 🍴 N • Topics: …`, writes back.
5. Workflow stages `README.md` and `assets/archive.svg`; if nothing changed, the staged-diff check exits without committing.

Implementation notes:

- The `C` palette mirrors the one in `render-static.ts`. The two objects are intentionally separate (different scripts, different runtimes) but must be kept identical for shared keys.
- Layout constants (`CARD_H`, `MONTH_LABEL_H`, `CARD_GAP`, etc.) are at the top of `buildArchiveSvg`.
- Unknown languages fall through to a default gray band. Add to `LANG_COLORS` to colorize.

---

## 6. `render-static.ts` (local path)

Two renderers behind one `main()`. Both pass through `svgRoot(w, h, defs, body)`, which provides the shared dark background, dot pattern, radial glow, and outer border.

### `renderTerminal(p)`

Animated "whoami" pane.

- Body is an `entries` array: `{ kind: 'cmd' | 'out' | 'ready', text }`. `cmd` lines render with a cyan `$ <text>`; `out` lines are indented in ink-white; the single `ready` line uses an amber `> <text>`.
- Font: 28px source → ~11px on a 360-wide mobile column. Longest single line ≈ 47 monospace chars before bleed.
- Chrome: traffic-light dots (rose / amber / cyan) at fixed positions, centered `brian@nb-11` title, right-aligned status badge cycling between `SECURE_TTY · ONLINE` → `UPLINK · STABLE` → `AUTH · 0xNB-7` via three text elements that swap visibility with `calcMode="discrete"`. A small cyan LED pulses near the badge anchor.
- Reveal: one `<clipPath>` per line containing a `<rect>` whose `width` animates 0→lineWidth over 0.4s, staggered 0.35s. Costs one animate per line vs. the per-character cost of an explicit typewriter.
- Steady state: a final blinking `▌` cursor at the end of the last line, an `↗` that nudges 4px up-right every 1.6s, and chrome corner brackets opacity-breathing on a 4.2s period.

### `renderStack()`

Tool grid in four categories.

- `TOOLS` is a list of `{ ring, tools: [{ slug, label, url, icon, tint? }] }`. `slug` keys both the icon cache file and the per-symbol id prefix. `tint` is applied to monochrome icons by overriding `currentColor` and re-coloring near-black hex fills, so devicon brand marks remain legible on dark backgrounds.
- `fetchIconSvg(tool)` retrieves each icon SVG, namespaces all ids (`<tool-slug>-<id>`), captures root paint attributes onto a wrapper `<g>` so inheritance survives extraction, and caches to `.github/scripts/icon-cache/<slug>.svg`. Subsequent runs read from cache; delete a file to force a refetch.
- Tiles: 210×56, 4 per row. Per-tile halo pulse with phase offset based on grid position. Each section ends with a data-flow rail — a horizontal line plus a colored dot traveling left→right at per-section durations.
- A horizontal scanline sweeps left→right across the content area every 9s.

### `main()`

Builds `Profile` from `CONFIG` (no network call), runs both renderers, passes each output through `assertValidSvg` (a regex check for attribute-quoting bugs), writes `assets/terminal.svg` and `assets/stack.svg`.

Run: `npm run render`.

---

## 7. Workflow

`.github/workflows/update-readme.yml`:

- **Schedule**: `0 0 * * *` (daily 00:00 UTC).
- **Manual**: `workflow_dispatch`.
- **Permissions**: `contents: write` — required for the bot to push back.
- **Steps**: checkout → setup Node 20 → run `generate_readme.js` with `GITHUB_TOKEN` and `REPO_OWNER` env → `git add README.md assets/archive.svg` → commit `chore(readme): refresh repo list + archive.svg` and push, or exit clean if nothing changed.

No other paths are staged. The workflow never touches `terminal.svg`, `stack.svg`, or hand-edited regions of `README.md`.

---

## 8. README anchor scheme

The top of `README.md` is three lines with no blank lines between them:

```html
<a href="https://www.linkedin.com/in/…/"><img src="./assets/terminal.svg" …/></a>
<a><img src="./assets/stack.svg" …/></a>
<a href="https://github.com/NatBrian?tab=repositories"><img src="./assets/archive.svg" …/></a>
```

| SVG | Wrapper | Behavior |
|---|---|---|
| terminal | `<a href="…linkedin…">` | click → LinkedIn |
| stack | `<a>` no href | placeholder hyperlink, renders inert, no navigation |
| archive | `<a href="…repos…">` | click → GitHub repos page |

The gapless layout comes from removing blank lines between the tags. GitHub's CommonMark renderer treats consecutive HTML tags with no blank-line separator as a single HTML block, suppressing paragraph margins. With separators, each tag becomes its own paragraph with default margins.

Below the hero is a single outer `<details>` wrapping per-year inner `<details>` blocks. Only the summary line and the markers are hand-edited; bullets between the markers are cron-managed.

---

## 9. Palette

`C` object in both scripts (kept in sync for shared keys):

| Key | Hex | Use |
|---|---|---|
| `bg` | `#0c1018` | SVG body, between-card background. Matches across all three SVGs. |
| `panel` | `#0a0d18` (archive) / `#0c1018` (terminal & stack tiles) | Card / tile fill. Archive's `panel` is slightly darker than its `bg` for a recessed-card look; terminal and stack tiles use the same hex as `bg` because the tile *is* the panel surface. |
| `panel2` | `#0f1422` | Reserved, currently unused. |
| `line` | `#1a2233` | Borders, dividers, dot-pattern fill. |
| `ink` | `#e6ecf5` | Primary text. |
| `dim` | `#5b6577` | Secondary text, prompts, captions. |
| `cyan` | `#5eead4` | Terminal prompts, stack section 1, scanlines, LEDs. |
| `violet` | `#a78bfa` | Archive year pulse, stack section 2 (AI). |
| `amber` | `#fbbf24` | Terminal `ready` line, stack section 4 (cloud). |
| `rose` | `#fb7185` | Mac-style close dot. |
| `blue` | `#60a5fa` | Reserved. |

Font stacks:
- `mono = ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- `sans = ui-sans-serif, -apple-system, Inter, system-ui, sans-serif`

---

## 10. Mobile scaling

All SVGs are authored at 920 px wide. GitHub renders inline SVGs at column width; mobile column ≈ 360 px → scale factor ≈ **0.39×**.

| Target mobile px | Source px |
|---|---|
| 8 | 20 |
| 10 | 26 |
| 11 | 28 |
| 14 | 36 |

Monospace char width ≈ `0.6 × fontSize`. At 28 px source → 16.8 px/char → ~47 chars usable across a 920 canvas with normal padding. Plan terminal entries against this budget.

---

## 11. Animation constraints

GitHub serves README images through camo as `<img>`. Relevant capabilities:

| Technique | Status | Notes |
|---|---|---|
| SVG SMIL (`<animate>`, `<animateTransform>`) | works | Every animation in this repo. |
| `<script>` inside SVG | stripped | — |
| CSS `:hover` | inert | `<img>`-loaded SVGs receive no mouse events. |
| External font loads | inert | Camo doesn't proxy font CSS. All fonts are system fallbacks. |
| `<a href>` wrapping `<img>` | works | Used on terminal and archive. |
| `<a>` no href | works | Renders inert. Used on stack. |
| `href="javascript:…"` | stripped | — |

Cross-SVG animation sync is impossible: each `<img>`-loaded SVG starts its SMIL timeline when its own image finishes loading, independently. Identical shape and speed parameters drift apart at runtime. Workaround: give each SVG visually distinct ambient motion (stack: horizontal beam; terminal: corner-bracket breathe; archive: border dashes) so the eye doesn't expect synchrony.

---

## 12. Gotchas

- **Editing inside `<!-- REPO_LIST_* -->` markers** — overwritten on next cron. Edits go outside.
- **Stale terminal/stack after editing source** — `render-static.ts` constants don't propagate without `npm run render`. The cron will never do it.
- **Mismatched palette across scripts** — terminal and archive start diverging visually. The two `C` objects are independent; keep them identical for shared keys. Grep both when changing a color.
- **Unknown language in a repo** — defaults to gray band in archive. Add to `LANG_COLORS` in `generate_readme.js`.
- **Stale icon in stack** — if a third-party icon URL changes, the local cache hides the change. Delete `.github/scripts/icon-cache/<slug>.svg` to force a refetch.
- **Terminal text overflowing the panel** — 28 px mono at 920 width caps near 47 chars per line. Split into a second `out` entry or shorten.
- **Chrome geometry shift** — traffic-light dots are pinned at `cx={50,78,106}, cy=48`. Changing chrome height needs corresponding `cx`/`cy` updates.
- **`<details>` not expanding** — GitHub requires a blank line before `<summary>` and after `</summary>`.
- **archive.svg trailing whitespace at bottom** — `H` is computed from card count. Manually inserted titles/footers also need to bump `H`.

---

## 13. Local preview

```bash
npm run render

# Optional cron simulation (see §1 for env)
node .github/scripts/generate_readme.js

# Open in browser (animation behavior matches GitHub render closely enough for visual review)
xdg-open assets/terminal.svg
xdg-open assets/stack.svg
xdg-open assets/archive.svg
```

For GitHub-accurate rendering (camo proxy, exact column width), push to a throwaway branch on `NatBrian/NatBrian` and view at `github.com/NatBrian/NatBrian/tree/<branch>`. Branch READMEs render identically to the profile page.

---

## 14. Load-bearing — leave alone

- `<!-- REPO_LIST_START -->` / `<!-- REPO_LIST_END -->` marker comments. Removing them breaks cron regen.
- Empty `<a>` around stack.svg in `README.md` — deliberately inert.
- `permissions: contents: write` in the workflow — without it the bot push fails.
- `assertValidSvg` in `render-static.ts` — guards against attribute-quoting bugs in generated SVG strings.

---

## 15. Reading order if reorienting

1. `.github/workflows/update-readme.yml` — 49 lines, full automation surface.
2. `.github/scripts/generate_readme.js` — CONFIG, palette, layout constants at top; `buildArchiveSvg` is the bulk.
3. `.github/scripts/render-static.ts` — `CONFIG` and `TOOLS` at top; `renderTerminal` and `renderStack` are independent.
4. `README.md` — three hero anchors + outer `<details>` + footer; everything between markers is generated.
