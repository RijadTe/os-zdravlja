// frontend/src/config/adsense.js

// 🔥 ZAMIJENI SA SVOJIM PUB KODOM
export const ADSENSE_CLIENT = 'ca-pub-1234567890123456';

// 🔥 ZAMIJENI SA SVOJIM SLOT ID-evima
export const DEFAULT_SLOTS = {
  banner: '9876543210',             // Vaš banner slot ID
  sidebar: '9876543211',           // Vaš sidebar slot ID
  video: '9876543212',            // Vaš video slot ID
  inFeed: '9876543213'           // Vaš in-feed slot ID
};

// 🔥 AUTO-MAGIJA - uključi samo na produkciji
export const ADSENSE_ENABLED = process.env.NODE_ENV === 'production';