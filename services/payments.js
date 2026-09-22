/** Sifalo Pay boundary. Secrets never leave the server. */
const SIFALO_GATEWAYS = new Set(['zaad', 'evc', 'edahab', 'sahal', 'premier']);

function isConfigured() {
  return Boolean(process.env.SIFALO_API_KEY);
}

async function initiateSifaloPayment({ account, gateway, amount, orderId }) {
  if (!isConfigured()) throw new Error('Sifalo Pay is not configured');
  if (!SIFALO_GATEWAYS.has(gateway)) throw new Error('Unsupported payment method');
  if (!/^\+?[0-9]{7,15}$/.test(String(account || '').replaceAll(' ', ''))) throw new Error('Enter a valid mobile-money number');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('This order is awaiting a price');

  const response = await fetch(process.env.SIFALO_API_URL || 'https://api.sifalopay.com/gateway/', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${process.env.SIFALO_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      account: String(account).replaceAll(' ', ''), gateway,
      amount: amount.toFixed(2), currency: 'USD', order_id: String(orderId)
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || 'Payment could not be initiated');
  return body;
}

function verifyWebhookSignature(rawPayload, signatureHeader, secret = process.env.SIFALO_WEBHOOK_SECRET || process.env.SIFALO_API_KEY) {
  if (!secret) return false;
  if (!signatureHeader) return false;

  const crypto = require('crypto');
  const payloadString = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  const cleanHeader = String(signatureHeader).replace(/^sha256=/, '').trim();

  if (cleanHeader.length !== expectedSignature.length) return false;

  const bufA = Buffer.from(cleanHeader, 'hex');
  const bufB = Buffer.from(expectedSignature, 'hex');

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseWebhookPayload(body) {
  if (!body || typeof body !== 'object') return null;
  // Support standard Sifalo payload keys and fallback common shapes
  const orderId = body.order_id || body.orderId || body.reference || body.custom_reference;
  const status = String(body.status || body.payment_status || '').toLowerCase();
  const amount = Number(body.amount || body.amount_usd || 0);
  const transactionId = body.transaction_id || body.txn_id || body.payment_reference || body.id;
  const gateway = body.gateway || body.payment_method || 'sifalo';

  return {
    orderId: orderId ? String(orderId) : null,
    status: (status === 'success' || status === 'paid' || status === 'completed') ? 'paid' : status,
    amount,
    transactionId: transactionId ? String(transactionId) : null,
    gateway: String(gateway).toLowerCase(),
    raw: body
  };
}

module.exports = {
  isConfigured,
  initiateSifaloPayment,
  verifyWebhookSignature,
  parseWebhookPayload,
  SIFALO_GATEWAYS
};
