/**
 * Initial CMS content. This object is inserted into PostgreSQL by the CMS
 * migration and is only a resilience fallback if the database is unavailable.
 */
const { PRODUCTS, CATEGORIES } = require('./product-catalog');

const DEFAULT_SITE_CONTENT = {
  global: {
    siteName: 'SignPal',
    metaTitle: 'SignPal — Design, Print & Production',
    metaDescription: 'Create professional design concepts, preview your selected product, and order precision printing with SignPal.',
    logoUrl: '/images/signpal-logo-640.png',
    email: 'info@signpal.net',
    whatsappNumber: '+252 63 3336168',
    whatsappDigits: '252633336168',
    phone: '',
    address: 'Hargeisa, Somaliland',
    serviceArea: 'Somalia & Somaliland',
    openingHours: 'Add business hours',
    topbarText: 'Professional design, print & production',
    footerDescription: 'Professional design, printing, signage and custom production for Somalia and Somaliland.',
    footerTagline: 'Design · Print · Production'
  },
  navigation: [
    { label: 'Home', href: '/', slug: 'home' },
    { label: 'Products', href: '/products', slug: 'products' },
    { label: 'Services', href: '/services', slug: 'services' },
    { label: 'Our work', href: '/portfolio', slug: 'portfolio' },
    { label: 'About', href: '/about', slug: 'about' },
    { label: 'Contact', href: '/contact', slug: 'contact' }
  ],
  labels: {
    startOrder: 'Start an order',
    talkProduction: 'Talk to production',
    requestQuote: 'Request a quote',
    designStudio: 'Design Studio',
    aboutCompany: 'About SignPal',
    readyEyebrow: 'Ready when you are',
    readyTitle: 'Continue with SignPal'
  },
  catalog: {
    categories: CATEGORIES,
    products: PRODUCTS
  },
  design: {
    vehicleTypes: [
      { label: 'HiAce Bus (Small)', value: 'HiAce Bus (Small / Standard)', icon: '🚌' },
      { label: 'HiAce Bus (Large)', value: 'HiAce Bus (Large / High Roof)', icon: '🚐' },
      { label: 'Big Bus (Coach)', value: 'Big Bus (Coach / Public Bus)', icon: '🚍' },
      { label: 'Small Pickup (Single Cab)', value: 'Small Pickup Truck (Hilux / Single Cab)', icon: '🛻' },
      { label: 'Big Pickup (Double Cab)', value: 'Big Pickup Truck (Double Cab / Commercial Fleet)', icon: '🚚' },
      { label: 'Delivery Van / Probox', value: 'Commercial Delivery Van / Probox', icon: '🚐' }
    ],
    wrapCoverage: [
      { label: 'Full 360° Wrap', value: 'Full 360° Commercial Vinyl Wrap', icon: '🛡️' },
      { label: 'Side Doors + Hood', value: 'Side Doors & Bonnet Branding', icon: '🚪' },
      { label: 'Perforated Rear Glass', value: 'Rear Window One-Way Vision', icon: '🪟' },
      { label: 'Die-Cut Decals', value: 'Die-Cut Brand Decal Kit', icon: '✂️' }
    ]
  },
  hero: {
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=2000&q=86',
    imageAlt: 'Professional print and signage production',
    eyebrow: 'Design · Print · Signs · Branding',
    titleLine1: 'We design it.',
    titleLine2: 'We print it.',
    titleAccent: 'We make it visible.',
    description: 'From business cards and books to storefront signs, packaging and complete event branding—SignPal brings professional design and local production into one clear experience.',
    primaryButton: 'Start an order',
    secondaryButton: 'Explore products',
    trustItems: ['3 design directions', 'Design included with print', 'Custom production'],
    disclosure: 'Production imagery is illustrative until SignPal project photography is added.',
    facts: [
      { value: '45+', label: 'products and custom options' },
      { value: '3', label: 'distinct concepts when you need design' },
      { value: '1', label: 'partner from idea to production' }
    ]
  },
  showcase: {
    eyebrow: 'Products and production',
    title: 'Everything your business needs to be seen',
    linkLabel: 'Browse all products →',
    items: [
      { label: 'Signs & storefronts', title: 'Built to turn locations into landmarks', description: '3D letters, illuminated signs, acrylic, cladding and directional systems.', href: '/design?product=shop_sign', imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=84' },
      { label: 'Business print', title: 'Professional print for everyday business', description: 'Cards, flyers, brochures, stationery and certificates.', href: '/design?product=business_card', imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=900&q=84' },
      { label: 'Packaging & labels', title: 'Brand presence customers can hold', description: 'Labels, stickers, boxes, bags and food packaging.', href: '/design?product=packaging_box', imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=84' },
      { label: 'Events & displays', title: 'One visual identity across the venue', description: 'Banners, backdrops, flags, roll-ups and exhibition displays.', href: '/design?product=backdrop', imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=84' },
      { label: 'Apparel & promotion', title: 'Your identity, worn and remembered', description: 'Uniforms, T-shirts, caps, mugs, lanyards and ID cards.', href: '/design?product=tshirt', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=84' }
    ]
  },
  pathways: {
    eyebrow: 'Start the way that suits you',
    title: 'Already have artwork—or need us to create it?',
    items: [
      { title: 'Generate three design directions', description: 'Choose a product, share your content and compare three purposefully different concepts.', linkLabel: 'Create my design →', href: '/design' },
      { title: 'Upload finished artwork', description: 'Bring your own file for production specification, quality review and printing.', linkLabel: 'Upload my design →', href: '/design?mode=upload' },
      { title: 'Plan a custom project', description: 'Work with production on signage, site measurements, fabrication and installation.', linkLabel: 'Request a quotation →', href: '/contact' }
    ]
  },
  process: {
    eyebrow: 'SignPal Design Studio', title: 'Not one generic draft. Three real directions.',
    description: 'Every concept responds to the selected product and format. Compare a clean direction, a bold direction and a premium direction before choosing what goes to production.',
    steps: ['Choose a product', 'Compare three concepts', 'Preview the real product', 'Print or download'],
    buttonLabel: 'Open Design Studio'
  },
  portfolio: {
    eyebrow: 'Real-world impact', title: 'Designed for screens. Produced for streets, shelves and spaces.', linkLabel: 'View production gallery →',
    note: 'These images indicate the project categories SignPal serves. Replace them with verified SignPal projects as production work is photographed.',
    items: [
      { label: 'Storefront branding', title: 'Signs that make a business easier to find', imageUrl: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=1100&q=84' },
      { label: 'Books & publications', title: 'Finishing that makes content feel valuable', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=84' },
      { label: 'Business promotion', title: 'Consistent branding across every touchpoint', imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=900&q=84' }
    ]
  },
  factory: {
    imageUrl: 'https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=1200&q=84',
    imageNote: 'Your real factory photography will appear here', eyebrow: 'Designed online. Produced locally.',
    title: 'A printing company—not just a design tool',
    description: 'SignPal is built around the complete physical job: material selection, accurate specification, proof approval, payment, production, quality inspection and delivery or installation.',
    steps: ['Specification review', 'Proof approval', 'Production control', 'Final inspection']
  },
  pricing: {
    eyebrow: 'Simple commercial model', title: 'Choose what you want to receive',
    items: [
      { label: 'Print with SignPal', title: 'Your design is included', description: 'Choose a concept, approve the proof and pay for production. Standard products show an estimate; custom fabrication receives a quotation.', linkLabel: 'Design and print →' },
      { label: 'Download the artwork', title: 'Pay only for the design', description: 'Select your preferred concept and purchase the design file for use outside SignPal.', linkLabel: 'Create and download →' }
    ],
    note: 'Approved standard products use SignPal’s current reference pricing. Material, finishing, delivery and custom specifications may change the final quotation.'
  },
  closing: {
    imageUrl: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1800&q=84',
    eyebrow: 'Your next project starts here', title: 'What would you like SignPal to make visible?',
    description: 'Order a standard product online or speak with production about a custom project.', primaryButton: 'Start an order', secondaryButton: 'Talk to production'
  },
  pages: {
    products: { eyebrow: 'Everything we make', title: 'Print products for every visible part of your business', intro: 'Browse everyday print, large-format signage, packaging, apparel and custom fabrication. Start with a design, upload finished artwork, or ask for a quotation.' },
    services: { eyebrow: 'What we do', title: 'One partner from first idea to final installation', intro: 'SignPal combines graphic design, commercial printing, signage fabrication, branding, finishing, delivery and installation.', cards: [['Graphic design','Three design directions, brand adaptation and production artwork.'],['Commercial printing','Digital and offset-ready workflows for stationery, marketing and publications.'],['Large-format printing','Indoor and outdoor banners, backdrops, wall graphics and displays.'],['Sign fabrication','3D letters, illuminated signs, acrylic and custom structures.'],['Branding & installation','Storefront, office, vehicle and event branding delivered as one project.'],['Finishing & delivery','Cutting, binding, mounting, quality inspection and order handover.']] },
    portfolio: { eyebrow: 'Production gallery', title: 'Work designed to be seen in the real world', intro: 'Explore the types of storefronts, events, publications, packaging and promotional products our production workflow is built to deliver.', cards: [['Storefront project','Add client, materials and completion photography.'],['Event branding','Add backdrop, signage and venue photography.'],['Books & publications','Add cover, binding and finished publication photography.'],['Packaging project','Add dieline, material and finished product photography.'],['Vehicle branding','Add before, installation and completed wrap photography.'],['Corporate print','Add coordinated stationery and promotional photography.']] },
    about: { eyebrow: 'About SignPal', title: 'A printing company built for the way customers work today', intro: 'We are building a local design and production company where customers can move from an idea to an approved, paid and trackable print order in one place.', cards: [['Our story','Add the founding date, founder story and reason SignPal was established.'],['Our mission','Make professional design and dependable print production easier to access.'],['Our factory','Located in Hargeisa, Somaliland. Add equipment, capacity and photographs.'],['Our team','Add leadership, machine operators and installation specialists.'],['Quality promise','Add approved material, proofing, inspection and reprint policies.'],['Service area','Add cities, delivery coverage and collection points.']] },
    contact: { eyebrow: 'Talk to SignPal', title: 'Tell us what you need to make visible', intro: 'For custom fabrication, installation, high-volume orders or anything you cannot find in the catalog, speak directly with our production team.', sectionEyebrow: 'Custom and corporate work', sectionTitle: 'Start with a conversation', instructions: 'Send the product, approximate size, quantity, deadline and installation location. The team can prepare the right specification before pricing.' }
  }
};

module.exports = { DEFAULT_SITE_CONTENT };
