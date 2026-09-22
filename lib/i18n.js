/**
 * Regional Localization Dictionary: English & Af-Soomaali.
 * Designed for print storefront, order tracking, and mobile money interactions.
 */

const DICTIONARY = {
  en: {
    langName: 'English',
    orderTracking: 'Order Tracking & Production Status',
    orderNumber: 'Order',
    status: {
      pending: 'Preflight & Order Review',
      rip_queue: 'RIP & Plate Burning Queue',
      in_progress: 'Active Pressroom Production',
      finishing: 'Finishing, Cutting & Quality Control',
      out_for_delivery: 'Dispatched / Out for Delivery',
      completed: 'Completed & Handed Over',
      rejected: 'Cancelled / Specification Flagged'
    },
    payment: {
      paid: 'Payment Verified',
      unpaid: 'Awaiting Payment',
      processing: 'Processing Mobile Money...'
    },
    stepSubtitles: {
      pending: 'Artwork preflight checks & substrate allocation.',
      rip_queue: 'Calibrating Fogra39 CMYK & RIP rasterization.',
      in_progress: 'Direct high-pigment press running.',
      finishing: 'Lamination, eyeleting, and guillotine precision trimming.',
      out_for_delivery: 'Courier dispatched to delivery address or pickup hub.',
      completed: 'Order completed and handed over.'
    },
    actions: {
      payNow: 'Pay with Mobile Money (ZAAD / e-Dahab / EVC)',
      downloadAsset: 'Download High-Resolution Asset',
      jobTicket: 'View Industrial Prepress Ticket',
      shareWhatsApp: 'Share on WhatsApp',
      liveSync: 'Live Auto-Sync Active'
    }
  },
  so: {
    langName: 'Af-Soomaali',
    orderTracking: 'La-socodka Dalabka & Xaaladda Warshadda',
    orderNumber: 'Dalabka Lambar',
    status: {
      pending: '1. Hubinta Kahor Daabacaadda',
      rip_queue: '2. Safka Furfurka Daabacaadda (RIP)',
      in_progress: '3. Daabacaadda & Farsamada Warshadda',
      finishing: '4. Goynta, Dhameystirka & Tayada',
      out_for_delivery: '5. Loo Soo Diray Macmiilka',
      completed: '6. Waa La Dhamaystiray & La Gaadhsiiyay',
      rejected: 'Waa La Joojiyay'
    },
    payment: {
      paid: 'Lacagta Waa La Xaqiijiyay',
      unpaid: 'Lacag-bixintu Way Qabyo Tahay',
      processing: 'Waxa Socota Xaqiijinta Lacagta...'
    },
    stepSubtitles: {
      pending: 'Hubinta cabirka, darafyada dhiiga (bleed) iyo warqadda.',
      rip_queue: 'Diyaarinta midabada CMYK iyo mashiinka daabacaadda.',
      in_progress: 'Mashiinka daabacaadda ayaa hadda ku shaqaynaya.',
      finishing: 'Goynta tooska ah, dahaadhka (lamination) iyo biraha (eyelets).',
      out_for_delivery: 'Gaadiidka keenista ayaa kuu wada dalabkaaga.',
      completed: 'Dalabku wuu diyaar yahay waana la wareejiyay.'
    },
    actions: {
      payNow: 'Ku Bixi Zaad / e-Dahab / EVC Plus',
      downloadAsset: 'Soo Dejiso Faylka Tayada Sare Leh',
      jobTicket: 'Eeg Warqadda Farsamada Warshadda',
      shareWhatsApp: 'Ku Wadaag WhatsApp-ka',
      liveSync: 'Xogta Tooska ah Way Shaqaynaysaa'
    }
  }
};

function getTranslation(lang = 'en') {
  return DICTIONARY[lang] || DICTIONARY.en;
}

module.exports = {
  DICTIONARY,
  getTranslation
};
