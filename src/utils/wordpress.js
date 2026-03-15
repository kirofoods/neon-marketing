// WordPress REST API integration — Direct browser calls

function getWPConfig() {
  const url = localStorage.getItem('kj_wp_url');
  const user = localStorage.getItem('kj_wp_user');
  const appPassword = localStorage.getItem('kj_wp_app_password');
  if (!url || !user || !appPassword) throw new Error('WordPress not configured. Go to Settings and enter your WordPress site details.');
  return { url: url.replace(/\/$/, ''), user, appPassword };
}

export function isWordPressConfigured() {
  return !!(localStorage.getItem('kj_wp_url') && localStorage.getItem('kj_wp_user') && localStorage.getItem('kj_wp_app_password'));
}

async function wpFetch(path, options = {}) {
  const { url, user, appPassword } = getWPConfig();
  const auth = btoa(`${user}:${appPassword}`);

  const res = await fetch(`${url}/wp-json/wp/v2${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WordPress API error: ${res.status} ${errText}`);
  }
  return res.json();
}

export async function getWPPosts(perPage = 10) {
  return wpFetch(`/posts?per_page=${perPage}&orderby=date&order=desc`);
}

export async function getWPCategories() {
  return wpFetch('/categories?per_page=100');
}

export async function publishWPPost({ title, content, status = 'publish', categories = [], tags = [], excerpt = '' }) {
  return wpFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      title,
      content,
      status,
      categories,
      tags,
      excerpt
    })
  });
}

export async function updateWPPost(postId, { title, content, status, categories, tags, excerpt }) {
  const body = {};
  if (title !== undefined) body.title = title;
  if (content !== undefined) body.content = content;
  if (status !== undefined) body.status = status;
  if (categories !== undefined) body.categories = categories;
  if (tags !== undefined) body.tags = tags;
  if (excerpt !== undefined) body.excerpt = excerpt;

  return wpFetch(`/posts/${postId}`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

// Convert markdown to WordPress-friendly HTML
export function markdownToWPHtml(md) {
  let html = md;
  html = html.replace(/^### (.*$)/gm, '<!-- wp:heading {"level":3} -->\n<h3>$1</h3>\n<!-- /wp:heading -->');
  html = html.replace(/^## (.*$)/gm, '<!-- wp:heading -->\n<h2>$1</h2>\n<!-- /wp:heading -->');
  html = html.replace(/^# (.*$)/gm, '<!-- wp:heading {"level":1} -->\n<h1>$1</h1>\n<!-- /wp:heading -->');
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^\- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<!-- wp:list -->\n<ul>$&</ul>\n<!-- /wp:list -->');
  // Wrap plain paragraphs
  const lines = html.split('\n\n');
  html = lines.map(line => {
    if (line.startsWith('<!--') || line.startsWith('<h') || line.startsWith('<ul') || line.trim() === '') return line;
    return `<!-- wp:paragraph -->\n<p>${line}</p>\n<!-- /wp:paragraph -->`;
  }).join('\n\n');
  return html;
}
