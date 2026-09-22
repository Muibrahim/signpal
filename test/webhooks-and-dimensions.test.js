const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyWebhookSignature, parseWebhookPayload } = require('../services/payments');
const { estimatePrice, AREA_PRODUCTS } = require('../lib/pricing');
const { getTranslation, DICTIONARY } = require('../lib/i18n');

test('webhook signature verification succeeds with correct HMAC secret and rejects tampering', () => {
  const secret = 'sifalo_regional_secret_key_123';
  const payload = { order_id: '42', status: 'paid', amount: 85.50, transaction_id: 'TX9988' };
  const rawString = JSON.stringify(payload);

  const validSignature = crypto.createHmac('sha256', secret).update(rawString).digest('hex');

  // Valid signature
  assert.equal(verifyWebhookSignature(payload, validSignature, secret), true);
  // Valid signature with sha256= prefix
  assert.equal(verifyWebhookSignature(payload, `sha256=${validSignature}`, secret), true);

  // Tampered payload
  const tamperedPayload = { order_id: '42', status: 'paid', amount: 5.00, transaction_id: 'TX9988' };
  assert.equal(verifyWebhookSignature(tamperedPayload, validSignature, secret), false);

  // Invalid signature
  assert.equal(verifyWebhookSignature(payload, 'deadbeef12345678', secret), false);

  // Missing secret or signature
  assert.equal(verifyWebhookSignature(payload, validSignature, ''), false);
  assert.equal(verifyWebhookSignature(payload, '', secret), false);
});

test('parseWebhookPayload standardizes disparate mobile money gateway shapes', () => {
  const sifaloBody = {
    order_id: '105',
    status: 'success',
    amount: '45.00',
    transaction_id: 'ZAAD-88493',
    gateway: 'zaad'
  };

  const parsed = parseWebhookPayload(sifaloBody);
  assert.equal(parsed.orderId, '105');
  assert.equal(parsed.status, 'paid');
  assert.equal(parsed.amount, 45);
  assert.equal(parsed.transactionId, 'ZAAD-88493');
  assert.equal(parsed.gateway, 'zaad');
});

test('custom dimension pricing calculates exact square meters with 10% competitor discount', () => {
  // 3m × 2m PVC banner = 6 sqm
  // Competitor benchmark is $8.00/sqm
  // Competitor total = 6 × $8 = $48.00
  // Target with 10% discount = $43.20
  const estimate = estimatePrice('pvc_banner', 1, { widthM: 3, heightM: 2 });
  assert.equal(estimate.available, true);
  assert.equal(estimate.quoteRequired, false);
  assert.equal(estimate.dimensions.sqm, 6);
  assert.equal(estimate.competitorTotal, 48);
  assert.equal(estimate.total, 43.20);
  assert.equal(estimate.unitPrice, 43.20);
  assert.match(estimate.finishing, /Eyelets/i);
});

test('billboard print custom dimensions calculate direct m² quote with regional discount', () => {
  // 6m × 3m Billboard print = 18 sqm
  // Competitor benchmark is $6.50/sqm
  // Competitor total = 18 × $6.50 = $117.00
  // Target with 10% discount = $105.30
  const estimate = estimatePrice('billboard', 1, { widthM: 6, heightM: 3 });
  assert.equal(estimate.available, true);
  assert.equal(estimate.quoteRequired, false);
  assert.equal(estimate.dimensions.sqm, 18);
  assert.equal(estimate.competitorTotal, 117);
  assert.equal(estimate.total, 105.30);
});

test('custom dimension pricing protects 40% gross factory margin when factory costs configured', () => {
  const prevCosts = process.env.FACTORY_COSTS_JSON;
  // Factory cost of $6/sqm requires minimum price = 6 / (1 - 0.40) = $10.00/sqm
  process.env.FACTORY_COSTS_JSON = '{"pvc_banner":6}';

  const estimate = estimatePrice('pvc_banner', 1, { widthM: 2, heightM: 2 }); // 4 sqm
  // Without margin protection: 4 × $8 × 0.9 = $28.80
  // With margin protection: 4 × $6 / 0.60 = $40.00
  assert.equal(estimate.total, 40);
  assert.equal(estimate.marginProtected, true);

  if (prevCosts) process.env.FACTORY_COSTS_JSON = prevCosts;
  else delete process.env.FACTORY_COSTS_JSON;
});

test('bilingual dictionary contains full parity between English and Af-Soomaali', () => {
  const en = getTranslation('en');
  const so = getTranslation('so');

  assert.ok(en.orderTracking);
  assert.ok(so.orderTracking);
  assert.equal(en.langName, 'English');
  assert.equal(so.langName, 'Af-Soomaali');

  const requiredStatuses = ['pending', 'rip_queue', 'in_progress', 'finishing', 'out_for_delivery', 'completed'];
  for (const st of requiredStatuses) {
    assert.ok(en.status[st], `Missing English status: ${st}`);
    assert.ok(so.status[st], `Missing Somali status: ${st}`);
    assert.ok(en.stepSubtitles[st], `Missing English subtitle: ${st}`);
    assert.ok(so.stepSubtitles[st], `Missing Somali subtitle: ${st}`);
  }
});
