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

module.exports = { isConfigured, initiateSifaloPayment, SIFALO_GATEWAYS };
