/**
 * AI design generation via OpenAI.
 * Owns all AI image generation calls.
 * Does NOT handle storage — returns URLs for callers to persist.
 */

const OpenAI = require('openai');
const { getPrintSpec } = require('../lib/print-engine');

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
 * Build a fallback design prompt from a freeform user description.
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
Output should look like a real printed/mounted design piece.`;
}

/**
 * Structured Brand Brief Pipeline (Sonnet Architecture Step).
 * Converts user description + Brand DNA into a disciplined, structured JSON brief
 * before generating image model prompts.
 */
async function analyzeBrandBrief({ description, brandDna, productType = 'business_card', languages = 'English + Somali' }) {
  const openai = getClient();

  const systemPrompt = `You are an expert Brand Strategist and Art Director.
Parse the user's design request and Brand DNA into a structured JSON brand brief.

Return ONLY a JSON object with this exact schema:
{
  "industry": "industry name",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "brand_personality": ["personality1", "personality2"],
  "visual_direction": ["aesthetic direction 1", "aesthetic direction 2"],
  "color_roles": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex"
  },
  "fonts": {
    "heading": "font name",
    "body": "font name"
  },
  "extracted_text": {
    "company_name": "exact name string",
    "tagline": "exact tagline or empty string",
    "phone": "exact phone string or empty string",
    "email": "exact email string or empty string",
    "location": "exact address string or empty string"
  }
}`;

  try {
    const userPayload = `Description: "${description}"
Languages: "${languages}"
Product Type: "${productType}"
Brand DNA: ${JSON.stringify(brandDna || {})}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload }
      ],
      temperature: 0.3,
      max_tokens: 450,
    });

    const brief = JSON.parse(completion.choices[0]?.message?.content || '{}');
    console.log('[Structured Brand Brief JSON]:', brief);
    return brief;
  } catch (err) {
    console.warn('[Structured Brand Brief] Fallback due to error:', err.message);
    return null;
  }
}

/**
 * Layer 1: Prompt Restructuring & Engineering LLM.
 * Consumes the Structured Brand Brief to generate precise, high-artistry graphic design prompts.
 * All three options generate distinct 2D concepts. Mockups are a separate
 * post-selection stage and must never consume one of the concept slots.
 */
async function enhancePromptWithLLM({ description, variant = 1, isFlat, hasReferences = false, brandDna, productType = 'business_card', languages = 'English + Somali', brief = null }) {
  const openai = getClient();
  const { getPrintSpec } = require('../lib/print-engine');
  const printSpec = getPrintSpec(productType);

  // If brief wasn't pre-analyzed, run analysis now
  if (!brief) {
    brief = await analyzeBrandBrief({ description, brandDna, productType, languages });
  }

  const forceFlat = isFlat !== undefined ? isFlat : true;

  const colors = brief?.color_roles || {
    primary: brandDna?.primary_color || '#001F3F',
    secondary: brandDna?.secondary_color || '#FFD700',
    accent: brandDna?.accent_color || '#FF6F61',
    background: brandDna?.background_color || '#000000',
    text: brandDna?.text_color || '#FFFFFF'
  };

  const fonts = brief?.fonts || {
    heading: brandDna?.heading_font || 'Montserrat',
    body: brandDna?.body_font || 'Inter'
  };

  const brandContext = `
STRUCTURED BRAND BRIEF:
- Industry: ${brief?.industry || brandDna?.industry || 'Commercial Branding'}
- Personality: ${brief?.brand_personality?.join(', ') || 'Professional, Premium'}
- Keywords: ${brief?.keywords?.join(', ') || 'Clean, Modern'}
- 5-Color System: Primary (${colors.primary}), Secondary (${colors.secondary}), Accent (${colors.accent}), Background (${colors.background}), Text (${colors.text})
- Fonts: Heading (${fonts.heading}), Body (${fonts.body})
`;

  const variantDirectives = {
    1: `CONCEPT A — Structured clarity. Use a disciplined grid, strong typographic hierarchy, generous negative space and restrained brand-color blocks. Avoid glassmorphism, ornamental borders and centered badge layouts.`,
    2: `CONCEPT B — Editorial energy. Use an asymmetric composition, expressive scale contrast, cropped geometric or photographic framing and purposeful movement. The layout skeleton and headline position must be visibly different from Concept A.`,
    3: `CONCEPT C — Distinctive brand expression. Use a centered or emblem-led composition, culturally appropriate visual detail and a refined typography pairing. Do not reuse the grid, graphic device, background treatment or color distribution of Concepts A or B.`,
  };

  const formatType = forceFlat
    ? `Production graphic design artwork canvas for physical printing. Exact aspect ratio ${printSpec.aspectRatio} (${printSpec.widthMm}x${printSpec.heightMm}mm format). Front-facing 2D orthographic canvas view with rich textured background and geometric framing accents. Strictly ZERO 3D roll-up banner stand mechanisms, ZERO floor tiles, ZERO wall/desk surfaces, ZERO drop shadows on stand hardware.`
    : `Professional photorealistic 3D physical showcase render of ${printSpec.name} print media in a real-world environment.`;

  const systemPrompt = `You are a Senior Art Director and Master Graphic Designer specializing in print branding, signage, business cards, posters, banners, and visual identity.
Your job is to transform a customer's raw design request into an expert graphic design image prompt for an image generation model.

${brandContext}

MASTER RULES FOR HIGH-END PROFESSIONAL GRAPHIC DESIGN:

1. RICH BACKGROUND & VISUAL DEPTH (NEVER PLAIN FLAT SOLID COLOR):
   - BACKGROUND: Create rich visual depth using subtle textures (matte carbon, dark marble grain, geometric line mesh, or smooth multi-tone gradient waves). NEVER generate a plain white/blank empty box or flat solid paint bucket fill.
   - GRAPHIC ACCENTS: Include professional graphic elements such as metallic gold/silver foil borders, geometric vector framing lines, translucent glassmorphism container panels, and brand badge emblems.

2. EXHAUSTIVE DETAIL RETENTION & MULTILINGUAL PRESERVATION:
   - Selected Script / Languages: ${languages}.
   - You MUST extract EVERY SINGLE piece of information provided by the user and from the Brand DNA (names, titles, taglines, phone numbers, addresses, emails, social handles, service lists).
   - PRESERVE 100% OF THE CUSTOMER'S EXACT TEXT AND ORIGINAL SCRIPT/LANGUAGE (Arabic, Somali, English, etc.) UNCHANGED. DO NOT TRANSLATE. DO NOT INSERT "Lorem Ipsum" OR FAKE FILLER TEXT.
   - Enclose every name, number, address, or custom phrase in explicit double quotes inside the output prompt.

3. TYPOGRAPHY & COMPOSITION HIERARCHY:
   - Product Format: ${printSpec.name} (${printSpec.widthMm}x${printSpec.heightMm}mm with ${printSpec.bleedMm}mm safety margin).
   - Headline in bold high-contrast ${fonts.heading} typography, body text in clean ${fonts.body} fonts, contact details grouped neatly in a dedicated bottom accent bar or card footer.

4. VISUAL FORMAT:
   - Format Spec: ${formatType}
   - Aesthetic Style: ${variantDirectives[variant] || variantDirectives[1]}
   ${hasReferences ? '- Reference images are attached; match their visual style, layout composition, and color tone.' : ''}

Output ONLY the final image prompt text. Do not include markdown tags, conversational filler, or commentary.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Customer Request: "${description}"` }
      ],
      temperature: 0.5,
      max_tokens: 350,
    });

    const enhancedPrompt = completion.choices[0]?.message?.content?.trim();
    if (enhancedPrompt && enhancedPrompt.length > 20) {
      console.log(`[Layer 1 LLM] Enhanced Prompt (Variant ${variant}, Product: ${productType}):`, enhancedPrompt);
      return enhancedPrompt;
    }
  } catch (err) {
    console.warn('[Layer 1 LLM] Prompt enhancement fallback due to error:', err.message);
  }

  // Fallback to static prompt template if Layer 1 LLM fails
  return buildDesignPrompt({ description, imageBuffers: hasReferences ? [1] : [], variant });
}

async function generateDesigns({ description, imageBuffers, brandDna, productType = 'business_card', languages = 'English + Somali' }) {
  const openai = getClient();
  const hasReferences = Array.isArray(imageBuffers) && imageBuffers.length > 0;
  const printSpec = getPrintSpec(productType);

  // Step 1: Pre-analyze Brand Brief into structured JSON object
  const brief = await analyzeBrandBrief({ description, brandDna, productType, languages });

  const variantConfigs = [
    { id: 1, label: 'Concept A · Structured', isFlat: true },
    { id: 2, label: 'Concept B · Editorial', isFlat: true },
    { id: 3, label: 'Concept C · Distinctive', isFlat: true }
  ];

  // Run all 3 design variants in parallel for maximum performance
  const variantPromises = variantConfigs.map(async (cfg) => {
    // Layer 1: Prompt Structuring LLM consuming structured brief
    const prompt = await enhancePromptWithLLM({ description, variant: cfg.id, isFlat: cfg.isFlat, hasReferences, brandDna, productType, languages, brief });
    let url = null;
    let lastError;

    // Layer 2: Image Generation Engine
    const models = ['gpt-image-2', 'gpt-image-1.5', 'gpt-image-1'];
    const imageSize = printSpec.heightMm > printSpec.widthMm
      ? '1024x1536'
      : printSpec.widthMm > printSpec.heightMm
        ? '1536x1024'
        : '1024x1024';
    for (const model of models) {
      try {
        const opts = {
          model,
          prompt,
          n: 1,
          size: imageSize,
          quality: 'high',
        };

        const response = await openai.images.generate(opts);
        const img = response.data[0];

        if (img.url) {
          url = img.url;
        } else if (img.b64_json) {
          url = `data:image/png;base64,${img.b64_json}`;
        }

        if (url) break;
      } catch (e) {
        console.warn(`[Layer 2 Image Gen] Model ${model} failed for variant ${cfg.id}:`, e.message);
        lastError = e;
      }
    }

    if (!url) {
      throw lastError || new Error(`Image generation failed for variant ${cfg.id}`);
    }

    return { id: cfg.id, url, prompt, isFlat: cfg.isFlat, label: cfg.label };
  });

  const results = await Promise.all(variantPromises);
  return results;
}

async function generateFlatDesign({ description, imageBuffers, selectedPrompt }) {
  const openai = getClient();
  const hasReferences = Array.isArray(imageBuffers) && imageBuffers.length > 0;

  // Layer 1: Prompt Structuring LLM for 2D flat artwork
  const prompt = await enhancePromptWithLLM({ description: selectedPrompt || description, variant: 1, isFlat: true, hasReferences });

  // Layer 2: Image Generation Engine
  const models = ['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5'];
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

      const response = await openai.images.generate(opts);
      const img = response.data[0];

      if (img.url) {
        url = img.url;
      } else if (img.b64_json) {
        url = `data:image/png;base64,${img.b64_json}`;
      }

      if (url) break;
    } catch (e) {
      console.warn(`[Layer 2 Flat Gen] Model ${model} failed:`, e.message);
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
