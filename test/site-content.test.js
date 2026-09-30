const test = require('node:test');
const assert = require('node:assert/strict');
const ejs = require('ejs');
const path = require('path');
const { DEFAULT_SITE_CONTENT } = require('../lib/default-site-content');

test('CMS seed contains required editable website sections', () => {
  const content = DEFAULT_SITE_CONTENT;
  assert.ok(content.global.email);
  assert.ok(content.hero.imageUrl);
  assert.ok(content.factory.imageUrl);
  assert.ok(Array.isArray(content.navigation));
  assert.ok(content.navigation.length >= 5);
  assert.ok(Array.isArray(content.catalog.products));
  assert.ok(content.catalog.products.some(product => product.id === 'vehicle_wrap'));
  assert.ok(!content.catalog.products.some(product => product.id === 'bajaaj_wrap'));
  assert.ok(content.design.vehicleTypes.some(vehicle => /HiAce/i.test(vehicle.label)));
});

test('landing page renders CMS values instead of template literals', async () => {
  const content = structuredClone(DEFAULT_SITE_CONTENT);
  content.hero.titleLine1 = 'CMS CONTROLLED HEADLINE';
  content.global.email = 'cms-test@signpal.net';
  const html = await ejs.renderFile(path.join(__dirname, '../views/layout.ejs'), {
    content,
    slug: 'home',
    products: content.catalog.products,
    categories: content.catalog.categories
  });
  assert.match(html, /CMS CONTROLLED HEADLINE/);
  assert.match(html, /cms-test@signpal\.net/);
});
