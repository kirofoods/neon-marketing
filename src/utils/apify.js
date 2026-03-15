// Killjoy Apify Integration — Real SEO data via Apify actors
// Actors used:
//   - Google Search Results Scraper (apify/google-search-scraper)
//   - Website Content Crawler (apify/website-content-crawler)
//   - Google Maps Scraper (compass/crawler-google-places) — backup for leads

const APIFY_API = 'https://api.apify.com/v2';

function getApifyToken() {
  const token = localStorage.getItem('kj_apify_token');
  if (!token) throw new Error('Apify API token not set. Go to Settings.');
  return token;
}

export function isApifyTokenSet() {
  return !!localStorage.getItem('kj_apify_token');
}

// --- Run an Apify actor and wait for results ---
async function runActor(actorId, input, { timeout = 120000, memoryMbytes = 256 } = {}) {
  const token = getApifyToken();

  // Apify uses ~ separator in URLs (e.g. apify~google-search-scraper)
  const actorIdUrl = actorId.replace('/', '~');

  // Start the actor run — memoryMbytes goes as query param, body is pure input
  const startRes = await fetch(`${APIFY_API}/acts/${actorIdUrl}/runs?token=${token}&memory=${memoryMbytes}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });

  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to start actor: ${startRes.status}`);
  }

  const runData = await startRes.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error('No run ID returned');

  // Poll for completion
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(`${APIFY_API}/actor-runs/${runId}?token=${token}`);
    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === 'SUCCEEDED') {
      // Fetch dataset items
      const datasetId = statusData.data?.defaultDatasetId;
      const itemsRes = await fetch(`${APIFY_API}/datasets/${datasetId}/items?token=${token}&format=json`);
      return await itemsRes.json();
    }

    if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Actor run ${status.toLowerCase()}`);
    }
  }

  throw new Error('Actor run timed out');
}

// =============================================
// GOOGLE SERP SCRAPER
// =============================================
export async function scrapeGoogleSERP({ queries, countryCode = 'in', languageCode = 'en', maxPagesPerQuery = 1, resultsPerPage = 10 }) {
  const input = {
    queries: Array.isArray(queries) ? queries.join('\n') : queries,
    countryCode,
    languageCode,
    maxPagesPerQuery,
    resultsPerPage,
    mobileResults: false,
    includeUnfilteredResults: false,
    saveHtml: false,
    saveHtmlToKeyValueStore: false
  };

  const results = await runActor('apify/google-search-scraper', input, { timeout: 90000 });

  // Parse SERP results into structured data
  return results.map(item => ({
    query: item.searchQuery?.term || '',
    totalResults: item.searchQuery?.resultsTotal || 0,
    organicResults: (item.organicResults || []).map((r, i) => ({
      position: i + 1,
      title: r.title || '',
      url: r.url || '',
      displayUrl: r.displayedUrl || '',
      description: r.description || '',
      sitelinks: r.sitelinks || []
    })),
    paidResults: (item.paidResults || []).map(r => ({
      title: r.title || '',
      url: r.url || '',
      description: r.description || ''
    })),
    peopleAlsoAsk: (item.peopleAlsoAsk || []).map(q => q.question || q),
    relatedSearches: (item.relatedSearches || []).map(r => r.title || r),
    featuredSnippet: item.featuredSnippet ? {
      title: item.featuredSnippet.title || '',
      text: item.featuredSnippet.text || '',
      url: item.featuredSnippet.url || ''
    } : null
  }));
}

// =============================================
// WEBSITE CRAWLER (for site audit / content extraction)
// =============================================
export async function crawlWebsite({ url, maxPages = 20, maxDepth = 2 }) {
  const input = {
    startUrls: [{ url }],
    maxCrawlPages: maxPages,
    maxCrawlDepth: maxDepth,
    crawlerType: 'cheerio',
    includeUrlGlobs: [],
    excludeUrlGlobs: [],
    saveFiles: false,
    saveScreenshots: false,
    removeCookieWarnings: true,
    clickElementsCssSelector: '',
    htmlTransformer: 'readableText',
    readableTextCharThreshold: 100,
    aggressivePrune: false,
    proxyConfiguration: { useApifyProxy: true }
  };

  const results = await runActor('apify/website-content-crawler', input, { timeout: 180000, memoryMbytes: 512 });

  return results.map(page => ({
    url: page.url || '',
    title: page.metadata?.title || '',
    description: page.metadata?.description || '',
    h1: page.metadata?.h1 || '',
    text: page.text || '',
    wordCount: (page.text || '').split(/\s+/).filter(Boolean).length,
    loadedTime: page.loadedTime || null,
    statusCode: page.statusCode || null,
    headers: page.headers || {},
    links: (page.links || []).slice(0, 50),
    images: (page.images || []).length
  }));
}

// =============================================
// GOOGLE MAPS SCRAPER (Apify-powered, more results than Places API)
// =============================================
export async function scrapeGoogleMaps({ query, location, maxResults = 50 }) {
  const searchTerm = location ? `${query} in ${location}` : query;

  const input = {
    searchStringsArray: [searchTerm],
    maxCrawledPlacesPerSearch: maxResults,
    language: 'en',
    deeperCityScrape: false,
    includeWebResults: false,
    scrapeContacts: true,
    scrapeEmails: true
  };

  const results = await runActor('compass/crawler-google-places', input, { timeout: 180000, memoryMbytes: 512 });

  return results.map(place => ({
    id: place.placeId || `apify_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: place.title || '',
    address: place.address || '',
    phone: place.phone || '',
    website: place.website || '',
    email: (place.emails || []).join(', '),
    mapsUrl: place.url || '',
    status: place.permanentlyClosed ? 'CLOSED' : 'OPERATIONAL',
    type: place.categoryName || '',
    rating: place.totalScore || null,
    reviewCount: place.reviewsCount || 0,
    socialLinks: {
      facebook: (place.socialMedia || []).find(s => s.includes('facebook'))?.url || '',
      instagram: (place.socialMedia || []).find(s => s.includes('instagram'))?.url || '',
      twitter: (place.socialMedia || []).find(s => s.includes('twitter') || s.includes('x.com'))?.url || '',
      linkedin: (place.socialMedia || []).find(s => s.includes('linkedin'))?.url || ''
    },
    source: 'Apify Google Maps',
    scrapedAt: Date.now(),
    // Extra data from Apify
    imageUrl: place.imageUrl || '',
    priceRange: place.price || '',
    openingHours: place.openingHours || [],
    reviewsDistribution: place.reviewsDistribution || {}
  }));
}

// =============================================
// KEYWORD RANK TRACKER (check where a domain ranks for keywords)
// =============================================
export async function checkKeywordRankings({ domain, keywords, countryCode = 'in' }) {
  // Use Google Search Scraper and check where domain appears
  const results = await scrapeGoogleSERP({
    queries: keywords,
    countryCode,
    resultsPerPage: 100,
    maxPagesPerQuery: 1
  });

  return results.map(serp => {
    const domainClean = domain.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    const match = serp.organicResults.find(r =>
      r.url.includes(domainClean)
    );

    return {
      keyword: serp.query,
      position: match ? match.position : null,
      url: match ? match.url : null,
      title: match ? match.title : null,
      totalResults: serp.totalResults,
      topResult: serp.organicResults[0] ? {
        title: serp.organicResults[0].title,
        url: serp.organicResults[0].url
      } : null,
      featuredSnippet: serp.featuredSnippet,
      peopleAlsoAsk: serp.peopleAlsoAsk?.slice(0, 3) || []
    };
  });
}

// =============================================
// SITE AUDIT ANALYZER (crawl + analyze)
// =============================================
export async function runSiteAudit({ url, maxPages = 30 }) {
  const pages = await crawlWebsite({ url, maxPages, maxDepth: 3 });

  // Analyze the crawled data
  const issues = [];
  let totalWords = 0;
  const titleLengths = [];
  const descLengths = [];
  const missingTitles = [];
  const missingDescriptions = [];
  const missingH1 = [];
  const duplicateTitles = {};
  const brokenPages = [];
  const slowPages = [];

  pages.forEach(page => {
    totalWords += page.wordCount;

    // Title checks
    if (!page.title) {
      missingTitles.push(page.url);
    } else {
      titleLengths.push(page.title.length);
      if (page.title.length > 60) {
        issues.push({ type: 'warning', category: 'Content', title: 'Title too long', description: `${page.url} — title is ${page.title.length} chars (max 60)`, url: page.url });
      }
      if (page.title.length < 30) {
        issues.push({ type: 'warning', category: 'Content', title: 'Title too short', description: `${page.url} — title is ${page.title.length} chars (min 30)`, url: page.url });
      }
      duplicateTitles[page.title] = (duplicateTitles[page.title] || 0) + 1;
    }

    // Meta description checks
    if (!page.description) {
      missingDescriptions.push(page.url);
    } else {
      descLengths.push(page.description.length);
      if (page.description.length > 160) {
        issues.push({ type: 'info', category: 'Content', title: 'Meta description too long', description: `${page.url} — ${page.description.length} chars (max 160)`, url: page.url });
      }
    }

    // H1 check
    if (!page.h1) missingH1.push(page.url);

    // Thin content
    if (page.wordCount < 300 && page.wordCount > 0) {
      issues.push({ type: 'warning', category: 'Content', title: 'Thin content', description: `${page.url} — only ${page.wordCount} words`, url: page.url });
    }

    // Status code
    if (page.statusCode && page.statusCode >= 400) {
      brokenPages.push({ url: page.url, status: page.statusCode });
    }
  });

  // Duplicate titles
  Object.entries(duplicateTitles).forEach(([title, count]) => {
    if (count > 1) {
      issues.push({ type: 'critical', category: 'Technical', title: 'Duplicate title tag', description: `"${title.substring(0, 50)}..." used on ${count} pages`, count });
    }
  });

  if (missingTitles.length > 0) {
    issues.push({ type: 'critical', category: 'Content', title: 'Missing title tags', description: `${missingTitles.length} page(s) have no title tag`, urls: missingTitles });
  }
  if (missingDescriptions.length > 0) {
    issues.push({ type: 'warning', category: 'Content', title: 'Missing meta descriptions', description: `${missingDescriptions.length} page(s) have no meta description`, urls: missingDescriptions });
  }
  if (missingH1.length > 0) {
    issues.push({ type: 'warning', category: 'Content', title: 'Missing H1 tags', description: `${missingH1.length} page(s) have no H1 heading`, urls: missingH1 });
  }

  // Calculate health score
  const criticalCount = issues.filter(i => i.type === 'critical').length;
  const warningCount = issues.filter(i => i.type === 'warning').length;
  const healthScore = Math.max(0, Math.min(100, 100 - (criticalCount * 15) - (warningCount * 5)));

  return {
    url,
    pagesCrawled: pages.length,
    healthScore,
    totalWords,
    avgWordsPerPage: Math.round(totalWords / Math.max(1, pages.length)),
    issues,
    brokenPages,
    pages: pages.map(p => ({
      url: p.url,
      title: p.title,
      description: p.description,
      h1: p.h1,
      wordCount: p.wordCount,
      statusCode: p.statusCode
    })),
    summary: {
      totalPages: pages.length,
      criticalIssues: criticalCount,
      warnings: warningCount,
      missingTitles: missingTitles.length,
      missingDescriptions: missingDescriptions.length,
      missingH1: missingH1.length,
      brokenLinks: brokenPages.length
    }
  };
}


// =============================================
// INSTAGRAM SCRAPER
// =============================================
export async function scrapeInstagramProfile({ usernames, resultsLimit = 20 }) {
  const input = {
    usernames: Array.isArray(usernames) ? usernames : [usernames],
    resultsLimit,
    resultsType: 'posts',
    searchType: 'user',
    searchLimit: 1,
  };
  const results = await runActor('apify/instagram-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.id || item.shortCode || '',
    shortCode: item.shortCode || '',
    type: item.type || 'Image',
    url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
    caption: item.caption || '',
    hashtags: (item.hashtags || []),
    mentions: (item.mentions || []),
    likes: item.likesCount || item.likes || 0,
    comments: item.commentsCount || item.comments || 0,
    timestamp: item.timestamp || item.takenAt || '',
    imageUrl: item.displayUrl || item.imageUrl || '',
    videoUrl: item.videoUrl || '',
    ownerUsername: item.ownerUsername || '',
    ownerFullName: item.ownerFullName || '',
    ownerFollowers: item.ownerFollowersCount || 0,
    ownerFollowing: item.ownerFollowingCount || 0,
    ownerPosts: item.ownerPostsCount || 0,
    ownerBio: item.ownerBio || '',
    ownerIsVerified: item.ownerIsVerified || false,
    location: item.locationName || '',
    isVideo: item.isVideo || item.type === 'Video',
  }));
}

export async function scrapeInstagramHashtag({ hashtags, resultsLimit = 30 }) {
  const input = {
    hashtags: Array.isArray(hashtags) ? hashtags : [hashtags],
    resultsLimit,
    resultsType: 'posts',
  };
  const results = await runActor('apify/instagram-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.id || item.shortCode || '',
    shortCode: item.shortCode || '',
    type: item.type || 'Image',
    url: item.url || `https://www.instagram.com/p/${item.shortCode}/`,
    caption: item.caption || '',
    hashtags: item.hashtags || [],
    likes: item.likesCount || 0,
    comments: item.commentsCount || 0,
    timestamp: item.timestamp || '',
    imageUrl: item.displayUrl || '',
    ownerUsername: item.ownerUsername || '',
  }));
}


// =============================================
// FACEBOOK / META SCRAPER
// =============================================
export async function scrapeFacebookPage({ urls, resultsLimit = 20 }) {
  const input = {
    startUrls: (Array.isArray(urls) ? urls : [urls]).map(u => ({ url: u })),
    resultsLimit,
  };
  const results = await runActor('apify/facebook-posts-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.postId || item.id || '',
    url: item.postUrl || item.url || '',
    text: item.text || item.message || '',
    likes: item.likes || item.likesCount || 0,
    comments: item.comments || item.commentsCount || 0,
    shares: item.shares || item.sharesCount || 0,
    timestamp: item.time || item.timestamp || '',
    pageTitle: item.pageName || item.pageTitle || '',
    pageUrl: item.pageUrl || '',
    imageUrl: item.imageUrl || (item.images || [])[0] || '',
    videoUrl: item.videoUrl || '',
    type: item.type || 'post',
  }));
}


// =============================================
// FACEBOOK ADS LIBRARY SCRAPER
// =============================================
export async function scrapeFacebookAdsLibrary({ searchTerms, country = 'IN', adType = 'ALL', limit = 30 }) {
  const input = {
    searchTerms: Array.isArray(searchTerms) ? searchTerms : [searchTerms],
    country,
    adType,
    maxItems: limit,
  };
  const results = await runActor('apify/facebook-ads-library', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.adArchiveID || item.id || '',
    pageId: item.pageID || '',
    pageName: item.pageName || '',
    pageUrl: item.pageUrl || '',
    adCreativeBody: item.adCreativeBody || item.body || '',
    adCreativeTitle: item.adCreativeTitle || item.title || '',
    adCreativeLink: item.adCreativeLinkCaption || item.linkCaption || '',
    adUrl: item.adSnapshotUrl || item.url || '',
    startDate: item.startDate || item.adDeliveryStartTime || '',
    endDate: item.endDate || item.adDeliveryStopTime || '',
    isActive: item.isActive !== undefined ? item.isActive : !item.adDeliveryStopTime,
    currency: item.currency || '',
    spend: item.spend || null,
    impressions: item.impressions || null,
    platforms: item.publisherPlatform || [],
    imageUrl: item.imageUrl || item.snapshotUrl || '',
    category: item.adCategory || '',
    demographicDistribution: item.demographicDistribution || [],
    regionDistribution: item.regionDistribution || [],
  }));
}


// =============================================
// LINKEDIN SCRAPER
// =============================================
export async function scrapeLinkedInProfile({ urls, resultsLimit = 10 }) {
  const input = {
    startUrls: (Array.isArray(urls) ? urls : [urls]).map(u => ({ url: u })),
    maxItems: resultsLimit,
  };
  const results = await runActor('anchor/linkedin-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.id || item.profileUrl || '',
    name: item.fullName || item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
    headline: item.headline || item.title || '',
    location: item.location || item.geoLocation || '',
    profileUrl: item.profileUrl || item.url || '',
    profileImageUrl: item.profileImageUrl || item.profilePicture || '',
    summary: item.summary || item.about || '',
    connectionCount: item.connectionsCount || item.connections || 0,
    followerCount: item.followersCount || item.followers || 0,
    currentCompany: item.currentCompany || item.company || '',
    currentTitle: item.currentTitle || item.position || '',
    experience: (item.experience || []).map(e => ({
      title: e.title || '',
      company: e.companyName || e.company || '',
      duration: e.duration || '',
      description: e.description || '',
    })),
    education: (item.education || []).map(e => ({
      school: e.schoolName || e.school || '',
      degree: e.degreeName || e.degree || '',
      field: e.fieldOfStudy || '',
    })),
    skills: (item.skills || []).slice(0, 20),
  }));
}

export async function scrapeLinkedInCompany({ urls, resultsLimit = 10 }) {
  const input = {
    startUrls: (Array.isArray(urls) ? urls : [urls]).map(u => ({ url: u })),
    maxItems: resultsLimit,
  };
  const results = await runActor('anchor/linkedin-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.id || '',
    name: item.name || item.companyName || '',
    tagline: item.tagline || '',
    description: item.description || '',
    website: item.website || '',
    industry: item.industry || '',
    companySize: item.companySize || item.staffCount || '',
    headquarters: item.headquarters || item.location || '',
    founded: item.founded || '',
    specialties: item.specialties || [],
    followerCount: item.followersCount || 0,
    employeeCount: item.employeesOnLinkedIn || 0,
    logoUrl: item.logoUrl || '',
    coverImageUrl: item.coverImageUrl || '',
    posts: (item.posts || []).map(p => ({
      text: p.text || '',
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      timestamp: p.timestamp || '',
    })),
  }));
}


// =============================================
// TWITTER / X SCRAPER
// =============================================
export async function scrapeTwitterProfile({ handles, resultsLimit = 30 }) {
  const input = {
    handles: Array.isArray(handles) ? handles : [handles],
    maxItems: resultsLimit,
    mode: 'own',
    addUserInfo: true,
  };
  const results = await runActor('apidojo/tweet-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.id || item.tweetId || '',
    text: item.full_text || item.text || '',
    url: item.url || `https://twitter.com/i/web/status/${item.id}`,
    likes: item.favorite_count || item.likes || 0,
    retweets: item.retweet_count || item.retweets || 0,
    replies: item.reply_count || item.replies || 0,
    quotes: item.quote_count || 0,
    views: item.views || item.viewCount || 0,
    timestamp: item.created_at || item.timestamp || '',
    authorName: item.user?.name || item.authorName || '',
    authorHandle: item.user?.screen_name || item.authorHandle || '',
    authorFollowers: item.user?.followers_count || item.authorFollowers || 0,
    authorFollowing: item.user?.friends_count || 0,
    authorVerified: item.user?.verified || false,
    authorProfileImage: item.user?.profile_image_url_https || '',
    hashtags: (item.entities?.hashtags || item.hashtags || []).map(h => h.text || h),
    mentions: (item.entities?.user_mentions || item.mentions || []).map(m => m.screen_name || m),
    media: (item.entities?.media || item.media || []).map(m => ({
      type: m.type || 'photo',
      url: m.media_url_https || m.url || '',
    })),
    isRetweet: item.is_retweet || !!item.retweeted_status,
    isReply: !!item.in_reply_to_status_id,
    language: item.lang || '',
  }));
}

export async function scrapeTwitterSearch({ query, resultsLimit = 30 }) {
  const input = {
    searchTerms: [query],
    maxItems: resultsLimit,
    mode: 'live',
    addUserInfo: true,
  };
  const results = await runActor('apidojo/tweet-scraper', input, { timeout: 180000, memoryMbytes: 512 });
  return results.map(item => ({
    id: item.id || '',
    text: item.full_text || item.text || '',
    url: item.url || `https://twitter.com/i/web/status/${item.id}`,
    likes: item.favorite_count || 0,
    retweets: item.retweet_count || 0,
    replies: item.reply_count || 0,
    views: item.views || 0,
    timestamp: item.created_at || '',
    authorName: item.user?.name || '',
    authorHandle: item.user?.screen_name || '',
    authorFollowers: item.user?.followers_count || 0,
    hashtags: (item.entities?.hashtags || []).map(h => h.text || h),
    isRetweet: item.is_retweet || false,
  }));
}
