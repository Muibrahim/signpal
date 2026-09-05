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
  res.json(estimatePrice(req.query.productType, req.query.quantity));
});

router.get('/order/:token', async (req, res) => {
  const order = await orders.getOrderByToken(req.params.token);
  if (!order) return res.status(404).send('Order not found');
  const designs = order.designs_json ? JSON.parse(order.designs_json) : [];
  res.render('order-status', { order, selectedDesign: designs[order.selected_design] || null, paymentConfigured: payments.isConfigured() });
});

router.get('/api/orders/:token/status', async (req, res) => {
  const order = await orders.getOrderByToken(req.params.token);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ orderId: order.id, status: order.status, paymentStatus: order.payment_status, printStatus: order.print_status, amountUsd: order.amount_usd, fulfillmentType: order.fulfillment_type, downloadUrl: order.payment_status === 'paid' && order.fulfillment_type === 'download' ? order.upscaled_design_url : null });
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

// Generate 3 AI designs from freeform description + optional images + Brand DNA
router.post('/api/generate', async (req, res) => {
  const { description, images, brandId, productType, languages } = req.body;

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
    const designs = await generateDesigns({
      description: productDescription,
      imageBuffers,
      brandDna,
      productType: selectedProduct.id,
      languages: languages || 'English + Somali'
    });

    const printSpec = getPrintSpec(selectedProduct.id);
    res.json({ designs, printSpec, product: selectedProduct });
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
  const { userDescription, designs, selectedDesign, customerName, customerEmail, customerPhone, productType, fulfillmentType, quantity } = req.body;

  if (!customerName || !customerEmail || selectedDesign === undefined || !['print', 'download'].includes(fulfillmentType)) {
    return res.status(400).json({ error: 'Customer details, selected design, and Print or Download choice are required' });
  }

  try {
    const publicToken = crypto.randomBytes(24).toString('hex');
    const downloadPrice = Number(process.env.DESIGN_DOWNLOAD_PRICE_USD || 15);
    const pricing = estimatePrice(productType, quantity);
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

module.exports = router;
module.exports.generateAndSavePrintFiles = generateAndSavePrintFiles;
