// Image generation utilities (fal.ai) — Direct browser calls

function getFalKey() {
  const key = localStorage.getItem('kj_fal_key');
  if (!key) throw new Error('fal.ai API key not set. Go to Settings and enter your FAL_KEY.');
  return key;
}

export function isFalKeySet() {
  return !!localStorage.getItem('kj_fal_key');
}

export async function generateImage({ prompt, width = 1200, height = 630, numImages = 1, negativePrompt = '' }) {
  const falKey = getFalKey();

  const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt || 'blurry, low quality, distorted, watermark, text overlay',
      image_size: { width, height },
      num_inference_steps: 25,
      num_images: numImages,
      enable_safety_checker: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`fal.ai error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.images?.map(img => ({
    url: img.url,
    width: img.width,
    height: img.height,
    content_type: img.content_type
  })) || [];
}

// Preset sizes for common use cases
export const IMAGE_PRESETS = [
  { name: 'Blog Thumbnail (1200x630)', width: 1200, height: 630 },
  { name: 'Instagram Post (1080x1080)', width: 1080, height: 1080 },
  { name: 'Instagram Story (1080x1920)', width: 1080, height: 1920 },
  { name: 'Facebook Cover (1200x628)', width: 1200, height: 628 },
  { name: 'Twitter Header (1500x500)', width: 1500, height: 500 },
  { name: 'YouTube Thumbnail (1280x720)', width: 1280, height: 720 },
  { name: 'LinkedIn Post (1200x627)', width: 1200, height: 627 },
  { name: 'Product Image (800x800)', width: 800, height: 800 },
  { name: 'Email Banner (600x200)', width: 600, height: 200 },
  { name: 'Custom', width: 0, height: 0 }
];

// Generate a prompt enhancement for food/FMCG brand imagery
export function enhanceFoodPrompt(basePrompt) {
  return `${basePrompt}, professional food photography style, clean composition, warm natural lighting, appetizing presentation, high-quality product shot, clean label aesthetic, modern Indian kitchen, vibrant colors, editorial quality`;
}
