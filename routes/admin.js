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

// Prepress RIP Production Job Ticket View
router.get('/admin/orders/:id/ticket', adminAuth, async (req, res) => {
  try {
    const order = await orders.getOrderById(req.params.id);
    if (!order) return res.status(404).send('Order not found');

    const { getPrintSpec, getMaterialFinishingSpec } = require('../lib/print-engine');
    const spec = getPrintSpec(order.product_type || 'business_card');
    const material = getMaterialFinishingSpec(order.product_type || 'business_card', order.user_description || '');
    const designs = order.designs_json ? JSON.parse(order.designs_json) : [];

    res.render('job-ticket', { order, spec, material, designs });
  } catch (err) {
    console.error('Failed to generate job ticket:', err.message);
    res.status(500).send('Error generating job ticket');
  }
});

// CSV Export for Factory Floor Batch Scheduling
router.get('/admin/orders/export/csv', adminAuth, async (_req, res) => {
  try {
    const all = await orders.getOrders();
    const { getPrintSpec, getMaterialFinishingSpec } = require('../lib/print-engine');

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Phone',
      'Email',
      'Product',
      'Quantity',
      'Trim Width (mm)',
      'Trim Height (mm)',
      'Bleed (mm)',
      'Target DPI',
      'Substrate',
      'Ink System',
      'Finishing',
      'Amount USD',
      'Payment Status',
      'Payment Provider',
      'Payment Reference',
      'Production Status',
      'High-Res Print File URL'
    ];

    const rows = all.map(o => {
      const spec = getPrintSpec(o.product_type || 'business_card');
      const mat = getMaterialFinishingSpec(o.product_type || 'business_card', o.user_description || '');
      const escapeCsv = (val) => `"${String(val || '').replaceAll('"', '""').replaceAll('\n', ' ')}"`;

      return [
        o.id,
        o.created_at ? new Date(o.created_at).toISOString().slice(0, 10) : '',
        escapeCsv(o.customer_name),
        escapeCsv(o.customer_phone),
        escapeCsv(o.customer_email),
        escapeCsv(spec.name),
        o.quantity || 1,
        spec.widthMm || 'Custom',
        spec.heightMm || 'Custom',
        spec.bleedMm || 3,
        spec.dpi || 300,
        escapeCsv(mat.substrate),
        escapeCsv(mat.inkSystem),
        escapeCsv(mat.finishing),
        o.amount_usd || '0.00',
        escapeCsv(o.payment_status),
        escapeCsv(o.payment_provider),
        escapeCsv(o.payment_reference),
        escapeCsv(o.status),
        escapeCsv(o.upscaled_design_url || o.flat_design_url || '')
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=signpal-production-manifest-${dateStr}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Failed to export orders CSV:', err.message);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Update order Kanban stage
router.patch('/admin/orders/:id/kanban', adminAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'rip_queue', 'in_progress', 'finishing', 'out_for_delivery', 'completed', 'rejected'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid production status' });
  }

  try {
    const updated = await orders.updateOrderStatus(req.params.id, status);
    if (!updated) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order: updated });
  } catch (err) {
    console.error('Failed to update kanban status:', err.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Mobile floor technician quick scan action screen
router.get('/admin/orders/:id/scan-action', adminAuth, async (req, res) => {
  try {
    const order = await orders.getOrderById(req.params.id);
    if (!order) return res.status(404).send('Job Order not found');

    const { getPrintSpec, getMaterialFinishingSpec } = require('../lib/print-engine');
    const spec = getPrintSpec(order.product_type || 'business_card');
    const material = getMaterialFinishingSpec(order.product_type || 'business_card', order.user_description || '');

    const STAGES = [
      { id: 'pending', name: '1. Preflight', icon: '📥' },
      { id: 'rip_queue', name: '2. RIP Queue', icon: '🖨️' },
      { id: 'in_progress', name: '3. Press / Fab', icon: '⚙️' },
      { id: 'finishing', name: '4. Finishing & QC', icon: '✂️' },
      { id: 'out_for_delivery', name: '5. Dispatched', icon: '🚚' },
      { id: 'completed', name: '6. Fulfilled', icon: '✅' }
    ];

    const currentIndex = STAGES.findIndex(s => s.id === order.status);
    const nextStage = currentIndex >= 0 && currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;

    res.render('job-scan-action', {
      order,
      spec,
      material,
      stages: STAGES,
      currentStage: STAGES[currentIndex] || { id: order.status, name: order.status, icon: '📋' },
      nextStage,
      themeCSS: buildThemeCSS()
    });
  } catch (err) {
    console.error('Scan action error:', err.message);
    res.status(500).send('Error loading scan action');
  }
});

// Rapid advance API for floor scanners and mobile technician view
router.post('/api/admin/orders/:id/advance-stage', adminAuth, async (req, res) => {
  try {
    const order = await orders.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const STAGE_ORDER = ['pending', 'rip_queue', 'in_progress', 'finishing', 'out_for_delivery', 'completed'];
    const { targetStatus } = req.body;

    let newStatus = targetStatus;
    if (!newStatus) {
      const idx = STAGE_ORDER.indexOf(order.status);
      if (idx >= 0 && idx < STAGE_ORDER.length - 1) {
        newStatus = STAGE_ORDER[idx + 1];
      } else {
        newStatus = order.status;
      }
    }

    if (!STAGE_ORDER.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid target status' });
    }

    const updated = await orders.updateOrderStatus(order.id, newStatus);
    res.json({ success: true, previousStatus: order.status, status: newStatus, order: updated });
  } catch (err) {
    console.error('Advance stage error:', err.message);
    res.status(500).json({ error: 'Failed to advance stage' });
  }
});

module.exports = router;
