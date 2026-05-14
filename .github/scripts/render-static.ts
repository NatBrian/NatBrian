import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// === CONFIG — edit when your GitHub profile changes ===
// Drives terminal.svg's "whoami" line.
const CONFIG = {
  login: 'NatBrian',
  name: 'Nathanael Brian',
  headline: 'AI/ML Technology Consultant',
};

type Profile = {
  name: string;
  login: string;
  headline: string;
  generatedAt: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..', '..');
const ASSETS = join(REPO_ROOT, 'assets');

const C = {
  bg: '#07090d',
  panel: '#0c1018',
  panel2: '#0f1422',
  line: '#1a2233',
  ink: '#e6ecf5',
  dim: '#5b6577',
  cyan: '#5eead4',
  violet: '#a78bfa',
  amber: '#fbbf24',
  rose: '#fb7185',
  blue: '#60a5fa',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  sans: 'ui-sans-serif, -apple-system, Inter, system-ui, sans-serif',
};

const esc = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svgRoot(w: number, h: number, defs: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${C.violet}" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="${C.cyan}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${C.bg}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.cyan}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${C.cyan}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.4"/>
    </filter>
    <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="1" r="0.8" fill="${C.line}"/>
    </pattern>
    ${defs}
  </defs>
  <rect width="${w}" height="${h}" rx="20" fill="${C.bg}"/>
  <rect width="${w}" height="${h}" rx="20" fill="url(#dots)" opacity="0.55"/>
  <rect width="${w}" height="${h}" rx="20" fill="url(#bgGlow)"/>
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="20" fill="none" stroke="${C.line}"/>
  ${body}
</svg>`;
}

// =========================  STACK  =========================
// Tool catalog grouped into 3 orbital rings.
type Tool = { slug: string; label: string; url: string; icon: string; tint?: string };

const TOOLS: { ring: string; tools: Tool[] }[] = [
  {
    ring: 'lang',
    tools: [
      { slug: 'python', label: 'Python', url: 'https://www.python.org', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg' },
      { slug: 'java', label: 'Java', url: 'https://www.java.com', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg' },
      { slug: 'go', label: 'Go', url: 'https://golang.org', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/go/go-original.svg' },
      { slug: 'javascript', label: 'JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg' },
      { slug: 'html', label: 'HTML5', url: 'https://www.w3.org/html/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg' },
      { slug: 'css', label: 'CSS3', url: 'https://www.w3schools.com/css/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg' },
      { slug: 'react', label: 'React', url: 'https://reactjs.org/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original.svg' },
      { slug: 'nextjs', label: 'Next.js', url: 'https://nextjs.org/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/nextjs/nextjs-original.svg' },
      { slug: 'figma', label: 'Figma', url: 'https://www.figma.com/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/figma/figma-original.svg' },
    ],
  },
  {
    ring: 'ai',
    tools: [
      { slug: 'pytorch', label: 'PyTorch', url: 'https://pytorch.org/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/pytorch/pytorch-original.svg' },
      { slug: 'tensorflow', label: 'TensorFlow', url: 'https://www.tensorflow.org', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/tensorflow/tensorflow-original.svg' },
      { slug: 'huggingface', label: 'Hugging Face', url: 'https://huggingface.co', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/huggingface-color.svg' },
      { slug: 'langchain', label: 'LangChain', url: 'https://www.langchain.com', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/langchain-color.svg' },
      { slug: 'langgraph', label: 'LangGraph', url: 'https://www.langchain.com/langgraph', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/langgraph-color.svg' },
      { slug: 'autogen', label: 'AutoGen', url: 'https://github.com/microsoft/autogen', icon: 'https://microsoft.github.io/autogen/0.2/img/ag.svg' },
      { slug: 'llamaindex', label: 'LlamaIndex', url: 'https://www.llamaindex.ai/', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/llamaindex-color.svg' },
      { slug: 'qdrant', label: 'RAG', url: 'https://qdrant.tech/', icon: 'https://cdn.simpleicons.org/qdrant/F87171' },
      { slug: 'ollama', label: 'Ollama', url: 'https://ollama.com', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/ollama.svg', tint: '#e6ecf5' },
      { slug: 'vllm', label: 'vLLM', url: 'https://docs.vllm.ai/', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/vllm-color.svg' },
      { slug: 'openai', label: 'OpenAI', url: 'https://openai.com', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg', tint: '#10A37F' },
      { slug: 'anthropic', label: 'Claude', url: 'https://www.anthropic.com', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude-color.svg' },
      { slug: 'gemini', label: 'Gemini', url: 'https://gemini.google.com', icon: 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/gemini-color.svg' },
    ],
  },
  {
    ring: 'data',
    tools: [
      { slug: 'postgres', label: 'PostgreSQL', url: 'https://www.postgresql.org', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg' },
      { slug: 'mysql', label: 'MySQL', url: 'https://www.mysql.com/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original.svg' },
      { slug: 'oracle', label: 'Oracle', url: 'https://www.oracle.com/database/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/oracle/oracle-original.svg' },
      { slug: 'mongodb', label: 'MongoDB', url: 'https://www.mongodb.com/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original.svg' },
      { slug: 'elasticsearch', label: 'Elasticsearch', url: 'https://www.elastic.co/elasticsearch', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/elasticsearch/elasticsearch-original.svg' },
      { slug: 'redis', label: 'Redis', url: 'https://redis.io', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/redis/redis-original.svg' },
      { slug: 'kafka', label: 'Kafka', url: 'https://kafka.apache.org/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/apachekafka/apachekafka-original.svg', tint: '#e6ecf5' },
    ],
  },
  {
    ring: 'infra',
    tools: [
      { slug: 'aws', label: 'AWS', url: 'https://aws.amazon.com', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/amazonwebservices/amazonwebservices-original-wordmark.svg' },
      { slug: 'gcp', label: 'GCP', url: 'https://cloud.google.com', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/googlecloud/googlecloud-original.svg' },
      { slug: 'kubernetes', label: 'Kubernetes', url: 'https://kubernetes.io', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/kubernetes/kubernetes-plain.svg' },
      { slug: 'docker', label: 'Docker', url: 'https://www.docker.com/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original.svg' },
      { slug: 'linux', label: 'Linux', url: 'https://www.linux.org/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/linux/linux-original.svg' },
      { slug: 'gitlab', label: 'GitLab CI', url: 'https://about.gitlab.com/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/gitlab/gitlab-original.svg' },
      { slug: 'git', label: 'Git', url: 'https://git-scm.com/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg' },
      { slug: 'prometheus', label: 'Prometheus', url: 'https://prometheus.io/', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/prometheus/prometheus-original.svg' },
      { slug: 'grafana', label: 'Grafana', url: 'https://grafana.com', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/grafana/grafana-original.svg' },
      { slug: 'kibana', label: 'Kibana', url: 'https://www.elastic.co/kibana', icon: 'https://www.vectorlogo.zone/logos/elasticco_kibana/elasticco_kibana-icon.svg' },
      { slug: 'postman', label: 'Postman', url: 'https://postman.com', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/postman/postman-original.svg' },
      { slug: 'selenium', label: 'Selenium', url: 'https://www.selenium.dev', icon: 'https://raw.githubusercontent.com/devicons/devicon/master/icons/selenium/selenium-original.svg' },
      { slug: 'puppeteer', label: 'Puppeteer', url: 'https://pptr.dev/', icon: 'https://cdn.simpleicons.org/puppeteer/5EEAD4' },
    ],
  },
];

const ICON_CACHE = join(__dirname, 'icon-cache');

async function fetchIconSvg(tool: Tool): Promise<{ viewBox: string; body: string } | null> {
  if (tool.icon.startsWith('text:')) return null;
  mkdirSync(ICON_CACHE, { recursive: true });
  const cachePath = join(ICON_CACHE, `${tool.slug}.svg`);
  let raw: string | null = null;
  if (existsSync(cachePath)) {
    raw = readFileSync(cachePath, 'utf8');
  } else {
    try {
      const res = await fetch(tool.icon);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.text();
      if (!raw.includes('<svg')) throw new Error('not an svg');
      writeFileSync(cachePath, raw);
    } catch (e) {
      console.warn(`[icon] ${tool.slug} fetch failed: ${(e as Error).message}`);
      return null;
    }
  }
  // Match the outer <svg ...> tag along with its attributes and the inner content.
  const wrapMatch = raw.match(/<svg([^>]*)>([\s\S]*)<\/svg>/i);
  if (!wrapMatch) return null;
  const outerAttrs = wrapMatch[1];
  let inner = wrapMatch[2];

  // viewBox lookup (fallback synthesises from width/height).
  let viewBox = (outerAttrs.match(/\bviewBox=["']([^"']+)["']/i) || [])[1];
  if (!viewBox) {
    const w = (outerAttrs.match(/\swidth=["']([\d.]+)/i) || [])[1];
    const h = (outerAttrs.match(/\sheight=["']([\d.]+)/i) || [])[1];
    viewBox = w && h ? `0 0 ${w} ${h}` : '0 0 24 24';
  }

  // Capture root-level paint attrs that downstream paths inherit.
  let rootFill = (outerAttrs.match(/\bfill=["']([^"']+)["']/i) || [])[1];
  const rootStroke = (outerAttrs.match(/\bstroke=["']([^"']+)["']/i) || [])[1];

  // Tint: override currentColor explicitly OR force-color a monochrome icon.
  if (tool.tint) {
    inner = inner.replace(/currentColor/g, tool.tint);
    if (rootFill === 'currentColor' || !rootFill) rootFill = tool.tint;
    // Replace any hardcoded near-black fills (common in devicon brand marks)
    // with the tint so dark-on-dark icons remain visible.
    inner = inner.replace(/fill=["']#([0-9a-f]{3,8})["']/gi, (match, hex) => {
      const h = hex.length === 3
        ? hex.split('').map((c: string) => c + c).join('')
        : hex.length >= 6 ? hex.slice(0, 6) : hex;
      if (h.length !== 6) return match;
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const luma = (r * 0.299 + g * 0.587 + b * 0.114);
      return luma < 60 ? `fill="${tool.tint}"` : match;
    });
    inner = inner.replace(/fill=["'](black|#000)["']/gi, `fill="${tool.tint}"`);
  }

  // Namespace ids/refs so concurrent symbols don't collide.
  const prefix = `t-${tool.slug}`;
  const idMap = new Map<string, string>();
  inner = inner.replace(/\sid=["']([^"']+)["']/g, (_, id) => {
    const next = `${prefix}-${id}`;
    idMap.set(id, next);
    return ` id="${next}"`;
  });
  inner = inner.replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${idMap.get(id) || `${prefix}-${id}`})`);
  inner = inner.replace(/(\s(?:xlink:)?href)=["']#([^"']+)["']/g, (_, attr, id) => `${attr}="#${idMap.get(id) || `${prefix}-${id}`}"`);

  // Wrap inner in a <g> carrying the outer SVG's paint attributes so they survive.
  const paintAttrs = [
    rootFill ? `fill="${rootFill}"` : '',
    rootStroke ? `stroke="${rootStroke}"` : '',
  ].filter(Boolean).join(' ');
  if (paintAttrs) inner = `<g ${paintAttrs}>${inner}</g>`;

  return { viewBox, body: inner };
}

async function renderStack(): Promise<string> {
  const W = 920;
  const padX = 24;
  const headerH = 96;
  const rowGap = 22;

  // Tile geometry — icon LEFT, label RIGHT (wide+short tiles)
  const tileW = 210;
  const tileH = 56;
  const iconSize = 36;
  const iconLeftPad = 12;
  const labelLeftPad = iconLeftPad + iconSize + 14;   // = 62
  const labelRightPad = 12;
  const labelArea = tileW - labelLeftPad - labelRightPad; // = 136
  const tilesPerRow = 4;
  const tileGap = 10;
  const sectionHeaderH = 50;
  const subRowGap = 12;

  const rows = [
    { tools: TOOLS[0].tools, color: C.cyan,   label: 'LANGUAGES · FRAMEWORK' },
    { tools: TOOLS[1].tools, color: C.violet, label: 'AI · LLM · AGENTS · RAG' },
    { tools: TOOLS[2].tools, color: '#34d399', label: 'DATA · STREAMING' },
    { tools: TOOLS[3].tools, color: C.amber,  label: 'CLOUD · DEVOPS · TESTING' },
  ];

  // Pre-fetch all icons (parallel)
  const fetched = await Promise.all(rows.flatMap((r) => r.tools).map((t) => fetchIconSvg(t).then((res) => ({ t, res }))));
  const lookup = new Map(fetched.map((f) => [f.t.slug, f.res]));

  const symbols: string[] = [];
  for (const { t, res } of fetched) {
    if (res) symbols.push(`<symbol id="ic-${t.slug}" viewBox="${res.viewBox}">${res.body}</symbol>`);
  }

  let cursorY = headerH;
  const rowSvgs: string[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const n = row.tools.length;

    // Section header — 22px so it stays bigger than the 20px tile labels
    const headerY = cursorY + 28;
    const labelTextW = row.label.length * 14;
    const sectionHeader = `
      <text x="${padX}" y="${headerY}" font-family="${C.mono}" font-size="22" font-weight="600" fill="${row.color}" letter-spacing="2">▮ ${esc(row.label)}</text>
      <line x1="${padX + labelTextW + 36}" y1="${headerY - 7}" x2="${W - padX - 120}" y2="${headerY - 7}" stroke="${C.line}"/>
      <text x="${W - padX}" y="${headerY}" text-anchor="end" font-family="${C.mono}" font-size="14" fill="${C.dim}" letter-spacing="2">${String(n).padStart(2, '0')} TOOLS</text>`;
    cursorY += sectionHeaderH;

    // Chunk tools into rows of tilesPerRow
    const subRows: typeof row.tools[] = [];
    for (let i = 0; i < n; i += tilesPerRow) {
      subRows.push(row.tools.slice(i, i + tilesPerRow));
    }

    const tiles: string[] = [];
    let tileCursorY = cursorY;
    for (let si = 0; si < subRows.length; si++) {
      const sub = subRows[si];
      const subN = sub.length;
      const totalW = subN * tileW + (subN - 1) * tileGap;
      const startX = (W - totalW) / 2;

      for (let i = 0; i < subN; i++) {
        const tool = sub[i];
        const globalI = si * tilesPerRow + i;
        const phase = (globalI / n) * 3.6;
        const haloDur = 3.6;

        const tx = startX + i * (tileW + tileGap);
        const ty = tileCursorY;

        const res = lookup.get(tool.slug);
        const chipText = tool.icon.startsWith('text:') ? tool.icon.slice(5) : null;
        const iconNode = res
          ? `<use href="#ic-${tool.slug}" x="${iconLeftPad}" y="${(tileH - iconSize) / 2}" width="${iconSize}" height="${iconSize}"/>`
          : (() => {
              const t = chipText || tool.label;
              const fs = t.length <= 2 ? 22 : t.length === 3 ? 18 : t.length === 4 ? 15 : 12;
              return `<g transform="translate(${iconLeftPad + iconSize / 2} ${tileH / 2})">
                <text text-anchor="middle" dominant-baseline="central" font-family="${C.mono}" font-size="${fs}" font-weight="700" fill="${row.color}" letter-spacing="1">${esc(t)}</text>
              </g>`;
            })();

        // Label sits to right of icon, vertically centered.
        // Auto-shrink so long names stay within labelArea (136px).
        const ll = tool.label.length;
        const labelFontSize = ll <= 10 ? 20 : ll <= 12 ? 18 : ll <= 14 ? 16 : 14;
        const labelY = tileH / 2 + labelFontSize * 0.35;

        tiles.push(`<g transform="translate(${tx} ${ty})">
          <rect x="-2" y="-2" width="${tileW + 4}" height="${tileH + 4}" rx="11" fill="${row.color}" opacity="0">
            <animate attributeName="opacity" values="0;0.16;0" keyTimes="0;0.5;1" dur="${haloDur}s" begin="-${phase.toFixed(2)}s" repeatCount="indefinite"/>
          </rect>
          <rect width="${tileW}" height="${tileH}" rx="10" fill="${C.panel}" stroke="${C.line}"/>
          <circle cx="${iconLeftPad + iconSize / 2}" cy="${tileH / 2}" r="${iconSize / 2 - 2}" fill="${C.ink}" opacity="0.06"/>
          <rect x="10" y="2" width="${tileW - 20}" height="1.5" rx="1" fill="${row.color}" opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.9;0.2" keyTimes="0;0.5;1" dur="${haloDur}s" begin="-${phase.toFixed(2)}s" repeatCount="indefinite"/>
          </rect>
          ${iconNode}
          ${chipText ? '' : `<text x="${labelLeftPad}" y="${labelY}" font-family="${C.sans}" font-size="${labelFontSize}" font-weight="500" fill="${C.ink}" opacity="0.94">${esc(tool.label)}</text>`}
        </g>`);
      }

      tileCursorY += tileH + (si < subRows.length - 1 ? subRowGap : 0);
    }

    // Data-flow rail at bottom of the category
    const railY = tileCursorY + 18;
    const rail = `
      <line x1="${padX}" y1="${railY}" x2="${W - padX}" y2="${railY}" stroke="${C.line}"/>
      <circle r="2.5" fill="${row.color}" cy="${railY}">
        <animate attributeName="cx" from="${padX}" to="${W - padX}" dur="${6 + ri * 1.4}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="${6 + ri * 1.4}s" repeatCount="indefinite"/>
      </circle>`;

    rowSvgs.push(`${sectionHeader}${tiles.join('')}${rail}`);
    cursorY = railY + rowGap + 6;
  }

  const H = cursorY + 24;

  // Full-panel scanline that sweeps L→R every 9s
  const scanline = `
    <g opacity="0.55">
      <rect x="-40" y="${headerH - 8}" width="80" height="${H - headerH - 8}" fill="url(#vscan)">
        <animate attributeName="x" from="-80" to="${W}" dur="9s" repeatCount="indefinite"/>
      </rect>
    </g>`;

  const defs = `
    <linearGradient id="vscan" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.cyan}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${C.cyan}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${C.cyan}" stop-opacity="0"/>
    </linearGradient>
    ${symbols.join('\n')}`;

  // HUD frame — bumped so mobile reading stays oriented
  const hud = `
    <g font-family="${C.mono}" letter-spacing="1.5">
      <text x="24" y="36" font-size="20" font-weight="700" fill="${C.ink}">▮ STACK_MAP</text>
      <text x="184" y="36" font-size="14" fill="${C.cyan}">ACTIVE</text>
      <text x="24" y="60" font-size="13" fill="${C.dim}">active toolkit · grouped by layer</text>
      <text x="${W - 24}" y="36" text-anchor="end" font-size="14" fill="${C.dim}">${rows.reduce((a, r) => a + r.tools.length, 0)} NODES</text>
      <g stroke="${C.cyan}" stroke-width="1.2" fill="none">
        <path d="M16 80 L16 100 M16 80 L36 80"/>
        <path d="M${W - 16} 80 L${W - 16} 100 M${W - 16} 80 L${W - 36} 80"/>
        <path d="M16 ${H - 16} L16 ${H - 36} M16 ${H - 16} L36 ${H - 16}"/>
        <path d="M${W - 16} ${H - 16} L${W - 16} ${H - 36} M${W - 16} ${H - 16} L${W - 36} ${H - 16}"/>
      </g>
      <line x1="24" y1="72" x2="${W - 24}" y2="72" stroke="${C.line}"/>
    </g>`;

  return svgRoot(W, H, defs, `${scanline}${rowSvgs.join('')}${hud}`);
}

// =========================  TERMINAL  =========================
// Mobile scale: source 28px ≈ 11px on a 360px column (920·0.39).
// Stack-matching darkness: inner panel uses C.panel (#0c1018), same as stack tiles.
// "Interactivity" is simulated via SMIL — no JS survives GitHub's camo proxy:
//   • per-line typewriter wipe (one clipPath animate per line)
//   • blinking cursor that lands after the last line reveals
//   • chrome badge that cycles through 3 status messages (calcMode="discrete")
//   • pulsing connection LED + opacity-breathing chrome corner brackets
//   • CTA arrow nudge on the final "click to connect ↗" line
function renderTerminal(p: Profile) {
  const W = 920;
  type Entry = { kind: 'cmd' | 'out' | 'ready'; text: string };
  const displayName = p.name || 'Brian Nathanael';
  const entries: Entry[] = [
    { kind: 'cmd', text: 'whoami' },
    { kind: 'out', text: `${displayName} · AI/ML Consultant` },
    { kind: 'cmd', text: 'pitch' },
    { kind: 'out', text: 'complex problems → cutting-edge AI' },
    { kind: 'cmd', text: 'obsessed_with' },
    { kind: 'out', text: 'multi-agent · llm tuning · rag pipelines' },
    { kind: 'cmd', text: 'ethos' },
    { kind: 'out', text: 'driven · curious · ship & learn' },
    { kind: 'ready', text: 'open to collaborations · click to connect' },
  ];

  const fontSize = 28;             // 28·0.39 ≈ 11px on mobile
  const lineH = 42;
  const padX = 36;
  const promptOffset = 36;         // gap between $/> and the text
  const charW = fontSize * 0.6;    // SF-Mono-ish width estimate
  const chromeBottomY = 84;
  const padTopContent = chromeBottomY + 54;
  const padBottom = 56;
  const H = padTopContent + entries.length * lineH + padBottom;

  const REVEAL_DUR = 0.4;
  const STAGGER = 0.35;
  const finalRevealTime = (entries.length - 1) * STAGGER + REVEAL_DUR;

  // ----- DEFS: per-line typewriter clipPaths -----
  const clipDefs = entries.map((e, i) => {
    const y = padTopContent + i * lineH;
    const wipeW = (e.text.length + 6) * charW + promptOffset;
    return `<clipPath id="tw-${i}">
      <rect x="${padX - 6}" y="${y - fontSize}" height="${fontSize * 1.5}" width="0">
        <animate attributeName="width" from="0" to="${wipeW.toFixed(0)}" begin="${(i * STAGGER).toFixed(2)}s" dur="${REVEAL_DUR}s" fill="freeze"/>
      </rect>
    </clipPath>`;
  }).join('');

  const defs = `${clipDefs}`;

  // ----- CHROME: window frame + mac dots + title + divider + corner brackets -----
  const chrome = `
    <rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="14" fill="${C.panel}" stroke="${C.line}"/>
    <circle cx="50" cy="48" r="9" fill="${C.rose}"/>
    <circle cx="78" cy="48" r="9" fill="${C.amber}"/>
    <circle cx="106" cy="48" r="9" fill="${C.cyan}"/>
    <text x="${W / 2}" y="56" text-anchor="middle" font-family="${C.mono}" font-size="22" fill="${C.dim}" letter-spacing="2">brian@nb-11</text>
    <line x1="20" y1="${chromeBottomY}" x2="${W - 20}" y2="${chromeBottomY}" stroke="${C.line}"/>
    <g stroke="${C.cyan}" stroke-width="1.2" fill="none" opacity="0.65">
      <animate attributeName="opacity" values="0.35;0.9;0.35" dur="4.2s" repeatCount="indefinite"/>
      <path d="M28 ${chromeBottomY + 10} L28 ${chromeBottomY + 30} M28 ${chromeBottomY + 10} L48 ${chromeBottomY + 10}"/>
      <path d="M${W - 28} ${chromeBottomY + 10} L${W - 28} ${chromeBottomY + 30} M${W - 28} ${chromeBottomY + 10} L${W - 48} ${chromeBottomY + 10}"/>
      <path d="M28 ${H - 24} L28 ${H - 44} M28 ${H - 24} L48 ${H - 24}"/>
      <path d="M${W - 28} ${H - 24} L${W - 28} ${H - 44} M${W - 28} ${H - 24} L${W - 48} ${H - 24}"/>
    </g>`;

  // ----- CHROME RIGHT: pulsing LED + cycling status badge -----
  const ledX = W - 280;
  const pulseLed = `
    <circle cx="${ledX}" cy="50" r="6" fill="${C.cyan}">
      <animate attributeName="opacity" values="1;0.35;1" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="r" values="5.5;7;5.5" dur="2s" repeatCount="indefinite"/>
    </circle>`;
  const states = ['SECURE_TTY · ONLINE', 'UPLINK · STABLE', 'AUTH · 0xNB-7'];
  const badgeCycle = 9;            // 3s per state
  const stateBadge = states.map((s, i) => {
    const values = i === 0 ? '1;0;0' : i === 1 ? '0;1;0' : '0;0;1';
    const keyTimes = '0;0.333;0.666';
    const initOp = i === 0 ? 1 : 0;
    return `<text x="${W - 36}" y="56" text-anchor="end" font-family="${C.mono}" font-size="18" fill="${C.cyan}" letter-spacing="2" opacity="${initOp}">
      <animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}" calcMode="discrete" dur="${badgeCycle}s" repeatCount="indefinite"/>
      [${esc(s)}]
    </text>`;
  }).join('');

  // ----- CONTENT LINES: each wrapped in its typewriter clipPath -----
  const lines = entries.map((e, i) => {
    const y = padTopContent + i * lineH;
    const cp = `clip-path="url(#tw-${i})"`;
    if (e.kind === 'cmd') {
      return `<g ${cp}>
        <text x="${padX}" y="${y}" font-family="${C.mono}" font-size="${fontSize}" fill="${C.dim}">$</text>
        <text x="${padX + promptOffset}" y="${y}" font-family="${C.mono}" font-size="${fontSize}" fill="${C.cyan}" font-weight="500">${esc(e.text)}</text>
      </g>`;
    }
    if (e.kind === 'ready') {
      // CTA line: prompt arrow + amber text + nudging ↗ to hint at clickability
      return `<g ${cp}>
        <text x="${padX}" y="${y}" font-family="${C.mono}" font-size="${fontSize}" fill="${C.dim}">&gt;</text>
        <text x="${padX + promptOffset}" y="${y}" font-family="${C.mono}" font-size="${fontSize}" fill="${C.amber}" font-weight="500">${esc(e.text)}</text>
        <g transform="translate(${padX + promptOffset + (e.text.length + 1) * charW} ${y})">
          <text font-family="${C.mono}" font-size="${fontSize}" fill="${C.amber}" font-weight="600">↗
            <animateTransform attributeName="transform" type="translate" values="0 0;4 -4;0 0" dur="1.6s" begin="${(finalRevealTime + 0.2).toFixed(2)}s" repeatCount="indefinite"/>
          </text>
        </g>
      </g>`;
    }
    return `<g ${cp}>
      <text x="${padX + promptOffset}" y="${y}" font-family="${C.mono}" font-size="${fontSize}" fill="${C.ink}">${esc(e.text)}</text>
    </g>`;
  }).join('');

  // ----- CURSOR: lands at end of last line, then blinks forever -----
  const last = entries[entries.length - 1];
  // last line is ready: prompt + offset + text + space for ↗ + a bit
  const cursorX = padX + promptOffset + (last.text.length + 3) * charW;
  const cursorY = padTopContent + (entries.length - 1) * lineH;
  const cursor = `
    <text x="${cursorX}" y="${cursorY}" font-family="${C.mono}" font-size="${fontSize}" fill="${C.cyan}" opacity="0">
      <animate attributeName="opacity" from="0" to="1" begin="${(finalRevealTime + 0.05).toFixed(2)}s" dur="0.2s" fill="freeze"/>
      <animate attributeName="opacity" values="1;0;1" dur="1.1s" begin="${(finalRevealTime + 0.45).toFixed(2)}s" repeatCount="indefinite"/>
      ▌
    </text>`;

  return svgRoot(W, H, defs, `${chrome}${pulseLed}${stateBadge}${lines}${cursor}`);
}



function assertValidSvg(name: string, svg: string) {
  // Cheap well-formedness checks for generated SVG strings.
  // 1) every attr value should not contain an unescaped " inside another "..."
  // 2) opening tag count should match closing tag count for elements we use
  const lines = svg.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/="[^"]*"[^"\s>][^=]*"/);
    if (m) {
      throw new Error(`[${name}] line ${i + 1}: suspicious attribute (embedded quote?): ${m[0].slice(0, 80)}`);
    }
  }
}

async function main() {
  const profile: Profile = {
    name: CONFIG.name,
    login: CONFIG.login,
    headline: CONFIG.headline,
    generatedAt: new Date().toISOString(),
  };
  mkdirSync(ASSETS, { recursive: true });

  const terminal = renderTerminal(profile);
  const stack = await renderStack();

  for (const [n, s] of [['terminal', terminal], ['stack', stack]] as const) {
    assertValidSvg(n, s);
  }

  writeFileSync(join(ASSETS, 'terminal.svg'), terminal);
  writeFileSync(join(ASSETS, 'stack.svg'), stack);

  console.log(`[render-static] wrote terminal.svg + stack.svg → ${ASSETS}`);
  console.log(`[render-static] (archive.svg + README.md are regenerated by generate_readme.js)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
