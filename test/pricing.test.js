const test = require('node:test');
const assert = require('node:assert/strict');
const { estimatePrice } = require('../lib/pricing');

test('approved prices are ten percent below competitor references', () => {
  delete process.env.PRICE_BOOK_MODE;
  delete process.env.COMPETITOR_PRICE_CURRENCY;
  delete process.env.FACTORY_COSTS_JSON;
  const estimate = estimatePrice('business_card', 100);
  assert.equal(estimate.competitorTotal, 20);
  assert.equal(estimate.total, 18);
  assert.equal(estimate.unitPrice, 0.18);
  assert.equal(estimate.quoteRequired, false);
  assert.equal(estimate.currency, 'USD');
});

test('quantity tiers use the matching competitor unit price', () => {
  assert.equal(estimatePrice('flyer', 50).competitorUnitPrice, 0.45);
  assert.equal(estimatePrice('flyer', 600).competitorUnitPrice, 0.30);
  assert.equal(estimatePrice('flyer', 3000).competitorUnitPrice, 0.25);
});

test('custom fabrication remains quote-only', () => {
  assert.equal(estimatePrice('vehicle_wrap', 1).quoteRequired, true);
  assert.equal(estimatePrice('custom', 1).available, false);
});

test('approved prices enforce minimum factory margin', () => {
  const previous = { mode: process.env.PRICE_BOOK_MODE, currency: process.env.COMPETITOR_PRICE_CURRENCY, costs: process.env.FACTORY_COSTS_JSON };
  process.env.PRICE_BOOK_MODE = 'approved'; process.env.COMPETITOR_PRICE_CURRENCY = 'USD'; process.env.FACTORY_COSTS_JSON = '{"pvc_banner":6}';
  const estimate = estimatePrice('pvc_banner', 1);
  assert.equal(estimate.total, 10);
  assert.equal(estimate.quoteRequired, false);
  Object.assign(process.env, { PRICE_BOOK_MODE: previous.mode || '', COMPETITOR_PRICE_CURRENCY: previous.currency || '', FACTORY_COSTS_JSON: previous.costs || '' });
});
