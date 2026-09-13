const test = require('node:test');
const assert = require('node:assert/strict');
const ejs = require('ejs');
const fs = require('fs');
const path = require('path');
const { getPrintSpec, getMaterialFinishingSpec } = require('../lib/print-engine');

test('getMaterialFinishingSpec assigns commercial press substrates and finishing techniques', () => {
  const cardSpec = getMaterialFinishingSpec('business_card');
  assert.match(cardSpec.substrate, /400gsm/i);
  assert.match(cardSpec.finishing, /Lamination/i);

  const bajaajSpec = getMaterialFinishingSpec('bajaaj_wrap', 'Full wrap for delivery');
  assert.match(bajaajSpec.substrate, /Cast.*Vinyl/i);
  assert.match(bajaajSpec.finishing, /Overlaminate/i);
  assert.equal(bajaajSpec.turnaroundHours, 48);

  const lettersSpec = getMaterialFinishingSpec('three_d_letters', 'Backlit halo glow letters');
  assert.match(lettersSpec.substrate, /Acrylic/i);
  assert.match(lettersSpec.finishing, /LED/i);
  assert.match(lettersSpec.finishing, /Halo Glow/i);

  const pylonSpec = getMaterialFinishingSpec('pylon_sign');
  assert.match(pylonSpec.substrate, /Steel Truss.*Alucobond/i);
  assert.equal(pylonSpec.turnaroundHours, 96);
});

test('prepress job ticket renders all technical specifications and crop marks', () => {
  const ticketTpl = fs.readFileSync(path.join(__dirname, '../views/job-ticket.ejs'), 'utf8');
  const sampleOrder = {
    id: 42,
    customer_name: 'Hassan Aden',
    customer_email: 'hassan@example.com',
    customer_phone: '+252 63 9991122',
    product_type: 'three_d_letters',
    quantity: 1,
    payment_status: 'paid',
    payment_provider: 'edahab',
    amount_usd: 850.00,
    created_at: new Date('2026-09-12T12:00:00Z').toISOString(),
    user_description: 'Backlit halo channel letters for Dahabshiil branch',
    designs_json: JSON.stringify([{ url: 'https://images.unsplash.com/photo-1' }]),
    selected_design: 0,
    public_token: 'token_hassan_42'
  };

  const spec = getPrintSpec(sampleOrder.product_type);
  const material = getMaterialFinishingSpec(sampleOrder.product_type, sampleOrder.user_description);
  const html = ejs.render(ticketTpl, {
    order: sampleOrder,
    spec,
    material,
    designs: [{ url: 'https://images.unsplash.com/photo-1' }]
  }, { filename: path.join(__dirname, '../views/job-ticket.ejs') });

  // Verify critical industrial prepress elements
  assert.match(html, /JOB #00042/i);
  assert.match(html, /3D ILLUMINATED LETTERS/i);
  assert.match(html, /2400 × 600 mm/i);
  assert.match(html, /\+15 mm/i);
  assert.match(html, /Fogra39/i);
  assert.match(html, /Samsung 12V IP67 Backlit LEDs/i);
  assert.match(html, /crop-mark/i);
  assert.match(html, /cmyk-bar/i);
  assert.match(html, /Prepress RIP Operator Signature/i);
});

test('CSV export generator produces standard format with escaped fields', () => {
  const headers = [
    'Order ID', 'Date', 'Customer Name', 'Phone', 'Email', 'Product', 'Quantity',
    'Trim Width (mm)', 'Trim Height (mm)', 'Bleed (mm)', 'Target DPI', 'Substrate',
    'Ink System', 'Finishing', 'Amount USD', 'Payment Status', 'Payment Provider',
    'Payment Reference', 'Production Status', 'High-Res Print File URL'
  ];

  const sampleOrder = {
    id: 101,
    created_at: '2026-09-13T08:00:00.000Z',
    customer_name: 'Mohamed "Ali" Omar',
    customer_phone: '+252 63 1234567',
    customer_email: 'ali@somalia.so',
    product_type: 'corporate_bundle',
    user_description: 'Suite with rollup\nand letterheads',
    quantity: 1,
    amount_usd: 85.50,
    payment_status: 'paid',
    payment_provider: 'zaad',
    payment_reference: 'TX12345',
    status: 'rip_queue',
    upscaled_design_url: 'https://cdn.signpal.so/print/101_hires.png'
  };

  const spec = getPrintSpec(sampleOrder.product_type);
  const mat = getMaterialFinishingSpec(sampleOrder.product_type, sampleOrder.user_description);
  const escapeCsv = (val) => `"${String(val || '').replaceAll('"', '""').replaceAll('\n', ' ')}"`;

  const row = [
    sampleOrder.id,
    new Date(sampleOrder.created_at).toISOString().slice(0, 10),
    escapeCsv(sampleOrder.customer_name),
    escapeCsv(sampleOrder.customer_phone),
    escapeCsv(sampleOrder.customer_email),
    escapeCsv(spec.name),
    sampleOrder.quantity,
    spec.widthMm,
    spec.heightMm,
    spec.bleedMm,
    spec.dpi,
    escapeCsv(mat.substrate),
    escapeCsv(mat.inkSystem),
    escapeCsv(mat.finishing),
    sampleOrder.amount_usd,
    escapeCsv(sampleOrder.payment_status),
    escapeCsv(sampleOrder.payment_provider),
    escapeCsv(sampleOrder.payment_reference),
    escapeCsv(sampleOrder.status),
    escapeCsv(sampleOrder.upscaled_design_url)
  ].join(',');

  const csv = [headers.join(','), row].join('\n');
  assert.match(csv, /Order ID,Date,Customer Name/);
  assert.match(csv, /"Mohamed ""Ali"" Omar"/);
  assert.match(csv, /1200,800,5,300/);
  assert.match(csv, /85\.5/);
  assert.match(csv, /"rip_queue"/);
});
