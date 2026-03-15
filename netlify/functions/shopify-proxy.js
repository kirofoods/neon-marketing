// NEON — Shopify Admin API Proxy (Netlify Serverless Function)
// Proxies ALL Shopify Admin API calls from the browser
// Solves CORS issues — browser sends store+token+endpoint, function calls Shopify server-side

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Use POST' }) };
  }

  try {
    const { store, token, endpoint, method, body } = JSON.parse(event.body);

    if (!store || !token || !endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'store, token, and endpoint are required' }) };
    }

    const cleanStore = store.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const apiVersion = '2025-01';
    const url = `https://${cleanStore}/admin/api/${apiVersion}${endpoint}`;

    const fetchOptions = {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);

    // Get response body
    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers,
        body: JSON.stringify({
          error: responseData.errors || responseData.error || `Shopify API error: ${res.status}`,
          status: res.status,
          details: responseData
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData)
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
