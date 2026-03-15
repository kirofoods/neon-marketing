// Killjoy — Shopify Blog Article Publisher (Netlify Serverless Function)
// Publishes articles directly to your Shopify store's blog

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN; // e.g., your-store.myshopify.com
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopDomain || !accessToken) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'SHOPIFY_STORE_DOMAIN and SHOPIFY_ACCESS_TOKEN must be configured in Netlify environment variables.',
        setup: {
          steps: [
            '1. Go to your Shopify Admin → Settings → Apps and sales channels → Develop apps',
            '2. Create a new app called "Killjoy Publisher"',
            '3. Configure Admin API scopes: write_articles, read_articles, write_blogs, read_blogs',
            '4. Install the app and copy the Admin API access token',
            '5. In Netlify: Site settings → Environment variables, add:',
            '   SHOPIFY_STORE_DOMAIN = your-store.myshopify.com',
            '   SHOPIFY_ACCESS_TOKEN = shpat_xxxxx'
          ]
        }
      })
    };
  }

  const shopifyAPI = `https://${shopDomain}/admin/api/2024-01`;
  const shopifyHeaders = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken
  };

  try {
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    // GET BLOGS — list all blogs on the store
    if (event.httpMethod === 'GET' || action === 'list-blogs') {
      const res = await fetch(`${shopifyAPI}/blogs.json`, { headers: shopifyHeaders });
      if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ blogs: data.blogs })
      };
    }

    // LIST ARTICLES — get articles from a blog
    if (action === 'list-articles') {
      const { blogId, limit = 10 } = body;
      if (!blogId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'blogId required' }) };

      const res = await fetch(`${shopifyAPI}/blogs/${blogId}/articles.json?limit=${limit}`, { headers: shopifyHeaders });
      if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ articles: data.articles })
      };
    }

    // PUBLISH ARTICLE — create a new blog article
    if (action === 'publish') {
      const { blogId, title, bodyHtml, author, tags, summary, published, image } = body;

      if (!blogId || !title || !bodyHtml) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'blogId, title, and bodyHtml are required' })
        };
      }

      const articleData = {
        article: {
          title,
          body_html: bodyHtml,
          author: author || 'Killjoy AI',
          tags: tags || '',
          summary_html: summary || '',
          published: published !== false
        }
      };

      // If image URL provided, attach it
      if (image) {
        articleData.article.image = { src: image, alt: title };
      }

      const res = await fetch(`${shopifyAPI}/blogs/${blogId}/articles.json`, {
        method: 'POST',
        headers: shopifyHeaders,
        body: JSON.stringify(articleData)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Shopify publish error: ${res.status} ${errText}`);
      }

      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          article: {
            id: data.article.id,
            title: data.article.title,
            url: `https://${shopDomain}/blogs/${data.article.blog_id}/${data.article.handle}`,
            handle: data.article.handle,
            published_at: data.article.published_at
          }
        })
      };
    }

    // UPDATE ARTICLE
    if (action === 'update') {
      const { blogId, articleId, title, bodyHtml, tags, summary, published } = body;
      if (!blogId || !articleId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'blogId and articleId required' }) };
      }

      const updateData = { article: {} };
      if (title) updateData.article.title = title;
      if (bodyHtml) updateData.article.body_html = bodyHtml;
      if (tags !== undefined) updateData.article.tags = tags;
      if (summary) updateData.article.summary_html = summary;
      if (published !== undefined) updateData.article.published = published;

      const res = await fetch(`${shopifyAPI}/blogs/${blogId}/articles/${articleId}.json`, {
        method: 'PUT',
        headers: shopifyHeaders,
        body: JSON.stringify(updateData)
      });

      if (!res.ok) throw new Error(`Shopify update error: ${res.status} ${await res.text()}`);
      const data = await res.json();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, article: data.article })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: list-blogs, list-articles, publish, update' }) };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
