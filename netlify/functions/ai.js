// Killjoy — Claude API Proxy (Netlify Serverless Function)
// Keeps your API key secure on the server side

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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'CLAUDE_API_KEY not configured in Netlify environment variables.' })
    };
  }

  try {
    const { messages, system, max_tokens = 4096, temperature = 0.7, stream = false } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'messages array is required' })
      };
    }

    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      temperature,
      messages
    };

    if (system) {
      requestBody.system = system;
    }

    if (stream) {
      requestBody.stream = true;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ error: `Claude API error: ${errorData}` })
        };
      }

      // Collect streamed response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  fullText += data.delta.text;
                }
              } catch (e) { /* skip non-JSON lines */ }
            }
          }
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ content: fullText })
      };
    }

    // Non-streaming request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: `Claude API error: ${errorData}` })
      };
    }

    const data = await response.json();
    const content = data.content?.map(c => c.text).join('') || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content,
        usage: data.usage,
        model: data.model,
        stop_reason: data.stop_reason
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
}
