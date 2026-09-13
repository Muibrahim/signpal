const test = require('node:test');
const assert = require('node:assert/strict');
const { estimatePrice } = require('../lib/pricing');
const { getPrintSpec, evaluatePreflightQuality } = require('../lib/print-engine');
const { getProduct } = require('../lib/product-catalog');

test('corporate bundle provides 10% discount against market reference', () => {
  const estimate = estimatePrice('corporate_bundle', 1);
  assert.equal(estimate.available, true);
  assert.equal(estimate.quoteRequired, false);
  assert.equal(estimate.competitorTotal, 95);
  assert.equal(estimate.total, 85.5);
  assert.equal(estimate.unitPrice, 85.5);
  assert.equal(estimate.currency, 'USD');
});

test('bajaaj full wrap provides 10% discount against market reference', () => {
  const estimate = estimatePrice('bajaaj_wrap', 1);
  assert.equal(estimate.available, true);
  assert.equal(estimate.quoteRequired, false);
  assert.equal(estimate.competitorTotal, 140);
  assert.equal(estimate.total, 126);
  assert.equal(estimate.unitPrice, 126);
  assert.equal(estimate.currency, 'USD');
});

test('architectural signage and fabrication products enforce quote-only with market reference ranges', () => {
  const threeD = estimatePrice('three_d_letters', 1);
  assert.equal(threeD.available, false);
  assert.equal(threeD.quoteRequired, true);
  assert.deepEqual(threeD.referenceRange, [45, 120]);

  const pylon = estimatePrice('pylon_sign', 1);
  assert.equal(pylon.available, false);
  assert.equal(pylon.quoteRequired, true);
  assert.deepEqual(pylon.referenceRange, [450, 1800]);

  const neon = estimatePrice('neon_sign', 1);
  assert.equal(neon.available, false);
  assert.equal(neon.quoteRequired, true);
  assert.deepEqual(neon.referenceRange, [60, 250]);

  const acrylic = estimatePrice('acrylic_sign', 1);
  assert.equal(acrylic.available, false);
  assert.equal(acrylic.quoteRequired, true);
  assert.deepEqual(acrylic.referenceRange, [30, 95]);
});

test('print engine provides dedicated physical fabrication specifications for B2B products', () => {
  const corpSpec = getPrintSpec('corporate_bundle');
  assert.equal(corpSpec.widthMm, 1200);
  assert.equal(corpSpec.heightMm, 800);
  assert.equal(corpSpec.dpi, 300);
  assert.equal(corpSpec.bleedMm, 5);

  const bajaajSpec = getPrintSpec('bajaaj_wrap');
  assert.equal(bajaajSpec.widthMm, 2500);
  assert.equal(bajaajSpec.heightMm, 1500);
  assert.equal(bajaajSpec.dpi, 150);
  assert.equal(bajaajSpec.bleedMm, 20);

  const threeDSpec = getPrintSpec('three_d_letters');
  assert.equal(threeDSpec.widthMm, 2400);
  assert.equal(threeDSpec.heightMm, 600);
  assert.equal(threeDSpec.dpi, 150);
  assert.equal(threeDSpec.bleedMm, 15);

  const pylonSpec = getPrintSpec('pylon_sign');
  assert.equal(pylonSpec.widthMm, 1500);
  assert.equal(pylonSpec.heightMm, 4000);
  assert.equal(pylonSpec.dpi, 150);
  assert.equal(pylonSpec.bleedMm, 25);
});

test('pre-flight quality evaluation succeeds for B2B products', () => {
  const preflightCorp = evaluatePreflightQuality({ productType: 'corporate_bundle', hasHighRes: true, hasFlatArt: true });
  assert.equal(preflightCorp.score, 100);
  assert.equal(preflightCorp.bleedMm, 5);

  const preflightBajaaj = evaluatePreflightQuality({ productType: 'bajaaj_wrap', hasHighRes: true, hasFlatArt: true });
  assert.equal(preflightBajaaj.score, 100);
  assert.equal(preflightBajaaj.bleedMm, 20);
});

test('catalog lists B2B products with valid routing identifiers', () => {
  assert.equal(getProduct('corporate_bundle').id, 'corporate_bundle');
  assert.equal(getProduct('bajaaj_wrap').id, 'bajaaj_wrap');
  assert.equal(getProduct('three_d_letters').id, 'three_d_letters');
  assert.equal(getProduct('pylon_sign').id, 'pylon_sign');
});
