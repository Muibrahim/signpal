/**
 * Versioned approved price book derived from Sagaljet's October 2021 USD list.
 * SignPal's target is exactly 10% below the matching competitor tier. When
 * factory costs become available, the same engine additionally protects a
 * 40% minimum gross margin.
 */
const SOURCE = 'Sagaljet price list · October 2021';
const TARGET_DISCOUNT = 0.10;
const DEFAULT_MARGIN = 0.40;

const RULES = {
  business_card: tiered('piece', 100, [[200, 0.20], [500, 0.18], [Infinity, 0.18]]),
  brochure: tiered('piece', 20, [[100, 0.90], [500, 0.75], [2000, 0.50], [Infinity, 0.40]]),
  flyer: tiered('piece', 20, [[100, 0.45], [500, 0.39], [2000, 0.30], [Infinity, 0.25]]),
  letterhead: tiered('piece', 100, [[200, 0.29], [500, 0.23], [2000, 0.17], [Infinity, 0.12]]),
  envelope: tiered('piece', 100, [[500, 0.28], [Infinity, 0.23]]),
  sticker: tiered('A5 piece', 12, [[100, 0.45], [500, 0.28], [Infinity, 0.23]]),
  product_label: tiered('A5 sheet', 12, [[100, 0.45], [500, 0.28], [Infinity, 0.23]]),
  invitation: fixed('piece', 1, 0.40),
  id_badge: tiered('piece', 1, [[50, 5], [Infinity, 4]]),
  rollup_banner: fixed('90 cm stand', 1, 55),
  pvc_banner: fixed('1 × 1 m', 1, 8),
  fabric_banner: fixed('1 × 1 m', 1, 8),
  flag: fixed('150 × 100 cm, one-side print', 1, 25),
  tshirt: fixed('piece, one-side print', 1, 5),
  mug: fixed('piece', 1, 5),
  wallpaper: fixed('1 × 1 m', 1, 11),
  vehicle_wrap: { unit: 'job', minimum: 1, quoteOnly: true, referenceRange: [210, 635] },
  shop_sign: { unit: 'job', minimum: 1, quoteOnly: true, referenceRange: [25, 65] },
  illuminated_sign: { unit: 'job', minimum: 1, quoteOnly: true, referenceRange: [35, 180] },
  billboard: { unit: 'job', minimum: 1, quoteOnly: true, referenceRange: [50, 300] },
};

function tiered(unit, minimum, tiers) { return { unit, minimum, tiers }; }
function fixed(unit, minimum, competitorUnitPrice) { return { unit, minimum, tiers: [[Infinity, competitorUnitPrice]] }; }

function getFactoryCosts() {
  try { return JSON.parse(process.env.FACTORY_COSTS_JSON || '{}'); }
  catch (_) { return {}; }
}

function roundMoney(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

function estimatePrice(productType, requestedQuantity) {
  const rule = RULES[productType];
  const quantity = Math.max(1, Number.parseInt(requestedQuantity, 10) || rule?.minimum || 1);
  if (!rule) return { available: false, quoteRequired: true, quantity, reason: 'Product specification requires review' };
  if (rule.quoteOnly) return { available: false, quoteRequired: true, quantity, unit: rule.unit, referenceRange: rule.referenceRange, source: SOURCE, reason: 'Material, dimensions or installation must be confirmed' };

  const tier = rule.tiers.find(([maximum]) => quantity <= maximum);
  const competitorUnitPrice = tier[1];
  const competitorTotal = competitorUnitPrice * quantity;
  const targetFromCompetitor = competitorTotal * (1 - TARGET_DISCOUNT);
  const factoryCost = Number(getFactoryCosts()[productType]);
  const minimumFromMargin = Number.isFinite(factoryCost) && factoryCost > 0 ? factoryCost * quantity / (1 - DEFAULT_MARGIN) : null;
  const total = roundMoney(Math.max(targetFromCompetitor, minimumFromMargin || 0));
  const currency = process.env.COMPETITOR_PRICE_CURRENCY || 'USD';
  const mode = (process.env.PRICE_BOOK_MODE || 'approved') === 'approved' && currency === 'USD' ? 'approved' : 'provisional';

  return {
    available: true, quoteRequired: mode !== 'approved', mode, quantity,
    minimumQuantity: rule.minimum, unit: rule.unit, source: SOURCE, currency,
    competitorUnitPrice, competitorTotal: roundMoney(competitorTotal),
    targetDiscount: TARGET_DISCOUNT, minimumMargin: DEFAULT_MARGIN,
    marginProtected: Boolean(minimumFromMargin),
    unitPrice: roundMoney(total / quantity), total,
    reason: mode === 'approved' ? null : 'The price book has been placed in manual review mode'
  };
}

module.exports = { estimatePrice, RULES, SOURCE, TARGET_DISCOUNT, DEFAULT_MARGIN };
