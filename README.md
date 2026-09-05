# SignPal

SignPal is a full printing-company website and AI-assisted print storefront for Somalia and Somaliland. Customers can explore products and services, generate three distinct concepts, upload existing artwork, request custom production, preview the selected artwork as a product mockup, and choose printed fulfillment or a paid design download.

## Customer flow

1. Browse the 45-product catalog, including custom fabrication.
2. Provide exact content, language, Brand Kit and references.
3. Compare three flat design directions.
4. Select a concept and review its product mockup.
5. Choose **Print with SignPal** or **Download design**.
6. Pay through Sifalo Pay; fulfillment stays locked until verification.
7. Track the private order URL returned after checkout.

Print orders wait for an administrator quote. Download orders use `DESIGN_DOWNLOAD_PRICE_USD`. Verified orders automatically start fulfillment-file generation.

The built-in price book contains owner-confirmed USD references from Sagaljet's October 2021 list and automatically charges 10% less for exact standard-product matches. Ambiguous, zero-priced, installation-dependent and custom products remain quote-only. Optional per-unit costs in `FACTORY_COSTS_JSON` make the engine use the greater of the competitor target or the price required for a 40% gross margin.

## Setup

Requirements: Node.js 20+, PostgreSQL, OpenAI image-generation access, and a Sifalo Pay merchant account for live payments.

Copy `.env.example` to `.env` and populate its values. In production, `ADMIN_USER` and `ADMIN_PASSWORD` are mandatory.

```bash
npm install
npm run migrate
npm test
npm run dev
```

## Routes

- `/` — marketing site
- `/products` — complete product catalog
- `/services` — design, printing, fabrication and installation capabilities
- `/portfolio` — production categories and project-gallery structure
- `/about` — company and production story
- `/contact` — quotation and production contact path
- `/design` — product and design journey
- `/order/:token` — private customer payment/status page
- `/admin` — authenticated quote, payment and production dashboard
- `/health` — deployment health check

## Payment safety

`POST /api/orders/:token/pay` initiates a Sifalo mobile-money request using the server-held key. It sets payment to `processing`, never `paid`. Until the merchant account's signed webhook contract is available, staff confirm the transaction in Sifalo and use **Verify paid & fulfill** in `/admin`. Neither retry nor customer download paths release unpaid assets.

## Deployment

`render.yaml` installs dependencies and runs migrations before startup. Configure every `sync: false` secret in Render. AI assets should be moved to permanent object storage before substantial production traffic; provider/data URLs are not a durable archive.
