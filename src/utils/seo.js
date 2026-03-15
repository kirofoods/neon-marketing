// Killjoy SEO Engine — Industry-grade SEO toolkit
// Replicates core SEMrush/Ahrefs functionality using:
//   - Apify actors for real SERP/crawl data
//   - Google PageSpeed Insights API (free) for Core Web Vitals
//   - Google Autocomplete for keyword suggestions
//   - DNS-over-HTTPS for domain checks
//   - CORS proxy for on-page crawling
//   - User-scoped localStorage for historical tracking

import { getUserData, setUserData } from './userStorage';

// =============================================
// KEYWORD RESEARCH
// =============================================

// Google Autocomplete — free, no key needed, returns keyword suggestions
// Uses JSONP-style script injection as primary method (bypasses CORS)
// Falls back to CORS proxy if JSONP fails
export async function getKeywordSuggestions(keyword, lang = 'en', country = 'in') {
  // Method 1: JSONP via script tag (most reliable, bypasses CORS entirely)
  try {
    const data = await new Promise((resolve, reject) => {
      const callbackName = '_kj_cb_' + Math.random().toString(36).substr(2, 8);
      const timeout = setTimeout(() => {
        delete window[callbackName];
        reject(new Error('Timeout'));
      }, 8000);

      window[callbackName] = (response) => {
        clearTimeout(timeout);
        delete window[callbackName];
        const script = document.getElementById(callbackName);
        if (script) script.remove();
        resolve(response);
      };

      const script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(keyword)}&hl=${lang}&gl=${country}&callback=${callbackName}`;
      script.onerror = () => {
        clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
        reject(new Error('Script load failed'));
      };
      document.head.appendChild(script);
    });

    if (data && Array.isArray(data[1])) {
      return data[1].map((s, i) => ({
        keyword: s,
        type: (data[4]?.['google:suggesttype']?.[i]) || 'QUERY',
        relevance: (data[4]?.['google:suggestrelevance']?.[i]) || (1000 - i * 50)
      }));
    }
  } catch {
    // Fall through to method 2
  }

  // Method 2: CORS proxy fetch
  const corsProxy = localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?';
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}&hl=${lang}&gl=${country}`;

  const res = await fetch(corsProxy + encodeURIComponent(url), {
    signal: AbortSignal.timeout(8000)
  });

  if (!res.ok) throw new Error(`Autocomplete API returned ${res.status}`);

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse autocomplete response');
  }

  // Firefox client format: [query, [suggestions]]
  return (data[1] || []).map((s, i) => ({
    keyword: typeof s === 'string' ? s : String(s),
    type: 'QUERY',
    relevance: 1000 - i * 50
  }));
}

// Expand keyword with alphabet variations (a-z suffix)
export async function expandKeyword(keyword) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const allSuggestions = [];

  // Fetch in parallel batches of 6
  for (let i = 0; i < letters.length; i += 6) {
    const batch = letters.slice(i, i + 6);
    const results = await Promise.allSettled(
      batch.map(letter => getKeywordSuggestions(`${keyword} ${letter}`))
    );
    results.forEach(r => {
      if (r.status === 'fulfilled') allSuggestions.push(...r.value);
    });
  }

  // Deduplicate
  const seen = new Set();
  return allSuggestions.filter(s => {
    if (seen.has(s.keyword)) return false;
    seen.add(s.keyword);
    return true;
  });
}

// Question-based keyword research (who, what, where, when, why, how, can, does, is, are)
export async function getQuestionKeywords(keyword) {
  const prefixes = [
    'what is', 'what are', 'how to', 'how does', 'why is', 'why do',
    'where to', 'when to', 'who is', 'can you', 'does', 'is', 'are',
    'which', 'best', 'top', 'vs', 'alternative to', 'review'
  ];

  const allQuestions = [];

  for (let i = 0; i < prefixes.length; i += 5) {
    const batch = prefixes.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(prefix => getKeywordSuggestions(`${prefix} ${keyword}`))
    );
    results.forEach(r => {
      if (r.status === 'fulfilled') allQuestions.push(...r.value);
    });
  }

  const seen = new Set();
  return allQuestions.filter(s => {
    if (seen.has(s.keyword)) return false;
    seen.add(s.keyword);
    return true;
  });
}

// Estimate keyword difficulty based on SERP analysis
// Uses: title tag optimization, domain authority signals, content depth
export function estimateKeywordDifficulty(serpResults) {
  if (!serpResults || serpResults.length === 0) return { score: 50, label: 'Medium' };

  let difficultyScore = 0;
  const top10 = serpResults.slice(0, 10);

  top10.forEach((result, i) => {
    const weight = (10 - i) / 10; // Higher weight for top positions

    // Domain authority signals
    const domain = (result.url || '').toLowerCase();
    const isAuthority = [
      'wikipedia.org', 'amazon.', 'flipkart.', 'youtube.com', 'facebook.com',
      'linkedin.com', 'twitter.com', 'github.com', 'medium.com', 'quora.com',
      'reddit.com', 'forbes.com', 'healthline.com', 'webmd.com', '.gov',
      'nytimes.com', 'bbc.com'
    ].some(d => domain.includes(d));

    if (isAuthority) difficultyScore += 8 * weight;

    // HTTPS signal
    if (domain.startsWith('https')) difficultyScore += 1 * weight;

    // Title optimization — keyword in title
    // We can't check this without the query, so give partial score
    if (result.title && result.title.length > 30 && result.title.length < 65) {
      difficultyScore += 2 * weight;
    }

    // Description optimization
    if (result.description && result.description.length > 80) {
      difficultyScore += 1.5 * weight;
    }

    // URL structure
    if (domain.split('/').length <= 4) difficultyScore += 1 * weight;
  });

  // Normalize to 0-100
  const maxPossible = 13.5 * 5.5; // Approximate max weighted score
  const normalized = Math.min(100, Math.round((difficultyScore / maxPossible) * 100));

  let label = 'Easy';
  if (normalized >= 70) label = 'Very Hard';
  else if (normalized >= 50) label = 'Hard';
  else if (normalized >= 30) label = 'Medium';

  return { score: normalized, label };
}

// Estimate monthly search volume from SERP result count + autocomplete relevance
// This is an approximation — real volume requires paid APIs
export function estimateSearchVolume(totalResults, relevance = 500) {
  if (!totalResults) return { volume: 'N/A', range: 'Unknown' };

  // Rough heuristic based on result count
  let estimate;
  if (totalResults > 1000000000) estimate = '100K+';
  else if (totalResults > 100000000) estimate = '10K-100K';
  else if (totalResults > 10000000) estimate = '1K-10K';
  else if (totalResults > 1000000) estimate = '100-1K';
  else if (totalResults > 100000) estimate = '10-100';
  else estimate = '0-10';

  return { volume: estimate, totalResults };
}

// Cluster keywords by semantic similarity (simple word overlap method)
export function clusterKeywords(keywords) {
  const clusters = {};

  keywords.forEach(kw => {
    const words = kw.keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let matched = false;

    for (const [clusterName, cluster] of Object.entries(clusters)) {
      const clusterWords = clusterName.split(' ');
      const overlap = words.filter(w => clusterWords.some(cw => w.includes(cw) || cw.includes(w)));
      if (overlap.length > 0) {
        cluster.push(kw);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const name = words.slice(0, 2).join(' ') || kw.keyword;
      clusters[name] = [kw];
    }
  });

  return Object.entries(clusters)
    .map(([name, keywords]) => ({ name, keywords, count: keywords.length }))
    .sort((a, b) => b.count - a.count);
}


// =============================================
// ON-PAGE SEO ANALYZER
// =============================================

export async function analyzeOnPageSEO(url, targetKeyword = '') {
  const corsProxy = localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?';
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

  try {
    const res = await fetch(corsProxy + encodeURIComponent(cleanUrl), {
      signal: AbortSignal.timeout(15000)
    });
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract all SEO elements
    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';
    const metaKeywords = doc.querySelector('meta[name="keywords"]')?.getAttribute('content')?.trim() || '';
    const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
    const viewport = doc.querySelector('meta[name="viewport"]')?.getAttribute('content') || '';
    const charset = doc.querySelector('meta[charset]')?.getAttribute('charset') || doc.querySelector('meta[http-equiv="Content-Type"]')?.getAttribute('content') || '';
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const ogUrl = doc.querySelector('meta[property="og:url"]')?.getAttribute('content') || '';
    const twitterCard = doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || '';
    const twitterTitle = doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '';
    const lang = doc.documentElement.getAttribute('lang') || '';

    // Headings
    const h1s = [...doc.querySelectorAll('h1')].map(h => h.textContent.trim());
    const h2s = [...doc.querySelectorAll('h2')].map(h => h.textContent.trim());
    const h3s = [...doc.querySelectorAll('h3')].map(h => h.textContent.trim());
    const h4s = [...doc.querySelectorAll('h4')].map(h => h.textContent.trim());

    // Content
    const bodyText = doc.body?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 5);

    // Links
    const allLinks = [...doc.querySelectorAll('a[href]')];
    const internalLinks = allLinks.filter(a => {
      const href = a.getAttribute('href');
      return href && (href.startsWith('/') || href.includes(new URL(cleanUrl).hostname));
    });
    const externalLinks = allLinks.filter(a => {
      const href = a.getAttribute('href');
      return href && href.startsWith('http') && !href.includes(new URL(cleanUrl).hostname);
    });
    const nofollowLinks = allLinks.filter(a => (a.getAttribute('rel') || '').includes('nofollow'));

    // Images
    const images = [...doc.querySelectorAll('img')];
    const imagesWithAlt = images.filter(img => img.getAttribute('alt')?.trim());
    const imagesWithoutAlt = images.filter(img => !img.getAttribute('alt')?.trim());

    // Schema/Structured Data
    const schemas = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(s => {
      try { return JSON.parse(s.textContent); } catch { return null; }
    }).filter(Boolean);

    // Hreflang
    const hreflangs = [...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map(l => ({
      lang: l.getAttribute('hreflang'),
      href: l.getAttribute('href')
    }));

    // CSS/JS counts
    const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]').length;
    const scripts = doc.querySelectorAll('script[src]').length;
    const inlineStyles = doc.querySelectorAll('[style]').length;

    // Readability (Flesch-Kincaid)
    const syllableCount = bodyText.split(/\s+/).reduce((count, word) => {
      return count + Math.max(1, word.replace(/[^aeiouy]/gi, '').length);
    }, 0);
    const avgSentenceLen = sentences.length > 0 ? wordCount / sentences.length : 0;
    const avgSyllables = wordCount > 0 ? syllableCount / wordCount : 0;
    const fleschScore = Math.round(206.835 - (1.015 * avgSentenceLen) - (84.6 * avgSyllables));

    // Keyword analysis
    let keywordAnalysis = null;
    if (targetKeyword) {
      const kw = targetKeyword.toLowerCase();
      const titleContains = title.toLowerCase().includes(kw);
      const descContains = metaDesc.toLowerCase().includes(kw);
      const h1Contains = h1s.some(h => h.toLowerCase().includes(kw));
      const urlContains = cleanUrl.toLowerCase().includes(kw.replace(/\s+/g, '-'));
      const bodyLower = bodyText.toLowerCase();
      const keywordCount = (bodyLower.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const density = wordCount > 0 ? ((keywordCount / wordCount) * 100).toFixed(2) : 0;

      // First 100 words contains keyword
      const first100 = bodyLower.split(/\s+/).slice(0, 100).join(' ');
      const inFirst100 = first100.includes(kw);

      keywordAnalysis = {
        keyword: targetKeyword,
        inTitle: titleContains,
        inMetaDesc: descContains,
        inH1: h1Contains,
        inUrl: urlContains,
        inFirst100Words: inFirst100,
        count: keywordCount,
        density: parseFloat(density),
        // Score 0-100
        score: (titleContains ? 20 : 0) + (descContains ? 15 : 0) + (h1Contains ? 20 : 0) +
               (urlContains ? 15 : 0) + (inFirst100 ? 10 : 0) +
               (density > 0.5 && density < 3 ? 20 : density > 0 ? 10 : 0)
      };
    }

    // Generate issues and score
    const issues = [];
    let score = 100;

    // Title checks
    if (!title) { issues.push({ severity: 'critical', category: 'Meta', issue: 'Missing title tag', fix: 'Add a <title> tag with your target keyword' }); score -= 15; }
    else if (title.length < 30) { issues.push({ severity: 'warning', category: 'Meta', issue: `Title too short (${title.length} chars)`, fix: 'Expand title to 50-60 characters' }); score -= 5; }
    else if (title.length > 60) { issues.push({ severity: 'warning', category: 'Meta', issue: `Title too long (${title.length} chars)`, fix: 'Trim title to under 60 characters' }); score -= 3; }
    else { issues.push({ severity: 'pass', category: 'Meta', issue: `Title tag good (${title.length} chars)` }); }

    // Meta description
    if (!metaDesc) { issues.push({ severity: 'critical', category: 'Meta', issue: 'Missing meta description', fix: 'Add meta description with target keyword (150-160 chars)' }); score -= 10; }
    else if (metaDesc.length < 70) { issues.push({ severity: 'warning', category: 'Meta', issue: `Meta description too short (${metaDesc.length} chars)`, fix: 'Expand to 150-160 characters' }); score -= 3; }
    else if (metaDesc.length > 160) { issues.push({ severity: 'warning', category: 'Meta', issue: `Meta description too long (${metaDesc.length} chars)`, fix: 'Trim to under 160 characters' }); score -= 2; }
    else { issues.push({ severity: 'pass', category: 'Meta', issue: `Meta description good (${metaDesc.length} chars)` }); }

    // H1
    if (h1s.length === 0) { issues.push({ severity: 'critical', category: 'Content', issue: 'No H1 heading found', fix: 'Add one H1 tag with your target keyword' }); score -= 10; }
    else if (h1s.length > 1) { issues.push({ severity: 'warning', category: 'Content', issue: `Multiple H1 tags found (${h1s.length})`, fix: 'Use only one H1 per page' }); score -= 5; }
    else { issues.push({ severity: 'pass', category: 'Content', issue: 'Single H1 tag present' }); }

    // Heading hierarchy
    if (h2s.length === 0 && wordCount > 300) { issues.push({ severity: 'warning', category: 'Content', issue: 'No H2 subheadings', fix: 'Add H2s to break up content' }); score -= 3; }
    else if (h2s.length > 0) { issues.push({ severity: 'pass', category: 'Content', issue: `${h2s.length} H2 subheadings` }); }

    // Content length
    if (wordCount < 300) { issues.push({ severity: 'critical', category: 'Content', issue: `Thin content (${wordCount} words)`, fix: 'Expand to at least 800-1500 words for competitive topics' }); score -= 15; }
    else if (wordCount < 800) { issues.push({ severity: 'warning', category: 'Content', issue: `Short content (${wordCount} words)`, fix: 'Consider expanding for better rankings' }); score -= 5; }
    else { issues.push({ severity: 'pass', category: 'Content', issue: `Good content length (${wordCount} words)` }); }

    // Images
    if (images.length === 0 && wordCount > 300) { issues.push({ severity: 'warning', category: 'Content', issue: 'No images found', fix: 'Add relevant images with alt text' }); score -= 3; }
    if (imagesWithoutAlt.length > 0) { issues.push({ severity: 'warning', category: 'Accessibility', issue: `${imagesWithoutAlt.length} images missing alt text`, fix: 'Add descriptive alt text to all images' }); score -= Math.min(8, imagesWithoutAlt.length * 2); }
    if (imagesWithAlt.length > 0) { issues.push({ severity: 'pass', category: 'Accessibility', issue: `${imagesWithAlt.length} images have alt text` }); }

    // Open Graph
    if (!ogTitle) { issues.push({ severity: 'info', category: 'Social', issue: 'Missing Open Graph title', fix: 'Add og:title meta tag' }); score -= 2; }
    if (!ogDesc) { issues.push({ severity: 'info', category: 'Social', issue: 'Missing Open Graph description', fix: 'Add og:description meta tag' }); score -= 2; }
    if (!ogImage) { issues.push({ severity: 'info', category: 'Social', issue: 'Missing Open Graph image', fix: 'Add og:image meta tag for social sharing' }); score -= 2; }
    if (ogTitle && ogDesc && ogImage) { issues.push({ severity: 'pass', category: 'Social', issue: 'Open Graph tags present' }); }

    // Twitter Card
    if (!twitterCard) { issues.push({ severity: 'info', category: 'Social', issue: 'Missing Twitter Card tags', fix: 'Add twitter:card meta tag' }); score -= 1; }

    // Canonical
    if (!canonical) { issues.push({ severity: 'warning', category: 'Technical', issue: 'No canonical URL set', fix: 'Add <link rel="canonical"> to prevent duplicate content' }); score -= 5; }
    else { issues.push({ severity: 'pass', category: 'Technical', issue: 'Canonical URL set' }); }

    // Schema
    if (schemas.length === 0) { issues.push({ severity: 'info', category: 'Technical', issue: 'No structured data (Schema.org)', fix: 'Add JSON-LD structured data for rich snippets' }); score -= 3; }
    else { issues.push({ severity: 'pass', category: 'Technical', issue: `${schemas.length} structured data block(s) found` }); }

    // Viewport
    if (!viewport) { issues.push({ severity: 'critical', category: 'Mobile', issue: 'No viewport meta tag', fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">' }); score -= 10; }
    else { issues.push({ severity: 'pass', category: 'Mobile', issue: 'Viewport meta tag present' }); }

    // Language
    if (!lang) { issues.push({ severity: 'warning', category: 'Technical', issue: 'No lang attribute on <html>', fix: 'Add lang="en" (or appropriate language) to <html> tag' }); score -= 2; }
    else { issues.push({ severity: 'pass', category: 'Technical', issue: `Language: ${lang}` }); }

    // Internal linking
    if (internalLinks.length < 3 && wordCount > 500) { issues.push({ severity: 'warning', category: 'Links', issue: `Only ${internalLinks.length} internal link(s)`, fix: 'Add more internal links to related content' }); score -= 3; }
    else if (internalLinks.length >= 3) { issues.push({ severity: 'pass', category: 'Links', issue: `${internalLinks.length} internal links` }); }

    // External linking
    if (externalLinks.length === 0 && wordCount > 500) { issues.push({ severity: 'info', category: 'Links', issue: 'No external links', fix: 'Link to authoritative sources for credibility' }); score -= 1; }

    // Readability
    if (fleschScore < 30) { issues.push({ severity: 'warning', category: 'Content', issue: `Poor readability (Flesch score: ${fleschScore})`, fix: 'Simplify sentences and use shorter words' }); score -= 3; }
    else if (fleschScore >= 60) { issues.push({ severity: 'pass', category: 'Content', issue: `Good readability (Flesch score: ${fleschScore})` }); }

    // Resource load
    if (stylesheets > 10) { issues.push({ severity: 'warning', category: 'Performance', issue: `${stylesheets} CSS files`, fix: 'Combine and minify CSS files' }); score -= 2; }
    if (scripts > 15) { issues.push({ severity: 'warning', category: 'Performance', issue: `${scripts} JS files`, fix: 'Reduce and defer JavaScript loading' }); score -= 2; }

    score = Math.max(0, Math.min(100, score));

    return {
      url: cleanUrl,
      score,
      title: { text: title, length: title.length },
      metaDescription: { text: metaDesc, length: metaDesc.length },
      canonical,
      robots,
      viewport: !!viewport,
      lang,
      headings: { h1: h1s, h2: h2s, h3: h3s, h4: h4s },
      content: { wordCount, sentences: sentences.length, readability: fleschScore },
      links: {
        total: allLinks.length,
        internal: internalLinks.length,
        external: externalLinks.length,
        nofollow: nofollowLinks.length
      },
      images: { total: images.length, withAlt: imagesWithAlt.length, withoutAlt: imagesWithoutAlt.length },
      social: { ogTitle, ogDesc, ogImage, ogUrl, twitterCard, twitterTitle },
      schema: schemas,
      hreflangs,
      resources: { stylesheets, scripts, inlineStyles },
      keywordAnalysis,
      issues: issues.sort((a, b) => {
        const order = { critical: 0, warning: 1, info: 2, pass: 3 };
        return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
      })
    };
  } catch (err) {
    throw new Error(`Failed to analyze page: ${err.message}`);
  }
}


// =============================================
// CORE WEB VITALS (Google PageSpeed Insights API — free)
// =============================================

export async function getCoreWebVitals(url, strategy = 'mobile') {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;

  // PageSpeed Insights API is free, no key required (rate-limited)
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(cleanUrl)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`PageSpeed API error: ${res.status}`);
    const data = await res.json();

    const lhr = data.lighthouseResult;
    const crux = data.loadingExperience?.metrics || {};

    return {
      url: cleanUrl,
      strategy,
      scores: {
        performance: Math.round((lhr?.categories?.performance?.score || 0) * 100),
        accessibility: Math.round((lhr?.categories?.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr?.categories?.['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr?.categories?.seo?.score || 0) * 100)
      },
      metrics: {
        FCP: lhr?.audits?.['first-contentful-paint']?.displayValue || 'N/A',
        LCP: lhr?.audits?.['largest-contentful-paint']?.displayValue || 'N/A',
        TBT: lhr?.audits?.['total-blocking-time']?.displayValue || 'N/A',
        CLS: lhr?.audits?.['cumulative-layout-shift']?.displayValue || 'N/A',
        SI: lhr?.audits?.['speed-index']?.displayValue || 'N/A',
        TTI: lhr?.audits?.['interactive']?.displayValue || 'N/A'
      },
      metricScores: {
        FCP: lhr?.audits?.['first-contentful-paint']?.score || 0,
        LCP: lhr?.audits?.['largest-contentful-paint']?.score || 0,
        TBT: lhr?.audits?.['total-blocking-time']?.score || 0,
        CLS: lhr?.audits?.['cumulative-layout-shift']?.score || 0,
      },
      crux: {
        LCP: crux.LARGEST_CONTENTFUL_PAINT_MS?.percentile || null,
        FID: crux.FIRST_INPUT_DELAY_MS?.percentile || null,
        CLS: crux.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile || null,
        FCP: crux.FIRST_CONTENTFUL_PAINT_MS?.percentile || null,
        INP: crux.INTERACTION_TO_NEXT_PAINT?.percentile || null,
        TTFB: crux.EXPERIMENTAL_TIME_TO_FIRST_BYTE?.percentile || null
      },
      opportunities: (lhr?.audits ? Object.values(lhr.audits) : [])
        .filter(a => a.score !== null && a.score < 0.9 && a.details?.type === 'opportunity')
        .map(a => ({
          title: a.title,
          description: a.description,
          savings: a.details?.overallSavingsMs ? `${Math.round(a.details.overallSavingsMs)}ms` : null,
          score: a.score
        }))
        .sort((a, b) => (a.score || 0) - (b.score || 0))
        .slice(0, 10),
      diagnostics: (lhr?.audits ? Object.values(lhr.audits) : [])
        .filter(a => a.score !== null && a.score < 0.9 && a.details?.type === 'table')
        .map(a => ({ title: a.title, description: a.description, score: a.score }))
        .sort((a, b) => (a.score || 0) - (b.score || 0))
        .slice(0, 8)
    };
  } catch (err) {
    throw new Error(`Core Web Vitals check failed: ${err.message}`);
  }
}


// =============================================
// BACKLINK CHECKER (Using free OpenPageRank API + CORS proxy scraping)
// =============================================

// OpenPageRank API — free tier, 10 requests/month per IP
export async function getDomainRank(domain) {
  try {
    const cleanDomain = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '');
    const res = await fetch(`https://openpagerank.com/api/v1.0/getPageRank?domains[]=${cleanDomain}`, {
      headers: { 'API-OPR': localStorage.getItem('kj_opr_key') || '' },
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    if (data.response && data.response[0]) {
      return {
        domain: cleanDomain,
        pageRank: data.response[0].page_rank_decimal || 0,
        rank: data.response[0].rank || null,
        statusCode: data.response[0].status_code
      };
    }
    return { domain: cleanDomain, pageRank: 0, rank: null };
  } catch {
    return { domain, pageRank: 0, rank: null, error: 'API unavailable' };
  }
}

// Extract backlink-like data from SERP results (link: operator or site mentions)
export async function estimateBacklinks(domain, apifyToken) {
  if (!apifyToken) return { estimatedLinks: 0, sources: [] };

  // Use the SERP scraper to find pages linking to this domain
  const { scrapeGoogleSERP } = await import('./apify.js');
  try {
    const results = await scrapeGoogleSERP({
      queries: [`"${domain}" -site:${domain}`],
      countryCode: 'in',
      resultsPerPage: 100,
      maxPagesPerQuery: 1
    });

    if (results.length > 0) {
      const serp = results[0];
      return {
        estimatedLinks: serp.totalResults || 0,
        referringPages: serp.organicResults.map(r => ({
          url: r.url,
          title: r.title,
          domain: new URL(r.url).hostname,
          description: r.description
        })),
        totalMentions: serp.totalResults
      };
    }
    return { estimatedLinks: 0, referringPages: [] };
  } catch {
    return { estimatedLinks: 0, referringPages: [], error: 'SERP scrape failed' };
  }
}


// =============================================
// DOMAIN OVERVIEW (Aggregate metrics)
// =============================================

export async function getDomainOverview(domain, apifyToken) {
  const cleanDomain = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '');

  const results = {
    domain: cleanDomain,
    timestamp: Date.now()
  };

  // 1. Domain rank
  try {
    results.rank = await getDomainRank(cleanDomain);
  } catch { results.rank = { pageRank: 0 }; }

  // 2. On-page quick check
  try {
    results.onPage = await analyzeOnPageSEO(`https://${cleanDomain}`);
  } catch { results.onPage = null; }

  // 3. Core Web Vitals
  try {
    results.vitals = await getCoreWebVitals(`https://${cleanDomain}`, 'mobile');
  } catch { results.vitals = null; }

  // 4. Backlink estimate
  if (apifyToken) {
    try {
      results.backlinks = await estimateBacklinks(cleanDomain, apifyToken);
    } catch { results.backlinks = null; }
  }

  // 5. SERP presence — check how many pages are indexed
  if (apifyToken) {
    try {
      const { scrapeGoogleSERP } = await import('./apify.js');
      const siteResults = await scrapeGoogleSERP({
        queries: [`site:${cleanDomain}`],
        countryCode: 'in',
        resultsPerPage: 10
      });
      if (siteResults.length > 0) {
        results.indexedPages = siteResults[0].totalResults || 0;
        results.topIndexedPages = siteResults[0].organicResults.slice(0, 10);
      }
    } catch { results.indexedPages = null; }
  }

  // Save to history
  saveDomainSnapshot(cleanDomain, results);

  return results;
}


// =============================================
// KEYWORD GAP ANALYSIS
// =============================================

export async function analyzeKeywordGap(domain1, domain2, keywords, apifyToken) {
  if (!apifyToken) throw new Error('Apify token required for keyword gap analysis');

  const { scrapeGoogleSERP } = await import('./apify.js');

  const results = await scrapeGoogleSERP({
    queries: keywords,
    countryCode: 'in',
    resultsPerPage: 100
  });

  const d1Clean = domain1.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '');
  const d2Clean = domain2.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '');

  return results.map(serp => {
    const d1Match = serp.organicResults.find(r => r.url.includes(d1Clean));
    const d2Match = serp.organicResults.find(r => r.url.includes(d2Clean));

    let gapType = 'neutral';
    if (d1Match && !d2Match) gapType = 'domain1_only';
    else if (!d1Match && d2Match) gapType = 'domain2_only';
    else if (d1Match && d2Match) {
      gapType = d1Match.position < d2Match.position ? 'domain1_leads' : 'domain2_leads';
    } else {
      gapType = 'neither';
    }

    return {
      keyword: serp.query,
      totalResults: serp.totalResults,
      domain1: { position: d1Match?.position || null, url: d1Match?.url || null, title: d1Match?.title || null },
      domain2: { position: d2Match?.position || null, url: d2Match?.url || null, title: d2Match?.title || null },
      gapType,
      opportunity: !d1Match && d2Match ? d2Match.position : null
    };
  });
}


// =============================================
// CONTENT ANALYZER
// =============================================

export async function analyzeContent(text, targetKeyword = '') {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));

  // Readability metrics
  const syllableCount = words.reduce((count, word) => {
    return count + Math.max(1, word.replace(/[^aeiouy]/gi, '').length);
  }, 0);
  const avgSentenceLen = sentences.length > 0 ? wordCount / sentences.length : 0;
  const avgSyllables = wordCount > 0 ? syllableCount / wordCount : 0;
  const fleschScore = Math.round(206.835 - (1.015 * avgSentenceLen) - (84.6 * avgSyllables));
  const fleschKincaid = Math.round((0.39 * avgSentenceLen + 11.8 * avgSyllables - 15.59) * 10) / 10;

  // Reading time
  const readingTime = Math.ceil(wordCount / 200);

  // Vocabulary diversity
  const lexicalDiversity = wordCount > 0 ? (uniqueWords.size / wordCount * 100).toFixed(1) : 0;

  // Word frequency (top 20, excluding common stop words)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her', 'i', 'me', 'my', 'who', 'which', 'what', 'where', 'when', 'how', 'if', 'then', 'also', 'about', 'up', 'out', 'one', 'two', 'there', 'here']);

  const wordFreq = {};
  words.forEach(w => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower.length > 2 && !stopWords.has(lower)) {
      wordFreq[lower] = (wordFreq[lower] || 0) + 1;
    }
  });
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count, density: ((count / wordCount) * 100).toFixed(2) }));

  // Keyword analysis
  let keywordResult = null;
  if (targetKeyword) {
    const kw = targetKeyword.toLowerCase();
    const kwCount = (text.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    const kwDensity = ((kwCount / wordCount) * 100).toFixed(2);

    // Check keyword prominence
    const firstIndex = text.toLowerCase().indexOf(kw);
    const prominence = firstIndex >= 0 ? Math.max(0, 100 - (firstIndex / text.length * 100)) : 0;

    let densityRating = 'optimal';
    if (kwDensity < 0.5) densityRating = 'low';
    else if (kwDensity > 3) densityRating = 'over-optimized';

    keywordResult = {
      keyword: targetKeyword,
      count: kwCount,
      density: parseFloat(kwDensity),
      densityRating,
      prominence: Math.round(prominence),
      inFirstSentence: (sentences[0] || '').toLowerCase().includes(kw),
      inLastParagraph: (paragraphs[paragraphs.length - 1] || '').toLowerCase().includes(kw)
    };
  }

  // Overall content score
  let contentScore = 50;
  if (wordCount >= 1500) contentScore += 15;
  else if (wordCount >= 800) contentScore += 10;
  else if (wordCount >= 300) contentScore += 5;
  if (fleschScore >= 60) contentScore += 10;
  else if (fleschScore >= 40) contentScore += 5;
  if (paragraphs.length >= 5) contentScore += 5;
  if (uniqueWords.size > 200) contentScore += 5;
  if (avgSentenceLen >= 10 && avgSentenceLen <= 25) contentScore += 10;
  if (keywordResult) {
    if (keywordResult.density >= 0.5 && keywordResult.density <= 2.5) contentScore += 10;
    if (keywordResult.inFirstSentence) contentScore += 5;
  }
  contentScore = Math.min(100, contentScore);

  return {
    stats: { wordCount, sentences: sentences.length, paragraphs: paragraphs.length, uniqueWords: uniqueWords.size, readingTime },
    readability: { fleschScore, fleschKincaid, avgSentenceLen: Math.round(avgSentenceLen), avgSyllables: Math.round(avgSyllables * 100) / 100, lexicalDiversity: parseFloat(lexicalDiversity) },
    topWords,
    keyword: keywordResult,
    score: contentScore
  };
}


// =============================================
// HISTORICAL RANK TRACKING (localStorage)
// =============================================

export function saveRankSnapshot(domain, rankings) {
  const history = getUserData('rank_history', {});
  if (!history[domain]) history[domain] = [];

  history[domain].push({
    date: Date.now(),
    dateStr: new Date().toISOString().split('T')[0],
    rankings: rankings.map(r => ({
      keyword: r.keyword,
      position: r.position,
      url: r.url
    }))
  });

  // Keep last 90 snapshots per domain
  if (history[domain].length > 90) {
    history[domain] = history[domain].slice(-90);
  }

  setUserData('rank_history', history);
}

export function getRankHistory(domain) {
  const history = getUserData('rank_history', {});
  return history[domain] || [];
}

export function getAllTrackedDomains() {
  const history = getUserData('rank_history', {});
  return Object.keys(history);
}


// =============================================
// DOMAIN HISTORY (localStorage)
// =============================================

export function saveDomainSnapshot(domain, data) {
  const history = getUserData('domain_history', {});
  if (!history[domain]) history[domain] = [];

  history[domain].push({
    date: Date.now(),
    dateStr: new Date().toISOString().split('T')[0],
    score: data.onPage?.score || null,
    vitals: data.vitals?.scores || null,
    indexedPages: data.indexedPages || null,
    pageRank: data.rank?.pageRank || null
  });

  if (history[domain].length > 30) {
    history[domain] = history[domain].slice(-30);
  }

  setUserData('domain_history', history);
}

export function getDomainHistory(domain) {
  const history = getUserData('domain_history', {});
  return history[domain] || [];
}


// =============================================
// SEO DASHBOARD AGGREGATOR
// =============================================

export function getSEODashboardData() {
  const rankHistory = getUserData('rank_history', {});
  const domainHistory = getUserData('domain_history', {});

  const trackedDomains = Object.keys(rankHistory);
  const analyzedDomains = Object.keys(domainHistory);

  // Latest snapshots for each domain
  const latestRanks = {};
  trackedDomains.forEach(domain => {
    const snapshots = rankHistory[domain];
    if (snapshots.length > 0) {
      latestRanks[domain] = snapshots[snapshots.length - 1];
    }
  });

  // Total keywords tracked
  const totalKeywords = new Set();
  Object.values(rankHistory).forEach(snapshots => {
    snapshots.forEach(s => s.rankings.forEach(r => totalKeywords.add(r.keyword)));
  });

  return {
    trackedDomains: trackedDomains.length,
    analyzedDomains: analyzedDomains.length,
    totalKeywords: totalKeywords.size,
    latestRanks,
    domainHistory
  };
}


// =============================================
// TRAFFIC INSIGHTS (Estimated using SimilarWeb-style SERP analysis)
// =============================================

export async function getTrafficInsights(domain, apifyToken) {
  const cleanDomain = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '');

  const results = { domain: cleanDomain, timestamp: Date.now() };

  // 1. Get indexed pages count via site: query
  if (apifyToken) {
    try {
      const { scrapeGoogleSERP } = await import('./apify.js');
      const siteSearch = await scrapeGoogleSERP({
        queries: [`site:${cleanDomain}`],
        countryCode: 'in',
        resultsPerPage: 10
      });
      if (siteSearch[0]) {
        results.indexedPages = siteSearch[0].totalResults || 0;
        results.topPages = siteSearch[0].organicResults.map(r => ({
          url: r.url,
          title: r.title,
          description: r.description
        }));
      }
    } catch { results.indexedPages = 0; }

    // 2. Check branded search presence
    try {
      const { scrapeGoogleSERP } = await import('./apify.js');
      const brandSearch = await scrapeGoogleSERP({
        queries: [cleanDomain.split('.')[0]],
        countryCode: 'in',
        resultsPerPage: 10
      });
      if (brandSearch[0]) {
        results.brandedResults = brandSearch[0].organicResults.filter(r =>
          r.url.includes(cleanDomain)
        ).length;
        results.brandTotalResults = brandSearch[0].totalResults;
      }
    } catch { results.brandedResults = 0; }

    // 3. Check mentions across web
    try {
      const { scrapeGoogleSERP } = await import('./apify.js');
      const mentionSearch = await scrapeGoogleSERP({
        queries: [`"${cleanDomain}" -site:${cleanDomain}`],
        countryCode: 'in',
        resultsPerPage: 10
      });
      if (mentionSearch[0]) {
        results.webMentions = mentionSearch[0].totalResults || 0;
        results.mentionSources = mentionSearch[0].organicResults.map(r => ({
          url: r.url,
          title: r.title,
          domain: (() => { try { return new URL(r.url).hostname; } catch { return ''; } })()
        }));
      }
    } catch { results.webMentions = 0; }
  }

  // 4. Estimate traffic tier based on indexed pages + mentions
  const indexedPages = results.indexedPages || 0;
  const mentions = results.webMentions || 0;
  let trafficTier = 'Very Low';
  if (indexedPages > 10000 || mentions > 100000) trafficTier = 'Very High';
  else if (indexedPages > 1000 || mentions > 10000) trafficTier = 'High';
  else if (indexedPages > 100 || mentions > 1000) trafficTier = 'Medium';
  else if (indexedPages > 10 || mentions > 100) trafficTier = 'Low';

  results.trafficTier = trafficTier;

  return results;
}


// =============================================
// PAID ADS INTELLIGENCE (via SERP ad scraping)
// =============================================

export async function getAdIntelligence(keywords, apifyToken) {
  if (!apifyToken) throw new Error('Apify token required for ad intelligence');

  const { scrapeGoogleSERP } = await import('./apify.js');

  const results = await scrapeGoogleSERP({
    queries: keywords,
    countryCode: 'in',
    resultsPerPage: 10,
    maxPagesPerQuery: 1
  });

  return results.map(serp => ({
    keyword: serp.query,
    totalResults: serp.totalResults,
    paidResults: serp.paidResults || [],
    paidCount: (serp.paidResults || []).length,
    hasAds: (serp.paidResults || []).length > 0,
    topAdvertisers: (serp.paidResults || []).map(ad => ({
      title: ad.title,
      url: ad.url,
      description: ad.description,
      domain: (() => { try { return new URL(ad.url).hostname; } catch { return ad.url; } })()
    })),
    featuredSnippet: serp.featuredSnippet,
    organicTop3: serp.organicResults.slice(0, 3).map(r => ({
      title: r.title,
      url: r.url,
      position: r.position
    }))
  }));
}


// =============================================
// CONTENT RESEARCH (Find top content for a topic)
// =============================================

export async function researchContent(topic, apifyToken) {
  if (!apifyToken) throw new Error('Apify token required for content research');

  const { scrapeGoogleSERP } = await import('./apify.js');

  // Search multiple query variations for comprehensive results
  const queries = [
    topic,
    `best ${topic}`,
    `${topic} guide`,
    `${topic} tips`,
    `how to ${topic}`
  ];

  const results = await scrapeGoogleSERP({
    queries,
    countryCode: 'in',
    resultsPerPage: 10
  });

  // Aggregate all organic results across queries
  const allPages = [];
  const seenUrls = new Set();

  results.forEach(serp => {
    serp.organicResults.forEach(r => {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allPages.push({
          url: r.url,
          title: r.title,
          description: r.description,
          position: r.position,
          query: serp.query,
          domain: (() => { try { return new URL(r.url).hostname; } catch { return ''; } })()
        });
      }
    });
  });

  // Get all PAA questions
  const allQuestions = [];
  results.forEach(serp => {
    (serp.peopleAlsoAsk || []).forEach(q => {
      if (!allQuestions.includes(q)) allQuestions.push(q);
    });
  });

  // Get related searches
  const allRelated = [];
  results.forEach(serp => {
    (serp.relatedSearches || []).forEach(r => {
      if (!allRelated.includes(r)) allRelated.push(r);
    });
  });

  // Group by domain to find dominant publishers
  const domainCounts = {};
  allPages.forEach(p => {
    domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
  });
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([domain, count]) => ({ domain, count }));

  return {
    topic,
    totalPages: allPages.length,
    topPages: allPages.slice(0, 30),
    topDomains,
    questions: allQuestions,
    relatedTopics: allRelated,
    featuredSnippets: results.filter(r => r.featuredSnippet).map(r => ({
      query: r.query,
      ...r.featuredSnippet
    }))
  };
}


// =============================================
// COMPETITOR KEYWORD ANALYSIS (Find what keywords a competitor ranks for)
// =============================================

export async function getCompetitorKeywords(domain, seedKeywords, apifyToken) {
  if (!apifyToken) throw new Error('Apify token required');

  const { scrapeGoogleSERP } = await import('./apify.js');
  const cleanDomain = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*/, '');

  const results = await scrapeGoogleSERP({
    queries: seedKeywords,
    countryCode: 'in',
    resultsPerPage: 100
  });

  const rankings = [];
  results.forEach(serp => {
    const match = serp.organicResults.find(r => r.url.includes(cleanDomain));
    if (match) {
      rankings.push({
        keyword: serp.query,
        position: match.position,
        url: match.url,
        title: match.title,
        totalResults: serp.totalResults,
        estimatedTraffic: match.position <= 3 ? 'High' : match.position <= 10 ? 'Medium' : 'Low'
      });
    }
  });

  return {
    domain: cleanDomain,
    keywordsChecked: seedKeywords.length,
    keywordsRanking: rankings.length,
    rankings: rankings.sort((a, b) => a.position - b.position),
    topKeywords: rankings.filter(r => r.position <= 10),
    missingKeywords: seedKeywords.filter(kw =>
      !rankings.some(r => r.keyword === kw)
    )
  };
}
