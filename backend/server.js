// backend/server.js
require('dotenv').config();

// ============================================================
// 🔥 ENV VALIDACIJA - OBAVEZNO!
// ============================================================
console.log('\n🔍 === PROVJERA ENV VARIJABLI ===\n');

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY'
];

const missingRequired = requiredEnv.filter(key => !process.env[key]);

if (missingRequired.length > 0) {
  console.error('\n❌❌❌ FATALNA GREŠKA ❌❌❌');
  console.error(`Fale obavezne ENV varijable:\n  - ${missingRequired.join('\n  - ')}`);
  console.error('\n🚫 Server se NE MOŽE pokrenuti!');
  console.error('📝 Postavite sve obavezne varijable u .env fajl.\n');
  process.exit(1);
}

console.log('✅ Sve obavezne ENV varijable su postavljene!');
console.log('=================================\n');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const webpush = require('web-push');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;
const speakeasy = require('speakeasy');
const geoip = require('geoip-lite');

const app = express();

// ============================================================
// PROVJERA ENV VARIJABLI (detaljna)
// ============================================================
console.log('🔍 Provjera .env:');
console.log('PORT:', process.env.PORT || '5000');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅' : '❌');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅' : '❌');
console.log('VAPID_PUBLIC_KEY:', process.env.VAPID_PUBLIC_KEY ? '✅' : '❌');
console.log('VAPID_PRIVATE_KEY:', process.env.VAPID_PRIVATE_KEY ? '✅' : '❌');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌');
console.log('=================================\n');

// ============================================================
// KONFIGURACIJA
// ============================================================
const PORT = process.env.PORT || 5000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Fale Supabase kredencijali!');
  process.exit(1);
}

// ============================================================
// CLOUDINARY KONFIGURACIJA
// ============================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log('✅ Cloudinary povezan!');

// ============================================================
// 🔥 MIDDLEWARE - HELMET
// ============================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: [
        "'self'",
        "https://api.openai.com",
        "https://*.supabase.co",
        "https://os-zdravlja.vercel.app",
        "https://os-zdravlja-backend.onrender.com"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

console.log('✅ Helmet sigurnosni headeri aktivirani');

// ============================================================
// 🔥 MIDDLEWARE - CORS (DINAMIČKI)
// ============================================================
const allowedOrigins = [
  'https://os-zdravlja.vercel.app',
  'https://os-zdravlja-backend.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3001'
];

if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blokiran: ${origin}`);
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Content-Language', 'X-Source', 'X-Cache-Hit'],
  maxAge: 86400
}));

console.log('✅ CORS konfiguriran sa dinamičkom provjerom');

// ============================================================
// 🔥 RATE LIMIT - PRILAGOĐEN TVOJIM POTREBAMA
// ============================================================
console.log('🛡️ POSTAVLJAM RATE LIMIT...');

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    error: '⏳ Previše zahtjeva. Pokušajte za minutu.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: '⏳ Previše pokušaja prijave. Pokušajte za 15 minuta.'
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    error: '⏳ Previše AI pretraga. Pokušajte za minutu.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const heavyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    error: '⏳ Previše zahtjeva za ovaj endpoint. Pokušajte za minutu.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

console.log('✅ Rate Limit postavljen:');
console.log('   - API: 1000 zahtjeva/min');
console.log('   - Auth: 10 pokušaja/15min');
console.log('   - AI: 50 pretraga/min (CACHE 90 dana)');
console.log('   - Teški endpointi: 500 zahtjeva/min');

// ============================================================
// 🔥 IP BAN LISTA
// ============================================================
const bannedIPs = new Set();

app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  if (bannedIPs.has(ip)) {
    console.warn(`🚫 Blokiran banovani IP: ${ip}`);
    return res.status(403).json({ error: 'Pristup odbijen.' });
  }
  next();
});

console.log('✅ IP ban lista aktivirana');

// Admin endpoint za ban
app.post('/api/admin/ban-ip', (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP je obavezan' });
  bannedIPs.add(ip);
  console.log(`🚫 IP banovan: ${ip}`);
  res.json({ success: true, message: `IP ${ip} je banovan` });
});

// ============================================================
// OSTALI MIDDLEWARES
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/ai-chef', aiLimiter);
app.use('/api/recepti', heavyLimiter);
app.use('/api/profil', heavyLimiter);
app.use('/api/community', heavyLimiter);
app.use('/api/healthy-chef', heavyLimiter);

// ============================================================
// VAPID KONFIGURACIJA ZA PUSH NOTIFIKACIJE
// ============================================================
webpush.setVapidDetails(
  'mailto:info@os-zdravlja.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ============================================================
// MULTER KONFIGURACIJA ZA SLIKE
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('❌ Dozvoljeni su samo JPEG, PNG, JPG, WEBP i GIF formati.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase povezan!');

// ============================================================
// OPENAI CLIENT
// ============================================================
let openai = null;
if (process.env.OPENAI_API_KEY) {
  try {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI povezan!');
  } catch (error) {
    console.warn('⚠️ OpenAI nije dostupan:', error.message);
  }
} else {
  console.warn('⚠️ OPENAI_API_KEY nije postavljen, AI Sommelier će koristiti fallback.');
}

// ============================================================
// CLOUDINARY FUNKCIJE
// ============================================================
async function uploadToCloudinary(filePath, folder = 'os-zdravlja') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      use_filename: true,
      unique_filename: true,
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' }
      ]
    });
    console.log('✅ Slika uploadana na Cloudinary:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('❌ Cloudinary greška:', error);
    return null;
  }
}

async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('✅ Slika izbrisana sa Cloudinary:', publicId);
    return result;
  } catch (error) {
    console.error('❌ Greška pri brisanju sa Cloudinary:', error);
    return null;
  }
}

// ============================================================
// 🔧 POMOĆNA FUNKCIJA ZA PREVOD TEKSTA
// ============================================================
async function translateRecipeText(recipe, targetLang) {
  const langMap = {
    'en': 'engleski',
    'de': 'njemački'
  };
  const langName = langMap[targetLang] || targetLang;

  if (!openai) {
    return {
      naziv: recipe.naziv,
      opis: recipe.opis || '',
      sastojci: recipe.sastojci || [],
      upute: recipe.upute || [],
      nacin_pripreme: recipe.nacin_pripreme || ''
    };
  }

  const prompt = `
    Prevedi sljedeći recept na ${langName} jezik.
    
    Naziv: ${recipe.naziv}
    Opis: ${recipe.opis || ''}
    Sastojci: ${recipe.sastojci?.join(', ') || ''}
    Upute: ${recipe.upute?.join('. ') || ''}
    Način pripreme: ${recipe.nacin_pripreme || ''}
    
    Odgovori isključivo u JSON formatu:
    {
      "naziv": "...",
      "opis": "...",
      "sastojci": ["...", "..."],
      "upute": ["...", "..."],
      "nacin_pripreme": "..."
    }
    
    Prevedi prirodno i sačuvaj kontekst kulinarskih termina.
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

// ============================================================
// AI CHEF HELPER FUNKCIJE
// ============================================================
function generateHash(input, type = 'tekst') {
  if (type === 'tekst') {
    return crypto.createHash('md5').update(input.toLowerCase().trim()).digest('hex');
  }
  return crypto.createHash('md5').update(input).digest('hex');
}

async function checkCache(inputHash) {
  const { data, error } = await supabase
    .from('ai_chef_cache')
    .select('*')
    .eq('input_hash', inputHash)
    .gte('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.error('❌ Greška pri provjeri keša:', error);
    return null;
  }
  return data;
}

async function saveToCache(inputHash, inputType, results) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const { data, error } = await supabase
    .from('ai_chef_cache')
    .insert([{
      input_hash: inputHash,
      input_type: inputType,
      results: results,
      expires_at: expiresAt.toISOString()
    }])
    .select()
    .maybeSingle();

  if (error) {
    console.error('❌ Greška pri spremanju u keš:', error);
    return null;
  }
  return data;
}

async function analyzeImage(imagePath) {
  try {
    console.log('🔍 Analiziram sliku...');
    let tekst = '';
    let sastojci = [];
    
    try {
      const Tesseract = require('tesseract.js');
      const result = await Tesseract.recognize(imagePath, 'hrv+eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📊 OCR progres: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      tekst = result.data.text;
      console.log('📝 Prepoznat tekst:', tekst.substring(0, 200) + '...');
    } catch (ocrError) {
      console.warn('⚠️ OCR nije dostupan, koristim naziv fajla:', ocrError.message);
      tekst = path.basename(imagePath, path.extname(imagePath));
    }

    sastojci = tekst
      .split(/[\n,;.]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 50)
      .filter(s => !s.match(/^\d+$/))
      .filter(s => !s.match(/^[^a-zA-Z]+$/));

    if (sastojci.length === 0 && tekst.trim()) {
      sastojci = [tekst.trim()];
    }

    console.log('📦 Izvučeni sastojci:', sastojci);
    
    return {
      tekst: tekst,
      sastojci: sastojci.length > 0 ? sastojci : [path.basename(imagePath, path.extname(imagePath))]
    };
  } catch (error) {
    console.error('❌ Greška pri analizi slike:', error);
    return {
      tekst: path.basename(imagePath, path.extname(imagePath)),
      sastojci: [path.basename(imagePath, path.extname(imagePath))]
    };
  }
}

// ============================================================
// AI SOMELIJER CACHE FUNKCIJE
// ============================================================
async function checkSommelierCache(receptId) {
  try {
    const { data, error } = await supabase
      .from('ai_sommelier_cache')
      .select('zacini, pice, prilog, vrijeme_jela, created_at')
      .eq('recept_id', receptId)
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('❌ Greška pri provjeri Sommelier keša:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('❌ Greška pri provjeri Sommelier keša:', error);
    return null;
  }
}

async function saveSommelierCache(receptId, data) {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase
      .from('ai_sommelier_cache')
      .insert([{
        recept_id: receptId,
        zacini: data.zacini,
        pice: data.pice,
        prilog: data.prilog,
        vrijeme_jela: data.vrijeme_jela,
        expires_at: expiresAt.toISOString()
      }]);

    if (error) {
      console.error('❌ Greška pri spremanju u Sommelier keš:', error);
    } else {
      console.log('✅ Sačuvano u Sommelier keš za recept:', receptId);
    }
  } catch (error) {
    console.error('❌ Greška pri spremanju u Sommelier keš:', error);
  }
}

// ============================================================
// NOTIFIKACIJE - POMOĆNE FUNKCIJE
// ============================================================
async function sendPushNotification(email, title, body, link = '/') {
  try {
    const { data: subscriptionData, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('korisnik_email', email)
      .maybeSingle();

    if (error || !subscriptionData) {
      console.log('ℹ️ Korisnik nema push subscription:', email);
      return;
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: link }
    });

    await webpush.sendNotification(
      subscriptionData.subscription,
      payload
    );

    console.log('✅ Push notifikacija poslana za:', email);
  } catch (error) {
    console.error('❌ Greška pri slanju push notifikacije:', error);
  }
}

async function createNotification(email, tip, poruka, link = '/') {
  try {
    const { data: profil, error: profilError } = await supabase
      .from('profili')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (profilError || !profil) {
      console.error('❌ Korisnik nije pronađen:', email);
      return null;
    }

    const { data, error } = await supabase
      .from('notifikacije')
      .insert([{
        korisnik_id: profil.id,
        korisnik_email: email,
        tip: tip,
        poruka: poruka,
        link: link,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Greška pri kreiranju notifikacije:', error);
      return null;
    }

    console.log('✅ Notifikacija kreirana za:', email);
    await sendPushNotification(email, 'OS Zdravlja', poruka, link);
    
    return data?.[0] || null;
  } catch (error) {
    console.error('❌ Greška:', error);
    return null;
  }
}

// ============================================================
// 🔥 FALLBACK PLAN GENERATOR
// ============================================================
function generateFallbackPlan(kalorije, proteini, ugljikohidrati, masti, restrikcije) {
  const hasRestriction = (food) => {
    if (!restrikcije || restrikcije.length === 0) return false;
    return restrikcije.some(r => 
      food.toLowerCase().includes(r.toLowerCase()) || 
      r.toLowerCase().includes(food.toLowerCase())
    );
  };

  const getSafeAlternative = (food, restrikcije) => {
    if (!restrikcije || restrikcije.length === 0) return food;
    
    const alternatives = {
      'Pileća prsa': 'Pileći file',
      'Losos': 'Riba (bez alergena)',
      'Tofu': 'Soja (bez glutena)',
      'Jaja': 'Tofu jaja',
      'Mlijeko': 'Sojino mlijeko',
      'Sir': 'Veganski sir',
      'Pizza': 'Pizza bez glutena',
      'Palačinke': 'Palačinke od heljde',
      'Kajgana': 'Kajgana od tofua',
      'Hljeb': 'Hljeb bez glutena',
      'Tjestenina': 'Tjestenina bez glutena',
      'Krompir': 'Batat',
      'Riža': 'Kvinoja',
      'Zobene pahuljice': 'Heljdine pahuljice',
      'Ovsena kaša': 'Heljdina kaša'
    };
    
    const lowerFood = food.toLowerCase();
    for (const [key, value] of Object.entries(alternatives)) {
      if (lowerFood.includes(key.toLowerCase())) {
        if (!hasRestriction(value)) {
          return value;
        }
      }
    }
    
    return food;
  };
  
  const planovi = {
    low: {
      dani: [
        { naziv: 'Pon', dorucak: 'Zobene pahuljice sa voćem', rucak: 'Pileća salata', vecera: 'Losos sa povrćem' },
        { naziv: 'Uto', dorucak: 'Jaja na oko', rucak: 'Tuna salata', vecera: 'Tofu sa rižom' },
        { naziv: 'Sri', dorucak: 'Smoothie bowl', rucak: 'Riba na žaru', vecera: 'Krompir sa povrćem' },
        { naziv: 'Čet', dorucak: 'Palenta sa sirom', rucak: 'Piletina sa rižom', vecera: 'Povrće na žaru' },
        { naziv: 'Pet', dorucak: 'Musli sa jogurtom', rucak: 'Burger sa salatom', vecera: 'Pizza sa povrćem' },
        { naziv: 'Sub', dorucak: 'Palačinke', rucak: 'Ćevapi sa lukom', vecera: 'Riba sa blitvom' },
        { naziv: 'Ned', dorucak: 'Kajgana sa šunkom', rucak: 'Pečenje sa krompirom', vecera: 'Salata sa piletinom' },
      ]
    },
    medium: {
      dani: [
        { naziv: 'Pon', dorucak: 'Ovsena kaša sa medom', rucak: 'Pileća prsa sa povrćem', vecera: 'Losos sa krompirom' },
        { naziv: 'Uto', dorucak: 'Jaja sa avokadom', rucak: 'Salata sa tunjevinom', vecera: 'Tofu sa povrćem' },
        { naziv: 'Sri', dorucak: 'Smoothie bowl', rucak: 'Riba na žaru', vecera: 'Krompir sa povrćem' },
        { naziv: 'Čet', dorucak: 'Palenta sa sirom', rucak: 'Piletina sa rižom', vecera: 'Povrće na žaru' },
        { naziv: 'Pet', dorucak: 'Musli sa jogurtom', rucak: 'Burger sa salatom', vecera: 'Pizza sa povrćem' },
        { naziv: 'Sub', dorucak: 'Palačinke', rucak: 'Ćevapi sa lukom', vecera: 'Riba sa blitvom' },
        { naziv: 'Ned', dorucak: 'Kajgana sa šunkom', rucak: 'Pečenje sa krompirom', vecera: 'Salata sa piletinom' },
      ]
    },
    high: {
      dani: [
        { naziv: 'Pon', dorucak: 'Proteinski omlet', rucak: 'Pileća prsa sa rižom', vecera: 'Govedina sa povrćem' },
        { naziv: 'Uto', dorucak: 'Jaja sa sirom', rucak: 'Tuna sa tjesteninom', vecera: 'Losos sa krompirom' },
        { naziv: 'Sri', dorucak: 'Zobene pahuljice sa proteinom', rucak: 'Riba na žaru', vecera: 'Piletina sa povrćem' },
        { naziv: 'Čet', dorucak: 'Palenta sa jajima', rucak: 'Govedina sa rižom', vecera: 'Tofu sa povrćem' },
        { naziv: 'Pet', dorucak: 'Musli sa voćem', rucak: 'Burger sa sirom', vecera: 'Pizza sa piletinom' },
        { naziv: 'Sub', dorucak: 'Palačinke sa proteinom', rucak: 'Ćevapi sa povrćem', vecera: 'Riba sa blitvom' },
        { naziv: 'Ned', dorucak: 'Kajgana sa sirom', rucak: 'Pečenje sa povrćem', vecera: 'Salata sa piletinom' },
      ]
    }
  };
  
  let selectedPlan;
  if (kalorije < 1800) {
    selectedPlan = planovi.low;
  } else if (kalorije < 2500) {
    selectedPlan = planovi.medium;
  } else {
    selectedPlan = planovi.high;
  }
  
  if (restrikcije && restrikcije.length > 0) {
    selectedPlan.dani = selectedPlan.dani.map(dan => {
      const newDan = { ...dan };
      
      ['dorucak', 'rucak', 'vecera'].forEach(obrok => {
        if (hasRestriction(newDan[obrok])) {
          newDan[obrok] = getSafeAlternative(newDan[obrok], restrikcije);
        }
        
        if (newDan[obrok] && hasRestriction(newDan[obrok])) {
          const genericNames = {
            'dorucak': 'Zdrav doručak (bez alergena)',
            'rucak': 'Zdrav ručak (bez alergena)',
            'vecera': 'Zdrava večera (bez alergena)'
          };
          newDan[obrok] = genericNames[obrok] || 'Zdrav obrok (bez alergena)';
        }
      });
      
      return newDan;
    });
    
    console.log('🔒 Restrikcije primijenjene na fallback plan');
  }
  
  return selectedPlan;
}

// ============================================================
// 1. TEST ENDPOINT
// ============================================================
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: '✅ Server radi!',
    timestamp: new Date().toISOString()
  });
});

// ============================================================
// 2. GEOIP - DOHVATI LOKACIJU
// ============================================================
app.get('/api/geoip', (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
      return res.json({
        country: 'Localhost',
        city: 'Development',
        ip: ip
      });
    }

    const geo = geoip.lookup(ip);
    
    if (geo) {
      res.json({
        country: geo.country,
        city: geo.city,
        region: geo.region,
        timezone: geo.timezone,
        ip: ip
      });
    } else {
      res.json({ 
        country: 'Nepoznato', 
        ip: ip,
        message: 'Lokacija nije pronađena'
      });
    }
  } catch (error) {
    console.error('❌ Greška pri dohvatu lokacije:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 3. 2FA - GENERIŠI SECRET
// ============================================================
app.post('/api/auth/2fa/generate', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email je obavezan.' });
    }

    const secret = speakeasy.generateSecret({
      name: `OS Zdravlja (${email})`,
      length: 20
    });

    await supabase
      .from('profili')
      .update({ 
        twofa_secret: secret.base32,
        twofa_enabled: false
      })
      .eq('email', email);

    const QRCode = require('qrcode');
    const otpauthUrl = secret.otpauth_url;
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCode,
      message: '📱 Skenirajte QR kod sa Google Authenticator ili Authy.'
    });
  } catch (error) {
    console.error('❌ Greška pri generisanju 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 4. 2FA - VERIFIKUJ KOD
// ============================================================
app.post('/api/auth/2fa/verify', async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email i token su obavezni.' });
    }

    const { data: user, error } = await supabase
      .from('profili')
      .select('twofa_secret')
      .eq('email', email)
      .maybeSingle();

    if (error || !user || !user.twofa_secret) {
      return res.status(400).json({ error: '2FA nije podešen za ovog korisnika.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      await supabase
        .from('profili')
        .update({ twofa_enabled: true })
        .eq('email', email);

      res.json({ 
        success: true, 
        message: '✅ 2FA uspješno aktiviran!' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: '❌ Pogrešan 2FA kod. Pokušajte ponovo.' 
      });
    }
  } catch (error) {
    console.error('❌ Greška pri verifikaciji 2FA:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🔥 REGISTRACIJA
// ============================================================
app.post('/api/auth/register',
  body('email').isEmail().withMessage('Neispravan email format'),
  body('ime').isLength({ min: 2, max: 50 }).withMessage('Ime mora imati 2-50 karaktera'),
  body('lozinka').isLength({ min: 6 }).withMessage('Lozinka mora imati najmanje 6 karaktera'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }
    next();
  },
  async (req, res) => {
    console.log('\n📝 === REGISTRACIJA ===');
    console.log('📦 Podaci:', req.body);
    
    try {
      const { email, ime, lozinka } = req.body;

      console.log('🔍 Provjeravam email:', email);
      const { data: existingUser, error: checkError } = await supabase
        .from('profili')
        .select('email, id')
        .eq('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Greška pri provjeri:', checkError);
      }

      if (existingUser) {
        console.log('⚠️ Email već postoji u bazi:', email);
        return res.status(400).json({ error: '❌ Korisnik sa ovim emailom već postoji. Molimo prijavite se.' });
      }

      console.log('✅ Email slobodan:', email);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: lozinka,
        options: {
          data: { ime: ime }
        }
      });

      if (authError) {
        console.error('❌ Auth greška:', authError);
        if (authError.message.includes('already registered')) {
          return res.status(400).json({ error: '❌ Korisnik sa ovim emailom već postoji. Molimo prijavite se.' });
        }
        return res.status(400).json({ error: authError.message });
      }

      console.log('✅ Auth korisnik kreiran:', authData.user?.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profili')
        .insert([{
          id: authData.user?.id,
          email: email,
          ime: ime,
          premium: false,
          kviz_zavrsen: false,
          vrsta: [],
          izbjegava: [],
          preferencije: [],
          ai_chef_pretrage: 0,
          ai_chef_datum: null,
          twofa_secret: null,
          twofa_enabled: false,
          created_at: new Date().toISOString()
        }])
        .select();

      if (profileError) {
        console.error('❌ Greška pri kreiranju profila:', profileError);
        if (profileError.code === '23505') {
          console.log('ℹ️ Profil već postoji, nastavljam...');
          return res.status(201).json({
            success: true,
            message: '✅ Registracija uspješna! Profil već postoji.',
            user: { id: authData.user?.id, email: email, ime: ime },
            session: authData.session
          });
        }
        return res.status(500).json({ error: '❌ Greška pri kreiranju profila: ' + profileError.message });
      }

      console.log('✅ Profil kreiran:', profileData);

      await createNotification(
        email,
        'motivacija',
        `👋 Dobrodošli ${ime}! Otkrijte savršene recepte prilagođene vašim potrebama. Započnite kviz da personalizujemo vaše iskustvo!`,
        '/quiz'
      );

      res.status(201).json({
        success: true,
        message: '✅ Registracija uspješna!',
        user: { id: authData.user?.id, email: email, ime: ime },
        session: authData.session
      });

    } catch (error) {
      console.error('❌ Server greška:', error);
      res.status(500).json({ error: '❌ Greška na serveru: ' + error.message });
    }
  }
);

// ============================================================
// 🔥 PRIJAVA
// ============================================================
app.post('/api/auth/login',
  body('email').isEmail().withMessage('Neispravan email format'),
  body('lozinka').notEmpty().withMessage('Lozinka je obavezna'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(e => e.msg)
      });
    }
    next();
  },
  async (req, res) => {
    console.log('\n🔐 === PRIJAVA ===');
    console.log('📦 Podaci:', req.body);
    
    try {
      const { email, lozinka } = req.body;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: lozinka
      });

      if (error) {
        console.error('❌ Auth greška:', error);
        if (error.message.includes('Invalid login credentials')) {
          return res.status(401).json({ error: '❌ Pogrešan email ili lozinka.' });
        }
        return res.status(400).json({ error: error.message });
      }

      console.log('✅ Prijava uspješna:', data.user?.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profili')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        console.warn('⚠️ Greška pri dohvatu profila:', profileError);
      }

      if (!profileData) {
        console.log('🆕 Profil ne postoji, kreiram...');
        const { data: newProfile, error: insertError } = await supabase
          .from('profili')
          .insert([{
            id: data.user?.id,
            email: email,
            ime: data.user?.user_metadata?.ime || '',
            premium: false,
            kviz_zavrsen: false,
            vrsta: [],
            izbjegava: [],
            preferencije: [],
            ai_chef_pretrage: 0,
            ai_chef_datum: null,
            twofa_secret: null,
            twofa_enabled: false,
            created_at: new Date().toISOString()
          }])
          .select();

        if (insertError) {
          console.warn('⚠️ Greška pri kreiranju profila:', insertError);
        }

        return res.json({
          success: true,
          message: '✅ Prijava uspješna!',
          user: {
            id: data.user?.id,
            email: email,
            ime: data.user?.user_metadata?.ime || '',
            profile: newProfile?.[0] || null
          },
          session: data.session
        });
      }

      res.json({
        success: true,
        message: '✅ Prijava uspješna!',
        user: {
          id: data.user?.id,
          email: email,
          ime: data.user?.user_metadata?.ime || profileData.ime || '',
          profile: profileData
        },
        session: data.session
      });

    } catch (error) {
      console.error('❌ Server greška:', error);
      res.status(500).json({ error: '❌ Greška na serveru: ' + error.message });
    }
  }
);

// ============================================================
// 7. DOHVATI TRENUTNOG KORISNIKA
// ============================================================
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Niste prijavljeni.' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Nevažeći token.' });
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profili')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        ime: user.user_metadata?.ime || '',
        profile: profileData
      }
    });

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// ============================================================
// 8. ODJAVA (LOGOUT)
// ============================================================
app.post('/api/auth/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: '✅ Odjava uspješna.' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: 'Greška na serveru.' });
  }
});

// ============================================================
// 9. QUIZ
// ============================================================
app.post('/api/quiz', async (req, res) => {
  console.log('\n📥 === QUIZ ENDPOINT ===');
  console.log('📦 Primljeni podaci:', JSON.stringify(req.body, null, 2));
  
  try {
    const { email, ime, vrsta, restrikcije, preferencije, vrijeme, tezina, kalorije } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email je obavezan' });
    }

    console.log(`🔍 Provjeravam korisnika: ${email}`);
    const { data: existingUser, error: checkError } = await supabase
      .from('profili')
      .select('email, id')
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Greška pri provjeri:', checkError);
      return res.status(500).json({ 
        success: false, 
        error: 'Greška pri provjeri korisnika',
        details: checkError.message 
      });
    }

    let result;
    let error;

    if (existingUser) {
      console.log(`📝 Ažuriranje profila za: ${email}`);
      const { data, error: updateError } = await supabase
        .from('profili')
        .update({
          ime: ime || existingUser.ime,
          vrsta: vrsta || [],
          izbjegava: restrikcije || [],
          preferencije: preferencije || [],
          vrijeme: vrijeme || '',
          tezina: tezina || '',
          kalorije: kalorije || '',
          kviz_zavrsen: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      error = updateError;
      result = data;
    } else {
      console.log(`🆕 Kreiranje novog profila za: ${email}`);
      const { data, error: insertError } = await supabase
        .from('profili')
        .insert([{
          email,
          ime: ime || 'Korisnik',
          vrsta: vrsta || [],
          izbjegava: restrikcije || [],
          preferencije: preferencije || [],
          vrijeme: vrijeme || '',
          tezina: tezina || '',
          kalorije: kalorije || '',
          kviz_zavrsen: true,
          premium: false,
          ai_chef_pretrage: 0,
          ai_chef_datum: null,
          twofa_secret: null,
          twofa_enabled: false,
          created_at: new Date().toISOString()
        }])
        .select();

      error = insertError;
      result = data;
    }

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Greška pri upisu u bazu',
        code: error.code,
        details: error.message
      });
    }

    console.log('✅ Kviz uspješno sačuvan!');
    
    const { data: updatedProfile } = await supabase
      .from('profili')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    res.json({ 
      success: true, 
      message: 'Kviz uspješno sačuvan!',
      data: updatedProfile || (result ? result[0] : null)
    });

  } catch (error) {
    console.error('❌ Server greška:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server greška: ' + error.message 
    });
  }
});

// ============================================================
// 10. 🔥 DOHVATI RECEPTE SA FILTERIMA + PAGINACIJA + PREVODI!
// ============================================================
app.get('/api/recepti', async (req, res) => {
  try {
    const { 
      email, 
      vrsta, 
      restrikcije, 
      preferencije, 
      vrijeme, 
      tezina, 
      kalorije,
      page = 1,
      limit = 20,
      search,
      jezik = 'hr'
    } = req.query;
    
    console.log('📊 Dohvatam recepte sa paginacijom:');
    console.log('   Page:', page);
    console.log('   Limit:', limit);
    console.log('   Search:', search);
    console.log('   Email:', email);
    console.log('   Jezik:', jezik);
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let userRestrictions = [];
    let userPreferences = [];
    let userVrsta = [];
    let userVrijeme = '';
    let userTezina = '';
    let userKalorije = '';
    
    if (email) {
      const { data: profil, error: profilError } = await supabase
        .from('profili')
        .select('izbjegava, preferencije, vrsta, vrijeme, tezina, kalorije')
        .eq('email', email)
        .maybeSingle();
      
      if (!profilError && profil) {
        userRestrictions = profil.izbjegava || [];
        userPreferences = profil.preferencije || [];
        userVrsta = profil.vrsta || [];
        userVrijeme = profil.vrijeme || '';
        userTezina = profil.tezina || '';
        userKalorije = profil.kalorije || '';
        console.log('🔒 Korisničke restrikcije iz profila:', userRestrictions);
      }
    }
    
    let restrikcijeArray = [];
    if (restrikcije) {
      restrikcijeArray = Array.isArray(restrikcije) 
        ? restrikcije 
        : restrikcije.split(',').filter(r => r.trim() !== '');
      console.log('🔒 Query restrikcije:', restrikcijeArray);
    } else if (userRestrictions.length > 0) {
      restrikcijeArray = userRestrictions;
    }
    
    let query = supabase
      .from('recepti')
      .select(`
        *,
        prevod:recepti_prevodi!recept_id(
          naziv,
          opis,
          sastojci,
          upute,
          nacin_pripreme
        )
      `, { count: 'exact' });

    if (jezik !== 'hr') {
      query = query.eq('prevod.jezik', jezik);
    }

    let vrstaFilter = vrsta ? vrsta.split(',') : [];
    if (vrstaFilter.length === 0 && userVrsta.length > 0) {
      vrstaFilter = userVrsta.filter(v => v !== 'Svejedno');
    }
    if (vrstaFilter.length > 0) {
      query = query.in('vrsta', vrstaFilter);
      console.log('✅ Filtriram po vrsti:', vrstaFilter);
    }

    let vrijemeFilter = vrijeme || userVrijeme;
    if (vrijemeFilter) {
      query = query.eq('vrijeme', vrijemeFilter);
      console.log('✅ Filtriram po vremenu:', vrijemeFilter);
    }

    let tezinaFilter = tezina || userTezina;
    if (tezinaFilter) {
      query = query.eq('tezina', tezinaFilter);
      console.log('✅ Filtriram po težini:', tezinaFilter);
    }

    let kalorijeFilter = kalorije || userKalorije;
    if (kalorijeFilter) {
      if (kalorijeFilter.includes('do 300')) {
        query = query.lte('kalorije', 300);
      } else if (kalorijeFilter.includes('300-500')) {
        query = query.gte('kalorije', 300).lte('kalorije', 500);
      } else if (kalorijeFilter.includes('500-700')) {
        query = query.gte('kalorije', 500).lte('kalorije', 700);
      } else if (kalorijeFilter.includes('900+')) {
        query = query.gte('kalorije', 900);
      }
      console.log('✅ Filtriram po kalorijama:', kalorijeFilter);
    }

    if (restrikcijeArray.length > 0) {
      const hasNoRestrictions = restrikcijeArray.some(r => 
        r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
        const alergeniRestrikcije = [];
        const dijetneRestrikcije = [];
        
        restrikcijeArray.forEach(r => {
          const rLower = r.toLowerCase();
          const jeAlergen = alergeniList.some(a => rLower.includes(a));
          if (jeAlergen) {
            alergeniRestrikcije.push(r);
          } else {
            dijetneRestrikcije.push(r);
          }
        });
        
        if (alergeniRestrikcije.length > 0) {
          query = query.not('alergeni', '&&', alergeniRestrikcije);
          console.log('✅ Filtriram po alergenima (izbacujem):', alergeniRestrikcije);
        }
        
        if (dijetneRestrikcije.length > 0) {
          query = query.overlaps('dijetne_oznake', dijetneRestrikcije);
          console.log('✅ Filtriram po dijetnim oznakama:', dijetneRestrikcije);
        }
      } else {
        console.log('✅ Korisnik nema restrikcija - prikazujem sve');
      }
    }

    let preferencijeFilter = preferencije ? preferencije.split(',') : [];
    if (preferencijeFilter.length === 0 && userPreferences.length > 0) {
      preferencijeFilter = userPreferences.filter(p => p !== 'Svejedno');
    }
    if (preferencijeFilter.length > 0) {
      if (preferencijeFilter.includes('Visokoproteinski')) {
        query = query.gte('proteini', 20);
        console.log('✅ Filtriram po visokoproteinima: >= 20g');
      }
      if (preferencijeFilter.includes('Bogat vlaknima')) {
        query = query.gte('vlakna', 5);
        console.log('✅ Filtriram po vlaknima: >= 5g');
      }
      if (preferencijeFilter.includes('Bogat ugljikohidratima')) {
        query = query.gte('ugljikohidrati', 40);
        console.log('✅ Filtriram po ugljikohidratima: >= 40g');
      }
    }

    if (search && search.trim()) {
      query = query.ilike('naziv', `%${search.trim()}%`);
      console.log('✅ Pretraga:', search.trim());
    }

    query = query.order('created_at', { ascending: false });
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ error: error.message });
    }
    
    const processedRecipes = data.map(recipe => {
      if (recipe.prevod && jezik !== 'hr') {
        return {
          ...recipe,
          naziv: recipe.prevod.naziv || recipe.naziv,
          opis: recipe.prevod.opis || recipe.opis,
          sastojci: recipe.prevod.sastojci || recipe.sastojci,
          upute: recipe.prevod.upute || recipe.upute,
          nacin_pripreme: recipe.prevod.nacin_pripreme || recipe.nacin_pripreme,
          prevod: undefined
        };
      }
      return {
        ...recipe,
        prevod: undefined
      };
    });
    
    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata (od ${count || 0} ukupno)`);
    
    res.json({
      success: true,
      data: processedRecipes || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 11. DOHVATI JEDAN RECEPT (SA PREVODOM)
// ============================================================
app.get('/api/recepti/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { jezik = 'hr' } = req.query;

    let query = supabase
      .from('recepti')
      .select(`
        *,
        prevod:recepti_prevodi!recept_id(
          naziv,
          opis,
          sastojci,
          upute,
          nacin_pripreme
        )
      `)
      .eq('id', id);

    if (jezik !== 'hr') {
      query = query.eq('prevod.jezik', jezik);
    }

    const { data: recipe, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Recept nije pronađen' });
      }
      throw error;
    }

    if (recipe.prevod && jezik !== 'hr') {
      recipe.naziv = recipe.prevod.naziv || recipe.naziv;
      recipe.opis = recipe.prevod.opis || recipe.opis;
      recipe.sastojci = recipe.prevod.sastojci || recipe.sastojci;
      recipe.upute = recipe.prevod.upute || recipe.upute;
      recipe.nacin_pripreme = recipe.prevod.nacin_pripreme || recipe.nacin_pripreme;
    }

    delete recipe.prevod;

    res.json({ success: true, data: recipe });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 12. DOHVATI RECEPTE ZA KORISNIKA
// ============================================================
app.get('/api/recepti/korisnik/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`👤 Dohvatam recepte za korisnika: ${email}`);
    
    const { data: profil, error: profilError } = await supabase
      .from('profili')
      .select('vrsta, izbjegava, preferencije, vrijeme, tezina, kalorije')
      .eq('email', email)
      .maybeSingle();

    if (profilError) {
      console.error('❌ Greška pri dohvatu profila:', profilError);
      return res.status(500).json({ error: 'Greška pri dohvatu profila' });
    }
    
    if (!profil) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    console.log('📋 Korisničke restrikcije (izbjegava):', profil.izbjegava);
    console.log('📋 Korisničke preferencije:', profil.preferencije);
    console.log('📋 Korisnička vrsta:', profil.vrsta);

    let query = supabase
      .from('recepti')
      .select('*');

    if (profil.vrsta && profil.vrsta.length > 0) {
      const vrste = profil.vrsta.filter(v => v !== 'Svejedno');
      if (vrste.length > 0) {
        query = query.in('vrsta', vrste);
        console.log('✅ Filtriram po vrsti:', vrste);
      }
    }

    if (profil.vrijeme && profil.vrijeme !== '') {
      query = query.eq('vrijeme', profil.vrijeme);
      console.log('✅ Filtriram po vremenu:', profil.vrijeme);
    }

    if (profil.tezina && profil.tezina !== '') {
      query = query.eq('tezina', profil.tezina);
      console.log('✅ Filtriram po težini:', profil.tezina);
    }

    if (profil.kalorije && profil.kalorije !== '') {
      const kalorijeValue = profil.kalorije;
      let minKcal = 0;
      let maxKcal = 9999;
      
      if (kalorijeValue.includes('do 300')) {
        maxKcal = 300;
      } else if (kalorijeValue.includes('300-500')) {
        minKcal = 300;
        maxKcal = 500;
      } else if (kalorijeValue.includes('500-700')) {
        minKcal = 500;
        maxKcal = 700;
      } else if (kalorijeValue.includes('900+')) {
        minKcal = 900;
        maxKcal = 9999;
      }
      
      query = query.gte('kalorije', minKcal).lte('kalorije', maxKcal);
      console.log('✅ Filtriram po kalorijama:', minKcal, '-', maxKcal);
    }

    const restrikcije = profil.izbjegava || [];
    if (restrikcije.length > 0) {
      const hasNoRestrictions = restrikcije.some(r => 
        r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
        const alergeniRestrikcije = [];
        const dijetneRestrikcije = [];
        
        restrikcije.forEach(r => {
          const rLower = r.toLowerCase();
          const jeAlergen = alergeniList.some(a => rLower.includes(a));
          if (jeAlergen) {
            alergeniRestrikcije.push(r);
          } else {
            dijetneRestrikcije.push(r);
          }
        });
        
        if (alergeniRestrikcije.length > 0) {
          query = query.not('alergeni', '&&', alergeniRestrikcije);
          console.log('✅ Filtriram po alergenima (izbacujem):', alergeniRestrikcije);
        }
        
        if (dijetneRestrikcije.length > 0) {
          query = query.overlaps('dijetne_oznake', dijetneRestrikcije);
          console.log('✅ Filtriram po dijetnim oznakama:', dijetneRestrikcije);
        }
      } else {
        console.log('✅ Korisnik nema restrikcija - prikazujem sve');
      }
    }

    if (profil.preferencije && profil.preferencije.length > 0) {
      if (profil.preferencije.includes('Visokoproteinski')) {
        query = query.gte('proteini', 20);
        console.log('✅ Filtriram po visokoproteinima: >= 20g');
      }
      if (profil.preferencije.includes('Bogat vlaknima')) {
        query = query.gte('vlakna', 5);
        console.log('✅ Filtriram po vlaknima: >= 5g');
      }
      if (profil.preferencije.includes('Bogat ugljikohidratima')) {
        query = query.gte('ugljikohidrati', 40);
        console.log('✅ Filtriram po ugljikohidratima: >= 40g');
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata za korisnika`);
    res.json(data || []);
    
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 13. DOHVATI PROFIL
// ============================================================
app.get('/api/profil/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`🔍 Dohvatam profil za: ${email}`);
    
    const { data, error } = await supabase
      .from('profili')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ success: false, error: 'Profil nije pronađen' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 14. AŽURIRAJ PROFIL
// ============================================================
app.put('/api/profil/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;
    
    console.log(`📝 Ažuriranje profila: ${email}`);
    
    if (updates.premium === true) {
      const premiumDo = new Date();
      premiumDo.setDate(premiumDo.getDate() + 30);
      updates.premium_do = premiumDo.toISOString().split('T')[0];
    }
    
    const { data, error } = await supabase
      .from('profili')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (error) throw error;
    res.json({ success: true, data: data ? data[0] : null });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 15. KREIRAJ PROFIL
// ============================================================
app.post('/api/profil', async (req, res) => {
  try {
    const { email, ime, premium, kviz_zavrsen, vrsta, izbjegava, preferencije } = req.body;
    
    console.log('🆕 Kreiranje profila:', email);

    const { data: existingUser } = await supabase
      .from('profili')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Korisnik već postoji' });
    }
    
    const { data, error } = await supabase
      .from('profili')
      .insert([{
        email,
        ime: ime || 'Korisnik',
        premium: premium || false,
        kviz_zavrsen: kviz_zavrsen || false,
        vrsta: vrsta || [],
        izbjegava: izbjegava || [],
        preferencije: preferencije || [],
        ai_chef_pretrage: 0,
        ai_chef_datum: null,
        twofa_secret: null,
        twofa_enabled: false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 16. IZBRIŠI PROFIL
// ============================================================
app.delete('/api/profil/:email/delete', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🗑️ Brisanje profila:', email);
    
    const { error } = await supabase
      .from('profili')
      .delete()
      .eq('email', email);

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    res.json({ success: true, message: 'Profil izbrisan' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 🔥🔥🔥 HEALTHY CHEF - POPRAVLJENI ENDPOINTI
// ============================================================

// 17. DOHVATI SVE KATEGORIJE I FAZE
app.get('/api/healthy-chef/kategorije', async (req, res) => {
  try {
    console.log('🌿 Dohvatam HealthyChef kategorije...');
    
    const { data, error } = await supabase
      .from('healthy_chef_kategorije')
      .select('*')
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('redoslijed', { ascending: true });

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} kategorija/faza`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška pri dohvatu kategorija:', error);
    res.status(500).json({ error: error.message });
  }
});

// 18. DOHVATI FAZE ZA KATEGORIJU
app.get('/api/healthy-chef/faze/:kategorijaId', async (req, res) => {
  try {
    const { kategorijaId } = req.params;
    console.log(`🌿 Dohvatam faze za kategoriju: ${kategorijaId}`);
    
    const { data, error } = await supabase
      .from('healthy_chef_kategorije')
      .select('*')
      .eq('parent_id', kategorijaId)
      .order('redoslijed', { ascending: true });

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} faza`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška pri dohvatu faza:', error);
    res.status(500).json({ error: error.message });
  }
});

// 19. 🔥 RECEPTI ZA FAZU SA FILTRIRANJEM PO KORISNIKU
app.get('/api/healthy-chef/recepti', async (req, res) => {
  try {
    const { fazaId, email, vrsta, vrijeme, tezina, page = 1, limit = 20 } = req.query;
    
    console.log(`🌿 Dohvatam recepte za fazu: ${fazaId}`);
    console.log(`👤 Korisnik: ${email}`);
    console.log('📦 Filteri:', { vrsta, vrijeme, tezina });
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 1. Dohvati korisnika i njegove restrikcije
    let userRestrictions = [];
    if (email) {
      const { data: profil, error: profilError } = await supabase
        .from('profili')
        .select('izbjegava, ime')
        .eq('email', email)
        .maybeSingle();
      
      if (!profilError && profil) {
        userRestrictions = profil.izbjegava || [];
        console.log(`🔒 Restrikcije za ${profil.ime || email}:`, userRestrictions);
      }
    }
    
    // 2. Dohvati recepte za fazu
    let query = supabase
      .from('recepti')
      .select('*', { count: 'exact' })
      .eq('faza_id', fazaId);
    
    // Dodaj filtere
    if (vrsta) query = query.eq('vrsta', vrsta);
    if (vrijeme) query = query.eq('vrijeme', vrijeme);
    if (tezina) query = query.eq('tezina', tezina);
    
    const { data: recepti, error, count } = await query;
    
    if (error) {
      console.error('❌ Greška pri dohvatu recepata:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`📊 Pronađeno ${recepti?.length || 0} recepata za fazu`);
    
    // 3. 🔥 FILTRIRAJ PO RESTRIKCIJAMA KORISNIKA
    let filteredRecepti = recepti || [];
    
    if (userRestrictions.length > 0) {
      // Provjeri da li korisnik ima "Bez restrikcija"
      const hasNoRestrictions = userRestrictions.some(r => 
        r === 'Bez restrikcija' || 
        r === 'No restrictions' || 
        r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        // Podijeli restrikcije na alergene i dijetne
        const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
        const alergeniRestrikcije = [];
        const dijetneRestrikcije = [];
        
        userRestrictions.forEach(r => {
          const rLower = r.toLowerCase();
          const jeAlergen = alergeniList.some(a => rLower.includes(a));
          if (jeAlergen) {
            alergeniRestrikcije.push(r);
          } else {
            dijetneRestrikcije.push(r);
          }
        });
        
        // Filtriraj po alergenima (IZBACUJE recepte koji sadrže alergene)
        if (alergeniRestrikcije.length > 0) {
          filteredRecepti = filteredRecepti.filter(recipe => {
            const alergeni = recipe.alergeni || [];
            const imaAlergen = alergeniRestrikcije.some(r => 
              alergeni.some(a => a.toLowerCase().includes(r.toLowerCase()))
            );
            return !imaAlergen; // IZBACUJE ako sadrži alergen
          });
          console.log(`🔒 Nakon filtriranja po alergenima: ${filteredRecepti.length} recepata`);
        }
        
        // Filtriraj po dijetnim oznakama (ZADRŽAVA samo one koje odgovaraju)
        if (dijetneRestrikcije.length > 0) {
          filteredRecepti = filteredRecepti.filter(recipe => {
            const dijetne = recipe.dijetne_oznake || [];
            return dijetneRestrikcije.some(r => 
              dijetne.some(d => d.toLowerCase().includes(r.toLowerCase()))
            );
          });
          console.log(`🔒 Nakon filtriranja po dijetnim oznakama: ${filteredRecepti.length} recepata`);
        }
      } else {
        console.log(`✅ Korisnik nema restrikcija - prikazujem sve recepte`);
      }
    }
    
    console.log(`✅ Vraćam ${filteredRecepti.length} recepata za korisnika`);
    
    // Paginacija (primijenjena nakon filtriranja)
    const paginatedData = filteredRecepti.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      data: paginatedData || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredRecepti.length,
        pages: Math.ceil(filteredRecepti.length / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('❌ Greška pri dohvatu recepata:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 20. AI WEEKLY PLAN (FoodPlanner) - OpenAI
// ============================================================
app.post('/api/ai-weekly-plan', async (req, res) => {
  try {
    const { 
      email, 
      sastojci, 
      kalorije, 
      proteini, 
      ugljikohidrati, 
      masti, 
      restrikcije,
      datum 
    } = req.body;
    
    console.log('🤖 Generišem sedmični plan za:', email);
    console.log('📊 Ciljevi:', { kalorije, proteini, ugljikohidrati, masti });
    console.log('🔒 Restrikcije:', restrikcije);
    console.log('📦 Sastojci:', sastojci?.length || 0);
    
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('ime, vrsta, preferencije')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) {
      console.error('❌ Greška pri dohvatu korisnika:', userError);
    }
    
    const ime = user?.ime || 'Korisnik';
    
    let plan = null;
    
    if (openai) {
      try {
        const restrikcijeTekst = restrikcije && restrikcije.length > 0 
          ? `IZBJEGAVAJ: ${restrikcije.join(', ')}. Ove namirnice su ZABRANJENE!` 
          : 'Nema posebnih restrikcija.';
        
        const sastojciTekst = sastojci && sastojci.length > 0
          ? `Koristi dostupne namirnice: ${sastojci.join(', ')}.`
          : 'Koristi uobičajene namirnice.';
        
        const prompt = `
          Kreiraj sedmični plan obroka za korisnika ${ime}.
          
          CILJEVI (DNEVNO):
          - Kalorije: ${kalorije || 2200} kcal
          - Proteini: ${proteini || 150}g
          - Ugljikohidrati: ${ugljikohidrati || 250}g
          - Masti: ${masti || 70}g
          
          RESTRIKCIJE (ZABRANJENE NAMIRNICE):
          ${restrikcijeTekst}
          
          DOSTUPNE NAMIRNICE:
          ${sastojciTekst}
          
          Plan treba imati 7 dana (Pon-Ned) sa 3 obroka dnevno (doručak, ručak, večera).
          Svaki obrok treba biti zdrav, ukusan i jednostavan za pripremu.
          Poštuj sve restrikcije - NE KORISTI ZABRANJENE NAMIRNICE!
          
          Odgovori isključivo u JSON formatu:
          {
            "dani": [
              {
                "naziv": "Pon",
                "dorucak": "Naziv jela",
                "rucak": "Naziv jela",
                "vecera": "Naziv jela"
              }
            ]
          }
        `;
        
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });
        
        plan = JSON.parse(response.choices[0].message.content);
        console.log('✅ AI plan generiran sa OpenAI');
        
      } catch (openaiError) {
        console.error('❌ OpenAI greška:', openaiError.message);
        plan = generateFallbackPlan(kalorije, proteini, ugljikohidrati, masti, restrikcije);
      }
    } else {
      console.log('ℹ️ OpenAI nije dostupan, koristim fallback plan');
      plan = generateFallbackPlan(kalorije, proteini, ugljikohidrati, masti, restrikcije);
    }
    
    try {
      const { error: saveError } = await supabase
        .from('planovi_obroka')
        .upsert({
          korisnik_email: email,
          datum: datum || new Date().toISOString().split('T')[0],
          plan: plan,
          ciljevi: { kalorije, proteini, ugljikohidrati, masti },
          restrikcije: restrikcije || [],
          created_at: new Date().toISOString()
        }, { onConflict: 'korisnik_email, datum' });
      
      if (saveError) {
        console.error('❌ Greška pri spremanju plana:', saveError);
      } else {
        console.log('✅ Plan sačuvan u bazu');
      }
    } catch (saveError) {
      console.error('❌ Greška pri spremanju plana:', saveError);
    }
    
    res.json(plan);
    
  } catch (error) {
    console.error('❌ Greška pri generisanju plana:', error);
    res.status(500).json({ 
      error: error.message,
      fallback: generateFallbackPlan(2200, 150, 250, 70, [])
    });
  }
});

// ============================================================
// 20a. 🔥 WEEKLY PLAN - HYBRID: Baza → OpenAI (fallback)
// ============================================================
app.post('/api/weekly-plan', async (req, res) => {
  try {
    const { 
      email, 
      sastojci, 
      kalorije, 
      proteini, 
      ugljikohidrati, 
      masti, 
      restrikcije,
      datum 
    } = req.body;
    
    console.log('📊 Generišem sedmični plan za:', email);
    console.log('🔒 Restrikcije:', restrikcije);
    console.log('📦 Sastojci:', sastojci?.length || 0);
    console.log('🎯 Cilj kalorija:', kalorije);

    let korisnikIme = 'Korisnik';
    let korisnikVrsta = [];
    let korisnikPreferencije = [];
    
    if (email) {
      const { data: profil, error: profilError } = await supabase
        .from('profili')
        .select('ime, vrsta, preferencije')
        .eq('email', email)
        .maybeSingle();
      
      if (!profilError && profil) {
        korisnikIme = profil.ime || 'Korisnik';
        korisnikVrsta = profil.vrsta || [];
        korisnikPreferencije = profil.preferencije || [];
        console.log('👤 Korisničke vrste:', korisnikVrsta);
        console.log('⭐ Korisničke preferencije:', korisnikPreferencije);
      }
    }

    const { data: recepti, error } = await supabase
      .from('recepti')
      .select('*');

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Greška pri dohvatu recepata' });
    }

    console.log(`📚 Ukupno recepata u bazi: ${recepti?.length || 0}`);

    let filtered = [...recepti];

    if (restrikcije && restrikcije.length > 0) {
      const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
      const alergeniRestrikcije = [];
      const dijetneRestrikcije = [];
      
      restrikcije.forEach(r => {
        const rLower = r.toLowerCase();
        const jeAlergen = alergeniList.some(a => rLower.includes(a));
        if (jeAlergen) {
          alergeniRestrikcije.push(r);
        } else {
          dijetneRestrikcije.push(r);
        }
      });
      
      filtered = filtered.filter(recipe => {
        if (alergeniRestrikcije.length > 0) {
          const alergeni = recipe.alergeni || [];
          const imaRestrikciju = alergeniRestrikcije.some(r => alergeni.includes(r));
          if (imaRestrikciju) return false;
        }
        
        if (dijetneRestrikcije.length > 0) {
          const dijetne = recipe.dijetne_oznake || [];
          const imaOznaku = dijetneRestrikcije.some(r => dijetne.includes(r));
          if (!imaOznaku) return false;
        }
        
        return true;
      });
      console.log(`📊 Nakon restrikcija: ${filtered.length} recepata`);
    }

    const kalorijePoObroku = Math.round((kalorije || 2200) / 3);
    const minKcal = Math.round(kalorijePoObroku * 0.5);
    const maxKcal = Math.round(kalorijePoObroku * 1.3);
    
    filtered = filtered.filter(recipe => {
      const kcal = recipe.kalorije || 0;
      return kcal >= minKcal && kcal <= maxKcal;
    });
    console.log(`📊 Nakon kalorija (${minKcal}-${maxKcal} kcal): ${filtered.length} recepata`);

    if (sastojci && sastojci.length > 0) {
      const sastojciLower = sastojci.map(s => s.toLowerCase());
      filtered = filtered.filter(recipe => {
        const recipeIngredients = recipe.sastojci || [];
        return sastojciLower.some(s => 
          recipeIngredients.some(ri => ri.toLowerCase().includes(s))
        );
      });
      console.log(`📊 Nakon sastojaka: ${filtered.length} recepata`);
    }

    if (filtered.length >= 7) {
      console.log(`✅ Koristim bazu: ${filtered.length} recepata dostupno`);
      
      const dani = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      
      const plan = dani.map((dan, i) => {
        const startIdx = (i * 3) % shuffled.length;
        const dailyRecipes = [];
        
        for (let j = 0; j < 3; j++) {
          const idx = (startIdx + j) % shuffled.length;
          dailyRecipes.push(shuffled[idx]);
        }
        
        return {
          naziv: dan,
          dorucak: dailyRecipes[0]?.naziv || '---',
          rucak: dailyRecipes[1]?.naziv || '---',
          vecera: dailyRecipes[2]?.naziv || '---'
        };
      });

      try {
        await supabase
          .from('planovi_obroka')
          .upsert({
            korisnik_email: email,
            datum: datum || new Date().toISOString().split('T')[0],
            plan: { dani: plan },
            ciljevi: { kalorije, proteini, ugljikohidrati, masti },
            restrikcije: restrikcije || [],
            izvor: 'baza',
            created_at: new Date().toISOString()
          }, { onConflict: 'korisnik_email, datum' });
        console.log('✅ Plan iz baze sačuvan');
      } catch (saveError) {
        console.error('⚠️ Greška pri spremanju:', saveError);
      }

      return res.json({ dani: plan, _izvor: 'baza' });
    }

    console.log(`⚠️ Premalo recepata u bazi (${filtered.length}), prelazim na OpenAI...`);

    if (!openai) {
      console.warn('⚠️ OpenAI nije dostupan, koristim fallback plan');
      const fallbackPlan = generateFallbackPlan(kalorije, proteini, ugljikohidrati, masti, restrikcije);
      
      try {
        await supabase
          .from('planovi_obroka')
          .upsert({
            korisnik_email: email,
            datum: datum || new Date().toISOString().split('T')[0],
            plan: fallbackPlan,
            ciljevi: { kalorije, proteini, ugljikohidrati, masti },
            restrikcije: restrikcije || [],
            izvor: 'fallback',
            created_at: new Date().toISOString()
          }, { onConflict: 'korisnik_email, datum' });
      } catch (saveError) {
        console.error('⚠️ Greška pri spremanju:', saveError);
      }
      
      return res.json(fallbackPlan);
    }

    try {
      const ime = korisnikIme || email?.split('@')[0] || 'Korisnik';
      
      let restrikcijePrompt = 'Nema posebnih restrikcija.';
      let alergeniPrompt = '';
      let dijetnePrompt = '';
      
      if (restrikcije && restrikcije.length > 0) {
        const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi', 'školjke', 'riba'];
        const alergeni = [];
        const dijetne = [];
        
        restrikcije.forEach(r => {
          const rLower = r.toLowerCase();
          const jeAlergen = alergeniList.some(a => rLower.includes(a));
          if (jeAlergen) {
            alergeni.push(r);
          } else {
            dijetne.push(r);
          }
        });
        
        if (alergeni.length > 0) {
          alergeniPrompt = `\n⚠️ ALERGENI KOJE MORATE IZBJEĆI: ${alergeni.join(', ')}.\nSVAKO jelo u planu MORA biti BEZ ovih sastojaka!`;
        }
        if (dijetne.length > 0) {
          dijetnePrompt = `\n🥗 DIJETNE OZNAKE: ${dijetne.join(', ')}.\nSVAKO jelo MORA odgovarati ovim dijetnim zahtjevima.`;
        }
        
        restrikcijePrompt = `Korisnik IZBJEGAVA: ${restrikcije.join(', ')}.`;
      }

      let vrstaPrompt = '';
      if (korisnikVrsta && korisnikVrsta.length > 0) {
        const vrste = korisnikVrsta.filter(v => v !== 'Svejedno');
        if (vrste.length > 0) {
          vrstaPrompt = `\n🍽️ PREFERIRANE VRSTE JELA: ${vrste.join(', ')}.`;
        }
      }

      let preferencijePrompt = '';
      if (korisnikPreferencije && korisnikPreferencije.length > 0) {
        const prefs = korisnikPreferencije.filter(p => p !== 'Svejedno');
        if (prefs.length > 0) {
          preferencijePrompt = `\n💪 NUTRICIONI PREFERENCIJE: ${prefs.join(', ')}.`;
        }
      }

      let sastojciPrompt = '';
      if (sastojci && sastojci.length > 0) {
        sastojciPrompt = `\n📦 DOSTUPNE NAMIRNICE (koristi ih ako je moguće): ${sastojci.join(', ')}.`;
      }

      const prompt = `
        KREIRAJ SEDMIČNI PLAN OBROKA za korisnika ${ime}.
        
        📊 DNEVNI NUTRITIVNI CILJEVI:
        - Kalorije: ${kalorije || 2200} kcal
        - Proteini: ${proteini || 150}g
        - Ugljikohidrati: ${ugljikohidrati || 250}g
        - Masti: ${masti || 70}g
        
        🔒 RESTRIKCIJE KORISNIKA:
        ${restrikcijePrompt}
        ${alergeniPrompt}
        ${dijetnePrompt}
        ${vrstaPrompt}
        ${preferencijePrompt}
        ${sastojciPrompt}
        
        ⚠️ VAŽNA UPOZORENJA (OBAVEZNO):
        1. SVAKI OBROK MORA BITI BEZ ALERGENA iz liste!
        2. SVAKI OBROK MORA ODGOVARATI DIJETNIM OZNAKAMA!
        3. Ako korisnik ima "Gluten" - NEMA HRANE SA GLUTENOM!
        4. Ako korisnik ima "Laktoza" - NEMA MLIJEČNIH PROIZVODA!
        5. Ako korisnik ima "Jaja" - NEMA JAJA!
        6. Ako korisnik ima "Orašasti" - NEMA ORAŠASTIH PLODOVA!
        
        📋 FORMAT:
        Plan treba imati 7 dana (Pon-Ned) sa 3 obroka dnevno (doručak, ručak, večera).
        Svaki obrok treba biti zdrav, ukusan i jednostavan za pripremu.
        Poštuj SVE restrikcije - OVO JE OBAVEZNO!
        
        Odgovori isključivo u JSON formatu:
        {
          "dani": [
            {
              "naziv": "Pon",
              "dorucak": "Naziv jela",
              "rucak": "Naziv jela",
              "vecera": "Naziv jela"
            }
          ]
        }
      `;
      
      console.log('📝 OpenAI prompt dužina:', prompt.length);
      console.log('🔒 Restrikcije u promptu:', restrikcijePrompt);
      
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });
      
      const aiPlan = JSON.parse(response.choices[0].message.content);
      console.log('✅ AI plan generiran sa OpenAI');
      console.log('📋 Plan ima restrikcije:', restrikcije?.length || 0);

      try {
        await supabase
          .from('planovi_obroka')
          .upsert({
            korisnik_email: email,
            datum: datum || new Date().toISOString().split('T')[0],
            plan: aiPlan,
            ciljevi: { kalorije, proteini, ugljikohidrati, masti },
            restrikcije: restrikcije || [],
            izvor: 'openai',
            created_at: new Date().toISOString()
          }, { onConflict: 'korisnik_email, datum' });
        console.log('✅ AI plan sačuvan u bazu');
      } catch (saveError) {
        console.error('⚠️ Greška pri spremanju:', saveError);
      }

      return res.json(aiPlan);

    } catch (openaiError) {
      console.error('❌ OpenAI greška:', openaiError.message);
      console.log('🔄 Koristim fallback plan sa restrikcijama');
      
      const fallbackPlan = generateFallbackPlan(kalorije, proteini, ugljikohidrati, masti, restrikcije);
      
      try {
        await supabase
          .from('planovi_obroka')
          .upsert({
            korisnik_email: email,
            datum: datum || new Date().toISOString().split('T')[0],
            plan: fallbackPlan,
            ciljevi: { kalorije, proteini, ugljikohidrati, masti },
            restrikcije: restrikcije || [],
            izvor: 'fallback',
            created_at: new Date().toISOString()
          }, { onConflict: 'korisnik_email, datum' });
      } catch (saveError) {
        console.error('⚠️ Greška pri spremanju:', saveError);
      }
      
      return res.json(fallbackPlan);
    }

  } catch (error) {
    console.error('❌ Greška pri generisanju plana:', error);
    const fallbackPlan = generateFallbackPlan(2200, 150, 250, 70, []);
    res.status(500).json({ 
      error: error.message,
      ...fallbackPlan
    });
  }
});

// ============================================================
// 21. TAJNI RECEPT
// ============================================================
app.get('/api/tajni-recept', async (req, res) => {
  try {
    console.log('🔮 Dohvatam današnji tajni recept...');
    
    const email = req.query.email;
    let restrikcije = [];
    
    if (email) {
      const { data: profil, error: profilError } = await supabase
        .from('profili')
        .select('izbjegava')
        .eq('email', email)
        .maybeSingle();
      
      if (!profilError && profil) {
        restrikcije = profil.izbjegava || [];
        console.log('🔒 Restrikcije korisnika:', restrikcije);
      }
    }
    
    const danas = new Date().toISOString().split('T')[0];
    
    const { data: tajni, error: tajniError } = await supabase
      .from('tajni_recepti')
      .select('recept_id, datum')
      .eq('datum', danas)
      .maybeSingle();

    if (tajniError) {
      console.error('❌ Greška pri dohvatu tajnog recepta:', tajniError);
      return res.status(500).json({ error: tajniError.message });
    }

    if (tajni) {
      console.log(`✅ Tajni recept pronađen za danas: ${tajni.recept_id}`);
      
      const { data: recept, error: receptError } = await supabase
        .from('recepti')
        .select('*')
        .eq('id', tajni.recept_id)
        .maybeSingle();

      if (receptError) {
        console.error('❌ Greška pri dohvatu recepta:', receptError);
        return res.status(500).json({ error: receptError.message });
      }

      if (!recept) {
        return res.status(404).json({ error: 'Recept nije pronađen.' });
      }

      if (restrikcije.length > 0) {
        const alergeni = recept.alergeni || [];
        const imaRestrikciju = restrikcije.some(r => alergeni.includes(r));
        if (imaRestrikciju) {
          console.log('⚠️ Tajni recept sadrži restrikcije, biram novi...');
          await supabase
            .from('tajni_recepti')
            .delete()
            .eq('datum', danas);
        } else {
          return res.json({
            ...recept,
            _tajni_datum: tajni.datum
          });
        }
      } else {
        return res.json({
          ...recept,
          _tajni_datum: tajni.datum
        });
      }
    }

    console.log('🔄 Nema tajnog recepta za danas (ili ne odgovara restrikcijama), biram novi...');
    
    const { data: sviRecepti, error: sviError } = await supabase
      .from('recepti')
      .select('id, alergeni, naziv');

    if (sviError) {
      console.error('❌ Greška pri dohvatu recepata:', sviError);
      return res.status(500).json({ error: sviError.message });
    }

    if (!sviRecepti || sviRecepti.length === 0) {
      return res.status(404).json({ error: 'Nema recepata u bazi.' });
    }

    let dozvoljeniRecepti = sviRecepti;
    
    if (restrikcije.length > 0) {
      dozvoljeniRecepti = sviRecepti.filter(r => {
        const alergeni = r.alergeni || [];
        return !restrikcije.some(rest => alergeni.includes(rest));
      });
      
      console.log(`📊 Nakon restrikcija: ${dozvoljeniRecepti.length} recepata`);
    }
    
    if (dozvoljeniRecepti.length === 0) {
      console.log('⚠️ Nema recepata bez restrikcija, biram bilo koji...');
      dozvoljeniRecepti = sviRecepti;
    }
    
    const randomIndex = Math.floor(Math.random() * dozvoljeniRecepti.length);
    const odabraniId = dozvoljeniRecepti[randomIndex].id;

    const { data: noviTajni, error: insertError } = await supabase
      .from('tajni_recepti')
      .insert([{
        recept_id: odabraniId,
        datum: danas
      }])
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('❌ Greška pri kreiranju tajnog recepta:', insertError);
      if (insertError.code === '23505') {
        const { data: existing, error: existingError } = await supabase
          .from('tajni_recepti')
          .select('recept_id')
          .eq('datum', danas)
          .maybeSingle();

        if (existingError) {
          return res.status(500).json({ error: existingError.message });
        }

        if (existing) {
          const { data: recept, error: rError } = await supabase
            .from('recepti')
            .select('*')
            .eq('id', existing.recept_id)
            .maybeSingle();

          if (rError) return res.status(500).json({ error: rError.message });
          return res.json({ ...recept, _tajni_datum: danas });
        }
      }
      return res.status(500).json({ error: insertError.message });
    }

    const { data: recept, error: receptError } = await supabase
      .from('recepti')
      .select('*')
      .eq('id', odabraniId)
      .maybeSingle();

    if (receptError) {
      console.error('❌ Greška pri dohvatu recepta:', receptError);
      return res.status(500).json({ error: receptError.message });
    }

    console.log(`✅ Novi tajni recept kreiran: ${recept?.naziv}`);
    res.json({
      ...recept,
      _tajni_datum: danas
    });

  } catch (error) {
    console.error('❌ Greška pri dohvatu tajnog recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 22. AI CHEF - DOHVATI LIMIT
// ============================================================
app.get('/api/ai-chef/limit/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`🤖 Dohvatam AI Chef limit za: ${email}`);
    
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('ai_chef_pretrage, ai_chef_datum, premium')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;

    if (!user) {
      return res.json({
        broj_pretraga: 0,
        max_pretraga: 3,
        preostalo: 3,
        moze: true,
        isPremium: false
      });
    }

    if (user?.premium) {
      return res.json({
        broj_pretraga: 0,
        max_pretraga: 999,
        preostalo: 999,
        moze: true,
        isPremium: true
      });
    }

    const danas = new Date().toISOString().split('T')[0];
    const maxPretraga = 3;
    
    let brojPretraga = user?.ai_chef_pretrage || 0;
    if (user?.ai_chef_datum !== danas) {
      brojPretraga = 0;
    }

    const preostalo = Math.max(maxPretraga - brojPretraga, 0);

    res.json({
      broj_pretraga: brojPretraga,
      max_pretraga: maxPretraga,
      preostalo: preostalo,
      moze: preostalo > 0,
      isPremium: false
    });
  } catch (error) {
    console.error('❌ Greška pri dohvatu limita:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 23. 🔥 AI CHEF - OTKLJUČAJ PRETRAGU
// ============================================================
app.post('/api/ai-chef/unlock', async (req, res) => {
  try {
    const { email, type } = req.body;
    console.log(`🔓 Otključavanje pretrage za: ${email}`);
    console.log(`📌 Tip: ${type || 'normal'}`);

    if (!email) {
      return res.status(400).json({ error: 'Email je obavezan.' });
    }

    const danas = new Date().toISOString().split('T')[0];
    const maxPretraga = 3;

    const { data: existing, error: fetchError } = await supabase
      .from('profili')
      .select('ai_chef_pretrage, ai_chef_datum, premium, video_ad_count')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existing) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    if (existing?.premium) {
      return res.status(400).json({ error: 'Premium korisnici nemaju ograničenja.' });
    }

    let brojPretraga = existing?.ai_chef_pretrage || 0;
    if (existing?.ai_chef_datum !== danas) {
      brojPretraga = 0;
    }

    if (brojPretraga >= maxPretraga) {
      return res.status(400).json({ error: 'Dostigli ste maksimum za danas.' });
    }

    const noviBroj = brojPretraga + 1;
    const preostalo = maxPretraga - noviBroj;

    const updateData = {
      ai_chef_pretrage: noviBroj,
      ai_chef_datum: danas
    };

    if (type === 'video_ad') {
      const videoCount = (existing?.video_ad_count || 0) + 1;
      updateData.video_ad_count = videoCount;
      console.log(`📺 Video reklama ${videoCount}/3 za danas`);
    }

    const { error: updateError } = await supabase
      .from('profili')
      .update(updateData)
      .eq('email', email);

    if (updateError) throw updateError;

    const { data: updated, error: getError } = await supabase
      .from('profili')
      .select('ai_chef_pretrage, video_ad_count')
      .eq('email', email)
      .single();

    if (getError) throw getError;

    res.json({
      success: true,
      message: '✅ Otključano!',
      broj_pretraga: updated?.ai_chef_pretrage || noviBroj,
      max_pretraga: maxPretraga,
      preostalo: Math.max(maxPretraga - (updated?.ai_chef_pretrage || noviBroj), 0),
      moze: preostalo > 0,
      video_ad_count: updated?.video_ad_count || 0
    });
  } catch (error) {
    console.error('❌ Greška pri otključavanju:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 24. 🔥 AI CHEF - DOHVATI BROJ VIDEO REKLAMA
// ============================================================
app.get('/api/ai-chef/video-ads/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`📺 Dohvatam broj video reklama za: ${email}`);

    const { data: user, error } = await supabase
      .from('profili')
      .select('video_ad_count')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({
      success: true,
      broj_video_reklama: user?.video_ad_count || 0
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 25. 🔥🔥🔥 AI CHEF - PRETRAGA SA BAZOM I AI FALLBACKOM
// ============================================================
app.post('/api/ai-chef', upload.single('slika'), async (req, res) => {
  try {
    const { tekst, email, jezik } = req.body;
    const slika = req.file;
    
    console.log(`🤖 AI Chef pretraga za: ${email}`);
    console.log(`🌐 Jezik: ${jezik || 'hr'}`);
    
    let restrikcije = [];
    let korisnikIme = 'Korisnik';
    let korisnikVrsta = [];
    let korisnikPreferencije = [];
    let zdravstveniPodaci = null;
    
    if (email) {
      const { data: profil, error: profilError } = await supabase
        .from('profili')
        .select('ime, izbjegava, vrsta, preferencije')
        .eq('email', email)
        .maybeSingle();
      
      if (!profilError && profil) {
        korisnikIme = profil.ime || 'Korisnik';
        restrikcije = profil.izbjegava || [];
        korisnikVrsta = profil.vrsta || [];
        korisnikPreferencije = profil.preferencije || [];
        console.log('👤 Korisnik:', korisnikIme);
        console.log('🔒 Restrikcije:', restrikcije);
        console.log('🍽️ Vrste:', korisnikVrsta);
        console.log('💪 Preferencije:', korisnikPreferencije);
      }
      
      const { data: zdravstveni, error: zdravError } = await supabase
        .from('zdravstveni_podaci')
        .select('*')
        .eq('korisnik_email', email)
        .order('datum', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (zdravstveni) {
        zdravstveniPodaci = zdravstveni;
        console.log('😴 Zdravstveni podaci:', zdravstveni);
      }
    }
    
    let inputText = tekst || '';
    let inputType = 'tekst';
    let imageHash = null;
    let slikaPutanja = null;
    let izvuceniSastojci = [];

    if (slika) {
      inputType = 'slika';
      slikaPutanja = slika.path;
      console.log('📸 Primljena slika:', slika.originalname);
      console.log('📏 Veličina:', slika.size, 'bytes');

      imageHash = generateHash(slikaPutanja, 'slika');
      
      const cached = await checkCache(imageHash);
      if (cached) {
        console.log('✅ Keš pronađen za sliku!');
        res.setHeader('X-Cache-Hit', 'true');
        res.setHeader('X-Cache-Date', cached.created_at);
        if (fs.existsSync(slikaPutanja)) {
          fs.unlink(slikaPutanja, (err) => { if (err) console.error('⚠️ Greška pri brisanju slike:', err); });
        }
        return res.json(cached.results);
      }

      const analysis = await analyzeImage(slikaPutanja);
      izvuceniSastojci = analysis.sastojci || [];
      inputText = izvuceniSastojci.join(', ');
      
      if (fs.existsSync(slikaPutanja)) {
        fs.unlink(slikaPutanja, (err) => { if (err) console.error('⚠️ Greška pri brisanju slike:', err); });
      }
      
      console.log('📝 Izvučeni sastojci sa slike:', izvuceniSastojci);
    }

    if (!inputText || inputText.trim() === '') {
      return res.json([]);
    }

    const textHash = generateHash(inputText, 'tekst');
    
    const cachedText = await checkCache(textHash);
    if (cachedText) {
      console.log('✅ Keš pronađen za tekst!');
      res.setHeader('X-Cache-Hit', 'true');
      res.setHeader('X-Cache-Date', cachedText.created_at);
      return res.json(cachedText.results);
    }

    const sastojci = inputText.split(',').map(s => s.trim().toLowerCase());
    console.log('📦 Sastojci za pretragu:', sastojci);

    let query = supabase
      .from('recepti')
      .select(`
        *,
        prevod:recepti_prevodi!recept_id(
          naziv,
          opis,
          sastojci,
          upute,
          nacin_pripreme
        )
      `);

    if (jezik && jezik !== 'hr') {
      query = query.eq('prevod.jezik', jezik);
    }

    const { data: recepti, error } = await query;

    if (error) {
      console.error('❌ Greška pri dohvatu recepata:', error);
      throw error;
    }

    const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
    const alergeniRestrikcije = [];
    const dijetneRestrikcije = [];
    
    if (restrikcije && restrikcije.length > 0) {
      restrikcije.forEach(r => {
        const rLower = r.toLowerCase();
        const jeAlergen = alergeniList.some(a => rLower.includes(a));
        if (jeAlergen) {
          alergeniRestrikcije.push(r);
        } else {
          dijetneRestrikcije.push(r);
        }
      });
    }

    let bazaRezultati = recepti.filter(recept => {
      if (!recept.sastojci || recept.sastojci.length === 0) return false;
      const receptSastojci = recept.sastojci.map(s => s.toLowerCase());
      const imaSastojak = sastojci.some(sastojak => 
        receptSastojci.some(rs => rs.includes(sastojak))
      );
      if (!imaSastojak) return false;
      
      if (alergeniRestrikcije.length > 0) {
        const alergeni = recept.alergeni || [];
        const imaRestrikciju = alergeniRestrikcije.some(r => alergeni.includes(r));
        if (imaRestrikciju) return false;
      }
      
      if (dijetneRestrikcije.length > 0) {
        const dijetne = recept.dijetne_oznake || [];
        const imaOznaku = dijetneRestrikcije.some(r => dijetne.includes(r));
        if (!imaOznaku) return false;
      }
      
      if (zdravstveniPodaci) {
        const sanSati = zdravstveniPodaci.san_sati || 0;
        
        if (sanSati < 6) {
          const kalorije = recept.kalorije || 0;
          const vrijeme = recept.vrijeme || '';
          const jeLagano = kalorije < 500 || vrijeme.includes('Kratko') || vrijeme.includes('Srednje');
          if (!jeLagano) return false;
        }
        
        if (sanSati > 8) {
          const kalorije = recept.kalorije || 0;
          const proteini = recept.proteini || 0;
          const jeEnergijski = kalorije > 400 || proteini > 20;
          if (!jeEnergijski) return false;
        }
      }
      
      return true;
    });

    console.log(`✅ U bazi pronađeno ${bazaRezultati.length} recepata`);

    if (bazaRezultati.length > 0) {
      let results = bazaRezultati.map(recipe => {
        if (recipe.prevod && jezik && jezik !== 'hr') {
          return {
            ...recipe,
            naziv: recipe.prevod.naziv || recipe.naziv,
            opis: recipe.prevod.opis || recipe.opis,
            sastojci: recipe.prevod.sastojci || recipe.sastojci,
            upute: recipe.prevod.upute || recipe.upute,
            nacin_pripreme: recipe.prevod.nacin_pripreme || recipe.nacin_pripreme
          };
        }
        const clean = { ...recipe };
        delete clean.prevod;
        return clean;
      });

      const hashToSave = imageHash || textHash;
      const typeToSave = slika ? 'slika' : 'tekst';
      const originalResults = bazaRezultati.map(r => {
        const clean = { ...r };
        delete clean.prevod;
        return clean;
      });
      await saveToCache(hashToSave, typeToSave, originalResults);

      res.setHeader('X-Content-Language', jezik || 'hr');
      res.setHeader('X-Source', 'database');
      res.setHeader('X-Cache-Hit', 'false');
      return res.json(results);
    }

    console.log('❌ Nema recepata u bazi, pozivam OpenAI...');

    if (!openai) {
      console.warn('⚠️ OpenAI nije dostupan, vraćam prazan niz');
      res.setHeader('X-Cache-Hit', 'false');
      res.setHeader('X-Source', 'empty');
      return res.json([]);
    }

    try {
      console.log('🤖 Generišem AI recepte na osnovu sastojaka...');

      let restrikcijePrompt = 'Nema posebnih restrikcija.';
      let alergeniPrompt = '';
      let dijetnePrompt = '';
      
      if (restrikcije && restrikcije.length > 0) {
        const alergeni = [];
        const dijetne = [];
        
        restrikcije.forEach(r => {
          const rLower = r.toLowerCase();
          const jeAlergen = alergeniList.some(a => rLower.includes(a));
          if (jeAlergen) {
            alergeni.push(r);
          } else {
            dijetne.push(r);
          }
        });
        
        if (alergeni.length > 0) {
          alergeniPrompt = `\n⚠️ ALERGENI KOJE MORATE IZBJEĆI: ${alergeni.join(', ')}.\nSVAKI predloženi recept MORA biti BEZ ovih sastojaka!`;
        }
        if (dijetne.length > 0) {
          dijetnePrompt = `\n🥗 DIJETNE OZNAKE: ${dijetne.join(', ')}.\nSVAKI predloženi recept MORA odgovarati ovim dijetnim zahtjevima.`;
        }
        
        restrikcijePrompt = `Korisnik IZBJEGAVA: ${restrikcije.join(', ')}.`;
      }

      let vrstaPrompt = '';
      if (korisnikVrsta && korisnikVrsta.length > 0) {
        const vrste = korisnikVrsta.filter(v => v !== 'Svejedno');
        if (vrste.length > 0) {
          vrstaPrompt = `\n🍽️ PREFERIRANE VRSTE JELA: ${vrste.join(', ')}.`;
        }
      }

      let preferencijePrompt = '';
      if (korisnikPreferencije && korisnikPreferencije.length > 0) {
        const prefs = korisnikPreferencije.filter(p => p !== 'Svejedno');
        if (prefs.length > 0) {
          preferencijePrompt = `\n💪 NUTRICIONI PREFERENCIJE: ${prefs.join(', ')}.`;
        }
      }

      const jezikMapa = {
        'hr': 'hrvatskom',
        'en': 'engleskom',
        'de': 'njemačkom'
      };
      const jezikNaziv = jezikMapa[jezik] || 'hrvatskom';

      const prompt = `
        KREIRAJ RECEPTE na ${jezikNaziv} jeziku na osnovu dostupnih sastojaka.
        
        📦 DOSTUPNI SASTOJCI:
        ${sastojci.join(', ')}
        
        👤 KORISNIK: ${korisnikIme}
        
        🔒 RESTRIKCIJE KORISNIKA:
        ${restrikcijePrompt}
        ${alergeniPrompt}
        ${dijetnePrompt}
        ${vrstaPrompt}
        ${preferencijePrompt}
        
        ⚠️ VAŽNA UPOZORENJA (OBAVEZNO):
        1. SVAKI recept MORA BITI BEZ ALERGENA iz liste!
        2. SVAKI recept MORA ODGOVARATI DIJETNIM OZNAKAMA!
        3. Koristi DOSTUPNE SASTOJKE što je više moguće!
        4. Ako nedostaju neki sastojci, predloži zamjene!
        5. Recepti trebaju biti zdravi, ukusni i jednostavni za pripremu!
        6. Odgovori na ${jezikNaziv} jeziku!
        
        📋 FORMAT:
        Kreiraj 3-5 recepta. Svaki recept treba imati:
        - naziv: Naziv jela
        - opis: Kratak opis (1-2 rečenice)
        - sastojci: Lista sastojaka (sa količinama)
        - upute: Koraci pripreme
        - vrijeme: Vrijeme pripreme (npr. "30 min")
        - tezina: Težina (Početnik/Srednji/Profesionalac)
        - kalorije: Broj kalorija po porciji
        - vrsta: Vrsta jela (Slano/Deserti/Dijetalni recepti/Napitki)
        
        Odgovori isključivo u JSON formatu:
        {
          "recepti": [
            {
              "naziv": "...",
              "opis": "...",
              "sastojci": ["...", "..."],
              "upute": ["...", "..."],
              "vrijeme": "...",
              "tezina": "...",
              "kalorije": 0,
              "vrsta": "..."
            }
          ]
        }
      `;

      console.log('📝 Šaljem OpenAI zahtjev...');
      console.log('🔒 Restrikcije u promptu:', restrikcijePrompt);
      console.log('🌐 Jezik odgovora:', jezikNaziv);

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const aiData = JSON.parse(response.choices[0].message.content);
      console.log('✅ OpenAI generisao recepte:', aiData.recepti?.length || 0);

      let aiResults = aiData.recepti || [];
      
      aiResults = aiResults.map((r, index) => ({
        ...r,
        id: `ai-${Date.now()}-${index}`,
        _ai_generated: true,
        alergeni: restrikcije || []
      }));

      const hashToSave = imageHash || textHash;
      const typeToSave = slika ? 'slika' : 'tekst';
      await saveToCache(hashToSave, typeToSave, aiResults);

      res.setHeader('X-Content-Language', jezik || 'hr');
      res.setHeader('X-Source', 'ai_generated');
      res.setHeader('X-Cache-Hit', 'false');
      res.json(aiResults);

    } catch (openaiError) {
      console.error('❌ OpenAI greška:', openaiError.message);
      res.setHeader('X-Cache-Hit', 'false');
      res.setHeader('X-Source', 'error');
      res.json([]);
    }

  } catch (error) {
    console.error('❌ Greška pri AI pretrazi:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 26. AI CHEF - OČISTI STARI KEŠ
// ============================================================
app.delete('/api/ai-chef/cache/clean', async (req, res) => {
  try {
    console.log('🧹 Čišćenje starog AI Chef keša...');
    
    const { error } = await supabase
      .from('ai_chef_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    res.json({ success: true, message: '✅ Stari keš očišćen.' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 27. PDF IZVJEŠTAJ
// ============================================================
app.get('/api/pdf/izvjestaj/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { datum } = req.query;
    
    console.log(`📄 Generišem PDF izvještaj za: ${email}`);
    
    let query = supabase
      .from('obroci')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (datum) {
      query = query.eq('datum', datum);
    }

    const { data: obroci, error } = await query;

    if (error) throw error;

    if (!obroci || obroci.length === 0) {
      return res.status(404).json({ error: 'Nema obroka za izvještaj.' });
    }

    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('ime, email')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;

    const ukupno = obroci.reduce((acc, o) => ({
      kalorije: acc.kalorije + (o.kalorije || 0),
      proteini: acc.proteini + (o.proteini || 0),
      ugljikohidrati: acc.ugljikohidrati + (o.ugljikohidrati || 0),
      masti: acc.masti + (o.masti || 0)
    }), { kalorije: 0, proteini: 0, ugljikohidrati: 0, masti: 0 });

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=izvjestaj-${email}-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    doc.fontSize(24).fillColor('#2563eb').text('🏥 OS Zdravlja', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#1f2937').text('📊 Izvještaj o ishrani', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#4b5563').text(`Korisnik: ${user?.ime || email}`, { align: 'center' });
    doc.text(`Email: ${email}`, { align: 'center' });
    const datumIzvjestaja = datum || new Date().toISOString().split('T')[0];
    doc.text(`Datum: ${datumIzvjestaja}`, { align: 'center' });
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    doc.fontSize(16).fillColor('#1f2937').text('📊 Statistika', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#4b5563')
       .text(`📅 Ukupno obroka: ${obroci.length}`)
       .text(`🔥 Ukupno kalorija: ${Math.round(ukupno.kalorije)} kcal`)
       .text(`🥩 Proteini: ${Math.round(ukupno.proteini)}g`)
       .text(`🍞 Ugljikohidrati: ${Math.round(ukupno.ugljikohidrati)}g`)
       .text(`🧈 Masti: ${Math.round(ukupno.masti)}g`);

    doc.moveDown(0.5);

    const dani = [...new Set(obroci.map(o => o.datum))].length || 1;
    doc.text(`📈 Dnevni prosjek kalorija: ${Math.round(ukupno.kalorije / dani)} kcal`);

    const total = ukupno.proteini + ukupno.ugljikohidrati + ukupno.masti || 1;
    const procProteini = Math.round((ukupno.proteini / total) * 100);
    const procUglj = Math.round((ukupno.ugljikohidrati / total) * 100);
    const procMasti = Math.round((ukupno.masti / total) * 100);

    doc.text(`🥧 Makronutrijenti: ${procProteini}% proteini, ${procUglj}% ugljikohidrati, ${procMasti}% masti`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    doc.fontSize(16).fillColor('#1f2937').text('📋 Lista obroka', { underline: true });
    doc.moveDown(0.5);

    const startX = 50;
    const col1 = 30;
    const col2 = 100;
    const col3 = 120;
    const col4 = 70;
    const col5 = 70;
    const col6 = 70;
    const col7 = 70;
    let y = doc.y;

    doc.rect(startX, y - 5, 495, 25).fillColor('#f3f4f6').fill();
    doc.fillColor('#1f2937').fontSize(10)
       .text('RB', startX + 5, y)
       .text('Naziv', startX + col1, y)
       .text('Tip', startX + col1 + col2, y)
       .text('🔥 kcal', startX + col1 + col2 + col3, y)
       .text('🥩 P', startX + col1 + col2 + col3 + col4, y)
       .text('🍞 U', startX + col1 + col2 + col3 + col4 + col5, y)
       .text('🧈 M', startX + col1 + col2 + col3 + col4 + col5 + col6, y)
       .text('😊', startX + col1 + col2 + col3 + col4 + col5 + col6 + col7, y);

    y += 25;
    doc.moveDown(0.5);

    obroci.forEach((obrok, index) => {
      if (y > 750) {
        doc.addPage();
        y = 50;
      }

      if (index % 2 === 0) {
        doc.rect(startX, y - 3, 495, 20).fillColor('#f9fafb').fill();
      }

      doc.fillColor('#374151').fontSize(9)
         .text(`${index + 1}`, startX + 5, y + 2)
         .text(obrok.naziv.substring(0, 20), startX + col1, y + 2)
         .text(obrok.tip || 'Ručak', startX + col1 + col2, y + 2)
         .text(`${Math.round(obrok.kalorije || 0)}`, startX + col1 + col2 + col3, y + 2)
         .text(`${Math.round(obrok.proteini || 0)}`, startX + col1 + col2 + col3 + col4, y + 2)
         .text(`${Math.round(obrok.ugljikohidrati || 0)}`, startX + col1 + col2 + col3 + col4 + col5, y + 2)
         .text(`${Math.round(obrok.masti || 0)}`, startX + col1 + col2 + col3 + col4 + col5 + col6, y + 2)
         .text(`${obrok.mood_before || '😐'}→${obrok.mood_after || '😐'}`, startX + col1 + col2 + col3 + col4 + col5 + col6 + col7, y + 2);

      y += 20;
    });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    doc.fontSize(10).fillColor('#9ca3af')
       .text(`📄 Izvještaj generisan: ${new Date().toLocaleString('hr')}`, { align: 'center' })
       .text('🏥 OS Zdravlja – Operativni sistem za tvoje zdravlje', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('❌ Greška pri generisanju PDF-a:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 28. ZDRAVSTVENI PODACI - SAČUVAJ
// ============================================================
app.post('/api/zdravstveni-podaci', async (req, res) => {
  try {
    const { email, san_sati, kvalitet_sna, nivo_stresa, energija, raspolozenje } = req.body;
    
    console.log(`📊 Čuvam zdravstvene podatke za: ${email}`);
    
    const { data, error } = await supabase
      .from('zdravstveni_podaci')
      .insert([{
        korisnik_email: email,
        datum: new Date().toISOString().split('T')[0],
        san_sati: san_sati || null,
        kvalitet_sna: kvalitet_sna || null,
        nivo_stresa: nivo_stresa || null,
        energija: energija || null,
        raspolozenje: raspolozenje || null
      }])
      .select();

    if (error) throw error;
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 29. ZDRAVSTVENI PODACI - DOHVATI
// ============================================================
app.get('/api/zdravstveni-podaci/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`📊 Dohvatam zdravstvene podatke za: ${email}`);
    
    const { data, error } = await supabase
      .from('zdravstveni_podaci')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false })
      .limit(7);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 30. 🔥 NOTIFIKACIJE - GENERIŠI PREPORUKE
// ============================================================
app.get('/api/notifikacije/preporuke/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`🧠 Generišem preporuke za: ${email}`);

    const { data: profil, error: profilError } = await supabase
      .from('profili')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profilError) throw profilError;
    if (!profil) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const ime = profil.ime || 'Prijatelju';
    const isPremium = profil.premium || false;
    const restrikcije = profil.izbjegava || [];
    const preporuke = [];
    const sat = new Date().getHours();

    const { data: zdravstveni, error: zdravError } = await supabase
      .from('zdravstveni_podaci')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false })
      .limit(7);

    if (zdravError) throw zdravError;

    if (zdravstveni && zdravstveni.length > 0) {
      const prosjekSna = zdravstveni.reduce((acc, z) => acc + (z.san_sati || 0), 0) / zdravstveni.length;
      const prosjekStresa = zdravstveni.reduce((acc, z) => acc + (z.nivo_stresa || 0), 0) / zdravstveni.length;
      const prosjekEnergije = zdravstveni.reduce((acc, z) => acc + (z.energija || 0), 0) / zdravstveni.length;

      if (prosjekSna < 6) {
        preporuke.push({
          tip: 'san',
          poruka: `😴 ${ime}, primjećujem da spavaš manje od 6 sati u prosjeku. Pokušaj ranije na spavanje večeras!`,
          link: '/'
        });
      }

      if (prosjekStresa > 6) {
        preporuke.push({
          tip: 'coach',
          poruka: `🧘 ${ime}, primjećujem da si pod stresom. Isprobaj vježbe disanja ili čaj od kamilice.`,
          link: '/'
        });
      }

      if (prosjekEnergije < 5) {
        preporuke.push({
          tip: 'energija',
          poruka: `⚡ ${ime}, energija ti je na niskom nivou. Probaj smoothie od banane ili proteinski obrok.`,
          link: '/recipes?preferencije=Visokoproteinski'
        });
      }

      if (prosjekSna >= 7 && prosjekStresa < 4 && prosjekEnergije >= 7) {
        preporuke.push({
          tip: 'motivacija',
          poruka: `🌟 Odlično, ${ime}! San, energija i stres su na dobrom nivou. Nastavi ovako!`,
          link: '/profile'
        });
      }
    }

    const namirnice = profil.namirnice || [];
    if (namirnice.length < 3) {
      preporuke.push({
        tip: 'kupovina',
        poruka: `🛒 ${ime}, primjećujem da ti ponestaje namirnica. Vrijeme je za odlazak u trgovinu!`,
        link: '/'
      });
    }

    const danas = new Date().toISOString().split('T')[0];
    
    const { data: danasnjiObroci, error: obrociError } = await supabase
      .from('obroci')
      .select('*')
      .eq('email', email)
      .eq('datum', danas);

    if (obrociError) throw obrociError;

    const imaDoručak = danasnjiObroci?.some(o => o.tip === 'Doručak') || false;
    const imaRučak = danasnjiObroci?.some(o => o.tip === 'Ručak') || false;
    const imaVečeru = danasnjiObroci?.some(o => o.tip === 'Večera') || false;

    const ukupneKalorije = danasnjiObroci?.reduce((sum, o) => sum + (o.kalorije || 0), 0) || 0;

    const zadnjiObrok = danasnjiObroci?.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    )[0];

    if (sat >= 7 && sat <= 10 && !imaDoručak) {
      let poruka = `🌅 ${ime}, vrijeme je za doručak! Dobre jutarnje navike počinju obrokom bogatim proteinima.`;
      if (isPremium) {
        poruka += ` 📊 Danas si uneo/la ${ukupneKalorije} kcal.`;
      }
      preporuke.push({
        tip: 'dorucak',
        poruka: poruka,
        link: '/food-planner'
      });
    }

    if (sat >= 12 && sat <= 15 && !imaRučak) {
      let poruka = `🍽️ ${ime}, vrijeme je za ručak! Ne preskači glavni obrok u danu.`;
      if (isPremium) {
        poruka += ` 📊 Danas si uneo/la ${ukupneKalorije} kcal.`;
      }
      preporuke.push({
        tip: 'rucak',
        poruka: poruka,
        link: '/food-planner'
      });
    }

    if (sat >= 18 && sat <= 21 && !imaVečeru) {
      let poruka = `🌙 ${ime}, vrijeme je za laganu večeru! Izbjegavaj tešku hranu prije spavanja.`;
      if (isPremium) {
        poruka += ` 📊 Danas si uneo/la ${ukupneKalorije} kcal.`;
      }
      preporuke.push({
        tip: 'vecera',
        poruka: poruka,
        link: '/food-planner'
      });
    }

    if (isPremium && zadnjiObrok) {
      const moodAfter = zadnjiObrok.mood_after || '😐';
      const kalorije = zadnjiObrok.kalorije || 0;
      const naziv = zadnjiObrok.naziv || 'obrok';

      let moodPoruka = '';
      if (moodAfter === '😊' || moodAfter === '🤩') {
        moodPoruka = `😊 Odlično se osjećaš nakon jela! Nastavi sa zdravim navikama.`;
      } else if (moodAfter === '😞' || moodAfter === '😡') {
        moodPoruka = `😔 Primjećujem da si loše raspoložen/a nakon jela. Možda probaj laganiji obrok sljedeći put?`;
      } else if (moodAfter === '😴') {
        moodPoruka = `😴 Osjećaš se umorno nakon jela. Probaj manje porcije ili lakšu hranu.`;
      } else if (moodAfter === '😌') {
        moodPoruka = `😌 Opušten/a si nakon jela. To je odličan znak da ti hrana prija!`;
      }

      if (moodPoruka) {
        preporuke.push({
          tip: 'motivacija',
          poruka: `🍽️ Nakon jela "${naziv}" (${kalorije} kcal): ${moodPoruka}`,
          link: '/food-planner'
        });
      }

      if (ukupneKalorije > 0) {
        let kalorijePoruka = '';
        const cilj = 2200;
        const preostalo = cilj - ukupneKalorije;
        
        if (preostalo > 500) {
          kalorijePoruka = `📊 Danas si uneo/la ${ukupneKalorije} kcal. Preostalo ti je ${preostalo} kcal do cilja (${cilj} kcal).`;
        } else if (preostalo > 0) {
          kalorijePoruka = `📊 Danas si uneo/la ${ukupneKalorije} kcal. Odlično, blizu si cilja (${cilj} kcal)!`;
        } else {
          kalorijePoruka = `📊 Danas si uneo/la ${ukupneKalorije} kcal. Prešao/la si cilj (${cilj} kcal) za ${Math.abs(preostalo)} kcal.`;
        }

        preporuke.push({
          tip: 'energija',
          poruka: kalorijePoruka,
          link: '/food-planner'
        });
      }
    }

    if (danasnjiObroci && danasnjiObroci.length > 0) {
      const zadnji = danasnjiObroci.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
      
      if (zadnji) {
        const vrijemeZadnjeg = new Date(zadnji.created_at);
        const satiOdZadnjeg = (Date.now() - vrijemeZadnjeg.getTime()) / (1000 * 60 * 60);
        
        if (satiOdZadnjeg > 5) {
          let poruka = `⏰ ${ime}, prošlo je više od 5 sati od zadnjeg obroka. Vrijeme je za nešto zdravo!`;
          if (isPremium) {
            poruka += ` 📊 Danas si uneo/la ${ukupneKalorije} kcal.`;
          }
          preporuke.push({
            tip: 'podsjetnik',
            poruka: poruka,
            link: '/food-planner'
          });
        }
      }
    }

    let query = supabase.from('recepti').select('*').limit(3);
    
    if (profil.vrsta && profil.vrsta.length > 0) {
      const vrste = profil.vrsta.filter(v => v !== 'Svejedno');
      if (vrste.length > 0) {
        query = query.in('vrsta', vrste);
      }
    }
    
    if (restrikcije.length > 0) {
      const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
      const alergeniRestrikcije = restrikcije.filter(r => 
        alergeniList.some(a => r.toLowerCase().includes(a))
      );
      
      if (alergeniRestrikcije.length > 0) {
        query = query.not('alergeni', '&&', alergeniRestrikcije);
        console.log('🔒 Lifestyle Coach filtriram po alergenima:', alergeniRestrikcije);
      }
    }
    
    const { data: recepti } = await query;
    
    if (recepti && recepti.length > 0) {
      const naziviRecepata = recepti.map(r => r.naziv).join(', ');
      preporuke.push({
        tip: 'recepti',
        poruka: `🍽️ ${ime}, preporučujemo vam recepte: ${naziviRecepata}`,
        link: '/recipes'
      });
    }

    for (const preporuka of preporuke) {
      await createNotification(
        email,
        preporuka.tip,
        preporuka.poruka,
        preporuka.link || '/'
      );
    }

    const { data: notifikacije, error: notifError } = await supabase
      .from('notifikacije')
      .select('*')
      .eq('korisnik_email', email)
      .order('created_at', { ascending: false });

    if (notifError) throw notifError;

    res.json({
      success: true,
      notifikacije: notifikacije || []
    });

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 31. NOTIFIKACIJE - DOHVATI
// ============================================================
app.get('/api/notifikacije/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`🔔 Dohvatam notifikacije za: ${email}`);
    
    const { data, error } = await supabase
      .from('notifikacije')
      .select('*')
      .eq('korisnik_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 32. NOTIFIKACIJE - OZNAČI KAO PROČITANO
// ============================================================
app.put('/api/notifikacije/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✅ Označavam notifikaciju ${id} kao pročitanu`);
    
    const { error } = await supabase
      .from('notifikacije')
      .update({ procitano: true })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 33. NOTIFIKACIJE - OZNAČI SVE KAO PROČITANO
// ============================================================
app.put('/api/notifikacije/:email/read-all', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`✅ Označavam sve notifikacije kao pročitane za: ${email}`);
    
    const { error } = await supabase
      .from('notifikacije')
      .update({ procitano: true })
      .eq('korisnik_email', email)
      .eq('procitano', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 34. NOTIFIKACIJE - IZBRIŠI
// ============================================================
app.delete('/api/notifikacije/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Brisanje notifikacije: ${id}`);
    
    const { error } = await supabase
      .from('notifikacije')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 35. OBROCI - DOHVATI OBROKE
// ============================================================
app.get('/api/obroci/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { datum } = req.query;
    
    console.log(`📊 Dohvatam obroke za: ${email}`);
    
    let query = supabase
      .from('obroci')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (datum) {
      query = query.eq('datum', datum);
    }

    const { data, error } = await query;

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} obroka`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 36. OBROCI - KREIRAJ OBROK
// ============================================================
app.post('/api/obroci', async (req, res) => {
  try {
    const { email, naziv, kalorije, proteini, ugljikohidrati, masti, tip, mood_before, mood_after, mood_note, datum } = req.body;
    
    console.log(`📝 Kreiranje obroka za: ${email}`);
    
    const { data: userData, error: userError } = await supabase
      .from('profili')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;
    if (!userData) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    const { data, error } = await supabase
      .from('obroci')
      .insert([{
        user_id: userData.id,
        email: email,
        naziv: naziv,
        kalorije: kalorije || 0,
        proteini: proteini || 0,
        ugljikohidrati: ugljikohidrati || 0,
        masti: masti || 0,
        tip: tip || 'Ručak',
        vrijeme: new Date().toLocaleTimeString('hr', { hour: '2-digit', minute: '2-digit' }),
        mood_before: mood_before || '😐',
        mood_after: mood_after || '😐',
        mood_note: mood_note || '',
        datum: datum || new Date().toISOString().split('T')[0]
      }])
      .select();

    if (error) throw error;
    console.log('✅ Obrok kreiran:', data);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 37. OBROCI - IZBRIŠI OBROK
// ============================================================
app.delete('/api/obroci/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Brisanje obroka: ${id}`);
    
    const { error } = await supabase
      .from('obroci')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Obrok izbrisan.' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 38. 🔥 COMMUNITY - DOHVATI OBJAVE
// ============================================================
app.get('/api/community/objave', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('📝 Dohvatam objave sa paginacijom...');
    console.log('   Page:', page, 'Limit:', limit);
    
    const { data, error, count } = await supabase
      .from('objave')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;
    
    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 38a. 🔥 COMMUNITY - DOHVATI JEDNU OBJAVU
// ============================================================
app.get('/api/community/objave/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`📝 Dohvatam objavu: ${id}`);
    
    const { data: objava, error: fetchError } = await supabase
      .from('objave')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Objava nije pronađena.' });
      }
      throw fetchError;
    }
    
    const noviPregledi = (objava.pregledi || 0) + 1;
    
    const { error: updateError } = await supabase
      .from('objave')
      .update({ pregledi: noviPregledi })
      .eq('id', id);

    if (updateError) {
      console.error('❌ Greška pri ažuriranju pregleda:', updateError);
    }
    
    res.json({
      success: true,
      data: {
        ...objava,
        pregledi: noviPregledi
      }
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 39. 🔥 COMMUNITY - KREIRAJ OBJAVU
// ============================================================
app.post('/api/community/objave', upload.single('slika'), async (req, res) => {
  try {
    const { email, naziv, vrsta, opis, sastojci, alergeni, vrijeme, tezina, kalorije } = req.body;
    const slika = req.file;
    
    console.log(`📝 Kreiranje objave za: ${email}`);
    console.log(`📦 Alergeni:`, alergeni);
    console.log(`⏱️ Vrijeme:`, vrijeme);
    console.log(`👨‍🍳 Težina:`, tezina);
    console.log(`🍽️ Vrsta:`, vrsta);
    console.log(`🔥 Kalorije:`, kalorije);
    
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('id, ime')
      .eq('email', email)
      .maybeSingle();

    if (userError) throw userError;
    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    let slikaUrl = null;
    if (slika) {
      slikaUrl = await uploadToCloudinary(slika.path, 'community');
      if (fs.existsSync(slika.path)) {
        fs.unlink(slika.path, (err) => { if (err) console.error('⚠️ Greška pri brisanju slike:', err); });
      }
    }

    let alergeniArray = [];
    try {
      alergeniArray = alergeni ? JSON.parse(alergeni) : [];
    } catch (e) {
      console.warn('⚠️ Greška pri parsiranju alergena:', e);
      alergeniArray = [];
    }

    const sastojciArray = sastojci ? sastojci.split(',').map(s => s.trim()).filter(s => s) : [];

    const { data, error } = await supabase
      .from('objave')
      .insert([{
        korisnik_id: user.id,
        korisnik_ime: user.ime || 'Korisnik',
        naziv: naziv,
        vrsta: vrsta || '',
        opis: opis || '',
        sastojci: sastojciArray,
        slika: slikaUrl,
        alergeni: alergeniArray,
        vrijeme: vrijeme || '',
        tezina: tezina || '',
        kalorije: parseInt(kalorije) || 0,
        lajkovi: 0,
        pregledi: 0,
        lajkovi_korisnici: []
      }])
      .select();

    if (error) {
      console.error('❌ Supabase greška:', error);
      throw error;
    }
    
    console.log('✅ Objava kreirana:', data);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 40. COMMUNITY - LAJKUJ OBJAVU
// ============================================================
app.post('/api/community/objave/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    
    console.log(`❤️ Lajk objave ${id} od ${email}`);
    
    const { data: objava, error: fetchError } = await supabase
      .from('objave')
      .select('lajkovi, lajkovi_korisnici, korisnik_email, naziv')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!objava) {
      return res.status(404).json({ error: 'Objava nije pronađena.' });
    }

    const lajkoviKorisnici = objava.lajkovi_korisnici || [];
    let noviLajkovi = objava.lajkovi || 0;
    let lajkovao = false;

    if (lajkoviKorisnici.includes(email)) {
      noviLajkovi--;
      const index = lajkoviKorisnici.indexOf(email);
      lajkoviKorisnici.splice(index, 1);
      lajkovao = false;
    } else {
      noviLajkovi++;
      lajkoviKorisnici.push(email);
      lajkovao = true;
    }

    const { data, error } = await supabase
      .from('objave')
      .update({
        lajkovi: noviLajkovi,
        lajkovi_korisnici: lajkoviKorisnici
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (lajkovao && objava.korisnik_email && objava.korisnik_email !== email) {
      const { data: userData } = await supabase
        .from('profili')
        .select('ime')
        .eq('email', email)
        .maybeSingle();

      const ime = userData?.ime || 'Neko';
      
      await createNotification(
        objava.korisnik_email,
        'lajk',
        `${ime} je lajkovao/la vašu objavu "${objava.naziv}"`,
        `/community`
      );
    }

    res.json({ lajkovi: noviLajkovi, lajkovao });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 41. COMMUNITY - IZBRIŠI OBJAVU
// ============================================================
app.delete('/api/community/objave/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Brisanje objave: ${id}`);
    
    const { data: objava } = await supabase
      .from('objave')
      .select('slika')
      .eq('id', id)
      .maybeSingle();

    if (objava?.slika) {
      const publicId = objava.slika.split('/').pop().split('.')[0];
      await deleteFromCloudinary(`community/${publicId}`);
    }

    const { error } = await supabase
      .from('objave')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Objava izbrisana.' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 42. ZABORAVLJENA LOZINKA
// ============================================================
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`📧 Slanje linka za reset lozinke na: ${email}`);

    if (!email) {
      return res.status(400).json({ error: 'Email je obavezan.' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL || 'http://localhost:5174'}/reset-password`,
    });

    if (error) throw error;

    res.json({ 
      success: true, 
      message: '✅ Link za resetovanje lozinke je poslan na vaš email.' 
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 43. RESET LOZINKE
// ============================================================
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, lozinka } = req.body;
    console.log(`🔐 Resetovanje lozinke`);

    if (!token || !lozinka) {
      return res.status(400).json({ error: 'Token i lozinka su obavezni.' });
    }

    if (lozinka.length < 6) {
      return res.status(400).json({ error: 'Lozinka mora imati najmanje 6 karaktera.' });
    }

    const { error } = await supabase.auth.updateUser({
      password: lozinka
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (error) throw error;

    res.json({ 
      success: true, 
      message: '✅ Lozinka je uspješno promijenjena!' 
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 44. TEST QUIZ ENDPOINT
// ============================================================
app.post('/api/test-quiz', (req, res) => {
  console.log('\n📥 TEST ENDPOINT - Primljen zahtjev');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  
  res.json({
    success: true,
    message: 'Test endpoint radi!',
    received: req.body
  });
});

// ============================================================
// 45. AI SOMELIJER (SA KEŠOM!)
// ============================================================
app.post('/api/ai-sommelier', async (req, res) => {
  console.log('\n🍷 === AI SOMELIJER ===');
  console.log('📦 Recept:', req.body.naziv);
  console.log('📦 Recept ID:', req.body.receptId);
  
  try {
    const { naziv, sastojci, receptId } = req.body;

    if (receptId) {
      const cached = await checkSommelierCache(receptId);
      if (cached) {
        console.log('✅ Keš pronađen za recept:', receptId);
        return res.json({
          zacini: cached.zacini,
          pice: cached.pice,
          prilog: cached.prilog,
          vrijeme_jela: cached.vrijeme_jela,
          _cached: true,
          _cached_at: cached.created_at
        });
      }
    }

    console.log('🔄 Nema keša, generišem odgovor...');

    let result = {
      zacini: 'Origano, bosiljak, crni biber',
      pice: 'Crno vino (Merlot)',
      prilog: 'Krompir na žaru',
      vrijeme_jela: 'Večera (19-21h)'
    };

    if (openai) {
      try {
        const prompt = `Za jelo "${naziv}" sa sastojcima: ${sastojci?.join(', ') || 'nepoznati'}. 
        Predloži:
        1. Začine (2-3)
        2. Piće (vino, sok, čaj...)
        3. Prilog (salata, krompir, povrće...)
        4. Idealno vrijeme za jelo (doručak, ručak, večera...)
        
        Odgovori u JSON formatu: { "zacini": "...", "pice": "...", "prilog": "...", "vrijeme_jela": "..." }`;
        
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });
        
        result = JSON.parse(response.choices[0].message.content);
        console.log('✅ OpenAI odgovor generisan');
      } catch (openaiError) {
        console.error('❌ OpenAI greška:', openaiError.message);
      }
    } else {
      console.log('ℹ️ OpenAI nije dostupan, koristim fallback odgovor');
    }

    if (receptId) {
      await saveSommelierCache(receptId, result);
      console.log('✅ Sačuvano u keš za recept:', receptId);
    }

    res.json({
      ...result,
      _cached: false
    });

  } catch (error) {
    console.error('❌ Greška pri AI Somelijeru:', error);
    res.json({
      zacini: 'Origano, bosiljak, crni biber',
      pice: 'Crno vino (Merlot)',
      prilog: 'Krompir na žaru',
      vrijeme_jela: 'Večera (19-21h)',
      _cached: false,
      _fallback: true
    });
  }
});

// ============================================================
// 46. OČISTI SOMELIJER KEŠ
// ============================================================
app.delete('/api/ai-sommelier/cache/clean', async (req, res) => {
  try {
    console.log('🧹 Čišćenje starog AI Sommelier keša...');
    
    const { error } = await supabase
      .from('ai_sommelier_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    
    res.json({ success: true, message: '✅ Stari Sommelier keš očišćen.' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 47. STRIPE - KREIRAJ CHECKOUT SESSION
// ============================================================
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('💳 Kreiranje Stripe checkout session za:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email je obavezan.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: '⭐ Premium - OS Zdravlja',
            description: 'Otključajte sve Premium funkcionalnosti: AI Chef, HealthyChef, Food Planner, Glasovno kuhanje i još mnogo toga!',
            images: ['https://os-zdravlja.vercel.app/icons/icon-512.png']
          },
          unit_amount: 499,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL || 'https://os-zdravlja.vercel.app'}/premium-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || 'https://os-zdravlja.vercel.app'}/premium-cancel`,
      metadata: { email: email },
      customer_email: email,
    });

    console.log('✅ Stripe session kreiran:', session.id);
    res.json({ url: session.url });

  } catch (error) {
    console.error('❌ Stripe greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 48. VERIFIKACIJA PLAĆANJA
// ============================================================
app.get('/api/verify-payment', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    console.log('🔍 Verifikacija plaćanja, session_id:', session_id);
    
    if (!session_id) {
      return res.status(400).json({ success: false, error: 'Session ID je obavezan.' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status === 'paid') {
      const email = session.metadata.email || session.customer_email;
      console.log('💰 Plaćanje potvrđeno za:', email);
      
      const premiumDo = new Date();
      premiumDo.setDate(premiumDo.getDate() + 30);
      const premiumDoStr = premiumDo.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('profili')
        .update({ 
          premium: true,
          premium_do: premiumDoStr
        })
        .eq('email', email);

      if (error) {
        console.error('❌ Greška pri ažuriranju profila:', error);
        return res.json({ success: false, error: error.message });
      }

      console.log('✅ Premium aktiviran za:', email);
      console.log('📅 Premium važi do:', premiumDoStr);
      return res.json({ success: true, premium: true, premium_do: premiumDoStr });
    }

    res.json({ success: false, premium: false });
  } catch (error) {
    console.error('❌ Greška pri verifikaciji:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 49. STRIPE WEBHOOK
// ============================================================
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook greška:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.metadata.email || session.customer_email;
    
    console.log('💰 Plaćanje (webhook) za:', email);

    try {
      const premiumDo = new Date();
      premiumDo.setDate(premiumDo.getDate() + 30);
      const premiumDoStr = premiumDo.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('profili')
        .update({ 
          premium: true,
          premium_do: premiumDoStr
        })
        .eq('email', email);

      if (error) {
        console.error('❌ Greška pri ažuriranju profila:', error);
      } else {
        console.log('✅ Premium aktiviran (webhook) za:', email);
        console.log('📅 Premium važi do:', premiumDoStr);
        
        await createNotification(
          email,
          'motivacija',
          `🎉 Čestitamo! Vaš Premium nalog je aktiviran do ${premiumDoStr}. Sada imate pristup svim Premium funkcionalnostima!`,
          '/profile'
        );
      }
    } catch (error) {
      console.error('❌ Greška:', error);
    }
  }

  res.json({ received: true });
});

// ============================================================
// 50. NOTIFIKACIJE - REGISTRUJ PUSH SUBSCRIPTION
// ============================================================
app.post('/api/notifikacije/subscribe', async (req, res) => {
  try {
    const { subscription, email } = req.body;
    console.log('📱 Registrujem push subscription za:', email);

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        korisnik_email: email,
        subscription: subscription,
        updated_at: new Date().toISOString()
      }, { onConflict: 'korisnik_email' });

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 51. PREVOD RECEPATA (i18n) - JEDAN RECEPT
// ============================================================
app.post('/api/recepti/translate', async (req, res) => {
  try {
    const { receptId, jezik } = req.body;
    
    if (!receptId || !jezik) {
      return res.status(400).json({ error: 'receptId i jezik su obavezni.' });
    }

    if (!['en', 'de'].includes(jezik)) {
      return res.status(400).json({ error: 'Jezik mora biti "en" ili "de".' });
    }

    console.log(`🔄 Prevodenje recepta ${receptId} na jezik: ${jezik}`);

    const { data: recept, error: receptError } = await supabase
      .from('recepti')
      .select('id, naziv, opis, sastojci, upute, nacin_pripreme')
      .eq('id', receptId)
      .single();

    if (receptError) {
      console.error('❌ Greška pri dohvatu recepta:', receptError);
      return res.status(404).json({ error: 'Recept nije pronađen.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('recepti_prevodi')
      .select('*')
      .eq('recept_id', receptId)
      .eq('jezik', jezik)
      .maybeSingle();

    if (existing) {
      console.log('✅ Prevod već postoji za recept:', receptId);
      return res.json({ success: true, data: existing, cached: true });
    }

    let translation;
    try {
      translation = await translateRecipeText(recept, jezik);
    } catch (translateError) {
      console.error('❌ Greška pri prevodu:', translateError);
      translation = {
        naziv: recept.naziv,
        opis: recept.opis || '',
        sastojci: recept.sastojci || [],
        upute: recept.upute || [],
        nacin_pripreme: recept.nacin_pripreme || ''
      };
    }

    const { data: saved, error: saveError } = await supabase
      .from('recepti_prevodi')
      .insert([{
        recept_id: receptId,
        jezik: jezik,
        naziv: translation.naziv || recept.naziv,
        opis: translation.opis || recept.opis || '',
        sastojci: translation.sastojci || recept.sastojci || [],
        upute: translation.upute || recept.upute || [],
        nacin_pripreme: translation.nacin_pripreme || recept.nacin_pripreme || ''
      }])
      .select()
      .single();

    if (saveError) {
      console.error('❌ Greška pri spremanju prevoda:', saveError);
      return res.json({
        success: true,
        data: {
          naziv: translation.naziv || recept.naziv,
          opis: translation.opis || recept.opis || '',
          sastojci: translation.sastojci || recept.sastojci || [],
          upute: translation.upute || recept.upute || [],
          nacin_pripreme: translation.nacin_pripreme || recept.nacin_pripreme || ''
        },
        cached: false,
        saved_to_db: false
      });
    }

    console.log(`✅ Prevod na ${jezik} sačuvan za recept:`, receptId);
    res.json({ success: true, data: saved, cached: false, saved_to_db: true });

  } catch (error) {
    console.error('❌ Greška pri prevodu recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 52. MASOVNI PREVOD SVIH RECEPATA
// ============================================================
app.post('/api/recepti/translate-all', async (req, res) => {
  try {
    const { jezik } = req.body;
    
    if (!jezik || !['en', 'de'].includes(jezik)) {
      return res.status(400).json({ error: 'Parametar "jezik" je obavezan (en ili de).' });
    }

    console.log(`🔄 Masovni prevod recepata na jezik: ${jezik}`);

    const { data: recipes, error: recipesError } = await supabase
      .from('recepti')
      .select('id, naziv, opis, sastojci, upute, nacin_pripreme')
      .not('id', 'in', (
        supabase.from('recepti_prevodi').select('recept_id').eq('jezik', jezik)
      ));

    if (recipesError) {
      console.error('❌ Greška pri dohvatu recepata:', recipesError);
      return res.status(500).json({ error: recipesError.message });
    }

    if (!recipes || recipes.length === 0) {
      return res.json({
        success: true,
        message: `Svi recepti su već prevedeni na ${jezik}.`,
        total: 0,
        translated: 0,
        failed: 0
      });
    }

    console.log(`📊 Pronađeno ${recipes.length} recepata za prevod na ${jezik}`);

    let translated = 0;
    let failed = 0;
    const errors = [];

    for (const recipe of recipes) {
      try {
        const translation = await translateRecipeText(recipe, jezik);

        const { error: saveError } = await supabase
          .from('recepti_prevodi')
          .insert([{
            recept_id: recipe.id,
            jezik: jezik,
            naziv: translation.naziv || recipe.naziv,
            opis: translation.opis || recipe.opis || '',
            sastojci: translation.sastojci || recipe.sastojci || [],
            upute: translation.upute || recipe.upute || [],
            nacin_pripreme: translation.nacin_pripreme || recipe.nacin_pripreme || ''
          }]);

        if (saveError) {
          throw new Error(saveError.message);
        }

        translated++;
        console.log(`✅ ${translated}/${recipes.length}: ${recipe.naziv}`);
      } catch (err) {
        failed++;
        errors.push({ id: recipe.id, naziv: recipe.naziv, error: err.message });
        console.error(`❌ Greška za ${recipe.naziv}:`, err.message);
      }
    }

    res.json({
      success: true,
      total: recipes.length,
      translated,
      failed,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Greška pri masovnom prevodu:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 53. STATUS PREVODA
// ============================================================
app.get('/api/recepti/translate/status', async (req, res) => {
  try {
    const { jezik } = req.query;

    const { count: totalRecipes, error: totalError } = await supabase
      .from('recepti')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    if (jezik && ['en', 'de'].includes(jezik)) {
      const { count: missing, error: missingError } = await supabase
        .from('recepti')
        .select('*', { count: 'exact', head: true })
        .not('id', 'in', (
          supabase.from('recepti_prevodi').select('recept_id').eq('jezik', jezik)
        ));

      if (missingError) throw missingError;

      return res.json({
        success: true,
        total_recipes: totalRecipes || 0,
        missing_translations: missing || 0,
        translated: (totalRecipes || 0) - (missing || 0),
        jezik: jezik
      });
    }

    const { count: missingAny, error: missingAnyError } = await supabase
      .from('recepti')
      .select('*', { count: 'exact', head: true })
      .not('id', 'in', (
        supabase.from('recepti_prevodi').select('recept_id')
      ));

    if (missingAnyError) throw missingAnyError;

    const { count: enCount, error: enError } = await supabase
      .from('recepti_prevodi')
      .select('*', { count: 'exact', head: true })
      .eq('jezik', 'en');

    if (enError) throw enError;

    const { count: deCount, error: deError } = await supabase
      .from('recepti_prevodi')
      .select('*', { count: 'exact', head: true })
      .eq('jezik', 'de');

    if (deError) throw deError;

    res.json({
      success: true,
      total_recipes: totalRecipes || 0,
      missing_translations: missingAny || 0,
      en_translations: enCount || 0,
      de_translations: deCount || 0,
      fully_translated: (totalRecipes || 0) - (missingAny || 0) === (totalRecipes || 0)
    });

  } catch (error) {
    console.error('❌ Greška pri provjeri statusa prevoda:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 54. 🔥 CRON JOB - PREMIUM ISTEK
// ============================================================
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  try {
    console.log('🔄 Provjeravam Premium istoke...');
    
    const danas = new Date();
    const danasStr = danas.toISOString().split('T')[0];
    
    const { data: expiredUsers, error } = await supabase
      .from('profili')
      .select('email, ime')
      .eq('premium', true)
      .lt('premium_do', danasStr);
    
    if (error) {
      console.error('❌ Greška pri dohvatu:', error);
      return;
    }
    
    if (expiredUsers.length === 0) {
      console.log('✅ Nema isteklih Premium korisnika');
      return;
    }
    
    console.log(`⏰ Pronađeno ${expiredUsers.length} korisnika sa isteklim Premiumom`);
    
    for (const user of expiredUsers) {
      console.log(`   - ${user.email} (${user.ime || 'Bez imena'})`);
      
      const { error: updateError } = await supabase
        .from('profili')
        .update({ 
          premium: false,
          premium_do: null
        })
        .eq('email', user.email);
      
      if (updateError) {
        console.error(`❌ Greška pri deaktivaciji ${user.email}:`, updateError);
      } else {
        console.log(`✅ Deaktiviran: ${user.email}`);
      }
    }
    
    console.log(`✅ Završeno. Deaktivirano ${expiredUsers.length} korisnika.`);
  } catch (error) {
    console.error('❌ Cron greška:', error);
  }
});

console.log('⏰ Cron job za Premium istok postavljen (svaki dan u 00:00)');

// ============================================================
// 🏆 NAGRADE - PROVJERI I DODIJELI BEDŽEVE
// ============================================================
async function checkAndAwardBadges(email, akcija, podaci = {}) {
  console.log(`🏆 Provjeravam bedževe za ${email}, akcija: ${akcija}`);
  
  try {
    const { data: sviBadgevi, error: badgeError } = await supabase
      .from('badges')
      .select('*');
    
    if (badgeError) {
      console.error('❌ Greška pri dohvatu badgeva:', badgeError);
      return [];
    }
    
    if (!sviBadgevi || sviBadgevi.length === 0) {
      console.log('ℹ️ Nema definiranih badgeva u bazi');
      return [];
    }
    
    const { data: postojeci, error: postError } = await supabase
      .from('korisnik_badges')
      .select('badge_id')
      .eq('korisnik_email', email);
    
    if (postError) {
      console.error('❌ Greška pri dohvatu korisnikovih badgeva:', postError);
      return [];
    }
    
    const postojeciIds = postojeci?.map(b => b.badge_id) || [];
    const noviBadgevi = [];
    
    for (const badge of sviBadgevi) {
      if (postojeciIds.includes(badge.id)) {
        console.log(`ℹ️ Korisnik već ima bedž: ${badge.naziv}`);
        continue;
      }
      
      let ispunjen = false;
      
      switch (badge.uvjet_type) {
        case 'broj_objava': {
          const { count: brojObjava, error: countError } = await supabase
            .from('objave')
            .select('*', { count: 'exact', head: true })
            .eq('korisnik_email', email);
          
          if (countError) {
            console.error('❌ Greška pri brojanju objava:', countError);
            continue;
          }
          
          ispunjen = (brojObjava || 0) >= badge.uvjet_value;
          console.log(`📊 Korisnik ima ${brojObjava || 0} objava, potrebno ${badge.uvjet_value} za ${badge.naziv}: ${ispunjen ? '✅' : '❌'}`);
          break;
        }
        
        case 'broj_lajkova': {
          const { data: objaveKorisnika, error: objaveError } = await supabase
            .from('objave')
            .select('lajkovi')
            .eq('korisnik_email', email);
          
          if (objaveError) {
            console.error('❌ Greška pri dohvatu objava:', objaveError);
            continue;
          }
          
          const ukupnoLajkova = objaveKorisnika?.reduce((sum, o) => sum + (o.lajkovi || 0), 0) || 0;
          ispunjen = ukupnoLajkova >= badge.uvjet_value;
          console.log(`📊 Korisnik ima ${ukupnoLajkova} ukupno lajkova, potrebno ${badge.uvjet_value} za ${badge.naziv}: ${ispunjen ? '✅' : '❌'}`);
          break;
        }
        
        case 'broj_dana': {
          const { data: objave, error: objaveError } = await supabase
            .from('objave')
            .select('created_at')
            .eq('korisnik_email', email)
            .order('created_at', { ascending: false });
          
          if (objaveError) {
            console.error('❌ Greška pri dohvatu objava:', objaveError);
            continue;
          }
          
          if (objave && objave.length > 0) {
            const dani = new Set();
            objave.forEach(o => {
              const dan = new Date(o.created_at).toISOString().split('T')[0];
              dani.add(dan);
            });
            ispunjen = dani.size >= badge.uvjet_value;
            console.log(`📊 Korisnik je objavljivao ${dani.size} različitih dana, potrebno ${badge.uvjet_value} za ${badge.naziv}: ${ispunjen ? '✅' : '❌'}`);
          }
          break;
        }
        
        default: {
          console.warn(`⚠️ Nepoznat uvjet_type: ${badge.uvjet_type}`);
          continue;
        }
      }
      
      if (ispunjen) {
        const { error: insertError } = await supabase
          .from('korisnik_badges')
          .insert([{
            korisnik_email: email,
            badge_id: badge.id,
            osvojeno_na: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error(`❌ Greška pri dodjeli bedža ${badge.naziv}:`, insertError);
          continue;
        }
        
        noviBadgevi.push(badge);
        console.log(`🏆 Dodijeljen bedž: ${badge.naziv} za ${email}`);
        
        await createNotification(
          email,
          'bedz',
          `🎉 Čestitamo! Osvojili ste bedž "${badge.naziv}"! ${badge.opis || ''}`,
          '/profile'
        );
      }
    }
    
    if (noviBadgevi.length > 0) {
      console.log(`🏆 Ukupno dodijeljeno ${noviBadgevi.length} novih bedževa za ${email}`);
    } else {
      console.log(`ℹ️ Nema novih bedževa za ${email}`);
    }
    
    return noviBadgevi;
    
  } catch (error) {
    console.error('❌ Greška pri provjeri bedževa:', error);
    return [];
  }
}

// ============================================================
// 🏆 NAGRADE - PROVJERI I DODIJELI BEDŽEVE (ENDPOINT)
// ============================================================
app.post('/api/badges/check', async (req, res) => {
  try {
    const { email, akcija, podaci } = req.body;
    
    console.log(`📥 Zahtjev za provjeru bedževa: ${email}, akcija: ${akcija}`);
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }
    
    const noviBadgevi = await checkAndAwardBadges(email, akcija, podaci);
    
    res.json({
      success: true,
      noviBadgevi: noviBadgevi,
      message: noviBadgevi.length > 0 
        ? `🎉 Osvojili ste ${noviBadgevi.length} novih bedževa!` 
        : 'Nema novih bedževa.'
    });
    
  } catch (error) {
    console.error('❌ Greška pri provjeri bedževa:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 🏆 NAGRADE - DOHVATI KORISNIKOVE BEDŽEVE
// ============================================================
app.get('/api/badges/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`📥 Dohvatam bedževe za: ${email}`);
    
    const { data, error } = await supabase
      .from('korisnik_badges')
      .select(`
        id,
        osvojeno_na,
        created_at,
        badge:badges(
          id,
          kljuc,
          naziv,
          opis,
          ikona,
          uvjet_type,
          uvjet_value
        )
      `)
      .eq('korisnik_email', email)
      .order('osvojeno_na', { ascending: false });
    
    if (error) {
      console.error('❌ Greška pri dohvatu badgeva:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    const validBadges = data?.filter(item => item.badge !== null) || [];
    
    console.log(`✅ Dohvaćeno ${validBadges.length} bedževa za ${email}`);
    
    res.json({
      success: true,
      badges: validBadges,
      count: validBadges.length
    });
    
  } catch (error) {
    console.error('❌ Greška pri dohvatu badgeva:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 🏆 NAGRADE - DOHVATI SVE BEDŽEVE SA STATUSOM
// ============================================================
app.get('/api/badges/all/:email?', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log(`📥 Dohvatam sve bedževe${email ? ` za korisnika ${email}` : ''}`);
    
    const { data: sviBadgevi, error: badgeError } = await supabase
      .from('badges')
      .select('*')
      .order('uvjet_value', { ascending: true });
    
    if (badgeError) {
      console.error('❌ Greška pri dohvatu badgeva:', badgeError);
      return res.status(500).json({ 
        success: false, 
        error: badgeError.message 
      });
    }
    
    let korisnikBadgevi = [];
    if (email) {
      const { data: korisnikData, error: korisnikError } = await supabase
        .from('korisnik_badges')
        .select('badge_id, osvojeno_na')
        .eq('korisnik_email', email);
      
      if (!korisnikError && korisnikData) {
        korisnikBadgevi = korisnikData;
      }
    }
    
    const badgesWithStatus = sviBadgevi?.map(badge => {
      const osvojen = korisnikBadgevi.find(kb => kb.badge_id === badge.id);
      return {
        ...badge,
        osvojen: !!osvojen,
        osvojeno_na: osvojen?.osvojeno_na || null
      };
    }) || [];
    
    res.json({
      success: true,
      badges: badgesWithStatus,
      count: badgesWithStatus.length
    });
    
  } catch (error) {
    console.error('❌ Greška pri dohvatu badgeva:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 🏆 NAGRADE - RUČNA DODJELA BEDŽA (ADMIN)
// ============================================================
app.post('/api/badges/award', async (req, res) => {
  try {
    const { email, badge_key } = req.body;
    
    if (!email || !badge_key) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email i badge_key su obavezni.' 
      });
    }
    
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .select('id, naziv')
      .eq('kljuc', badge_key)
      .maybeSingle();
    
    if (badgeError || !badge) {
      return res.status(404).json({ 
        success: false, 
        error: `Bedž sa ključem "${badge_key}" nije pronađen.` 
      });
    }
    
    const { data: existing, error: existingError } = await supabase
      .from('korisnik_badges')
      .select('id')
      .eq('korisnik_email', email)
      .eq('badge_id', badge.id)
      .maybeSingle();
    
    if (existingError) {
      console.error('❌ Greška pri provjeri:', existingError);
      return res.status(500).json({ 
        success: false, 
        error: existingError.message 
      });
    }
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: 'Korisnik već ima ovaj bedž.' 
      });
    }
    
    const { data: newBadge, error: insertError } = await supabase
      .from('korisnik_badges')
      .insert([{
        korisnik_email: email,
        badge_id: badge.id,
        osvojeno_na: new Date().toISOString()
      }])
      .select();
    
    if (insertError) {
      console.error('❌ Greška pri dodjeli:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: insertError.message 
      });
    }
    
    console.log(`🏆 Ručno dodijeljen bedž ${badge.naziv} za ${email}`);
    
    await createNotification(
      email,
      'bedz',
      `🎉 Čestitamo! Osvojili ste bedž "${badge.naziv}"!`,
      '/profile'
    );
    
    res.json({
      success: true,
      message: `✅ Bedž "${badge.naziv}" uspješno dodijeljen.`,
      data: newBadge?.[0] || null
    });
    
  } catch (error) {
    console.error('❌ Greška pri dodjeli bedža:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 55. FALLBACK RUTA
// ============================================================
app.use('/*path', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `Ruta ${req.originalUrl} nije pronađena` 
  });
});

// ============================================================
// POKRENI SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(`✅ Server pokrenut na http://localhost:${PORT}`);
  console.log('=================================\n');
});