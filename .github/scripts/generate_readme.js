// .github/scripts/generate_readme.js
// Node 18+ (global fetch). Run with: node .github/scripts/generate_readme.js

const fs = require('fs/promises');
const path = require('path');

const README_PATH = path.join(process.cwd(), 'README.md');
const START_MARKER = '<!-- REPO_LIST_START -->';
const END_MARKER = '<!-- REPO_LIST_END -->';

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
  out += '## Repositories grouped by year\n\n';
  out += '_Click a year to expand/collapse. Showing description, language, stars, forks, and topics._\n\n';

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

async function run() {
  console.log(`Generating README repo list for owner: ${CONFIG.owner}`);
  const all = await fetchAllRepos();
  const repos = filterAndNormalize(all);
  const grouped = groupByYear(repos);
  const repoMarkdown = buildMarkdown(grouped);

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
