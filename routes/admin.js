/**
 * Admin routes for order management.
 * Owns: /admin page, /admin/orders, /api/admin/orders/*
 */

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const orders = require('../db/orders');
const { buildThemeCSS } = require('../lib/landing-context');
const { generateAndSavePrintFiles } = require('./customer');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'signpal-local-only';

if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD)) {
  throw new Error('ADMIN_USER and ADMIN_PASSWORD are required in production');
}

function safeEqual(value, expected) {
  const actualHash = crypto.createHash('sha256').update(String(value)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

// Timing-safe Basic Auth check middleware
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="SignPal Admin"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const credentials = Buffer.from(auth.slice(6), 'base64').toString().split(':');
    const inputUser = credentials[0] || '';
    const inputPass = credentials[1] || '';

    const userMatch = safeEqual(inputUser, ADMIN_USER);
    const passMatch = safeEqual(inputPass, ADMIN_PASSWORD);

    if (!userMatch || !passMatch) {
      res.setHeader('WWW-Authenticate', 'Basic realm="SignPal Admin"');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    next();
  } catch (err) {
    res.setHeader('WWW-Authenticate', 'Basic realm="SignPal Admin"');
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// Admin dashboard
router.get('/admin', adminAuth, async (_req, res) => {
  res.render('admin', { themeCSS: buildThemeCSS() });
});

// List all orders
router.get('/admin/orders', adminAuth, async (req, res) => {
  try {
    const all = await orders.getOrders();
    res.json({ orders: all });
  } catch (err) {
    console.error('Failed to fetch orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Update order status
router.patch('/admin/orders/:id', adminAuth, async (req, res) => {
  const { status, adminResponse } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  try {
    let order;
    if (adminResponse !== undefined) {
      order = await orders.updateOrderResponse(req.params.id, adminResponse, status);
    } else {
      order = await orders.updateOrderStatus(req.params.id, status);
    }

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Failed to update order:', err.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Retry print generation pipeline
router.post('/admin/orders/:id/retry-print', adminAuth, async (req, res) => {
  try {
    const order = await orders.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.payment_status !== 'paid') {
      return res.status(409).json({ error: 'Payment must be verified before production assets can be generated' });
    }

    const designs = order.designs_json ? JSON.parse(order.designs_json) : [];
    const selectedIndex = order.selected_design !== null && order.selected_design !== undefined ? order.selected_design : 0;
    const selectedDesign = designs[selectedIndex] || null;

    // Trigger pipeline in background
    generateAndSavePrintFiles(order.id, order.user_description || '', selectedDesign).catch(err => {
      console.error(`[Admin Retry] Print pipeline failed for order ${order.id}:`, err.message);
    });

    // Mark as processing immediately
    const updatedOrder = await orders.updatePrintStatus(order.id, 'processing', null);

    res.json({ success: true, message: 'Print pipeline job triggered', order: updatedOrder });
  } catch (err) {
    console.error('Failed to retry print pipeline:', err.message);
    res.status(500).json({ error: 'Failed to trigger retry' });
  }
});

// Set a print quote or manually verify a Sifalo payment after checking the
// merchant dashboard. This is the controlled fallback until signed webhooks
// are enabled for the merchant account.
router.patch('/admin/orders/:id/commerce', adminAuth, async (req, res) => {
  try {
    const existing = await orders.getOrderById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Order not found' });
    let updated = existing;
    if (req.body.amountUsd !== undefined) {
      const amount = Number(req.body.amountUsd);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Enter a valid amount' });
      updated = await orders.setOrderAmount(existing.id, amount);
    }
    if (req.body.paymentStatus === 'paid' && existing.payment_status !== 'paid') {
      updated = await orders.updatePayment(existing.id, { status: 'paid', provider: 'sifalo', reference: req.body.reference || 'manual-dashboard-verification' });
      const designs = updated.designs_json ? JSON.parse(updated.designs_json) : [];
      const chosen = designs[updated.selected_design] || null;
      if (chosen) generateAndSavePrintFiles(updated.id, updated.user_description || '', chosen).catch(err => console.error('[Fulfillment] Asset generation failed:', err.message));
    }
    res.json({ success: true, order: updated });
  } catch (err) {
    console.error('Commerce update failed:', err.message);
    res.status(500).json({ error: 'Failed to update payment details' });
  }
});

module.exports = router;
