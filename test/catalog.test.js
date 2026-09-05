const test = require('node:test');
const assert = require('node:assert/strict');
const { CATEGORIES, PRODUCTS, getProduct } = require('../lib/product-catalog');
const { getPrintSpec } = require('../lib/print-engine');

test('catalog product identifiers are unique and routable', () => {
  assert.equal(new Set(PRODUCTS.map(p => p.id)).size, PRODUCTS.length);
  const categoryIds = new Set(CATEGORIES.map(c => c.id));
  for (const product of PRODUCTS) {
    assert.ok(categoryIds.has(product.category), `${product.id} has an unknown category`);
    assert.equal(getProduct(product.id).id, product.id);
    assert.ok(getPrintSpec(product.id).aspectRatio);
  }
});

test('unknown products safely enter the custom quote workflow', () => {
  assert.equal(getProduct('not-real').id, 'custom');
  assert.equal(getProduct('custom').instantDesign, false);
});
