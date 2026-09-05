const test = require('node:test');
const assert = require('node:assert/strict');
const payments = require('../services/payments');

test('Sifalo integration stays disabled without a server API key', () => {
  const previous = process.env.SIFALO_API_KEY;
  delete process.env.SIFALO_API_KEY;
  assert.equal(payments.isConfigured(), false);
  if (previous) process.env.SIFALO_API_KEY = previous;
});

test('supported Sifalo gateways are explicitly allowlisted', () => {
  for (const gateway of ['zaad', 'evc', 'edahab', 'sahal', 'premier']) assert.ok(payments.SIFALO_GATEWAYS.has(gateway));
  assert.equal(payments.SIFALO_GATEWAYS.has('unknown'), false);
});
