const pool = require('./index');
const { DEFAULT_SITE_CONTENT } = require('../lib/default-site-content');

async function getSiteContent() {
  const result = await pool.query("SELECT value_json FROM site_content WHERE content_key = 'site'");
  return result.rows[0]?.value_json || DEFAULT_SITE_CONTENT;
}

async function updateSiteContent(value) {
  const result = await pool.query(
    `INSERT INTO site_content (content_key, value_json, updated_at)
     VALUES ('site', $1::jsonb, NOW())
     ON CONFLICT (content_key) DO UPDATE SET value_json=EXCLUDED.value_json, updated_at=NOW()
     RETURNING value_json, updated_at`,
    [JSON.stringify(value)]
  );
  return result.rows[0];
}

module.exports = { getSiteContent, updateSiteContent };
