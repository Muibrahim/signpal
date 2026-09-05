/**
 * SignPal product catalog.
 *
 * This is the shared source of truth for the storefront, AI prompts and
 * production routing. Prices are intentionally not stored here until the
 * factory has approved its material/finishing price matrix.
 */

const CATEGORIES = [
  { id: 'popular', name: 'Popular' },
  { id: 'paper', name: 'Paper & Marketing' },
  { id: 'display', name: 'Banners & Displays' },
  { id: 'signage', name: 'Signs & Storefronts' },
  { id: 'packaging', name: 'Stickers & Packaging' },
  { id: 'promotional', name: 'Clothing & Promotional' },
  { id: 'branding', name: 'Interior & Vehicle Branding' },
  { id: 'custom', name: 'Custom' },
];

const PRODUCTS = [
  product('business_card', 'Business Cards', 'paper', '85 × 55 mm', true, ['popular'], 'card'),
  product('flyer', 'Flyers', 'paper', 'A4, A5 or custom', true, ['popular'], 'page'),
  product('poster', 'Posters', 'paper', 'A4, A3 or custom', true, [], 'page'),
  product('brochure', 'Brochures', 'paper', 'Bi-fold or tri-fold', true, [], 'fold'),
  product('booklet', 'Booklets', 'paper', 'Multi-page', true, [], 'book'),
  product('book', 'Books', 'paper', 'Cover or full publication', false, ['popular'], 'book'),
  product('menu', 'Menus', 'paper', 'Single or multi-page', true, [], 'page'),
  product('letterhead', 'Letterheads', 'paper', 'A4 stationery', true, [], 'page'),
  product('envelope', 'Envelopes', 'paper', 'DL, C5 or custom', true, [], 'envelope'),
  product('certificate', 'Certificates', 'paper', 'A4 or custom', true, [], 'page'),
  product('calendar', 'Calendars', 'paper', 'Wall or desk', false, [], 'calendar'),
  product('invitation', 'Invitations', 'paper', 'Single or folded', true, [], 'card'),

  product('rollup_banner', 'Roll-up Banners', 'display', '800 × 2000 mm', true, ['popular'], 'banner'),
  product('pvc_banner', 'PVC Banners', 'display', 'Custom size', true, [], 'banner'),
  product('fabric_banner', 'Fabric Banners', 'display', 'Custom size', true, [], 'banner'),
  product('backdrop', 'Event Backdrops', 'display', 'Custom size', true, [], 'backdrop'),
  product('x_banner', 'X-Banners', 'display', 'Standard stand sizes', true, [], 'banner'),
  product('flag', 'Flags', 'display', 'Indoor or outdoor', true, [], 'flag'),
  product('exhibition', 'Exhibition Stands', 'display', 'Custom system', false, [], 'backdrop'),

  product('shop_sign', 'Shop Signboards', 'signage', 'Custom fabrication', false, ['popular'], 'sign'),
  product('three_d_letters', '3D Letters', 'signage', 'Custom fabrication', false, [], 'sign'),
  product('illuminated_sign', 'Illuminated Signs', 'signage', 'Custom fabrication', false, [], 'sign'),
  product('neon_sign', 'Neon Signs', 'signage', 'Custom fabrication', false, [], 'sign'),
  product('acrylic_sign', 'Acrylic Signs', 'signage', 'Custom fabrication', false, [], 'sign'),
  product('cladding_sign', 'Cladding Signboards', 'signage', 'Survey required', false, [], 'sign'),
  product('directional_sign', 'Directional Signs', 'signage', 'Indoor or outdoor', false, [], 'sign'),
  product('billboard', 'Billboards', 'signage', 'Artwork or media booking', false, [], 'billboard'),

  product('product_label', 'Product Labels', 'packaging', 'Roll or sheet', true, [], 'sticker'),
  product('sticker', 'Custom Stickers', 'packaging', 'Die-cut or sheet', true, ['popular'], 'sticker'),
  product('window_sticker', 'Window Stickers', 'packaging', 'Custom size', true, [], 'sticker'),
  product('packaging_box', 'Packaging Boxes', 'packaging', 'Custom dieline', false, [], 'box'),
  product('paper_bag', 'Paper Bags', 'packaging', 'Custom size', false, [], 'bag'),
  product('food_packaging', 'Food Packaging', 'packaging', 'Food-safe specification', false, [], 'box'),

  product('tshirt', 'T-Shirts', 'promotional', 'Print or embroidery', true, ['popular'], 'shirt'),
  product('uniform', 'Uniforms', 'promotional', 'Print or embroidery', false, [], 'shirt'),
  product('cap', 'Caps', 'promotional', 'Print or embroidery', false, [], 'cap'),
  product('mug', 'Mugs', 'promotional', 'Full-color print', true, [], 'mug'),
  product('lanyard', 'Lanyards', 'promotional', 'Custom print', true, [], 'lanyard'),
  product('id_badge', 'ID Cards & Badges', 'promotional', 'CR80 or custom', true, [], 'card'),

  product('wallpaper', 'Wallpaper & Wall Graphics', 'branding', 'Site dimensions required', false, [], 'wall'),
  product('window_graphic', 'Window Graphics', 'branding', 'Site dimensions required', false, [], 'window'),
  product('vehicle_wrap', 'Vehicle Wraps', 'branding', 'Vehicle template required', false, [], 'car'),
  product('vehicle_decal', 'Vehicle Decals', 'branding', 'Custom size', false, [], 'car'),
  product('office_branding', 'Office Branding', 'branding', 'Site survey recommended', false, [], 'wall'),

  product('custom', 'Other / Custom Product', 'custom', 'Tell us what you need', false, ['popular'], 'custom'),
];

function product(id, name, category, format, instantDesign, extraCategories = [], icon = 'custom') {
  return { id, name, category, categories: [category, ...extraCategories], format, instantDesign, icon };
}

function getProduct(id) {
  return PRODUCTS.find((item) => item.id === id) || PRODUCTS.find((item) => item.id === 'custom');
}

module.exports = { CATEGORIES, PRODUCTS, getProduct };
