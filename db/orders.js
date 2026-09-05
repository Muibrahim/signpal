/**
 * Order queries.
 * Owns all read/write access to the orders table.
 */

const pool = require('./index');

async function createOrder({ userDescription, designsJson, customerName, customerEmail, customerPhone, notes, productType, fulfillmentType, publicToken, amountUsd, quantity, pricingSnapshot }) {
  const result = await pool.query(
    `INSERT INTO orders (user_description, designs_json, customer_name, customer_email, customer_phone, notes, status, product_type, fulfillment_type, payment_status, public_token, amount_usd, quantity, pricing_snapshot)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,'unpaid',$9,$10,$11,$12)
     RETURNING *`,
    [userDescription || null, JSON.stringify(designsJson || []), customerName, customerEmail, customerPhone || null, notes || null, productType || null, fulfillmentType, publicToken, amountUsd, quantity || 1, pricingSnapshot ? JSON.stringify(pricingSnapshot) : null]
  );
  return result.rows[0];
}

async function getOrders({ status } = {}) {
  const where = status ? 'WHERE status = $1' : '';
  const params = status ? [status] : [];
  const result = await pool.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows;
}

async function getOrderById(id) {
  const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function getOrderByToken(token) {
  const result = await pool.query('SELECT * FROM orders WHERE public_token = $1', [token]);
  return result.rows[0] || null;
}

async function updatePayment(id, { status, provider = 'sifalo', reference = null }) {
  const result = await pool.query(
    `UPDATE orders SET payment_status=$2, payment_provider=$3, payment_reference=COALESCE($4,payment_reference),
       paid_at=CASE WHEN $2='paid' THEN COALESCE(paid_at,NOW()) ELSE paid_at END, updated_at=NOW()
     WHERE id=$1 RETURNING *`, [id, status, provider, reference]
  );
  return result.rows[0] || null;
}

async function setOrderAmount(id, amount) {
  const result = await pool.query('UPDATE orders SET amount_usd=$2, updated_at=NOW() WHERE id=$1 RETURNING *', [id, amount]);
  return result.rows[0] || null;
}

async function updateOrderStatus(id, status) {
  const result = await pool.query(
    `UPDATE orders SET status=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, status]
  );
  return result.rows[0] || null;
}

async function updateOrderResponse(id, adminResponse, status) {
  const result = await pool.query(
    `UPDATE orders SET admin_response=$2, status=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [id, adminResponse, status]
  );
  return result.rows[0] || null;
}

async function setSelectedDesign(orderId, designIndex) {
  const result = await pool.query(
    `UPDATE orders SET selected_design=$2, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [orderId, designIndex]
  );
  return result.rows[0] || null;
}

async function updateOrderPrintFiles(orderId, flatDesignUrl, upscaledDesignUrl, printStatus = 'completed') {
  const result = await pool.query(
    `UPDATE orders SET flat_design_url=$2, upscaled_design_url=$3, print_status=$4, print_error=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [orderId, flatDesignUrl, upscaledDesignUrl, printStatus]
  );
  return result.rows[0] || null;
}

async function updatePrintStatus(orderId, printStatus, printError = null) {
  const result = await pool.query(
    `UPDATE orders SET print_status=$2, print_error=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [orderId, printStatus, printError]
  );
  return result.rows[0] || null;
}

module.exports = { createOrder, getOrders, getOrderById, getOrderByToken, updatePayment, setOrderAmount, updateOrderStatus, updateOrderResponse, setSelectedDesign, updateOrderPrintFiles, updatePrintStatus };
