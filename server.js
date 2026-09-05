/**
 * SignPal Express entry point.
 * Owns: middleware setup, route mounting, server listen.
 * Does NOT own: business logic, database queries, external integrations.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { buildLandingContext } = require('./lib/landing-context');
const { PRODUCTS, CATEGORIES } = require('./lib/product-catalog');
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
  res.render('layout', { ...buildLandingContext(), slug: 'home', products: PRODUCTS, categories: CATEGORIES });
});

const companyPages = {
  products: {
    eyebrow: 'Everything we make',
    title: 'Print products for every visible part of your business',
    intro: 'Browse everyday print, large-format signage, packaging, apparel and custom fabrication. Start with a design, upload finished artwork, or ask for a quotation.',
  },
  services: {
    eyebrow: 'What we do',
    title: 'One partner from first idea to final installation',
    intro: 'SignPal combines graphic design, commercial printing, signage fabrication, branding, finishing, delivery and installation.',
    cards: [
      ['Graphic design', 'Three design directions, brand adaptation and production artwork.'],
      ['Commercial printing', 'Digital and offset-ready workflows for stationery, marketing and publications.'],
      ['Large-format printing', 'Indoor and outdoor banners, backdrops, wall graphics and displays.'],
      ['Sign fabrication', '3D letters, illuminated signs, acrylic and custom structures.'],
      ['Branding & installation', 'Storefront, office, vehicle and event branding delivered as one project.'],
      ['Finishing & delivery', 'Cutting, binding, mounting, quality inspection and order handover.'],
    ],
  },
  portfolio: {
    eyebrow: 'Production gallery',
    title: 'Work designed to be seen in the real world',
    intro: 'Explore the types of storefronts, events, publications, packaging and promotional products our production workflow is built to deliver.',
    cards: [
      ['Storefront project', 'Client, location, materials and completion photography will be added here.'],
      ['Event branding', 'Backdrop, directional signage, banners and venue photography will be added here.'],
      ['Books & publications', 'Cover, binding, paper and finished publication photography will be added here.'],
      ['Packaging project', 'Dieline, material, finishing and final product photography will be added here.'],
      ['Vehicle branding', 'Before, installation and completed wrap photography will be added here.'],
      ['Corporate print', 'Coordinated stationery and promotional product photography will be added here.'],
    ],
  },
  about: {
    eyebrow: 'About SignPal',
    title: 'A printing company built for the way customers work today',
    intro: 'We are building a local design and production company where customers can move from an idea to an approved, paid and trackable print order in one place.',
    cards: [
      ['Our story', 'Add the founding date, founder story and reason SignPal was established.'],
      ['Our mission', 'Make professional design and dependable print production easier to access.'],
      ['Our factory', 'Located in Hargeisa, Somaliland. Add the equipment list, production capacity and photographs.'],
      ['Our team', 'Add leadership, designers, machine operators and installation specialists.'],
      ['Quality promise', 'Add the approved material, proofing, inspection and reprint policies.'],
      ['Service area', 'Add cities, delivery coverage, installation range and collection points.'],
    ],
  },
  contact: {
    eyebrow: 'Talk to SignPal',
    title: 'Tell us what you need to make visible',
    intro: 'For custom fabrication, installation, high-volume orders or anything you cannot find in the catalog, speak directly with our production team.',
  },
};

Object.entries(companyPages).forEach(([slug, page]) => {
  app.get(`/${slug}`, (_req, res) => {
    res.render('company-page', { ...buildLandingContext(), slug, page, products: PRODUCTS, categories: CATEGORIES });
  });
});

// Customer-facing design tool
app.use(customerRoutes);

// Admin order management
app.use(adminRoutes);

app.listen(port, () => {
  console.log(`SignPal running on port ${port}`);
});
