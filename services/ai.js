/**
 * AI design generation via OpenAI.
 * Owns all AI image generation calls.
 * Does NOT handle storage — returns URLs for callers to persist.
 */

const OpenAI = require('openai');

let client;

function getClient() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Build a design prompt from a freeform user description.
 * Returns a tailored prompt for the requested design type.
 */
function buildDesignPrompt({ description, imageBuffers, variant }) {
  const variantStyles = {
    1: 'sleek, high-contrast, glowing edges, dark background, premium finish',
    2: 'vibrant colors, dynamic composition, bold typography, modern design',
    3: 'minimalist, clean layout, subtle elegance, professional look',
  };

  const style = variantStyles[variant] || variantStyles[1];

  let context = `Design request: ${description}.`;

  if (imageBuffers && imageBuffers.length > 0) {
    context += ' Style reference images are attached — match the aesthetic, color palette, and design language shown in them.';
  }

  return `Professional graphic design render of ${description}.
Style: ${style}.
The design should be centered in frame, photorealistic presentation, dark background, high contrast.
Include all relevant design elements (text, icons, layout) as specified.
No extra text, no watermarks, no frames. Clean showcase view.
Output should look like a real printed/mounted design piece.`; }

async function generateDesigns({ description, imageBuffers }) {
  const openai = getClient();
  const results = [];

  for (let i = 1; i <= 3; i++) {
    const prompt = buildDesignPrompt({ description, imageBuffers, variant: i });
    let url = null;
    let lastError;

    const models = ['gpt-image-1', 'dall-e-2'];
    for (const model of models) {
      try {
        const opts = {
          model,
          prompt,
          n: 1,
          size: '1024x1024',
        };

        // gpt-image-1 supports image_url input for style references
        if (model === 'gpt-image-1' && imageBuffers && imageBuffers.length > 0) {
          opts.image_url = imageBuffers.map(buf => ({
            url: `data:image/jpeg;base64,${buf.toString('base64')}`,
          }));
        }

        const response = await openai.images.generate(opts);
        const img = response.data[0];

        if (img.url) {
          url = img.url;
        } else if (img.b64_json) {
          url = `data:image/png;base64,${img.b64_json}`;
        }

        if (url) break;
      } catch (e) {
        lastError = e;
      }
    }

    if (!url) {
      throw lastError || new Error('No image generation model available');
    }

    results.push({ id: i, url, prompt });
  }

  return results;
}

async function generateFlatDesign({ description, imageBuffers }) {
  const openai = getClient();
  const prompt = `Professional flat design vector-style graphic of: ${description}. Clean solid background, 2D orthographic front-facing view, high contrast, clean layout. Strictly NO 3D mockup, NO shadows, NO realistic presentation details, NO desk or wall backgrounds. Designed as a clean production layout ready for printing.`;

  const models = ['gpt-image-1', 'dall-e-2'];
  let url = null;
  let lastError;

  for (const model of models) {
    try {
      const opts = {
        model,
        prompt,
        n: 1,
        size: '1024x1024',
      };

      if (model === 'gpt-image-1' && imageBuffers && imageBuffers.length > 0) {
        opts.image_url = imageBuffers.map(buf => ({
          url: `data:image/jpeg;base64,${buf.toString('base64')}`,
        }));
      }

      const response = await openai.images.generate(opts);
      const img = response.data[0];

      if (img.url) {
        url = img.url;
      } else if (img.b64_json) {
        url = `data:image/png;base64,${img.b64_json}`;
      }

      if (url) break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!url) {
    throw lastError || new Error('Flat design generation failed');
  }

  return { url, prompt };
}

async function upscaleImage({ imageUrl }) {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn('WARNING: REPLICATE_API_TOKEN is not set. Skipping upscale and using flat design URL.');
    return imageUrl;
  }

  try {
    const response = await fetch('https://api.replicate.com/v1/models/nightmare-color/real-esrgan/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: {
          image: imageUrl,
          scale: 4,
          face_enhance: false
        }
      })
    });

    let prediction = await response.json();
    if (!response.ok) {
      throw new Error(prediction.detail || 'Failed to create upscale prediction');
    }

    const pollUrl = prediction.urls.get;
    const startTime = Date.now();
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      if (Date.now() - startTime > 45000) {
        throw new Error('Upscaling timed out');
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      prediction = await pollRes.json();
      if (!pollRes.ok) {
        throw new Error('Failed to poll prediction status');
      }
    }

    if (prediction.status === 'succeeded') {
      return prediction.output;
    } else {
      throw new Error(prediction.error || 'Upscaling prediction failed');
    }
  } catch (err) {
    console.error('Upscaling failed, returning original flat image URL:', err.message);
    return imageUrl;
  }
}

module.exports = { generateDesigns, buildDesignPrompt, generateFlatDesign, upscaleImage };