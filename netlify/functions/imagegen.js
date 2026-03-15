// Killjoy — Image Generation via fal.ai Nano Banana 2
// Generates thumbnails and visuals for content

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

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'FAL_KEY not configured in Netlify environment variables.',
        setup: {
          steps: [
            '1. Go to https://fal.ai and create an account',
            '2. Navigate to Dashboard → Keys → Create Key',
            '3. Copy the API key',
            '4. In Netlify: Site settings → Environment variables, add:',
            '   FAL_KEY = your-fal-api-key'
          ]
        }
      })
    };
  }

  try {
    const { prompt, width = 1200, height = 630, num_images = 1, negative_prompt = '' } = JSON.parse(event.body);

    if (!prompt) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'prompt is required' }) };
    }

    // Call fal.ai with the fast-sdxl / nano-banana model
    const response = await fetch('https://queue.fal.run/fal-ai/fast-sdxl', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${falKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative_prompt || 'blurry, low quality, distorted, watermark, text overlay',
        image_size: { width, height },
        num_inference_steps: 25,
        num_images,
        enable_safety_checker: true
      })
    });

    if (!response.ok) {
      // If queued, handle the queue response
      if (response.status === 200 || response.status === 202) {
        const queueData = await response.json();

        // If it's a queue response, poll for result
        if (queueData.request_id) {
          let result = null;
          let attempts = 0;
          const maxAttempts = 30;

          while (!result && attempts < maxAttempts) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000));

            const statusRes = await fetch(`https://queue.fal.run/fal-ai/fast-sdxl/requests/${queueData.request_id}/status`, {
              headers: { 'Authorization': `Key ${falKey}` }
            });
            const statusData = await statusRes.json();

            if (statusData.status === 'COMPLETED') {
              const resultRes = await fetch(`https://queue.fal.run/fal-ai/fast-sdxl/requests/${queueData.request_id}`, {
                headers: { 'Authorization': `Key ${falKey}` }
              });
              result = await resultRes.json();
            } else if (statusData.status === 'FAILED') {
              throw new Error('Image generation failed');
            }
          }

          if (!result) throw new Error('Image generation timed out');

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              images: result.images?.map(img => ({
                url: img.url,
                width: img.width,
                height: img.height,
                content_type: img.content_type
              })) || []
            })
          };
        }
      }

      const errText = await response.text();
      throw new Error(`fal.ai API error: ${response.status} ${errText}`);
    }

    const data = await response.json();

    // Direct response (non-queued)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        images: data.images?.map(img => ({
          url: img.url,
          width: img.width,
          height: img.height,
          content_type: img.content_type
        })) || []
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
