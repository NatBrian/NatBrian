// .github/scripts/generate_readme.js
// Node 18+ (global fetch). Run with: node .github/scripts/generate_readme.js

const fs = require('fs/promises');
const path = require('path');

const README_PATH = path.join(process.cwd(), 'README.md');
const ASSETS_DIR = path.join(process.cwd(), 'assets');
const ARCHIVE_SVG_PATH = path.join(ASSETS_DIR, 'archive.svg');
const START_MARKER = '<!-- REPO_LIST_START -->';
const END_MARKER = '<!-- REPO_LIST_END -->';

// SVG palette + helpers — pure strings, no deps
const C = {
  bg: '#0c1018',      // matches terminal.svg's inner panel for a seamless dark backdrop
  panel: '#0a0d18',   // card fill — slightly darker than bg for recessed look
  panel2: '#0f1422',
  line: '#1a2233',
  ink: '#e6ecf5',
  dim: '#5b6577',
  cyan: '#5eead4',
  violet: '#a78bfa',
  amber: '#fbbf24',
  rose: '#fb7185',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  sans: 'ui-sans-serif, -apple-system, Inter, system-ui, sans-serif',
};

const LANG_COLOR = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Java: '#b07219',
  Go: '#00ADD8',
  'Jupyter Notebook': '#DA5B0B',
  HTML: '#e34c26',
  CSS: '#563d7c',
  'C#': '#178600',
  Shell: '#89e051',
  'C++': '#f34b7d',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Vue: '#41b883',
  Rust: '#dea584',
  Kotlin: '#A97BFF',
  Swift: '#F05138',
  Dart: '#00B4AB',
  Dockerfile: '#384d54',
  Solidity: '#AA6746',
};
const langColor = (l) => (l && LANG_COLOR[l]) || C.dim;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// CONFIG — tweak locally or modify in the script before committing
const CONFIG = {
  owner: process.env.REPO_OWNER || (process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[0] : undefined),
  includeForks: false,
  excludeArchived: true,
  minStars: 0,
  per_page: 100,
  acceptHeader: 'application/vnd.github+json, application/vnd.github.mercy-preview+json' // mer cy-preview to include topics
};

if (!CONFIG.owner) {
  console.error('ERROR: Repo owner not found. Set REPO_OWNER env or run in a GitHub Actions repo context.');
  process.exit(1);
}

const tokenHeader = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

async function fetchAllRepos() {
  const results = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/users/${encodeURIComponent(CONFIG.owner)}/repos?per_page=${CONFIG.per_page}&page=${page}&sort=created&direction=desc`;
    const res = await fetch(url, {
      headers: {
        Accept: CONFIG.acceptHeader,
        ...tokenHeader
      }
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${txt}`);
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < CONFIG.per_page) break;
    page += 1;
  }
  return results;
}

function filterAndNormalize(repos) {
  return repos
    .filter(r => (CONFIG.includeForks ? true : !r.fork))
    .filter(r => (CONFIG.excludeArchived ? !r.archived : true))
    .filter(r => (r.stargazers_count >= CONFIG.minStars))
    .map(r => ({
      id: r.id,
      name: r.name,
      html_url: r.html_url,
      description: r.description || '',
      language: r.language || 'Unknown',
      topics: Array.isArray(r.topics) ? r.topics : [],
      created_at: r.created_at,
      updated_at: r.updated_at,
      stargazers_count: r.stargazers_count,
      forks_count: r.forks_count,
      archived: r.archived
    }));
}

function groupByYear(repos) {
  const map = new Map();
  for (const r of repos) {
    const year = new Date(r.created_at).getFullYear() || 'Unknown';
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(r);
  }
  // sort years desc
  const years = Array.from(map.keys()).sort((a, b) => b - a);
  return years.map(y => ({ year: y, repos: map.get(y).sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name)) }));
}

function escapeInline(s) {
  // basic escape for single-line content in markdown lists
  return String(s).replace(/\r?\n|\r/g, ' ').trim();
}

function buildMarkdown(grouped) {
  let out = '\n';
  
  for (const g of grouped) {
    out += `<details>\n<summary><strong>${g.year}</strong> — ${g.repos.length} repos</summary>\n\n`;
    for (const r of g.repos) {
      const desc = r.description ? ` — ${escapeInline(r.description)}` : '';
      const topics = r.topics && r.topics.length ? ` • Topics: ${r.topics.map(t => t.replace(/\|/g, '/')).join(', ')}` : '';
      out += `- [**${r.name}**](${r.html_url})${desc} • \`${r.language}\` • ★ ${r.stargazers_count} • 🍴 ${r.forks_count}${topics}\n`;
    }
    out += '\n</details>\n\n';
  }

  out += '\n_Last updated: ' + new Date().toISOString() + '_\n';
  return out;
}

function svgRoot(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${C.violet}" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="${C.cyan}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${C.bg}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.8" fill="${C.line}"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" rx="20" fill="${C.bg}"/>
  <rect width="${w}" height="${h}" rx="20" fill="url(#dots)" opacity="0.55"/>
  <rect width="${w}" height="${h}" rx="20" fill="url(#bgGlow)"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="20" fill="none" stroke="${C.line}"/>
  ${body}
</svg>`;
}

function buildArchiveSvg(grouped) {
  if (grouped.length === 0) return svgRoot(920, 120, '');

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const total = grouped.reduce((n, g) => n + g.repos.length, 0);
  const years = grouped.map(g => g.year);
  const yearSpan = years.length > 1 ? `${years[years.length - 1]}–${years[0]}` : `${years[0]}`;

  // For each year: sub-group by month of created_at. Show ALL repos in each month
  // (no top-3 cap — user wants complete listing).
  const yearBlocks = grouped.map(g => {
    const byMonth = new Map();
    for (const r of g.repos) {
      const m = new Date(r.created_at).getUTCMonth();
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push(r);
    }
    const monthsDesc = [...byMonth.keys()].sort((a, b) => b - a);
    const months = monthsDesc.map(m => ({
      idx: m,
      name: MONTH_NAMES[m],
      repos: byMonth.get(m).slice().sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at) || a.name.localeCompare(b.name)
      ),
    }));
    return { year: g.year, total: g.repos.length, months };
  });

  // Geometry — full-width card rows in stack-style panel.
  // Sizes bumped so cards stay readable when the SVG scales to ~40% on mobile.
  const W = 920;
  const HEAD_CHROME = 104;    // taller top bar — fits 22px title + 20px count line
  const YEAR_HEAD = 64;       // year title strip — fits 36px year + 20px caption
  const MONTH_LABEL_H = 46;   // gap row above each month's first card — fits 26px month name
  const CARD_H = 96;          // card height — sized for 26px title + 26px desc (≈10px on mobile)
  const CARD_GAP = 9;
  const YEAR_PAD_BOT = 28;
  const FOOT_PAD = 36;

  // Compute layout heights per year
  yearBlocks.forEach(yb => {
    let h = YEAR_HEAD;
    for (const month of yb.months) {
      h += MONTH_LABEL_H;
      h += month.repos.length * (CARD_H + CARD_GAP);
    }
    h += YEAR_PAD_BOT;
    yb.height = h;
  });
  const H = HEAD_CHROME + yearBlocks.reduce((n, yb) => n + yb.height, 0) + FOOT_PAD;

  // Panel chrome — no terminal window-controls; clean title bar only
  const chrome = `
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="10" fill="${C.panel2}" stroke="${C.line}"/>
    <text x="40" y="58" font-family="${C.mono}" font-size="22" fill="${C.ink}" font-weight="600">▮ repository archive</text>
    <text x="${W - 40}" y="58" text-anchor="end" font-family="${C.mono}" font-size="20" fill="${C.dim}">${total} signals · ${yearSpan}</text>
    <line x1="20" y1="80" x2="${W - 20}" y2="80" stroke="${C.line}"/>`;

  // Card geometry — same for every repo, anchored by yCursor
  const CARD_X = 48;
  const CARD_W = W - CARD_X - 32;       // ends 32px from right edge
  const BAND_W = 6;                     // colored left band — proportional to bigger cards
  const CONTENT_X = CARD_X + BAND_W + 18;
  const LANG_LABEL_GAP = 14;            // gap between repo name and "· Language" tag

  let yCursor = HEAD_CHROME;

  const yearSvgs = yearBlocks.map((yb, i) => {
    const yStart = yCursor;
    yCursor += yb.height;
    const begin = (i * 0.22).toFixed(2);
    const isLatest = i === 0;
    const accent = isLatest ? C.cyan : C.violet;

    const headerY = yStart + 42;
    const dividerY = yStart + 54;

    const activeBadge = isLatest
      ? `<text x="290" y="${headerY}" font-family="${C.mono}" font-size="20" fill="${C.cyan}">● active</text>`
      : '';
    const pulse = isLatest
      ? `<circle cx="40" cy="${headerY - 12}" r="10" fill="${accent}" opacity="0.45">
          <animate attributeName="r" values="10;22;10" dur="2.6s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.45;0;0.45" dur="2.6s" repeatCount="indefinite"/>
        </circle>`
      : '';

    // Lay out months + cards under the year header
    let cursor = dividerY + 10;
    const monthSvgs = [];
    for (const month of yb.months) {
      // Month label row
      const monthLabelY = cursor + 30;
      const monthLabelW = month.name.length * 16; // 26px mono ≈ 16/char
      const countOffset = CARD_X + monthLabelW + 14;
      const repoWordW = (month.repos.length >= 10 ? 90 : 78); // "X repos" at 20px mono
      monthSvgs.push(`
        <text x="${CARD_X}" y="${monthLabelY}" font-family="${C.mono}" font-size="26" font-weight="600" fill="${accent}">${month.name}</text>
        <text x="${countOffset}" y="${monthLabelY}" font-family="${C.mono}" font-size="20" fill="${C.dim}">${month.repos.length} ${month.repos.length === 1 ? 'repo' : 'repos'}</text>
        <line x1="${countOffset + repoWordW}" y1="${monthLabelY - 10}" x2="${CARD_X + CARD_W}" y2="${monthLabelY - 10}" stroke="${C.line}" stroke-width="0.5" opacity="0.6"/>`);
      cursor += MONTH_LABEL_H;

      // One card per repo in this month
      for (const r of month.repos) {
        const cardY = cursor;
        const langName = r.language && r.language !== 'Unknown' ? r.language : '';
        const langC = langColor(langName);
        const repoName = r.name || '';
        const desc = r.description || '';

        // Truncate description to fit single line at 26px sans (~14px per char in usable width ~800)
        const descBudget = 56;
        const descTrim = desc.length > descBudget ? desc.slice(0, descBudget - 1) + '…' : desc;

        // Title row: repo name (mono 26) + "· Language" suffix (dim 20)
        const langSuffix = langName
          ? `<text x="${CONTENT_X + repoName.length * 15.3 + LANG_LABEL_GAP}" y="${cardY + 40}" font-family="${C.mono}" font-size="20" fill="${C.dim}">· ${esc(langName)}</text>`
          : '';

        // Subtle language-band breath — opacity 0.7↔1.0 over 5s, phase derived from cardY so
        // adjacent cards form a gentle vertical wave instead of synchronized blinking.
        const bandPhase = ((cardY % 50) / 10).toFixed(2);

        monthSvgs.push(`
          <g>
            <rect x="${CARD_X}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="${C.panel}" stroke="${C.line}" stroke-width="1"/>
            <rect x="${CARD_X}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="8" fill="#ffffff" opacity="0.02"/>
            <rect x="${CARD_X}" y="${cardY}" width="${BAND_W}" height="${CARD_H}" rx="3" fill="${langC}">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="5s" begin="-${bandPhase}s" repeatCount="indefinite"/>
            </rect>
            <text x="${CONTENT_X}" y="${cardY + 40}" font-family="${C.mono}" font-size="26" font-weight="600" fill="${C.ink}">${esc(repoName)}</text>
            ${langSuffix}
            <text x="${CONTENT_X}" y="${cardY + 76}" font-family="${C.sans}" font-size="26" fill="${C.dim}">${esc(descTrim)}</text>
          </g>`);

        cursor += CARD_H + CARD_GAP;
      }
    }

    return `<g opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${begin}s" dur="0.32s" fill="freeze"/>
      ${pulse}
      <circle cx="40" cy="${headerY - 12}" r="10" fill="${accent}" stroke="${C.bg}" stroke-width="3"/>
      <text x="68" y="${headerY}" font-family="${C.mono}" font-size="36" font-weight="600" fill="${C.ink}">${yb.year}</text>
      <text x="180" y="${headerY}" font-family="${C.mono}" font-size="20" fill="${C.dim}">${yb.total} signals</text>
      ${activeBadge}
      <line x1="30" y1="${dividerY}" x2="${W - 30}" y2="${dividerY}" stroke="${C.line}" stroke-width="0.5"/>
      ${monthSvgs.join('')}
    </g>`;
  }).join('');

  // Panel-edge accent — six long cyan dashes spaced evenly around the rounded outer border,
  // drifting clockwise. SVG is ~6462 tall but viewports show only ~1500 source units at a time,
  // so multiple long dashes (vs one short one) keep at least one beam visible in any viewport.
  // Path-length math: for a rounded rect, perimeter = 2(w+h) + 2r(π-4). With N evenly-spaced
  // dashes, the pattern repeats every perimeter/N units; animating stroke-dashoffset by one
  // slot per period yields a seamless loop because the visual state matches after each shift.
  const borderPerim = 2 * ((W - 40) + (H - 40)) + 20 * (Math.PI - 4);
  const NUM_DASHES = 6;
  const dashLen = 900;
  const dashCycle = borderPerim / NUM_DASHES;
  const gapLen = (dashCycle - dashLen).toFixed(1);
  const borderHighlight = `
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="10"
          fill="none" stroke="${C.cyan}" stroke-width="1.5" stroke-opacity="0.55"
          stroke-dasharray="${dashLen} ${gapLen}" stroke-linecap="round">
      <animate attributeName="stroke-dashoffset" from="0" to="-${dashCycle.toFixed(1)}" dur="10s" repeatCount="indefinite"/>
    </rect>`;

  return svgRoot(W, H, `${chrome}${yearSvgs}${borderHighlight}`);
}

async function run() {
  console.log(`Generating README repo list for owner: ${CONFIG.owner}`);
  const all = await fetchAllRepos();
  const repos = filterAndNormalize(all);
  const grouped = groupByYear(repos);
  const repoMarkdown = buildMarkdown(grouped);

  // Generate the visual archive SVG from the same grouped data.
  const archiveSvg = buildArchiveSvg(grouped);
  await fs.mkdir(ASSETS_DIR, { recursive: true });
  await fs.writeFile(ARCHIVE_SVG_PATH, archiveSvg, 'utf8');
  console.log(`Wrote archive SVG: ${ARCHIVE_SVG_PATH} (${archiveSvg.length} bytes)`);

  let readme;
  try {
    readme = await fs.readFile(README_PATH, 'utf8');
  } catch (err) {
    // If README doesn't exist, create a basic one with markers
    console.log('README.md not found — creating a new one with markers.');
    const base = `# Repositories\n\n<!-- REPO_LIST_START -->\n\n<!-- REPO_LIST_END -->\n`;
    await fs.writeFile(README_PATH, base, 'utf8');
    readme = base;
  }

  let start = readme.indexOf(START_MARKER);
  let end = readme.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    // If markers missing or malformed, append them at the end
    console.log('Markers not found or malformed — appending markers to README.md.');
    const newReadmeWithMarkers = `${readme}\n\n${START_MARKER}\n\n${END_MARKER}\n`;
    await fs.writeFile(README_PATH, newReadmeWithMarkers, 'utf8');
    readme = newReadmeWithMarkers;
    start = readme.indexOf(START_MARKER);
    end = readme.indexOf(END_MARKER);
  }

  const before = readme.slice(0, start + START_MARKER.length);
  const after = readme.slice(end);

  const newReadme = `${before}\n${repoMarkdown}\n${after}`;

  if (newReadme === readme) {
    console.log('README unchanged — nothing to do.');
    return;
  }

  await fs.writeFile(README_PATH, newReadme, 'utf8');
  console.log('README.md updated and written to disk.');
}

run().catch(err => {
  console.error('Fatal error:', err && err.stack ? err.stack : String(err));
  process.exit(1);
});
