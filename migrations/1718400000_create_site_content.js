const { DEFAULT_SITE_CONTENT } = require('../lib/default-site-content');

module.exports = {
  name: 'create_site_content',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_content (
        id SERIAL PRIMARY KEY,
        content_key VARCHAR(100) NOT NULL UNIQUE,
        value_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(
      `INSERT INTO site_content (content_key, value_json)
       VALUES ('site', $1::jsonb)
       ON CONFLICT (content_key) DO NOTHING`,
      [JSON.stringify(DEFAULT_SITE_CONTENT)]
    );
  }
};
