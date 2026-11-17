import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const ITEMS_DIR = path.join(PUBLIC_DIR, 'item');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');

const FALLBACK_DEALS = [
  {
    title: 'Cyberpunk 2077: Ultimate Tech Bundle',
    dealID: 'fallback-deal-1',
    salePrice: '23.99',
    normalPrice: '59.99',
    savings: '60',
    steamRatingPercent: '92',
    steamRatingText: 'Very Positive',
    metacriticScore: '86',
    thumb: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
    directUrl: 'https://www.cheapshark.com/'
  },
  {
    title: 'Factorio Automation Architect Edition',
    dealID: 'fallback-deal-2',
    salePrice: '17.50',
    normalPrice: '35.00',
    savings: '50',
    steamRatingPercent: '97',
    steamRatingText: 'Overwhelmingly Positive',
    metacriticScore: '90',
    thumb: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
    directUrl: 'https://www.cheapshark.com/'
  },
  {
    title: 'Hades II Digital Action Suite',
    dealID: 'fallback-deal-3',
    salePrice: '14.99',
    normalPrice: '29.99',
    savings: '50',
    steamRatingPercent: '95',
    steamRatingText: 'Overwhelmingly Positive',
    metacriticScore: '89',
    thumb: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    directUrl: 'https://www.cheapshark.com/'
  }
];

const FALLBACK_AI_TOOLS = [
  {
    title: 'n8n-io/n8n — Fair-Code Workflow Automation',
    description: 'Extensible workflow automation platform with native AI agent capabilities, 400+ integrations, and self-hosting.',
    url: 'https://github.com/n8n-io/n8n',
    stars: 55000,
    language: 'TypeScript',
    source: 'GitHub AI'
  },
  {
    title: 'langflow-ai/langflow — Visual AI Agent Builder',
    description: 'Low-code visual builder for deploying multi-agent workflows, RAG pipelines, and custom APIs rapidly.',
    url: 'https://github.com/langflow-ai/langflow',
    stars: 42000,
    language: 'Python',
    source: 'GitHub AI'
  },
  {
    title: 'Building Zero-Cost AI Micro-SaaS Pipelines',
    description: 'Architectural blueprint for running serverless AI tools and scheduled static generators without monthly server bills.',
    url: 'https://dev.to/t/ai',
    stars: 1200,
    language: 'JavaScript',
    source: 'Dev.to AI'
  }
];

const FALLBACK_JOBS = [
  {
    title: 'AI Automation Engineer (Remote / Async)',
    company: 'Global Cloud Studio',
    location: 'Worldwide Remote',
    tags: ['Remote', 'AI Agents', 'Node.js', 'Python'],
    url: 'https://www.arbeitnow.com/'
  },
  {
    title: 'Technical SEO & Growth Engineer',
    company: 'ScaleStack Labs',
    location: 'Remote (US/EU)',
    tags: ['Remote', 'Programmatic SEO', 'Analytics'],
    url: 'https://www.arbeitnow.com/'
  }
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text, suffix = '') {
  const base = String(text ?? 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const cleanSuffix = String(suffix).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8);
  return cleanSuffix ? `${base || 'item'}-${cleanSuffix}` : (base || 'item');
}

function appendQueryParams(rawUrl, params) {
  try {
    const parsed = new URL(rawUrl);
    for (const [key, val] of Object.entries(params)) {
      if (val) parsed.searchParams.set(key, String(val));
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

async function fetchJsonWithTimeout(url, headers = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AutoPulse-Radar/1.0 (+https://github.com)',
        ...headers
      },
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDeals(sourcesCfg, monetization) {
  const maxPrice = sourcesCfg?.cheapSharkMaxPrice ?? 40;
  const limit = sourcesCfg?.cheapSharkLimit ?? 24;
  const url = `https://www.cheapshark.com/api/1.0/deals?upperPrice=${maxPrice}&pageSize=${limit}&onSale=1`;

  let rawDeals = [];
  let status = 'live';
  try {
    const data = await fetchJsonWithTimeout(url);
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty deals array');
    rawDeals = data;
  } catch (err) {
    console.warn(`[Deals] Live fetch failed (${err.message}), using fallback dataset.`);
    rawDeals = FALLBACK_DEALS;
    status = 'fallback';
  }

  const items = rawDeals.map((d, idx) => {
    const title = d.title || `Software & Game Deal #${idx + 1}`;
    const savingsPct = Math.round(Number(d.savings || 0));
    const salePrice = Number(d.salePrice || 0).toFixed(2);
    const normalPrice = Number(d.normalPrice || salePrice).toFixed(2);
    const directBase = d.directUrl || `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID || '')}`;
    const encodedQuery = encodeURIComponent(title);

    return {
      id: `deal-${idx + 1}`,
      slug: slugify(title, `deal-${idx + 1}`),
      category: 'deal',
      categoryLabel: 'Flash Deal',
      title,
      subtitle: `${savingsPct}% OFF — $${salePrice} (Reg. $${normalPrice})`,
      description: `${title} is currently discounted by ${savingsPct}% down to $${salePrice} from $${normalPrice}. Rating: ${d.steamRatingText || 'Verified'} (${d.steamRatingPercent || '85'}%).`,
      badge: `-${savingsPct}%`,
      metricPrimary: `$${salePrice}`,
      metricSecondary: `Was $${normalPrice}`,
      ratingText: d.steamRatingText || 'Positive',
      ratingScore: Number(d.steamRatingPercent || d.metacriticScore || 85),
      thumb: d.thumb || '',
      outboundUrl: appendQueryParams(directBase, { utm_source: 'autopulse', utm_medium: 'radar' }),
      partnerLinks: [
        {
          label: 'Instant Gaming Price Check',
          url: `https://www.instant-gaming.com/en/search/?q=${encodedQuery}&igr=${encodeURIComponent(monetization.instantGamingAffiliateId || 'gamer-pulse')}`
        },
        {
          label: 'G2A Global Key Check',
          url: `https://www.g2a.com/search?query=${encodedQuery}&ref=${encodeURIComponent(monetization.g2aAffiliateId || 'autopulse')}`
        },
        {
          label: 'Amazon Digital / Gear',
          url: `https://www.amazon.com/s?k=${encodedQuery}&tag=${encodeURIComponent(monetization.amazonAssociateTag || 'autopulse-20')}`
        }
      ],
      pros: [
        `Save ${savingsPct}% ($${(Number(normalPrice) - Number(salePrice)).toFixed(2)}) compared to retail price`,
        `Verified community score: ${d.steamRatingPercent || '85'}% (${d.steamRatingText || 'Positive'})`,
        'Instant digital delivery with global comparison options'
      ],
      cons: [
        'Flash discount window can expire within hours',
        'Regional activation rules may vary by storefront'
      ]
    };
  });

  return { items, status };
}

async function fetchAiTools(sourcesCfg) {
  const ghLimit = sourcesCfg?.githubAiLimit ?? 15;
  const devLimit = sourcesCfg?.devtoAiLimit ?? 12;
  const collected = [];
  let ghStatus = 'live';
  let devStatus = 'live';

  try {
    const ghUrl = `https://api.github.com/search/repositories?q=topic:ai+stars:>1000&sort=updated&per_page=${ghLimit}`;
    const ghData = await fetchJsonWithTimeout(ghUrl, { Accept: 'application/vnd.github+json' });
    for (const repo of (ghData.items || [])) {
      collected.push({
        title: repo.full_name,
        description: repo.description || 'Open-source AI automation and developer toolkit trending on GitHub.',
        url: repo.html_url,
        stars: repo.stargazers_count || 1000,
        language: repo.language || 'AI / Multi',
        source: 'GitHub AI'
      });
    }
  } catch (err) {
    console.warn(`[GitHub AI] Live fetch failed (${err.message}).`);
    ghStatus = 'fallback';
  }

  try {
    const devUrl = `https://dev.to/api/articles?tag=ai&top=7&per_page=${devLimit}`;
    const devData = await fetchJsonWithTimeout(devUrl);
    if (Array.isArray(devData)) {
      for (const art of devData) {
        collected.push({
          title: art.title,
          description: art.description || 'Trending AI engineering guide and automation breakdown from Dev.to.',
          url: art.url,
          stars: art.positive_reactions_count || 50,
          language: (art.tag_list || ['ai']).slice(0, 2).join(', '),
          source: 'Dev.to AI'
        });
      }
    }
  } catch (err) {
    console.warn(`[Dev.to AI] Live fetch failed (${err.message}).`);
    devStatus = 'fallback';
  }

  const rawList = collected.length > 0 ? collected : FALLBACK_AI_TOOLS;
  const items = rawList.map((tool, idx) => ({
    id: `ai-${idx + 1}`,
    slug: slugify(tool.title, `ai-${idx + 1}`),
    category: 'ai',
    categoryLabel: tool.source,
    title: tool.title,
    subtitle: `${tool.source} • ${tool.language} • ${Number(tool.stars).toLocaleString('en-US')} signals`,
    description: tool.description,
    badge: tool.source === 'GitHub AI' ? `★ ${Number(tool.stars).toLocaleString('en-US')}` : `♥ ${tool.stars}`,
    metricPrimary: tool.language,
    metricSecondary: `${Number(tool.stars).toLocaleString('en-US')} Stars/Reactions`,
    ratingText: tool.source,
    ratingScore: Number(tool.stars || 100),
    thumb: '',
    outboundUrl: appendQueryParams(tool.url, { utm_source: 'autopulse', utm_medium: 'ai-radar' }),
    partnerLinks: [],
    pros: [
      `Active community traction (${Number(tool.stars).toLocaleString('en-US')} stars/reactions)`,
      'Zero upfront license cost to inspect and prototype',
      'Easily pairable with cloud cron jobs and serverless automation'
    ],
    cons: [
      'Requires basic configuration or hosting environment',
      'Open-source tools move fast — verify version compatibility'
    ]
  }));

  return {
    items,
    status: ghStatus === 'live' || devStatus === 'live' ? 'live' : 'fallback'
  };
}

async function fetchRemoteJobs(sourcesCfg) {
  const limit = sourcesCfg?.remoteJobsLimit ?? 15;
  let rawJobs = [];
  let status = 'live';

  try {
    const data = await fetchJsonWithTimeout('https://www.arbeitnow.com/api/job-board-api');
    const list = Array.isArray(data?.data) ? data.data : [];
    const remoteFirst = [
      ...list.filter((j) => j.remote),
      ...list.filter((j) => !j.remote)
    ];
    if (remoteFirst.length === 0) throw new Error('Empty jobs list');
    rawJobs = remoteFirst.slice(0, limit).map((j) => ({
      title: j.title,
      company: j.company_name || 'Remote Employer',
      location: j.remote ? `Remote (${j.location || 'Global'})` : (j.location || 'Global'),
      tags: Array.isArray(j.tags) && j.tags.length > 0 ? j.tags.slice(0, 4) : ['Tech', 'Remote'],
      url: j.url
    }));
  } catch (err) {
    console.warn(`[Jobs] Live fetch failed (${err.message}), using fallback dataset.`);
    rawJobs = FALLBACK_JOBS;
    status = 'fallback';
  }

  const items = rawJobs.map((job, idx) => ({
    id: `job-${idx + 1}`,
    slug: slugify(`${job.title}-${job.company}`, `job-${idx + 1}`),
    category: 'job',
    categoryLabel: 'Remote Job',
    title: job.title,
    subtitle: `${job.company} • ${job.location}`,
    description: `Hiring at ${job.company} (${job.location}). Skills & tags: ${job.tags.join(', ')}.`,
    badge: job.location.toLowerCase().includes('remote') ? 'REMOTE' : 'TECH',
    metricPrimary: job.company,
    metricSecondary: job.location,
    ratingText: job.tags.join(' • '),
    ratingScore: 90,
    thumb: '',
    outboundUrl: appendQueryParams(job.url, { utm_source: 'autopulse', utm_medium: 'jobs-radar' }),
    partnerLinks: [],
    pros: [
      `Direct application listing at ${job.company}`,
      `Tagged stack: ${job.tags.join(', ')}`,
      'Updated automatically every 6 hours'
    ],
    cons: [
      'Competitive global applicant pool — tailor resume keywords',
      'Check timezone overlap requirements before applying'
    ]
  }));

  return { items, status };
}

function getBaseStyles() {
  return `
  <style>
    :root {
      --bg: #070b14;
      --surface: #0f172a;
      --surface-2: #162033;
      --border: #1e293b;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --accent-2: #10b981;
      --warn: #f59e0b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: radial-gradient(circle at top right, #0f1f3a 0%, var(--bg) 45%);
      color: var(--text);
      line-height: 1.6;
    }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 1180px; margin: 0 auto; padding: 0 20px; }
    header.topbar {
      border-bottom: 1px solid var(--border);
      background: rgba(7, 11, 20, 0.85);
      backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 50;
    }
    .topbar-inner {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 0; gap: 16px; flex-wrap: wrap;
    }
    .brand { font-weight: 800; font-size: 1.1rem; color: var(--text); display: flex; align-items: center; gap: 8px; }
    .brand-dot { width: 10px; height: 10px; border-radius: 999px; background: var(--accent-2); box-shadow: 0 0 12px var(--accent-2); }
    nav.nav-links { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; font-size: 0.92rem; }
    nav.nav-links a { color: var(--muted); font-weight: 500; }
    nav.nav-links a:hover { color: var(--text); text-decoration: none; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.92rem;
      border: 1px solid transparent; cursor: pointer; transition: transform .15s ease, opacity .15s ease;
    }
    .btn:hover { transform: translateY(-1px); text-decoration: none; opacity: 0.95; }
    .btn-primary { background: linear-gradient(135deg, #0ea5e9, #10b981); color: #041018; }
    .btn-secondary { background: var(--surface-2); color: var(--text); border-color: var(--border); }
    .hero { padding: 48px 0 32px; }
    .pill {
      display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 0.78rem;
      font-weight: 700; letter-spacing: 0.03em; background: rgba(16, 185, 129, 0.14);
      color: var(--accent-2); border: 1px solid rgba(16, 185, 129, 0.35);
    }
    h1 { font-size: clamp(1.8rem, 4vw, 2.9rem); line-height: 1.15; margin: 14px 0; letter-spacing: -0.02em; }
    .lead { color: var(--muted); font-size: 1.05rem; max-width: 760px; }
    .vault-banner {
      margin: 28px 0; padding: 26px; border-radius: 16px;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(16, 185, 129, 0.12));
      border: 1px solid rgba(56, 189, 248, 0.35);
      display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: center;
    }
    @media (max-width: 760px) { .vault-banner { grid-template-columns: 1fr; } }
    .controls {
      display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
      justify-content: space-between; margin: 28px 0 18px;
    }
    .tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .tab-btn {
      padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border);
      background: var(--surface); color: var(--muted); font-weight: 600; cursor: pointer;
    }
    .tab-btn.active { background: var(--accent); color: #041018; border-color: var(--accent); }
    .search-input {
      background: var(--surface); border: 1px solid var(--border); color: var(--text);
      padding: 10px 14px; border-radius: 10px; min-width: 260px; font-size: 0.95rem;
    }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 18px;
    }
    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
      padding: 18px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;
    }
    .card:hover { border-color: #334155; }
    .card-thumb { width: 100%; height: 145px; object-fit: cover; border-radius: 10px; background: #0b1220; }
    .card-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
    .badge {
      font-size: 0.75rem; font-weight: 800; padding: 3px 9px; border-radius: 6px;
      background: rgba(56, 189, 248, 0.16); color: var(--accent);
    }
    .badge-deal { background: rgba(16, 185, 129, 0.18); color: var(--accent-2); }
    .badge-job { background: rgba(245, 158, 11, 0.18); color: var(--warn); }
    .card h3 { margin: 0; font-size: 1.05rem; line-height: 1.35; }
    .card p { margin: 0; color: var(--muted); font-size: 0.9rem; }
    .card-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
    .partner-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px; margin: 34px 0;
    }
    .partner-card {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 16px;
    }
    table.compare {
      width: 100%; border-collapse: collapse; margin: 18px 0; background: var(--surface);
      border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
    }
    table.compare th, table.compare td {
      padding: 12px 14px; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.92rem;
    }
    table.compare th { background: var(--surface-2); color: var(--accent); }
    footer.site-footer {
      border-top: 1px solid var(--border); margin-top: 56px; padding: 30px 0 48px;
      color: var(--muted); font-size: 0.85rem;
    }
    .hidden { display: none !important; }
  </style>`;
}

function renderPartnerStackHtml(monetization) {
  const banners = monetization.featuredAffiliateBanners || [];
  if (banners.length === 0) return '';

  const cards = banners.map((b) => `
    <div class="partner-card">
      <span class="badge">${escapeHtml(b.badge)}</span>
      <h3 style="margin:10px 0 6px;font-size:1rem;">${escapeHtml(b.title)}</h3>
      <p style="font-size:0.86rem;color:var(--muted);margin:0 0 12px;">${escapeHtml(b.description)}</p>
      <a class="btn btn-secondary" style="width:100%;" href="${escapeHtml(b.url)}" target="_blank" rel="sponsored noopener noreferrer">${escapeHtml(b.ctaText)}</a>
    </div>`).join('\n');

  return `
    <section aria-label="Recommended Cloud and AI Stack">
      <h2 style="margin:36px 0 8px;">⚡ Verified Automation & Creator Stack</h2>
      <p style="color:var(--muted);margin:0 0 14px;">Tools used to build, host, and scale automated micro-sites and AI workflows.</p>
      <div class="partner-grid">${cards}</div>
    </section>`;
}

function renderAdBannerHtml(monetization) {
  if (!monetization.aAdsUnitId) return '';
  const unitId = encodeURIComponent(monetization.aAdsUnitId);
  return `
    <div style="margin:24px 0;text-align:center;">
      <iframe data-aa="${escapeHtml(monetization.aAdsUnitId)}" src="https://ad.a-ads.com/${unitId}?size=728x90"
        style="width:728px;max-width:100%;height:90px;border:0;padding:0;overflow:hidden;background-color:transparent;" title="Sponsor Banner"></iframe>
    </div>`;
}

function renderIndexHtml(config, items, generatedIso, statusSummary) {
  const { monetization } = config;
  const cardsHtml = items.map((item) => {
    const badgeClass = item.category === 'deal' ? 'badge-deal' : (item.category === 'job' ? 'badge-job' : '');
    const thumbHtml = item.thumb
      ? `<img class="card-thumb" src="${escapeHtml(item.thumb)}" alt="${escapeHtml(item.title)}" loading="lazy" />`
      : '';
    const detailLink = item.hasDetailPage ? `<a class="btn btn-secondary" href="item/${escapeHtml(item.slug)}.html">Details &amp; Specs</a>` : '';

    return `
      <article class="card item-card" data-category="${escapeHtml(item.category)}" data-search="${escapeHtml((item.title + ' ' + item.description + ' ' + item.categoryLabel).toLowerCase())}">
        <div>
          ${thumbHtml}
          <div class="card-top" style="margin-top:${item.thumb ? '10px' : '0'};">
            <span class="badge ${badgeClass}">${escapeHtml(item.categoryLabel)}</span>
            <strong style="color:var(--accent-2);font-size:0.86rem;">${escapeHtml(item.badge)}</strong>
          </div>
          <h3 style="margin-top:8px;">${escapeHtml(item.title)}</h3>
          <p style="margin-top:6px;">${escapeHtml(item.subtitle)}</p>
        </div>
        <div class="card-actions">
          <a class="btn btn-primary" href="${escapeHtml(item.outboundUrl)}" target="_blank" rel="sponsored noopener noreferrer">Get Access →</a>
          ${detailLink}
        </div>
      </article>`;
  }).join('\n');

  const buyUrl = monetization.gumroadProductUrl && monetization.gumroadProductUrl !== '#vault-offer'
    ? monetization.gumroadProductUrl
    : '#vault-offer';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.siteName)}</title>
  <meta name="description" content="${escapeHtml(config.siteTagline)}" />
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(config.siteName)} RSS" href="feed.xml" />
  ${getBaseStyles()}
</head>
<body>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="index.html"><span class="brand-dot"></span> AutoPulse Radar</a>
      <nav class="nav-links">
        <a href="#feed">Live Feed (${items.length})</a>
        <a href="#vault-offer">AI Mega Vault (${escapeHtml(monetization.gumroadProductPrice)})</a>
        <a href="feed.xml">RSS</a>
        <a href="sitemap.xml">Sitemap</a>
        <a class="btn btn-secondary" href="setup-guide.html">⚙️ Kurulum &amp; Config</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <section class="hero">
      <span class="pill">AUTO-UPDATED EVERY 6 HOURS • ${escapeHtml(generatedIso.slice(0, 16).replace('T', ' '))} UTC</span>
      <h1>${escapeHtml(config.siteName)}</h1>
      <p class="lead">${escapeHtml(config.siteTagline)}</p>

      <div id="vault-offer" class="vault-banner">
        <div>
          <span class="pill" style="background:rgba(56,189,248,0.16);color:var(--accent);border-color:rgba(56,189,248,0.35);">DIGITAL DOWNLOAD • INSTANT ACCESS</span>
          <h2 style="margin:10px 0 6px;">${escapeHtml(monetization.gumroadProductTitle)}</h2>
          <p style="margin:0;color:var(--muted);">${escapeHtml(monetization.gumroadProductSubtitle)}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-width:210px;">
          <a class="btn btn-primary" href="${escapeHtml(buyUrl)}" ${buyUrl.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''}>
            Unlock Mega Vault (${escapeHtml(monetization.gumroadProductPrice)}) →
          </a>
          <span style="font-size:0.78rem;color:var(--muted);text-align:center;">Instant Gumroad PDF/HTML Delivery</span>
        </div>
      </div>

      ${renderAdBannerHtml(monetization)}
    </section>

    <section id="feed">
      <div class="controls">
        <div class="tabs" role="tablist">
          <button class="tab-btn active" data-filter="all">All (${items.length})</button>
          <button class="tab-btn" data-filter="deal">Flash Deals (${items.filter((i) => i.category === 'deal').length})</button>
          <button class="tab-btn" data-filter="ai">AI Tools &amp; Guides (${items.filter((i) => i.category === 'ai').length})</button>
          <button class="tab-btn" data-filter="job">Remote Jobs (${items.filter((i) => i.category === 'job').length})</button>
        </div>
        <input id="searchBox" class="search-input" type="search" placeholder="Filter deals, AI tools, or remote roles..." aria-label="Search items" />
      </div>

      <div id="itemsGrid" class="grid">
        ${cardsHtml}
      </div>
    </section>

    ${renderPartnerStackHtml(monetization)}
  </main>

  <footer class="site-footer">
    <div class="container">
      <p><strong>Affiliate &amp; Automation Disclosure:</strong> Some outbound links on ${escapeHtml(config.siteName)} are affiliate or referral links. We may earn a commission at zero extra cost to you. Content is refreshed autonomously via GitHub Actions.</p>
      <p>Sources Status — Deals: ${escapeHtml(statusSummary.deals)} | AI Tools: ${escapeHtml(statusSummary.ai)} | Remote Jobs: ${escapeHtml(statusSummary.jobs)} • <a href="setup-guide.html">Owner Setup Guide</a></p>
    </div>
  </footer>

  <script>
    (function () {
      var activeFilter = 'all';
      var searchInput = document.getElementById('searchBox');
      var cards = Array.from(document.querySelectorAll('.item-card'));
      var tabs = Array.from(document.querySelectorAll('.tab-btn'));

      function applyFilters() {
        var q = (searchInput.value || '').trim().toLowerCase();
        cards.forEach(function (card) {
          var catMatch = activeFilter === 'all' || card.dataset.category === activeFilter;
          var textMatch = !q || (card.dataset.search || '').includes(q);
          card.classList.toggle('hidden', !(catMatch && textMatch));
        });
      }

      tabs.forEach(function (btn) {
        btn.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('active'); });
          btn.classList.add('active');
          activeFilter = btn.dataset.filter;
          applyFilters();
        });
      });

      searchInput.addEventListener('input', applyFilters);
    })();
  </script>
</body>
</html>`;
}

function renderItemDetailHtml(config, item, generatedIso) {
  const { monetization } = config;
  const canonical = `${config.siteUrl.replace(/\/$/, '')}/item/${item.slug}.html`;
  const buyUrl = monetization.gumroadProductUrl && monetization.gumroadProductUrl !== '#vault-offer'
    ? monetization.gumroadProductUrl
    : '../index.html#vault-offer';

  const schemaType = item.category === 'deal'
    ? 'Product'
    : (item.category === 'job' ? 'JobPosting' : 'SoftwareApplication');

  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: item.title,
      description: item.description,
      url: canonical
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is ${item.title}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.description
          }
        },
        {
          '@type': 'Question',
          name: `Is ${item.title} verified and up to date?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. AutoPulse Radar updates this entry automatically every 6 hours. Last verified: ${generatedIso}.`
          }
        }
      ]
    }
  ];

  const partnerButtons = (item.partnerLinks || []).map((p) =>
    `<a class="btn btn-secondary" href="${escapeHtml(p.url)}" target="_blank" rel="sponsored noopener noreferrer">${escapeHtml(p.label)} →</a>`
  ).join('\n');

  const prosList = (item.pros || []).map((p) => `<li>✅ ${escapeHtml(p)}</li>`).join('');
  const consList = (item.cons || []).map((c) => `<li>⚠️ ${escapeHtml(c)}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(item.title)} — Review, Specs &amp; Best Deal | AutoPulse Radar</title>
  <meta name="description" content="${escapeHtml(item.description.slice(0, 155))}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  ${getBaseStyles()}
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>
<body>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="../index.html"><span class="brand-dot"></span> AutoPulse Radar</a>
      <nav class="nav-links">
        <a href="../index.html">← Back to Live Radar</a>
        <a href="../setup-guide.html">Owner Setup</a>
      </nav>
    </div>
  </header>

  <main class="container" style="padding-top:36px;">
    <span class="pill">${escapeHtml(item.categoryLabel)} • ${escapeHtml(item.badge)}</span>
    <h1>${escapeHtml(item.title)}</h1>
    <p class="lead">${escapeHtml(item.description)}</p>

    <div style="display:flex;gap:12px;flex-wrap:wrap;margin:22px 0;">
      <a class="btn btn-primary" href="${escapeHtml(item.outboundUrl)}" target="_blank" rel="sponsored noopener noreferrer">Go to Official Offer / Resource →</a>
      ${partnerButtons}
    </div>

    <table class="compare">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Current Verified Value</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Category</td><td>${escapeHtml(item.categoryLabel)}</td></tr>
        <tr><td>Primary Highlight</td><td><strong>${escapeHtml(item.metricPrimary)}</strong></td></tr>
        <tr><td>Benchmark / Reference</td><td>${escapeHtml(item.metricSecondary)}</td></tr>
        <tr><td>Community / Quality Signal</td><td>${escapeHtml(item.ratingText)}</td></tr>
        <tr><td>Last Auto-Verification</td><td>${escapeHtml(generatedIso)}</td></tr>
      </tbody>
    </table>

    <div class="partner-grid">
      <div class="card">
        <h3>Key Strengths</h3>
        <ul style="padding-left:18px;margin:0;color:var(--muted);">${prosList}</ul>
      </div>
      <div class="card">
        <h3>Things to Consider</h3>
        <ul style="padding-left:18px;margin:0;color:var(--muted);">${consList}</ul>
      </div>
    </div>

    <section class="card" style="margin-top:20px;">
      <h3>Frequently Asked Questions</h3>
      <p><strong>What is ${escapeHtml(item.title)}?</strong><br />${escapeHtml(item.description)}</p>
      <p style="margin-top:10px;"><strong>How frequently is pricing or status checked?</strong><br />AutoPulse Radar automatically refreshes upstream feeds every 6 hours via cloud automation.</p>
    </section>

    <div class="vault-banner" style="margin-top:28px;">
      <div>
        <h3 style="margin:0 0 6px;">Want 55+ Ready-to-Use AI &amp; Automation Prompts?</h3>
        <p style="margin:0;color:var(--muted);">${escapeHtml(monetization.gumroadProductTitle)} — instant access for ${escapeHtml(monetization.gumroadProductPrice)}.</p>
      </div>
      <a class="btn btn-primary" href="${escapeHtml(buyUrl)}">Get the Vault (${escapeHtml(monetization.gumroadProductPrice)}) →</a>
    </div>

    ${renderPartnerStackHtml(monetization)}
  </main>

  <footer class="site-footer">
    <div class="container">
      <p>Affiliate Disclosure: Links on this page may earn a referral commission at no extra cost to you. • <a href="../index.html">Home</a></p>
    </div>
  </footer>
</body>
</html>`;
}

function renderSetupGuideHtml(config) {
  const m = config.monetization || {};
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>10 Dakikada Kur ve Unut (Sıfır Bütçe Rehberi) — AutoPulse</title>
  <meta name="robots" content="noindex, nofollow" />
  ${getBaseStyles()}
  <style>
    .step-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
    label { display: block; font-size: 0.85rem; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
    input[type="text"], input[type="url"] {
      width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border);
      background: #060a12; color: var(--text); font-size: 0.92rem;
    }
    pre#jsonPreview {
      background: #05080f; border: 1px solid var(--border); border-radius: 10px;
      padding: 14px; overflow-x: auto; font-size: 0.82rem; color: #7dd3fc; max-height: 280px;
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="container topbar-inner">
      <a class="brand" href="index.html"><span class="brand-dot"></span> AutoPulse Kurulum Merkezi</a>
      <nav class="nav-links">
        <a href="index.html">← Canlı Siteye Dön</a>
        <a href="digital-product-vault.html">📦 Dijital Ürünü Aç (PDF/Gumroad)</a>
      </nav>
    </div>
  </header>

  <main class="container" style="padding:36px 20px 60px;">
    <span class="pill">0 TL BÜTÇE • KUR VE HİÇ DOKUNMA</span>
    <h1>10 Dakikada Kur ve Unut (Sıfır Bütçe Rehberi)</h1>
    <p class="lead">Bu sistem tamamen ücretsiz bulut servisleri (<strong>GitHub Actions + GitHub Pages + Gumroad</strong>) üzerinde çalışır. Bilgisayarın kapalıyken bile her 6 saatte bir otomatik güncellenir.</p>

    <div class="step-card">
      <h2>Adım 1: Hazır Dijital Ürününü Gumroad'a Ücretsiz Yükle ($19)</h2>
      <p style="color:var(--muted);">Senin için 55+ kopyala-yapıştır AI prompt ve otomasyon sistemi içeren İngilizce dijital ürünü sıfırdan yazdık.</p>
      <ol style="color:var(--muted);">
        <li><a href="digital-product-vault.html" target="_blank">Buraya tıklayarak dijital ürün sayfasını aç</a> ve tarayıcıdan <strong>"PDF Olarak Kaydet / Yazdır"</strong> diyerek <code>2026-AI-Automation-Mega-Vault.pdf</code> dosyasını indir.</li>
        <li><a href="https://gumroad.com" target="_blank" rel="noopener noreferrer">Gumroad.com</a> üzerinden ücretsiz hesap aç (kredi kartı gerekmez, komisyon sadece satış olunca kesilir).</li>
        <li><strong>New Product → Digital Product</strong> seç, PDF'i yükle, fiyatı <strong>$19</strong> yap ve yayınla. Sana verilen ürün linkini aşağıya yapıştır.</li>
      </ol>
    </div>

    <div class="step-card">
      <h2>Adım 2: Kendi Gelir Linklerini Gir ve <code>config.json</code> İndir</h2>
      <p style="color:var(--muted);">Aşağıdaki alanları kendi linklerinle doldur (boş bıraktıkların varsayılan kalır) ve hazır <code>config.json</code> dosyasını tek tıkla indir.</p>
      <div class="form-grid" style="margin-top:14px;">
        <div>
          <label for="fSiteName">Site Başlığı</label>
          <input id="fSiteName" type="text" value="${escapeHtml(config.siteName)}" />
        </div>
        <div>
          <label for="fSiteUrl">GitHub Pages Site Adresin</label>
          <input id="fSiteUrl" type="url" value="${escapeHtml(config.siteUrl)}" />
        </div>
        <div>
          <label for="fGumroadUrl">Gumroad Ürün Linkin (En Önemli)</label>
          <input id="fGumroadUrl" type="url" value="${escapeHtml(m.gumroadProductUrl || '')}" placeholder="https://kullanici.gumroad.com/l/ai-vault" />
        </div>
        <div>
          <label for="fGumroadPrice">Ürün Fiyatı</label>
          <input id="fGumroadPrice" type="text" value="${escapeHtml(m.gumroadProductPrice || '$19')}" />
        </div>
        <div>
          <label for="fAmazonTag">Amazon Associates Tag (Opsiyonel)</label>
          <input id="fAmazonTag" type="text" value="${escapeHtml(m.amazonAssociateTag || '')}" />
        </div>
        <div>
          <label for="fInstantTag">Instant Gaming Affiliate ID (Opsiyonel)</label>
          <input id="fInstantTag" type="text" value="${escapeHtml(m.instantGamingAffiliateId || '')}" />
        </div>
        <div>
          <label for="fG2aTag">G2A Affiliate Ref (Opsiyonel)</label>
          <input id="fG2aTag" type="text" value="${escapeHtml(m.g2aAffiliateId || '')}" />
        </div>
        <div>
          <label for="fAAdsId">A-Ads Reklam Birim ID (Onaysız Kripto/Display)</label>
          <input id="fAAdsId" type="text" value="${escapeHtml(m.aAdsUnitId || '')}" placeholder="Örn: 2345678" />
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:18px 0 12px;">
        <button id="downloadConfigBtn" class="btn btn-primary" type="button">⬇️ config.json Dosyasını İndir</button>
        <button id="copyConfigBtn" class="btn btn-secondary" type="button">📋 JSON Kopyala</button>
      </div>
      <pre id="jsonPreview"></pre>
    </div>

    <div class="step-card">
      <h2>Adım 3: GitHub'a Yükle ve Sonsuza Kadar Açık Bırak (Ücretsiz Bulut)</h2>
      <ol style="color:var(--muted);">
        <li><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub.com</a> üzerinde ücretsiz bir hesap aç ve <strong>autopulse-passive-engine</strong> adında yeni bir <em>Public</em> repository oluştur.</li>
        <li>Bu proje klasöründeki tüm dosyaları (indirdiğin yeni <code>config.json</code> dahil) GitHub repona yükle / push et.</li>
        <li>GitHub reponda <strong>Settings → Pages → Build and deployment → Source: GitHub Actions</strong> seç.</li>
        <li><strong>Settings → Actions → General → Workflow permissions</strong> kısmından <strong>Read and write permissions</strong> seçeneğini işaretle ve kaydet.</li>
        <li>Artık sistem her 6 saatte bir otomatik uyanıp fırsatları, AI araçlarını ve uzaktan iş ilanlarını çekecek, SEO sayfalarını oluşturup siteni güncelleyecek!</li>
      </ol>
    </div>
  </main>

  <script>
    (function () {
      var baseConfig = ${JSON.stringify(config)};
      var inputs = ['fSiteName', 'fSiteUrl', 'fGumroadUrl', 'fGumroadPrice', 'fAmazonTag', 'fInstantTag', 'fG2aTag', 'fAAdsId'];
      var preview = document.getElementById('jsonPreview');

      function buildConfig() {
        var next = JSON.parse(JSON.stringify(baseConfig));
        next.siteName = document.getElementById('fSiteName').value.trim() || baseConfig.siteName;
        next.siteUrl = document.getElementById('fSiteUrl').value.trim() || baseConfig.siteUrl;
        next.monetization.gumroadProductUrl = document.getElementById('fGumroadUrl').value.trim() || '#vault-offer';
        next.monetization.gumroadProductPrice = document.getElementById('fGumroadPrice').value.trim() || '$19';
        next.monetization.amazonAssociateTag = document.getElementById('fAmazonTag').value.trim();
        next.monetization.instantGamingAffiliateId = document.getElementById('fInstantTag').value.trim();
        next.monetization.g2aAffiliateId = document.getElementById('fG2aTag').value.trim();
        next.monetization.aAdsUnitId = document.getElementById('fAAdsId').value.trim();
        return JSON.stringify(next, null, 2);
      }

      function refreshPreview() {
        preview.textContent = buildConfig();
      }

      inputs.forEach(function (id) {
        document.getElementById(id).addEventListener('input', refreshPreview);
      });

      document.getElementById('downloadConfigBtn').addEventListener('click', function () {
        var blob = new Blob([buildConfig()], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'config.json';
        a.click();
        URL.revokeObjectURL(a.href);
      });

      document.getElementById('copyConfigBtn').addEventListener('click', function () {
        navigator.clipboard.writeText(buildConfig());
        this.textContent = '✅ Kopyalandı!';
        var btn = this;
        setTimeout(function () { btn.textContent = '📋 JSON Kopyala'; }, 2000);
      });

      refreshPreview();
    })();
  </script>
</body>
</html>`;
}

function markdownToSimpleHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let inCode = false;
  let inList = false;
  let inTable = false;

  const closeBlocks = () => {
    if (inList) { out.push('</ul>'); inList = false; }
    if (inTable) { out.push('</tbody></table>'); inTable = false; }
  };

  const inlineFormat = (text) => escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      closeBlocks();
      if (!inCode) {
        out.push('<pre><code>');
        inCode = true;
      } else {
        out.push('</code></pre>');
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      out.push(escapeHtml(line));
      continue;
    }

    if (!line.trim()) {
      closeBlocks();
      continue;
    }

    if (line.startsWith('|')) {
      if (line.includes('---')) continue;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (!inTable) {
        closeBlocks();
        out.push('<table class="vault-table"><thead><tr>' + cells.map((c) => `<th>${inlineFormat(c)}</th>`).join('') + '</tr></thead><tbody>');
        inTable = true;
      } else {
        out.push('<tr>' + cells.map((c) => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>');
      }
      continue;
    }

    if (/^[-*] /.test(line)) {
      if (inTable) { out.push('</tbody></table>'); inTable = false; }
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineFormat(line.slice(2).replace(/^\[ \] /, '☐ '))}</li>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      if (inTable) { out.push('</tbody></table>'); inTable = false; }
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineFormat(line)}</li>`);
      continue;
    }

    closeBlocks();

    const anchorMatch = line.match(/^## <a id="([^"]+)"><\/a>(.+)$/);
    if (anchorMatch) {
      out.push(`<h2 id="${escapeHtml(anchorMatch[1])}">${inlineFormat(anchorMatch[2])}</h2>`);
    } else if (line.startsWith('# ')) {
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith('> ')) {
      out.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
    } else if (line.startsWith('---')) {
      out.push('<hr />');
    } else {
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
  }

  closeBlocks();
  if (inCode) out.push('</code></pre>');
  return out.join('\n');
}

async function generateDigitalVaultHtml() {
  const mdPath = path.join(ROOT_DIR, 'digital-product', '2026-AI-Automation-Mega-Vault.md');
  const md = await readFile(mdPath, 'utf8');
  const bodyHtml = markdownToSimpleHtml(md);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>2026 AI &amp; Automation Mega Vault — Printable Edition</title>
  <style>
    body { font-family: Georgia, "Segoe UI", system-ui, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; line-height: 1.65; }
    .toolbar {
      position: sticky; top: 0; background: #0f172a; color: #f8fafc; padding: 12px 24px;
      display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .print-btn {
      background: #10b981; color: #041018; border: 0; padding: 9px 16px; border-radius: 8px;
      font-weight: 700; cursor: pointer; font-size: 0.92rem;
    }
    .doc { max-width: 860px; margin: 28px auto; background: #ffffff; padding: 42px 48px; border-radius: 12px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); }
    h1 { font-size: 2rem; border-bottom: 3px solid #0ea5e9; padding-bottom: 10px; }
    h2 { margin-top: 34px; color: #0369a1; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; page-break-after: avoid; }
    h3 { margin-top: 22px; color: #0f172a; page-break-after: avoid; }
    pre { background: #0f172a; color: #e2e8f0; padding: 14px 16px; border-radius: 8px; white-space: pre-wrap; font-family: ui-monospace, Consolas, monospace; font-size: 0.86rem; page-break-inside: avoid; }
    code { font-family: ui-monospace, Consolas, monospace; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; }
    pre code { background: transparent; padding: 0; color: inherit; }
    blockquote { border-left: 4px solid #0ea5e9; margin: 16px 0; padding: 8px 16px; background: #f0f9ff; }
    table.vault-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.88rem; }
    table.vault-table th, table.vault-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    table.vault-table th { background: #f1f5f9; }
    @media print {
      .toolbar { display: none; }
      body { background: #ffffff; }
      .doc { box-shadow: none; margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <span><strong>Gumroad Ready Digital Product</strong> — Save as PDF (Ctrl+P) &amp; Upload to Gumroad</span>
    <button class="print-btn" onclick="window.print()">🖨️ Export / Save as PDF</button>
  </div>
  <article class="doc">
    ${bodyHtml}
  </article>
</body>
</html>`;
}

function renderSitemapXml(config, detailItems, generatedIso) {
  const baseUrl = config.siteUrl.replace(/\/$/, '');
  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'always' },
    ...detailItems.map((item) => ({
      loc: `${baseUrl}/item/${item.slug}.html`,
      priority: '0.8',
      changefreq: 'daily'
    }))
  ];

  const entries = urls.map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(generatedIso.slice(0, 10))}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

function renderRssXml(config, items, generatedIso) {
  const baseUrl = config.siteUrl.replace(/\/$/, '');
  const pubDate = new Date(generatedIso).toUTCString();
  const feedItems = items.slice(0, 25).map((item) => {
    const link = item.hasDetailPage ? `${baseUrl}/item/${item.slug}.html` : item.outboundUrl;
    return `    <item>
      <title>${escapeXml(`[${item.categoryLabel}] ${item.title} (${item.badge})`)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(item.slug)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(config.siteName)}</title>
    <link>${escapeXml(baseUrl + '/')}</link>
    <description>${escapeXml(config.siteTagline)}</description>
    <lastBuildDate>${pubDate}</lastBuildDate>
${feedItems}
  </channel>
</rss>
`;
}

async function maybeBroadcastTelegram(config, deals) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || deals.length === 0) return false;

  const top3 = deals.slice(0, 3)
    .map((d, i) => `${i + 1}. *${d.title}* — ${d.badge} (${d.metricPrimary})\n${d.outboundUrl}`)
    .join('\n\n');

  const vaultUrl = config.monetization.gumroadProductUrl && config.monetization.gumroadProductUrl !== '#vault-offer'
    ? config.monetization.gumroadProductUrl
    : config.siteUrl;

  const text = `⚡ *AutoPulse Top Drops*\n\n${top3}\n\n🚀 *AI Automation Mega Vault (${config.monetization.gumroadProductPrice}):* ${vaultUrl}`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('[Telegram] Broadcast sent successfully.');
    return true;
  } catch (err) {
    console.warn(`[Telegram] Broadcast skipped/failed: ${err.message}`);
    return false;
  }
}

async function run() {
  const configPath = path.join(ROOT_DIR, 'config.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const generatedIso = new Date().toISOString();

  console.log('=== AutoPulse Autonomous Engine Starting ===');
  const [dealsRes, aiRes, jobsRes] = await Promise.all([
    fetchDeals(config.sources, config.monetization),
    fetchAiTools(config.sources),
    fetchRemoteJobs(config.sources)
  ]);

  const allItems = [...dealsRes.items, ...aiRes.items, ...jobsRes.items];
  const maxPages = config.sources?.maxProgrammaticPages ?? 36;
  const interleaved = [];
  const maxLen = Math.max(dealsRes.items.length, aiRes.items.length, jobsRes.items.length);
  for (let i = 0; i < maxLen; i++) {
    if (dealsRes.items[i]) interleaved.push(dealsRes.items[i]);
    if (aiRes.items[i]) interleaved.push(aiRes.items[i]);
    if (jobsRes.items[i]) interleaved.push(jobsRes.items[i]);
  }
  const detailItems = interleaved.slice(0, maxPages);
  const detailSet = new Set(detailItems.map((i) => i.slug));

  for (const item of allItems) {
    item.hasDetailPage = detailSet.has(item.slug);
  }

  await mkdir(PUBLIC_DIR, { recursive: true });
  await rm(ITEMS_DIR, { recursive: true, force: true });
  await mkdir(ITEMS_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const statusSummary = {
    deals: dealsRes.status,
    ai: aiRes.status,
    jobs: jobsRes.status
  };

  await Promise.all([
    writeFile(path.join(PUBLIC_DIR, 'index.html'), renderIndexHtml(config, allItems, generatedIso, statusSummary), 'utf8'),
    writeFile(path.join(PUBLIC_DIR, 'setup-guide.html'), renderSetupGuideHtml(config), 'utf8'),
    writeFile(path.join(PUBLIC_DIR, 'digital-product-vault.html'), await generateDigitalVaultHtml(), 'utf8'),
    writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), renderSitemapXml(config, detailItems, generatedIso), 'utf8'),
    writeFile(path.join(PUBLIC_DIR, 'feed.xml'), renderRssXml(config, allItems, generatedIso), 'utf8'),
    writeFile(path.join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.siteUrl.replace(/\/$/, '')}/sitemap.xml\n`, 'utf8'),
    writeFile(
      path.join(DATA_DIR, 'latest.json'),
      JSON.stringify({
        generatedAt: generatedIso,
        sourcesStatus: statusSummary,
        counts: {
          total: allItems.length,
          deals: dealsRes.items.length,
          aiTools: aiRes.items.length,
          jobs: jobsRes.items.length,
          programmaticPages: detailItems.length
        },
        items: allItems
      }, null, 2),
      'utf8'
    ),
    ...detailItems.map((item) =>
      writeFile(path.join(ITEMS_DIR, `${item.slug}.html`), renderItemDetailHtml(config, item, generatedIso), 'utf8')
    )
  ]);

  await maybeBroadcastTelegram(config, dealsRes.items);

  console.log(`Generated ${allItems.length} total radar items (${detailItems.length} programmatic SEO pages).`);
  console.log(`Sources: deals=${statusSummary.deals}, ai=${statusSummary.ai}, jobs=${statusSummary.jobs}`);
  console.log(`Output written to: ${PUBLIC_DIR}`);
}

run().catch((err) => {
  console.error('Autopilot failed:', err);
  process.exit(1);
});
