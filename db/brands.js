/**
 * Brand DNA Database Access.
 * Owns read/write operations for persistent brand profiles.
 */

const pool = require('./index');

async function createBrand({
  name,
  tagline,
  industry,
  primaryColor,
  secondaryColor,
  accentColor,
  backgroundColor,
  textColor,
  headingFont,
  bodyFont,
  primaryLanguage,
  secondaryLanguage,
  contactPhone,
  contactEmail,
  contactAddress,
  logoUrl
}) {
  const result = await pool.query(
    `INSERT INTO brands (
      name, tagline, industry, primary_color, secondary_color, accent_color, background_color, text_color,
      heading_font, body_font, primary_language, secondary_language, contact_phone, contact_email, contact_address, logo_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      name,
      tagline || null,
      industry || null,
      primaryColor || '#001F3F',
      secondaryColor || '#FFD700',
      accentColor || '#FF6F61',
      backgroundColor || '#000000',
      textColor || '#FFFFFF',
      headingFont || 'Montserrat',
      bodyFont || 'Inter',
      primaryLanguage || 'English',
      secondaryLanguage || 'Somali',
      contactPhone || null,
      contactEmail || null,
      contactAddress || null,
      logoUrl || null
    ]
  );
  return result.rows[0];
}

async function getBrands() {
  const result = await pool.query('SELECT * FROM brands ORDER BY created_at DESC');
  return result.rows;
}

async function getBrandById(id) {
  const result = await pool.query('SELECT * FROM brands WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function updateBrand(id, fields) {
  const keys = Object.keys(fields);
  if (keys.length === 0) return getBrandById(id);

  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map(k => fields[k]);

  const result = await pool.query(
    `UPDATE brands SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}

module.exports = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand
};
