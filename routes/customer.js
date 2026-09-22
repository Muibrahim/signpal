/**
 * Customer-facing design tool routes.
 * Owns: /design page, /api/generate, /api/orders
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { generateDesigns, generateFlatDesign, upscaleImage } = require('../services/ai');
const orders = require('../db/orders');
const { buildThemeCSS } = require('../lib/landing-context');
const { CATEGORIES, PRODUCTS, getProduct } = require('../lib/product-catalog');
const payments = require('../services/payments');
const { estimatePrice } = require('../lib/pricing');

// Design tool page
router.get('/design', (_req, res) => {
  res.render('design', { slug: 'design', themeCSS: buildThemeCSS(), productCategories: CATEGORIES, products: PRODUCTS });
});

router.get('/api/products', (_req, res) => {
  res.json({ categories: CATEGORIES, products: PRODUCTS });
});

router.get('/api/pricing/estimate', (req, res) => {
  const options = {
    widthM: req.query.widthM || req.query.width,
    heightM: req.query.heightM || req.query.height,
    sqm: req.query.sqm,
    finishing: req.query.finishing
  };
  res.json(estimatePrice(req.query.productType, req.query.quantity, options));
});

router.get('/order/:token', async (req, res) => {
  try {
    const order = await orders.getOrderByToken(req.params.token);
    if (!order) return res.status(404).send('Order not found');
    const designs = order.designs_json ? JSON.parse(order.designs_json) : [];
    res.render('order-status', { order, selectedDesign: designs[order.selected_design] || null, paymentConfigured: payments.isConfigured() });
  } catch (err) {
    console.error('Failed to load order:', err.message);
    res.status(500).send('Database connection error. Please verify PostgreSQL is running.');
  }
});

router.get('/order/:token/ticket', async (req, res) => {
  try {
    const order = await orders.getOrderByToken(req.params.token);
    if (!order) return res.status(404).send('Order not found');

    const { getPrintSpec, getMaterialFinishingSpec } = require('../lib/print-engine');
    const spec = getPrintSpec(order.product_type || 'business_card');
    const material = getMaterialFinishingSpec(order.product_type || 'business_card', order.user_description || '');
    const designs = order.designs_json ? JSON.parse(order.designs_json) : [];

    res.render('job-ticket', { order, spec, material, designs });
  } catch (err) {
    console.error('Failed to load job ticket:', err.message);
    res.status(500).send('Database connection error. Please verify PostgreSQL is running.');
  }
});

router.get('/api/orders/:token/status', async (req, res) => {
  try {
    const order = await orders.getOrderByToken(req.params.token);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ orderId: order.id, status: order.status, paymentStatus: order.payment_status, printStatus: order.print_status, amountUsd: order.amount_usd, fulfillmentType: order.fulfillment_type, downloadUrl: order.payment_status === 'paid' && order.fulfillment_type === 'download' ? order.upscaled_design_url : null });
  } catch (err) {
    console.error('Failed to check order status:', err.message);
    res.status(500).json({ error: 'Database connection error' });
  }
});

router.post('/api/orders/:token/pay', async (req, res) => {
  const order = await orders.getOrderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.payment_status === 'paid') return res.json({ success: true, status: 'paid' });
  if (!order.amount_usd) return res.status(409).json({ error: 'Your print quote is still being prepared.' });
  try {
    const result = await payments.initiateSifaloPayment({ account: req.body.account, gateway: req.body.gateway, amount: Number(order.amount_usd), orderId: order.id });
    const reference = result.transaction_id || result.reference || result.id || null;
    await orders.updatePayment(order.id, { status: 'processing', reference });
    res.json({ success: true, status: 'processing', message: 'Approve the payment on your phone. SignPal will verify it before fulfillment.' });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

const brands = require('../db/brands');
const { getPrintSpec, evaluatePreflightQuality } = require('../lib/print-engine');

// List saved Brand DNA profiles
router.get('/api/brands', async (_req, res) => {
  try {
    const list = await brands.getBrands();
    res.json({ brands: list });
  } catch (err) {
    console.error('Failed to fetch brands:', err.message);
    res.status(500).json({ error: 'Failed to fetch brand profiles' });
  }
});

// Create a new Brand DNA profile
router.post('/api/brands', async (req, res) => {
  try {
    const brand = await brands.createBrand(req.body);
    res.json({ success: true, brand });
  } catch (err) {
    console.error('Failed to create brand:', err.message);
    res.status(500).json({ error: 'Failed to create brand profile' });
  }
});

// Generate 3 AI designs from freeform description + optional images + Brand DNA + presets
router.post('/api/generate', async (req, res) => {
  const { description, images, brandId, productType, languages, industry, stylePreset } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'A description is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI generation is not configured. Contact support.' });
  }

  let brandDna = null;
  if (brandId) {
    try {
      brandDna = await brands.getBrandById(brandId);
    } catch (_) {}
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
    const selectedProduct = getProduct(productType);
    const productDescription = `${selectedProduct.name} (${selectedProduct.format}). ${description.trim()}`;
    const result = await generateDesigns({
      description: productDescription,
      imageBuffers,
      brandDna,
      productType: selectedProduct.id,
      languages: languages || 'English + Somali',
      industry: industry || null,
      stylePreset: stylePreset || null
    });

    const designs = Array.isArray(result) ? result : result.designs;
    const brief = result.brief || null;
    const printSpec = getPrintSpec(selectedProduct.id);
    const preflight = evaluatePreflightQuality({ productType: selectedProduct.id, hasHighRes: true, hasFlatArt: true, brief });

    res.json({ designs, brief, printSpec, preflight, product: selectedProduct });
  } catch (err) {
    console.error('AI generation failed:', err.message);
    res.status(500).json({ error: 'Design generation failed. Please try again.' });
  }
});

// Background task to generate flat print design and upscale it
async function generateAndSavePrintFiles(orderId, description, selectedDesignObj) {
  try {
    await orders.updatePrintStatus(orderId, 'processing', null);

    const selectedDesignUrl = typeof selectedDesignObj === 'string' ? selectedDesignObj : selectedDesignObj?.url;
    const isAlreadyFlat = typeof selectedDesignObj === 'object' && selectedDesignObj?.isFlat;
    const selectedPrompt = typeof selectedDesignObj === 'object' ? selectedDesignObj?.prompt : '';

    let flatUrl = null;

    if (isAlreadyFlat && selectedDesignUrl) {
      console.log(`[Background] Selected design is already 2D flat artwork! Using 1:1 direct flat URL for order ${orderId}.`);
      flatUrl = selectedDesignUrl;
    } else {
      let imageBuffers = [];
      if (selectedDesignUrl) {
        try {
          console.log(`[Background] Fetching selected mockup image from URL: ${selectedDesignUrl}`);
          const response = await fetch(selectedDesignUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            imageBuffers.push(Buffer.from(arrayBuffer));
          }
        } catch (fetchErr) {
          console.error('[Background] Error fetching selected mockup image:', fetchErr.message);
        }
      }

      console.log(`[Background] Starting 2D flat design extraction for order ${orderId}...`);
      const flatResult = await generateFlatDesign({ description, imageBuffers, selectedPrompt });
      flatUrl = flatResult.url;
      console.log(`[Background] Flat design generated for order ${orderId}: ${flatUrl}`);
    }

    // Upscale flat design for print production
    console.log(`[Background] Starting 4x image upscaling for order ${orderId}...`);
    const upscaledUrl = await upscaleImage({ imageUrl: flatUrl });
    console.log(`[Background] Image upscaled for order ${orderId}: ${upscaledUrl}`);

    // Update order in database
    await orders.updateOrderPrintFiles(orderId, flatUrl, upscaledUrl, 'completed');
    console.log(`[Background] Successfully updated order ${orderId} with print files.`);
  } catch (err) {
    console.error(`[Background] Print pipeline failed for order ${orderId}:`, err.message);
    await orders.updatePrintStatus(orderId, 'failed', err.message || 'Print pipeline generation failed');
  }
}

// Submit an order with a selected design
router.post('/api/orders', async (req, res) => {
  const {
    userDescription,
    designs,
    selectedDesign,
    customerName,
    customerEmail,
    customerPhone,
    productType,
    fulfillmentType,
    quantity,
    widthM,
    heightM,
    sqm,
    finishing
  } = req.body;

  if (!customerName || !customerEmail || selectedDesign === undefined || !['print', 'download'].includes(fulfillmentType)) {
    return res.status(400).json({ error: 'Customer details, selected design, and Print or Download choice are required' });
  }

  try {
    const publicToken = crypto.randomBytes(24).toString('hex');
    const downloadPrice = Number(process.env.DESIGN_DOWNLOAD_PRICE_USD || 15);
    const options = { widthM, heightM, sqm, finishing };
    const pricing = estimatePrice(productType, quantity, options);
    const printAmount = pricing.available && !pricing.quoteRequired ? pricing.total : null;
    const order = await orders.createOrder({
      userDescription,
      designsJson: designs || [],
      customerName,
      customerEmail,
      customerPhone,
      productType,
      fulfillmentType,
      publicToken,
      amountUsd: fulfillmentType === 'download' ? downloadPrice : printAmount,
      quantity: pricing.quantity,
      pricingSnapshot: pricing,
    });

    if (selectedDesign !== null && selectedDesign !== undefined) {
      await orders.setSelectedDesign(order.id, selectedDesign);
    }

    // Never generate production assets or release downloads before a verified
    // payment. A provider callback will enqueue fulfillment after confirmation.
    res.json({
      success: true,
      orderId: order.id,
      paymentRequired: true,
      paymentConfigured: payments.isConfigured(),
      orderUrl: `/order/${publicToken}`,
      message: 'Order saved. Payment must be verified before fulfillment.'
    });
  } catch (err) {
    console.error('Order creation failed:', err.message);
    res.status(500).json({ error: 'Failed to submit order. Please try again.' });
  }
});

// Automated Sifalo Pay & Mobile Money webhook listener
router.post('/api/webhooks/sifalo', async (req, res) => {
  try {
    const signature = req.headers['x-sifalo-signature'] || req.headers['x-signature'] || req.query.signature;
    const secret = process.env.SIFALO_WEBHOOK_SECRET || process.env.SIFALO_API_KEY;

    // Never accept payment confirmation without a configured, valid signature.
    if (!secret) {
      console.error('[Webhook] Signature secret is not configured');
      return res.status(503).json({ error: 'Webhook verification is not configured' });
    }
    const isValid = payments.verifyWebhookSignature(req.body, signature, secret);
    if (!isValid) {
      console.warn('[Webhook] Rejected invalid signature from', req.ip);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const parsed = payments.parseWebhookPayload(req.body);
    if (!parsed || !parsed.orderId) {
      return res.status(400).json({ error: 'Missing or malformed order reference in payload' });
    }

    // Lookup order by ID or public token
    let order = null;
    if (/^\d+$/.test(parsed.orderId)) {
      order = await orders.getOrderById(parseInt(parsed.orderId, 10));
    }
    if (!order) {
      order = await orders.getOrderByToken(parsed.orderId);
    }

    if (!order) {
      console.warn(`[Webhook] Order ${parsed.orderId} not found`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Idempotent response if already marked paid
    if (order.payment_status === 'paid') {
      return res.json({ success: true, message: 'Order already reconciled as paid', orderId: order.id });
    }

    if (parsed.status === 'paid') {
      const provider = parsed.gateway || 'sifalo';
      const reference = parsed.transactionId || `sifalo-webhook-${Date.now()}`;
      const updated = await orders.updatePayment(order.id, {
        status: 'paid',
        provider,
        reference
      });

      // Automatically trigger print generation pipeline
      const designs = updated.designs_json ? JSON.parse(updated.designs_json) : [];
      const selectedIndex = updated.selected_design !== null && updated.selected_design !== undefined ? updated.selected_design : 0;
      const chosen = designs[selectedIndex] || null;

      if (chosen) {
        generateAndSavePrintFiles(updated.id, updated.user_description || '', chosen).catch(err => {
          console.error(`[Webhook Fulfillment] Generation failed for order ${updated.id}:`, err.message);
        });
      }

      console.log(`[Webhook] Successfully reconciled order ${order.id} as PAID via ${provider}.`);
      return res.json({ success: true, orderId: order.id, status: 'paid' });
    }

    res.json({ success: true, message: `Webhook processed with status ${parsed.status}`, orderId: order.id });
  } catch (err) {
    console.error('[Webhook] Error processing Sifalo webhook:', err.message);
    res.status(500).json({ error: 'Internal webhook handling error' });
  }
});

module.exports = router;
module.exports.generateAndSavePrintFiles = generateAndSavePrintFiles;
