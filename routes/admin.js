/**
 * Admin routes for order management.
 * Owns: /admin page, /admin/orders, /api/admin/orders/*
 */

const express = require('express');
const router = express.Router();
const orders = require('../db/orders');
const { buildThemeCSS } = require('../lib/landing-context');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'signforge-admin';

// Simple Basic Auth check middleware
function adminAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="SignPal Admin"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const [username, password] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
  if (username !== 'admin' || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  next();
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

module.exports = router;