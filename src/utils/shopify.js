// NEON Shopify Integration — SEO Auto-Fix Engine
// Uses Shopify Admin API (REST) with Access Token
// Capabilities: read/write products, pages, blogs, metafields, theme files, redirects

// =============================================
// CONFIG & AUTH
// =============================================

function getShopifyConfig() {
  const store = localStorage.getItem('kj_shopify_store'); // e.g. "mystore.myshopify.com"
  const token = localStorage.getItem('kj_shopify_token'); // Admin API access token
  if (!store || !token) throw new Error('Shopify store not connected. Go to Settings.');
  return { store: store.replace(/^https?:\/\//, '').replace(/\/$/, ''), token };
}

export function isShopifyConnected() {
  return !!(localStorage.getItem('kj_shopify_store') && localStorage.getItem('kj_shopify_token'));
}

export function getShopifyStoreName() {
  return localStorage.getItem('kj_shopify_store') || '';
}

// CORS proxy fallback for when Netlify function isn't available
function getCorsProxy() {
  return localStorage.getItem('kj_cors_proxy') || 'https://corsproxy.io/?';
}

// Generic Shopify Admin API call — tries Netlify function first, falls back to CORS proxy
async function shopifyAPI(endpoint, method = 'GET', body = null) {
  const { store, token } = getShopifyConfig();

  // === Strategy 1: Netlify serverless function (works on proper deploys) ===
  try {
    const fnRes = await fetch('/.netlify/functions/shopify-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store, token, endpoint, method, body }),
      signal: AbortSignal.timeout(30000),
    });

    // If we got HTML back, the function doesn't exist (drag-and-drop deploy)
    const contentType = fnRes.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Function not deployed');
    }

    const fnData = await fnRes.json();
    if (!fnRes.ok) {
      throw new Error(fnData.error || `Shopify API: ${fnRes.status}`);
    }
    return fnData;
  } catch (fnErr) {
    // Function not available — fall through to CORS proxy
    if (fnErr.message === 'Function not deployed' || fnErr.name === 'TypeError' || fnErr.message.includes('Failed to fetch')) {
      console.log('[NEON] Netlify function unavailable, using CORS proxy fallback');
    } else {
      // It's a real Shopify API error, throw it
      throw fnErr;
    }
  }

  // === Strategy 2: CORS proxy fallback ===
  const customProxy = getCorsProxy();
  const targetUrl = `https://${store}/admin/api/2026-01${endpoint}`;
  const bodyStr = (body && method !== 'GET') ? JSON.stringify(body) : null;

  // Each proxy has different URL formats and header forwarding capabilities
  const proxyConfigs = [
    {
      name: 'corsproxy.io',
      buildUrl: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      forwardsHeaders: true,
    },
    {
      name: 'corsproxy.io (unencoded)',
      buildUrl: (url) => `https://corsproxy.io/?${url}`,
      forwardsHeaders: true,
    },
    {
      name: 'cors.sh',
      buildUrl: (url) => `https://proxy.cors.sh/${url}`,
      forwardsHeaders: true,
    },
    {
      name: 'custom',
      buildUrl: (url) => customProxy.includes('?') ? `${customProxy}${encodeURIComponent(url)}` : `${customProxy}${url}`,
      forwardsHeaders: true,
    },
  ];

  // De-duplicate by generated URL
  const seen = new Set();
  const uniqueConfigs = proxyConfigs.filter(cfg => {
    const u = cfg.buildUrl(targetUrl);
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  let lastError;
  for (const cfg of uniqueConfigs) {
    const proxyUrl = cfg.buildUrl(targetUrl);
    try {
      const fetchOpts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        signal: AbortSignal.timeout(20000),
      };
      if (bodyStr) fetchOpts.body = bodyStr;

      console.log(`[NEON] Trying ${cfg.name}...`);
      const res = await fetch(proxyUrl, fetchOpts);

      // Check if we got HTML back (proxy error page)
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) {
        throw new Error(`${cfg.name} returned HTML instead of JSON`);
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ errors: `HTTP ${res.status}` }));
        throw new Error(typeof err.errors === 'string' ? err.errors : JSON.stringify(err.errors || err));
      }

      if (method === 'DELETE') return { success: true };
      console.log(`[NEON] ${cfg.name} succeeded`);
      return await res.json();
    } catch (e) {
      console.warn(`[NEON] ${cfg.name} failed:`, e.message);
      lastError = e;
      continue;
    }
  }

  throw new Error(`Shopify API call failed: ${lastError?.message || 'All proxies failed'}. For reliable access, deploy via Netlify CLI instead of drag-and-drop.`);
}


// =============================================
// PRODUCTS
// =============================================

export async function getProducts(limit = 50) {
  const data = await shopifyAPI(`/products.json?limit=${limit}&fields=id,title,handle,body_html,images,metafields_global_title_tag,metafields_global_description_tag,status`);
  return data.products || [];
}

export async function updateProduct(id, updates) {
  const data = await shopifyAPI(`/products/${id}.json`, 'PUT', { product: { id, ...updates } });
  return data.product;
}

export async function updateProductImageAlt(productId, imageId, alt) {
  const data = await shopifyAPI(`/products/${productId}/images/${imageId}.json`, 'PUT', {
    image: { id: imageId, alt }
  });
  return data.image;
}


// =============================================
// PAGES
// =============================================

export async function getPages(limit = 50) {
  const data = await shopifyAPI(`/pages.json?limit=${limit}`);
  return data.pages || [];
}

export async function updatePage(id, updates) {
  const data = await shopifyAPI(`/pages/${id}.json`, 'PUT', { page: { id, ...updates } });
  return data.page;
}


// =============================================
// BLOG ARTICLES
// =============================================

export async function getBlogs() {
  const data = await shopifyAPI('/blogs.json');
  return data.blogs || [];
}

export async function getBlogArticles(blogId, limit = 50) {
  const data = await shopifyAPI(`/blogs/${blogId}/articles.json?limit=${limit}`);
  return data.articles || [];
}

export async function updateArticle(blogId, articleId, updates) {
  const data = await shopifyAPI(`/blogs/${blogId}/articles/${articleId}.json`, 'PUT', {
    article: { id: articleId, ...updates }
  });
  return data.article;
}


// =============================================
// REDIRECTS
// =============================================

export async function getRedirects(limit = 50) {
  const data = await shopifyAPI(`/redirects.json?limit=${limit}`);
  return data.redirects || [];
}

export async function createRedirect(path, target) {
  const data = await shopifyAPI('/redirects.json', 'POST', {
    redirect: { path, target }
  });
  return data.redirect;
}


// =============================================
// THEME
// =============================================

export async function getThemes() {
  const data = await shopifyAPI('/themes.json');
  return data.themes || [];
}

export async function getActiveTheme() {
  const themes = await getThemes();
  return themes.find(t => t.role === 'main') || themes[0];
}

export async function getThemeAsset(themeId, assetKey) {
  const data = await shopifyAPI(`/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(assetKey)}`);
  return data.asset;
}

export async function updateThemeAsset(themeId, assetKey, value) {
  const data = await shopifyAPI(`/themes/${themeId}/assets.json`, 'PUT', {
    asset: { key: assetKey, value }
  });
  return data.asset;
}


// =============================================
// COLLECTIONS
// =============================================

export async function getCollections(type = 'custom', limit = 50) {
  const endpoint = type === 'smart' ? '/smart_collections.json' : '/custom_collections.json';
  const data = await shopifyAPI(`${endpoint}?limit=${limit}`);
  return data.custom_collections || data.smart_collections || [];
}


// =============================================
// ORDERS
// =============================================

export async function getOrders(limit = 50, status = 'any') {
  const data = await shopifyAPI(`/orders.json?limit=${limit}&status=${status}&fields=id,name,email,total_price,currency,financial_status,fulfillment_status,created_at,line_items,customer,tags`);
  return data.orders || [];
}

export async function getOrderCount(status = 'any') {
  const data = await shopifyAPI(`/orders/count.json?status=${status}`);
  return data.count || 0;
}

// =============================================
// ANALYTICS / STORE INFO
// =============================================

export async function getShopInfo() {
  const data = await shopifyAPI('/shop.json');
  return data.shop || {};
}

export async function getInventoryLevels(locationId, limit = 50) {
  const data = await shopifyAPI(`/inventory_levels.json?location_ids=${locationId}&limit=${limit}`);
  return data.inventory_levels || [];
}

export async function getLocations() {
  const data = await shopifyAPI('/locations.json');
  return data.locations || [];
}

export async function getProductCount() {
  const data = await shopifyAPI('/products/count.json');
  return data.count || 0;
}

export async function getCustomerCount() {
  const data = await shopifyAPI('/customers/count.json');
  return data.count || 0;
}

export async function getCustomers(limit = 50) {
  const data = await shopifyAPI(`/customers.json?limit=${limit}&fields=id,first_name,last_name,email,orders_count,total_spent,created_at,tags`);
  return data.customers || [];
}

// =============================================
// MEDIA / ALT TEXT MANAGEMENT
// =============================================

// Get ALL product images across all products
export async function getAllProductImages(onProgress) {
  const allImages = [];
  let page = 1;
  let sinceId = 0;
  let hasMore = true;

  while (hasMore) {
    if (onProgress) onProgress(`Fetching products page ${page}...`);
    const endpoint = sinceId > 0
      ? `/products.json?limit=250&since_id=${sinceId}&fields=id,title,handle,images`
      : `/products.json?limit=250&fields=id,title,handle,images`;
    const data = await shopifyAPI(endpoint);
    const products = data.products || [];
    if (products.length === 0) { hasMore = false; break; }

    for (const product of products) {
      for (const img of (product.images || [])) {
        allImages.push({
          id: img.id,
          productId: product.id,
          productTitle: product.title,
          productHandle: product.handle,
          src: img.src,
          alt: img.alt || '',
          width: img.width,
          height: img.height,
          position: img.position,
          type: 'product_image',
        });
      }
    }
    sinceId = products[products.length - 1].id;
    if (products.length < 250) hasMore = false;
    page++;
  }

  if (onProgress) onProgress(`Found ${allImages.length} product images`);
  return allImages;
}

// Generate AI alt text for an image
export async function generateAltText(imageUrl, productTitle, context = '') {
  // We return a suggested alt text based on the product context
  // This will be called from the component which will use callClaude
  return `${productTitle} - ${context || 'product image'}`.substring(0, 125);
}

// Batch update alt text for multiple images
export async function batchUpdateAltText(updates, onProgress) {
  let completed = 0;
  const results = [];
  for (const { productId, imageId, alt } of updates) {
    try {
      await updateProductImageAlt(productId, imageId, alt);
      results.push({ imageId, success: true });
    } catch (e) {
      results.push({ imageId, success: false, error: e.message });
    }
    completed++;
    if (onProgress) onProgress(completed, updates.length);
  }
  return results;
}


// =============================================
// SEO AUTO-FIX ENGINE
// =============================================

// Fix a specific SEO issue on a Shopify resource
export async function fixSEOIssue(issue) {
  const { fixType, resourceType, resourceId, fixData } = issue;

  switch (fixType) {
    case 'fix_meta_title': {
      if (resourceType === 'product') return updateProduct(resourceId, { metafields_global_title_tag: fixData.value });
      if (resourceType === 'page') return updatePage(resourceId, { metafields: [{ namespace: 'global', key: 'title_tag', value: fixData.value, type: 'single_line_text_field' }] });
      if (resourceType === 'article') return updateArticle(fixData.blogId, resourceId, { metafields_global_title_tag: fixData.value });
      break;
    }
    case 'fix_meta_description': {
      if (resourceType === 'product') return updateProduct(resourceId, { metafields_global_description_tag: fixData.value });
      if (resourceType === 'page') return updatePage(resourceId, { metafields: [{ namespace: 'global', key: 'description_tag', value: fixData.value, type: 'single_line_text_field' }] });
      if (resourceType === 'article') return updateArticle(fixData.blogId, resourceId, { metafields_global_description_tag: fixData.value });
      break;
    }
    case 'fix_image_alt': {
      return updateProductImageAlt(fixData.productId, fixData.imageId, fixData.value);
    }
    case 'fix_title': {
      if (resourceType === 'product') return updateProduct(resourceId, { title: fixData.value });
      if (resourceType === 'page') return updatePage(resourceId, { title: fixData.value });
      break;
    }
    case 'fix_handle': {
      if (resourceType === 'product') return updateProduct(resourceId, { handle: fixData.value });
      if (resourceType === 'page') return updatePage(resourceId, { handle: fixData.value });
      break;
    }
    case 'create_redirect': {
      return createRedirect(fixData.fromPath, fixData.toPath);
    }
    default:
      throw new Error(`Unknown fix type: ${fixType}`);
  }
}


// =============================================
// FULL SHOPIFY SEO AUDIT — Scans entire store, generates fixable issues
// =============================================

export async function auditShopifySEO(onProgress) {
  const issues = [];
  let step = 0;
  const totalSteps = 3;

  // --- 1. PRODUCTS ---
  step++;
  if (onProgress) onProgress(step, totalSteps, 'Scanning products...');
  try {
    const products = await getProducts(250);
    for (const p of products) {
      const titleTag = p.metafields_global_title_tag || '';
      const descTag = p.metafields_global_description_tag || '';
      const bodyText = (p.body_html || '').replace(/<[^>]+>/g, '').trim();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

      // Missing meta title
      if (!titleTag) {
        const fix = `${p.title} | Buy Online`.substring(0, 60);
        issues.push({
          severity: 'warning', category: 'Meta Title',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: 'Missing SEO title tag',
          details: `Using default page title "${p.title}" instead of optimized SEO title`,
          currentValue: p.title,
          suggestedFix: fix,
          fixType: 'fix_meta_title',
          fixData: { value: fix }
        });
      } else if (titleTag.length > 60) {
        const fix = titleTag.substring(0, 57) + '...';
        issues.push({
          severity: 'warning', category: 'Meta Title',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: `SEO title too long (${titleTag.length}/60 chars)`,
          details: `Google will truncate this title in search results`,
          currentValue: titleTag,
          suggestedFix: fix,
          fixType: 'fix_meta_title',
          fixData: { value: fix }
        });
      } else if (titleTag.length < 30) {
        issues.push({
          severity: 'info', category: 'Meta Title',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: `SEO title too short (${titleTag.length}/60 chars)`,
          details: `Longer titles use more SERP real estate`,
          currentValue: titleTag,
          suggestedFix: `${titleTag} - Shop Now`,
          fixType: 'fix_meta_title',
          fixData: { value: `${titleTag} - Shop Now`.substring(0, 60) }
        });
      }

      // Missing meta description
      if (!descTag) {
        const fix = bodyText.substring(0, 155) || `Shop ${p.title} online. Premium quality at great prices. Free shipping available.`;
        issues.push({
          severity: 'critical', category: 'Meta Description',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: 'Missing meta description',
          details: 'Google will auto-generate a snippet, which may not be ideal',
          currentValue: '(empty)',
          suggestedFix: fix.substring(0, 160),
          fixType: 'fix_meta_description',
          fixData: { value: fix.substring(0, 160) }
        });
      } else if (descTag.length > 160) {
        issues.push({
          severity: 'info', category: 'Meta Description',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: `Meta description too long (${descTag.length}/160 chars)`,
          details: 'Google will truncate this in search results',
          currentValue: descTag,
          suggestedFix: descTag.substring(0, 157) + '...',
          fixType: 'fix_meta_description',
          fixData: { value: descTag.substring(0, 157) + '...' }
        });
      }

      // Missing image alt text
      for (const img of (p.images || [])) {
        if (!img.alt || !img.alt.trim()) {
          const fix = `${p.title} - Product Image`;
          issues.push({
            severity: 'warning', category: 'Image Alt Text',
            resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
            url: `/products/${p.handle}`,
            issue: `Image missing alt text`,
            details: `Image ID ${img.id} has no alt attribute — hurts accessibility & image SEO`,
            currentValue: '(empty)',
            suggestedFix: fix,
            fixType: 'fix_image_alt',
            fixData: { productId: p.id, imageId: img.id, value: fix }
          });
        }
      }

      // Thin content
      if (wordCount < 50) {
        issues.push({
          severity: 'info', category: 'Content',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: `Thin product description (${wordCount} words)`,
          details: 'Products with 150+ words of unique description rank better',
          currentValue: `${wordCount} words`,
          suggestedFix: 'Add detailed features, benefits, specs, and use cases',
          fixType: null
        });
      }

      // URL handle check (underscores, uppercase, etc.)
      if (p.handle && (p.handle.includes('_') || p.handle !== p.handle.toLowerCase())) {
        const fix = p.handle.toLowerCase().replace(/_/g, '-');
        issues.push({
          severity: 'info', category: 'URL Structure',
          resource: `Product: ${p.title}`, resourceType: 'product', resourceId: p.id,
          url: `/products/${p.handle}`,
          issue: 'Non-optimal URL handle',
          details: 'Use lowercase with hyphens for best SEO',
          currentValue: p.handle,
          suggestedFix: fix,
          fixType: 'fix_handle',
          fixData: { value: fix }
        });
      }
    }
  } catch (e) {
    issues.push({ severity: 'critical', category: 'Error', resource: 'Products', issue: `Failed to scan: ${e.message}`, fixType: null });
  }

  // --- 2. PAGES ---
  step++;
  if (onProgress) onProgress(step, totalSteps, 'Scanning pages...');
  try {
    const pages = await getPages(250);
    for (const page of pages) {
      const bodyText = (page.body_html || '').replace(/<[^>]+>/g, '').trim();

      if (!page.metafields_global_title_tag) {
        const fix = page.title.substring(0, 60);
        issues.push({
          severity: 'warning', category: 'Meta Title',
          resource: `Page: ${page.title}`, resourceType: 'page', resourceId: page.id,
          url: `/pages/${page.handle}`,
          issue: 'Missing SEO title',
          details: `Page uses default title "${page.title}"`,
          currentValue: page.title,
          suggestedFix: fix,
          fixType: 'fix_meta_title',
          fixData: { value: fix }
        });
      }

      if (!page.metafields_global_description_tag) {
        const fix = bodyText.substring(0, 155) || `Learn more about ${page.title}`;
        issues.push({
          severity: 'critical', category: 'Meta Description',
          resource: `Page: ${page.title}`, resourceType: 'page', resourceId: page.id,
          url: `/pages/${page.handle}`,
          issue: 'Missing meta description',
          details: 'No meta description — Google will auto-generate one',
          currentValue: '(empty)',
          suggestedFix: fix.substring(0, 160),
          fixType: 'fix_meta_description',
          fixData: { value: fix.substring(0, 160) }
        });
      }
    }
  } catch (e) {
    issues.push({ severity: 'critical', category: 'Error', resource: 'Pages', issue: `Failed to scan: ${e.message}`, fixType: null });
  }

  // --- 3. BLOG ARTICLES ---
  step++;
  if (onProgress) onProgress(step, totalSteps, 'Scanning blog articles...');
  try {
    const blogs = await getBlogs();
    for (const blog of blogs) {
      const articles = await getBlogArticles(blog.id, 250);
      for (const a of articles) {
        const bodyText = (a.body_html || '').replace(/<[^>]+>/g, '').trim();
        const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

        if (!a.metafields_global_title_tag) {
          issues.push({
            severity: 'warning', category: 'Meta Title',
            resource: `Article: ${a.title}`, resourceType: 'article', resourceId: a.id,
            url: `/blogs/${blog.handle}/${a.handle}`,
            issue: 'Missing SEO title',
            details: `Article uses default title "${a.title}"`,
            currentValue: a.title,
            suggestedFix: a.title.substring(0, 60),
            fixType: 'fix_meta_title',
            fixData: { blogId: blog.id, value: a.title.substring(0, 60) }
          });
        }

        if (!a.metafields_global_description_tag) {
          const fix = bodyText.substring(0, 155) || `Read about ${a.title}`;
          issues.push({
            severity: 'critical', category: 'Meta Description',
            resource: `Article: ${a.title}`, resourceType: 'article', resourceId: a.id,
            url: `/blogs/${blog.handle}/${a.handle}`,
            issue: 'Missing meta description',
            details: 'No meta description set for this article',
            currentValue: '(empty)',
            suggestedFix: fix.substring(0, 160),
            fixType: 'fix_meta_description',
            fixData: { blogId: blog.id, value: fix.substring(0, 160) }
          });
        }

        if (wordCount < 300) {
          issues.push({
            severity: 'info', category: 'Content',
            resource: `Article: ${a.title}`, resourceType: 'article', resourceId: a.id,
            url: `/blogs/${blog.handle}/${a.handle}`,
            issue: `Thin content (${wordCount} words)`,
            details: 'Articles with 800+ words tend to rank significantly better',
            currentValue: `${wordCount} words`,
            suggestedFix: 'Expand with more detail, examples, and media',
            fixType: null
          });
        }
      }
    }
  } catch (e) {
    issues.push({ severity: 'critical', category: 'Error', resource: 'Blog', issue: `Failed to scan: ${e.message}`, fixType: null });
  }

  // Sort by severity
  const order = { critical: 0, warning: 1, info: 2, pass: 3 };
  issues.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  return {
    totalIssues: issues.filter(i => i.severity !== 'pass').length,
    critical: issues.filter(i => i.severity === 'critical').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    fixable: issues.filter(i => i.fixType).length,
    issues
  };
}
