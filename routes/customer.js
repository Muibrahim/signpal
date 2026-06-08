/**
 * Customer-facing design tool routes.
 * Owns: /design page, /api/generate, /api/orders
 */

const express = require('express');
const router = express.Router();
const { generateDesigns, generateFlatDesign, upscaleImage } = require('../services/ai');
const orders = require('../db/orders');
const { buildThemeCSS } = require('../lib/landing-context');

// Design tool page
router.get('/design', (_req, res) => {
  res.render('design', { themeCSS: buildThemeCSS() });
});

// Generate 3 AI designs from freeform description + optional images
router.post('/api/generate', async (req, res) => {
  const { description, images } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'A description is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI generation is not configured. Contact support.' });
  }

  // Client sends base64 data URLs; decode to Buffers for AI
  let imageBuffers = [];
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (img && typeof img === 'string' && img.includes(',')) {
        try {
          const base64 = img.split(',')[1];
          imageBuffers.push(Buffer.from(base64, 'base64'));
        } catch (_) { /* skip malformed */ }
      }
    }
  }

  try {
    const designs = await generateDesigns({ description: description.trim(), imageBuffers });
    res.json({ designs });
  } catch (err) {
    console.error('AI generation failed:', err.message);
    res.status(500).json({ error: 'Design generation failed. Please try again.' });
  }
});

// Background task to generate flat print design and upscale it
async function generateAndSavePrintFiles(orderId, description, selectedDesignUrl) {
  try {
    let imageBuffers = [];
    if (selectedDesignUrl) {
      try {
        console.log(`[Background] Fetching selected design from URL: ${selectedDesignUrl}`);
        const response = await fetch(selectedDesignUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          imageBuffers.push(Buffer.from(arrayBuffer));
        } else {
          console.warn(`[Background] Failed to fetch selected design URL (status ${response.status})`);
        }
      } catch (fetchErr) {
        console.error('[Background] Error fetching selected design image:', fetchErr.message);
      }
    }

    // 1. Generate flat design
    console.log(`[Background] Starting flat design generation for order ${orderId}...`);
    const { url: flatUrl } = await generateFlatDesign({ description, imageBuffers });
    console.log(`[Background] Flat design generated for order ${orderId}: ${flatUrl}`);

    // 2. Upscale flat design
    console.log(`[Background] Starting image upscaling for order ${orderId}...`);
    const upscaledUrl = await upscaleImage({ imageUrl: flatUrl });
    console.log(`[Background] Image upscaled for order ${orderId}: ${upscaledUrl}`);

    // 3. Update order in database
    await orders.updateOrderPrintFiles(orderId, flatUrl, upscaledUrl);
    console.log(`[Background] Successfully updated order ${orderId} with print files.`);
  } catch (err) {
    console.error(`[Background] Print pipeline failed for order ${orderId}:`, err.message);
  }
}

// Submit an order with a selected design
router.post('/api/orders', async (req, res) => {
  const { userDescription, designs, selectedDesign, customerName, customerEmail, customerPhone } = req.body;

  if (!customerName || !customerEmail || selectedDesign === undefined) {
    return res.status(400).json({ error: 'customerName, customerEmail, and selectedDesign are required' });
  }

  try {
    const order = await orders.createOrder({
      userDescription,
      designsJson: designs || [],
      customerName,
      customerEmail,
      customerPhone,
    });

    if (selectedDesign !== null && selectedDesign !== undefined) {
      await orders.setSelectedDesign(order.id, selectedDesign);
    }

    // Trigger flat print generation and upscaling in the background
    if (selectedDesign !== null && selectedDesign !== undefined && designs && designs[selectedDesign]) {
      const selectedDesignUrl = designs[selectedDesign].url;
      generateAndSavePrintFiles(order.id, userDescription || '', selectedDesignUrl).catch(err => {
        console.error('[Background] Failed to run print pipeline:', err.message);
      });
    }

    res.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error('Order creation failed:', err.message);
    res.status(500).json({ error: 'Failed to submit order. Please try again.' });
  }
});

module.exports = router;