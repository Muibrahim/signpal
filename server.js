/**
 * SignPal Express entry point.
 * Owns: middleware setup, route mounting, server listen.
 * Does NOT own: business logic, database queries, external integrations.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');

const app = express();
const port = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// EJS view engine. Templates live in ./views/.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public folder.
// `index: false` disables auto-serving public/index.html as the directory
// index — `/` always hits the EJS render route below, which is the only
// thing that should ever serve the landing page on this template.
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// Health check (no DB query — allows Neon auto-suspend)
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// Landing page
app.get('/', (_req, res) => {
  res.render('layout', buildLandingContext());
});

// Customer-facing design tool
app.use(customerRoutes);

// Admin order management
app.use(adminRoutes);

app.listen(port, () => {
  console.log(`SignPal running on port ${port}`);
});