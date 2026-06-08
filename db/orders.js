/**
 * Order queries.
 * Owns all read/write access to the orders table.
 */

const pool = require('./index');

async function createOrder({ userDescription, designsJson, customerName, customerEmail, customerPhone, notes }) {
  const result = await pool.query(
    `INSERT INTO orders (user_description, designs_json, customer_name, customer_email, customer_phone, notes, status)
     VALUES ($1,$2,$3,$4,$5,$6,'pending')
     RETURNING *`,
    [userDescription || null, JSON.stringify(designsJson || []), customerName, customerEmail, customerPhone || null, notes || null]
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

async function updateOrderPrintFiles(orderId, flatDesignUrl, upscaledDesignUrl) {
  const result = await pool.query(
    `UPDATE orders SET flat_design_url=$2, upscaled_design_url=$3, updated_at=NOW() WHERE id=$1 RETURNING *`,
    [orderId, flatDesignUrl, upscaledDesignUrl]
  );
  return result.rows[0] || null;
}

module.exports = { createOrder, getOrders, getOrderById, updateOrderStatus, updateOrderResponse, setSelectedDesign, updateOrderPrintFiles };