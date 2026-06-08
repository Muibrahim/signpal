# SignPal — AI Design Tool

## What this app does
SignPal lets customers describe any design they need (business card, sign, poster, ID, etc.) in plain text with optional inspiration images. AI generates 3 design options. They pick one and submit an order. Admins review and respond to incoming orders.

## Stack
Express.js + EJS + PostgreSQL (Neon) + OpenAI image generation

## Directory map
- `server.js` — Express entry point (wiring only, <300 LOC)
- `routes/` — API route groups (customer, admin)
- `db/` — Database access (pool init, named queries)
- `services/` — External integrations (AI image generation)
- `migrations/` — DDL in timestamped SQL files
- `views/` — EJS templates (layout, partials, app pages)
- `public/css/` — Stylesheets (theme.css, design.css, admin.css)
- `lib/` — Shared utilities (landing-context)

## Database
- `users` — Polsia-managed subscription/users (email, subscription fields)
- `orders` — Customer design requests (user_description TEXT, designs_json, selected_design, status, contact info, created_at)
- `_migrations` — Tracks applied migration names

## External integrations
- OpenAI — Image generation (gpt-image-1) for design mockups
- R2 (via Polsia) — Image storage for generated designs

## Recent changes
- 2026-06-01: Chat-based design flow — replaced 3-step form with freeform description + image upload, renamed SignForge → SignPal
- 2026-05-30: MVP launched — AI design tool, order submission, admin panel