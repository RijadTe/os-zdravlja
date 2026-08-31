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
  'GROQ_API_KEY',
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
const cron = require('node-cron');
const Groq = require('groq-sdk');
const xss = require('xss');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');


const app = express();

// Render koristi proxy, ovo je obavezno!
app.set('trust proxy', true);

// ============================================================
// PROVJERA ENV VARIJABLI (detaljna)
// ============================================================
console.log('🔍 Provjera .env:');
console.log('PORT:', process.env.PORT || '5000');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅' : '❌');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅' : '❌');
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
// 🔥 MIDDLEWARE - CORS (DINAMIČKI)
// ============================================================
const allowedOrigins = [
  // Produkcija
  'https://os-zdravlja.vercel.app',
  'https://os-zdravlja-backend.onrender.com',
  
  // Lokalni development
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  
  // Capacitor (Android/iOS)
  'capacitor://localhost',
  'capacitor://localhost:5174',
  'ionic://localhost',
  'http://localhost',
  'http://127.0.0.1',
  'https://localhost',
  'https://127.0.0.1',
  
  // Za emulator
  'http://10.0.2.2:5174',  // Android emulator
  'http://10.0.2.2:5173',       
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
// 🔥🔥🔥 DODAJ OVDJE - XSS + CSRF ZAŠTITA 🔥🔥🔥
// ============================================================



// 1. XSS SANITIZACIJA - Čisti sve inpute
app.use((req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
});
console.log('✅ XSS sanitizacija aktivirana');

// 2. COOKIE PARSER - Potreban za CSRF
app.use(cookieParser());

// 3. CSRF ZAŠTITA
app.use(csrf({ cookie: true }));
console.log('✅ CSRF zaštita aktivirana');

// 4. CSRF VALIDACIJA ZA SVE METODE KOJE MIJENJAJU PODATKE
app.use('/api/*', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body._csrf;
    if (!token || token !== req.csrfToken()) {
      console.warn(`🚫 CSRF blokiran: ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ 
        success: false, 
        error: 'CSRF token nevažeći!' 
      });
    }
  }
  next();
});
console.log('✅ CSRF validacija za POST/PUT/DELETE/PATCH aktivirana');

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
console.log('   - AI: 50 pretraga/min (CACHE 120 dana)');
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
      
      await supabase
        .from('profili')
        .update({ 
          premium: true,
          premium_do: premiumDoStr
        })
        .eq('email', email);

      console.log('✅ Premium aktiviran za:', email);
      
      await createNotification(
        email,
        'motivacija',
        `🎉 Čestitamo! Vaš Premium nalog je aktiviran do ${premiumDoStr}.`,
        '/profile'
      );
      
    } catch (error) {
      console.error('❌ Greška:', error);
    }
  }

  res.json({ received: true });
});
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
// 🔥🔥🔥 GROQ INICIJALIZACIJA (DODAJ OVDJE!) 🔥🔥🔥
// ============================================================
let groq = null;
if (process.env.GROQ_API_KEY) {
  try {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('✅ Groq povezan za AI Chat!');
  } catch (error) {
    console.warn('⚠️ Groq nije dostupan:', error.message);
  }
} else {
  console.warn('⚠️ GROQ_API_KEY nije postavljen, AI Chat neće raditi.');
}


// ============================================================
// 🔥 PREMIUM FUNKCIJE - PROVJERA STATUSA
// ============================================================
async function checkPremiumStatus(email) {
  try {
    if (!email) return { isPremium: false, error: 'Email je obavezan' };
    
    const { data: profile, error } = await supabase
      .from('profili')
      .select('premium, premium_do, ime')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('❌ Greška pri provjeri premiuma:', error);
      return { isPremium: false, error: error.message };
    }
    
    if (!profile) {
      return { isPremium: false, error: 'Korisnik nije pronađen' };
    }
    
    if (!profile.premium) {
      return { isPremium: false, premium_do: null };
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (profile.premium_do && profile.premium_do < today) {
      console.log(`⏰ Premium istekao za ${email} (${profile.premium_do}), deaktiviram...`);
      
      const { error: updateError } = await supabase
        .from('profili')
        .update({ 
          premium: false,
          premium_do: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
      
      if (updateError) {
        console.error('❌ Greška pri deaktivaciji:', updateError);
        return { isPremium: false, error: updateError.message };
      }
      
      return { isPremium: false, premium_do: null, expired: true };
    }
    
    return { 
      isPremium: true, 
      premium_do: profile.premium_do,
      ime: profile.ime
    };
  } catch (error) {
    console.error('❌ Greška pri provjeri premiuma:', error);
    return { isPremium: false, error: error.message };
  }
}

// ============================================================
// 🔥 MIDDLEWARE - ZAŠTITA PREMIUM ENDPOINTA
// ============================================================
async function requirePremium(req, res, next) {
  try {
    const email = req.body.email || req.query.email || req.params.email;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan za premium funkcionalnosti.' 
      });
    }
    
    const premiumStatus = await checkPremiumStatus(email);
    
    if (!premiumStatus.isPremium) {
      return res.status(403).json({ 
        success: false, 
        error: 'Ova funkcionalnost je dostupna samo Premium korisnicima. Obnovite Premium za nastavak.',
        premium_do: premiumStatus.premium_do,
        expired: premiumStatus.expired || false
      });
    }
    
    req.premiumStatus = premiumStatus;
    next();
  } catch (error) {
    console.error('❌ Greška u premium middleware-u:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

console.log('✅ Premium middleware aktiviran');

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
// 🔥 AI CHEF HELPER FUNKCIJE
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
  expiresAt.setDate(expiresAt.getDate() + 120);

  const { data, error } = await supabase
    .from('ai_chef_cache')
    .upsert({
      input_hash: inputHash,
      input_type: inputType,
      results: results,
      expires_at: expiresAt.toISOString()
    }, {
      onConflict: 'input_hash'
    })
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

// ============================================================
// NOTIFIKACIJE - KREIRAJ (SA PROVJEROM DUPLIKATA)
// ============================================================
async function createNotification(email, tip, poruka, link = '/') {
  try {
    // 🔥 PROVJERI DA LI VEĆ POSTOJI ISTA NOTIFIKACIJA DANAS
    const danas = new Date().toISOString().split('T')[0];
    
    const { data: existing, error: checkError } = await supabase
      .from('notifikacije')
      .select('id')
      .eq('korisnik_email', email)
      .eq('tip', tip)
      .eq('poruka', poruka)
      .gte('created_at', `${danas}T00:00:00.000Z`)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Greška pri provjeri duplikata:', checkError);
    }

    // 🔥 AKO POSTOJI - NE KREIRAJ NOVU! (NIŠTA NE RADIŠ S NJOM!)
    if (existing) {
      console.log(`ℹ️ Notifikacija već postoji danas za ${email} (${tip})`);
      return existing;
    }

    // 🔥 KREIRAJ NOVU NOTIFIKACIJU (SAMO AKO NE POSTOJI)
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
// 🔥 FALLBACK PLAN GENERATOR (ZADNJA OPCIJA - SAMO AKO SVE PADNE)
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
// 🔥 REGISTRACIJA - DODAT preferred_language
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
      const { email, ime, lozinka, preferred_language } = req.body;

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
          preferred_language: preferred_language || 'hr',
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
      console.log('🌍 preferred_language sačuvan:', preferred_language || 'hr');

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
            preferred_language: 'hr',
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
          preferred_language: 'hr',
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
      faza_id,
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
    console.log('   Faza ID:', faza_id);
    
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
    
    // 🔥 ISPRAVLJEN QUERY - PRAVILAN JOIN ZA SUPABASE
    let query = supabase
      .from('recepti')
      .select(`
        *,
        faza_id,
        prevod:recepti_prevodi(
          naziv,
          opis,
          sastojci,
          upute,
          nacin_pripreme
        )
      `, { count: 'exact' });

    // 🔥 FILTRIRAJ PO JEZIKU (ako nije hrvatski)
    if (jezik && jezik !== 'hr') {
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

    if (faza_id) {
      query = query.eq('faza_id', faza_id);
      console.log('✅ Filtriram po fazi:', faza_id);
    }

    if (restrikcijeArray.length > 0) {
      const hasNoRestrictions = restrikcijeArray.some(r => 
        r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        query = query.contains('izbjegava', restrikcijeArray);
        console.log('✅ Filtriram po izbjegava (recept nema):', restrikcijeArray);
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
    
    // 🔥 OBRADI REZULTATE - ako postoji prevod, zamijeni polja
    const processedRecipes = data.map(recipe => {
      // Ako postoji prevod i nije hrvatski jezik
      if (recipe.prevod && recipe.prevod.length > 0 && jezik !== 'hr') {
        const prevod = recipe.prevod[0]; // Uzmi prvi prevod
        return {
          ...recipe,
          naziv: prevod.naziv || recipe.naziv,
          opis: prevod.opis || recipe.opis,
          sastojci: prevod.sastojci || recipe.sastojci,
          upute: prevod.upute || recipe.upute,
          nacin_pripreme: prevod.nacin_pripreme || recipe.nacin_pripreme,
          prevod: undefined // Ukloni prevod iz odgovora
        };
      }
      // Ako nema prevoda, vrati recept bez prevod polja
      const { prevod, ...recipeWithoutPrevod } = recipe;
      return recipeWithoutPrevod;
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
        prevod:recepti_prevodi(
          naziv,
          opis,
          sastojci,
          upute,
          nacin_pripreme
        )
      `)
      .eq('id', id);

    if (jezik && jezik !== 'hr') {
      query = query.eq('prevod.jezik', jezik);
    }

    const { data: recipe, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Recept nije pronađen' });
      }
      throw error;
    }

    // 🔥 OBRADI REZULTAT - ako postoji prevod, zamijeni polja
    if (recipe.prevod && recipe.prevod.length > 0 && jezik !== 'hr') {
      const prevod = recipe.prevod[0];
      recipe.naziv = prevod.naziv || recipe.naziv;
      recipe.opis = prevod.opis || recipe.opis;
      recipe.sastojci = prevod.sastojci || recipe.sastojci;
      recipe.upute = prevod.upute || recipe.upute;
      recipe.nacin_pripreme = prevod.nacin_pripreme || recipe.nacin_pripreme;
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
        query = query.contains('izbjegava', restrikcije);
        console.log('✅ Filtriram po izbjegava (recept nema):', restrikcije);
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
// 13. DOHVATI PROFIL - BEZ TOKEN VALIDACIJE (RADI!)
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

    if (error) {
      console.error('❌ Greška pri dohvatu profila:', error);
      throw error;
    }
    
    if (!data) {
      console.log(`ℹ️ Profil ne postoji za: ${email}`);
      return res.status(404).json({ success: false, error: 'Profil nije pronađen' });
    }
    
    console.log(`✅ Profil pronađen za: ${email}`);
    console.log(`🌍 preferred_language:`, data.preferred_language || 'hr');
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Greška pri dohvatu profila:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 14. AŽURIRAJ PROFIL - BEZ TOKEN VALIDACIJE (RADI!)
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

    if (error) {
      console.error('❌ Greška pri ažuriranju:', error);
      throw error;
    }
    
    console.log(`✅ Profil ažuriran za: ${email}`);
    res.json({ success: true, data: data ? data[0] : null });
  } catch (error) {
    console.error('❌ Greška pri ažuriranju profila:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 15. KREIRAJ PROFIL - DODAT preferred_language
// ============================================================
app.post('/api/profil', async (req, res) => {
  try {
    const { 
      email, 
      ime, 
      premium, 
      kviz_zavrsen, 
      vrsta, 
      izbjegava, 
      preferencije,
      preferred_language 
    } = req.body;
    
    console.log('🆕 Kreiranje profila:', email);
    console.log('🌍 preferred_language:', preferred_language);

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
        preferred_language: preferred_language || 'hr',
        twofa_secret: null,
        twofa_enabled: false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    console.log('✅ Profil kreiran sa preferred_language:', preferred_language || 'hr');
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 16. 🔥 IZBRIŠI PROFIL - POPRAVLJENO BRISANJE (BRISE I AUTH USER-A)
// ============================================================
app.delete('/api/profil/:email/delete', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('🗑️ Brisanje profila i auth user-a za:', email);
    
    const { data: userData, error: userError } = await supabase
      .from('profili')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (userError) throw userError;
    
    const { error: deleteProfileError } = await supabase
      .from('profili')
      .delete()
      .eq('email', email);
    
    if (deleteProfileError) throw deleteProfileError;
    
    if (userData?.id) {
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
        userData.id
      );
      
      if (deleteAuthError) {
        console.warn('⚠️ Greška pri brisanju auth user-a:', deleteAuthError);
      } else {
        console.log('✅ Auth user obrisan:', userData.id);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Profil i auth user uspješno izbrisani. Email je ponovo slobodan za registraciju.' 
    });
    
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 🔥🔥🔥 HEALTHY CHEF - POPRAVLJENI ENDPOINTI
// ============================================================

// ============================================================
// 17. 🔥 DOHVATI SVE KATEGORIJE I FAZE - HIJERARHIJSKI
// ============================================================
app.get('/api/healthy-chef/kategorije', async (req, res) => {
  try {
    console.log('🌿 Dohvatam HealthyChef kategorije...');
    
    const { data, error } = await supabase
      .from('healthy_chef_kategorije')
      .select('*')
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('redoslijed', { ascending: true });

    if (error) throw error;
    
    const kategorije = data?.filter(item => item.parent_id === null) || [];
    const faze = data?.filter(item => item.parent_id !== null) || [];
    
    const hijerarhijski = kategorije.map(kategorija => ({
      ...kategorija,
      faze: faze.filter(faza => faza.parent_id === kategorija.id)
    }));
    
    console.log(`✅ Dohvaćeno ${kategorije.length} kategorija i ${faze.length} faza`);
    res.json({
      success: true,
      data: hijerarhijski
    });
    
  } catch (error) {
    console.error('❌ Greška pri dohvatu kategorija:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 18. DOHVATI RECEPTE ZA HEALTHY CHEF
// ============================================================
app.get('/api/healthy-chef/recepti', async (req, res) => {
  try {
    const { fazaId, kategorijaId, email, vrsta, vrijeme, tezina, page = 1, limit = 20 } = req.query;
    
    console.log(`🌿 Dohvatam recepte za: ${fazaId || kategorijaId || 'sve'}`);
    console.log(`👤 Korisnik: ${email}`);
    console.log('📦 Filteri:', { vrsta, vrijeme, tezina });
    console.log(`📄 Page: ${page}, Limit: ${limit}`);
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
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
    
    let query = supabase
      .from('recepti')
      .select('*', { count: 'exact' });
    
    if (fazaId) {
      query = query.eq('faza_id', fazaId);
      console.log(`📍 Filtriram po fazi: ${fazaId}`);
    } else if (kategorijaId) {
      query = query.eq('kategorija_id', kategorijaId);
      console.log(`📍 Filtriram po kategoriji: ${kategorijaId}`);
    }
    
    if (vrsta) {
      query = query.eq('vrsta', vrsta);
      console.log(`📍 Filtriram po vrsti: ${vrsta}`);
    }
    if (vrijeme) {
      query = query.eq('vrijeme', vrijeme);
      console.log(`📍 Filtriram po vremenu: ${vrijeme}`);
    }
    if (tezina) {
      query = query.eq('tezina', tezina);
      console.log(`📍 Filtriram po težini: ${tezina}`);
    }
    
    const { data: recepti, error, count } = await query;
    
    if (error) {
      console.error('❌ Greška pri dohvatu recepata:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`📊 Pronađeno ${recepti?.length || 0} recepata`);
    
    let filteredRecepti = recepti || [];
    
    if (userRestrictions.length > 0) {
      const hasNoRestrictions = userRestrictions.some(r => 
        r === 'Bez restrikcija' || 
        r === 'No restrictions' || 
        r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        filteredRecepti = filteredRecepti.filter(recipe => {
          const izbjegava = recipe.izbjegava || [];
          return userRestrictions.every(r => izbjegava.includes(r));
        });
        console.log(`🔒 Nakon filtriranja po izbjegava: ${filteredRecepti.length} recepata`);
      } else {
        console.log(`✅ Korisnik nema restrikcija - prikazujem sve recepte`);
      }
    }
    
    console.log(`✅ Vraćam ${filteredRecepti.length} recepata za korisnika`);
    
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
// 19. 🔥🔥🔥 WEEKLY PLAN - KOMBINOVANI PRISTUP (BAZA + OPENAI)
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
    
    console.log('📊 Generišem sedmični plan (KOMBINOVANI)...');
    console.log('🔒 Restrikcije:', restrikcije);
    console.log('📦 Sastojci:', sastojci?.length || 0);
    console.log('🎯 Cilj kalorija:', kalorije);

    // ============================================================
    // 1. DOHVATI KORISNIKA
    // ============================================================
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

    // ============================================================
    // 2. DOHVATI RECEPTE IZ BAZE
    // ============================================================
    let query = supabase
      .from('recepti')
      .select('*');

    if (restrikcije && restrikcije.length > 0) {
      const hasNoRestrictions = restrikcije.some(r => 
        r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        query = query.contains('izbjegava', restrikcije);
        console.log('🔒 Filtriram po izbjegava:', restrikcije);
      }
    }

    const { data: recepti, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Greška pri dohvatu recepata' });
    }

    console.log(`📚 Ukupno recepata u bazi: ${recepti?.length || 0}`);

    // ============================================================
    // 3. FILTRIRAJ PO KALORIJAMA
    // ============================================================
    const kalorijePoObroku = Math.round((kalorije || 2200) / 3);
    const minKcal = Math.round(kalorijePoObroku * 0.5);
    const maxKcal = Math.round(kalorijePoObroku * 1.3);
    
    let filtered = (recepti || []).filter(recipe => {
      const kcal = typeof recipe.kalorije === 'string' 
        ? parseInt(recipe.kalorije) 
        : recipe.kalorije || 0;
      return kcal >= minKcal && kcal <= maxKcal;
    });
    
    console.log(`📊 Nakon kalorija (${minKcal}-${maxKcal} kcal): ${filtered.length} recepata`);

    // ============================================================
    // 4. FILTRIRAJ PO SASTOJCIJAMA
    // ============================================================
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

    // ============================================================
    // 5. FILTRIRAJ PO VRSTI (ako korisnik ima preferencije)
    // ============================================================
    if (korisnikVrsta && korisnikVrsta.length > 0) {
      const vrste = korisnikVrsta.filter(v => v !== 'Svejedno');
      if (vrste.length > 0) {
        filtered = filtered.filter(recipe => vrste.includes(recipe.vrsta));
        console.log(`📊 Nakon vrste (${vrste.join(', ')}): ${filtered.length} recepata`);
      }
    }

    // ============================================================
    // 6. GENERIŠI PLAN - PRVO IZ BAZE
    // ============================================================
    const dani = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
    const plan = [];
    let usedRecipes = [];
    let remainingRecipes = [...filtered];
    
    const getRandomRecipe = (recipeList) => {
      if (recipeList.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * recipeList.length);
      return recipeList[randomIndex];
    };

    const takeRecipe = (recipeList, recipe) => {
      const index = recipeList.indexOf(recipe);
      if (index > -1) {
        recipeList.splice(index, 1);
      }
      return recipe;
    };

    console.log(`🔄 Popunjavam plan iz baze (${filtered.length} dostupno)...`);
    
    for (let i = 0; i < dani.length; i++) {
      const dayPlan = { naziv: dani[i], dorucak: '---', rucak: '---', vecera: '---' };
      const dayRecipes = [];
      
      for (let j = 0; j < 3; j++) {
        const recipe = getRandomRecipe(remainingRecipes);
        if (recipe) {
          dayRecipes.push(recipe);
          takeRecipe(remainingRecipes, recipe);
          usedRecipes.push(recipe);
        }
      }
      
      if (dayRecipes.length > 0) {
        dayPlan.dorucak = dayRecipes[0]?.naziv || '---';
        dayPlan.rucak = dayRecipes[1]?.naziv || '---';
        dayPlan.vecera = dayRecipes[2]?.naziv || '---';
      }
      
      plan.push(dayPlan);
    }

    const baseRecipesCount = usedRecipes.length;
    console.log(`✅ Iz baze iskorišteno: ${baseRecipesCount} recepata`);

    // ============================================================
    // 7. POPUNI PRAZNA MJESTA SA OPENAI (AKO IMA MANJE OD 21 RECEPTA)
    // ============================================================
    if (baseRecipesCount < 21 && openai) {
      console.log(`⚠️ Premalo recepata u bazi (${baseRecipesCount}/21), popunjavam OpenAI...`);
      
      const emptySlots = [];
      plan.forEach((day, dayIndex) => {
        ['dorucak', 'rucak', 'vecera'].forEach(meal => {
          if (day[meal] === '---') {
            emptySlots.push({ dayIndex, meal });
          }
        });
      });
      
      console.log(`🔄 Potrebno popuniti ${emptySlots.length} praznih mjesta sa OpenAI`);
      
      try {
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
            alergeniPrompt = `\n⚠️ ALERGENI KOJE MORATE IZBJEĆI: ${alergeni.join(', ')}.\nSVAKO jelo MORA biti BEZ ovih sastojaka!`;
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
          KREIRAJ ${emptySlots.length} JELA za sedmični plan obroka.
          
          📊 NUTRITIVNI CILJEVI (po obroku):
          - Kalorije: ${kalorijePoObroku} kcal
          - Proteini: ${Math.round((proteini || 150) / 3)}g
          - Ugljikohidrati: ${Math.round((ugljikohidrati || 250) / 3)}g
          - Masti: ${Math.round((masti || 70) / 3)}g
          
          🔒 RESTRIKCIJE KORISNIKA:
          ${restrikcijePrompt}
          ${alergeniPrompt}
          ${dijetnePrompt}
          ${vrstaPrompt}
          ${preferencijePrompt}
          ${sastojciPrompt}
          
          ⚠️ VAŽNA UPOZORENJA (OBAVEZNO):
          1. SVAKO jelo MORA BITI BEZ ALERGENA iz liste!
          2. SVAKO jelo MORA ODGOVARATI DIJETNIM OZNAKAMA!
          3. Ako korisnik ima "Gluten" - NEMA HRANE SA GLUTENOM!
          4. Ako korisnik ima "Laktoza" - NEMA MLIJEČNIH PROIZVODA!
          5. Ako korisnik ima "Jaja" - NEMA JAJA!
          6. Ako korisnik ima "Orašasti" - NEMA ORAŠASTIH PLODOVA!
          
          📋 FORMAT:
          Odgovori isključivo u JSON formatu sa listom jela:
          {
            "jela": [
              {
                "naziv": "Naziv jela",
                "vrsta": "Slano",
                "vrijeme": "Srednje (30-45 min)",
                "tezina": "Srednji",
                "kalorije": ${kalorijePoObroku},
                "proteini": ${Math.round((proteini || 150) / 3)},
                "ugljikohidrati": ${Math.round((ugljikohidrati || 250) / 3)},
                "masti": ${Math.round((masti || 70) / 3)}
              }
            ]
          }
          
          KREIRAJ TAČNO ${emptySlots.length} JELA.
        `;

        console.log('📝 Šaljem OpenAI zahtjev za popunjavanje...');
        
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
          response_format: { type: "json_object" }
        });
        
        const aiData = JSON.parse(response.choices[0].message.content);
        const aiJela = aiData.jela || [];
        
        console.log(`✅ OpenAI generisao ${aiJela.length} jela`);
        
        let aiIndex = 0;
        for (const slot of emptySlots) {
          if (aiIndex < aiJela.length) {
            const jelo = aiJela[aiIndex];
            plan[slot.dayIndex][slot.meal] = `${jelo.naziv} ✨`;
            aiIndex++;
          }
        }
        
        console.log('✅ Plan popunjen sa OpenAI');
        
      } catch (openaiError) {
        console.error('❌ OpenAI greška:', openaiError.message);
        console.log('ℹ️ Nastavljam sa djelimičnim planom iz baze');
      }
    } else if (baseRecipesCount < 21 && !openai) {
      console.log('⚠️ OpenAI nije dostupan, plan djelimičan');
    } else {
      console.log('✅ Plan u potpunosti popunjen iz baze!');
    }

    // ============================================================
    // 8. SAČUVAJ PLAN U BAZU
    // ============================================================
    try {
      await supabase
        .from('planovi_obroka')
        .upsert({
          korisnik_email: email,
          datum: datum || new Date().toISOString().split('T')[0],
          plan: { dani: plan },
          ciljevi: { kalorije, proteini, ugljikohidrati, masti },
          restrikcije: restrikcije || [],
          izvor: baseRecipesCount >= 21 ? 'baza' : 'kombinovan',
          created_at: new Date().toISOString()
        }, { onConflict: 'korisnik_email, datum' });
      console.log('✅ Plan sačuvan u bazu');
    } catch (saveError) {
      console.error('⚠️ Greška pri spremanju:', saveError);
    }

    // ============================================================
    // 9. VRATI PLAN
    // ============================================================
    const aiCount = plan.flatMap(d => [d.dorucak, d.rucak, d.vecera]).filter(j => j && j.includes('✨')).length;
    const totalFilled = plan.flatMap(d => [d.dorucak, d.rucak, d.vecera]).filter(j => j && j !== '---').length;

    res.json({
      dani: plan,
      _izvor: baseRecipesCount >= 21 ? 'baza' : 'kombinovan',
      _broj_iz_baze: baseRecipesCount,
      _broj_iz_ai: aiCount,
      _ukupno: totalFilled
    });

  } catch (error) {
    console.error('❌ Greška pri generisanju plana:', error);
    res.status(500).json({ 
      error: error.message,
      dani: [
        { naziv: 'Pon', dorucak: '---', rucak: '---', vecera: '---' },
        { naziv: 'Uto', dorucak: '---', rucak: '---', vecera: '---' },
        { naziv: 'Sri', dorucak: '---', rucak: '---', vecera: '---' },
        { naziv: 'Čet', dorucak: '---', rucak: '---', vecera: '---' },
        { naziv: 'Pet', dorucak: '---', rucak: '---', vecera: '---' },
        { naziv: 'Sub', dorucak: '---', rucak: '---', vecera: '---' },
        { naziv: 'Ned', dorucak: '---', rucak: '---', vecera: '---' }
      ],
      _izvor: 'error'
    });
  }
});

// ============================================================
// 20. AI WEEKLY PLAN (ZAMRZNUT - KORISTI SE NOVI IZNAD)
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
        const izbjegava = recept.izbjegava || [];
        const imaRestrikciju = restrikcije.some(r => !izbjegava.includes(r));
        if (imaRestrikciju) {
          console.log('⚠️ Tajni recept ne odgovara restrikcijama, biram novi...');
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
      .select('id, izbjegava, naziv');

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
        const izbjegava = r.izbjegava || [];
        return restrikcije.every(rest => izbjegava.includes(rest));
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
// 🔥🔥🔥 AI CHEF - POPRAVLJENI ENDPOINTI
// ============================================================

// ============================================================
// 22. 🔥 AI CHEF - DOHVATI LIMIT
// ============================================================
app.get('/api/ai-chef/limit/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`🤖 Dohvatam AI Chef limit za: ${email}`);
    
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('ai_chef_pretrage, ai_chef_datum, premium, video_ad_count')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('❌ Greška pri dohvatu korisnika:', userError);
      return res.status(500).json({ error: userError.message });
    }

    if (!user) {
      console.log(`ℹ️ Korisnik nije pronađen: ${email}`);
      return res.json({
        broj_pretraga: 0,
        max_pretraga: 3,
        preostalo: 0,
        moze: false,
        isPremium: false,
        videoAdCount: 0
      });
    }

    if (user?.premium) {
      return res.json({
        broj_pretraga: 0,
        max_pretraga: 15,
        preostalo: 15,
        moze: true,
        isPremium: true,
        videoAdCount: 0
      });
    }

    const danas = new Date().toISOString().split('T')[0];
    const maxPretraga = 3;
    
    let brojPretraga = user?.ai_chef_pretrage || 0;
    if (user?.ai_chef_datum !== danas) {
      brojPretraga = 0;
    }

    const videoAdCount = user?.video_ad_count || 0;

    let preostalo = 0;
    if (videoAdCount > 0) {
      preostalo = Math.max(videoAdCount - brojPretraga, 0);
      preostalo = Math.min(preostalo, maxPretraga);
    }

    console.log(`📊 ${email}: pretrage=${brojPretraga}/${maxPretraga}, video=${videoAdCount}/3, preostalo=${preostalo}`);

    res.json({
      broj_pretraga: brojPretraga,
      max_pretraga: maxPretraga,
      preostalo: preostalo,
      moze: preostalo > 0,
      isPremium: false,
      videoAdCount: videoAdCount
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

    const { data: user, error: fetchError } = await supabase
      .from('profili')
      .select('ai_chef_pretrage, ai_chef_datum, premium, video_ad_count')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Greška pri dohvatu:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    if (user?.premium) {
      return res.status(400).json({ error: 'Premium korisnici nemaju ograničenja.' });
    }

    let brojPretraga = user?.ai_chef_pretrage || 0;
    if (user?.ai_chef_datum !== danas) {
      brojPretraga = 0;
    }

    const videoAdCount = user?.video_ad_count || 0;

    let preostalo = 0;
    if (videoAdCount > 0) {
      preostalo = Math.max(videoAdCount - brojPretraga, 0);
      preostalo = Math.min(preostalo, maxPretraga);
    }

    if (type === 'video_ad') {
      const noviVideoCount = (user?.video_ad_count || 0) + 1;
      
      if (noviVideoCount > 3) {
        return res.status(400).json({ 
          error: 'Dostigli ste maksimum od 3 video reklame za danas.',
          broj_pretraga: brojPretraga,
          max_pretraga: maxPretraga,
          preostalo: 0,
          moze: false,
          videoAdCount: videoAdCount
        });
      }

      const { error: updateError } = await supabase
        .from('profili')
        .update({
          video_ad_count: noviVideoCount,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);

      if (updateError) {
        console.error('❌ Greška pri ažuriranju video reklama:', updateError);
        return res.status(500).json({ error: updateError.message });
      }

      let novoPreostalo = Math.max(noviVideoCount - brojPretraga, 0);
      novoPreostalo = Math.min(novoPreostalo, maxPretraga);

      return res.json({
        success: true,
        message: '✅ Video reklama završena! +1 slikanje',
        broj_pretraga: brojPretraga,
        max_pretraga: maxPretraga,
        preostalo: novoPreostalo,
        moze: novoPreostalo > 0,
        videoAdCount: noviVideoCount
      });
    }

    if (preostalo <= 0) {
      return res.status(400).json({ 
        error: 'Nemate preostalih slikanja! Pogledajte video reklamu.',
        broj_pretraga: brojPretraga,
        max_pretraga: maxPretraga,
        preostalo: 0,
        moze: false,
        videoAdCount: videoAdCount
      });
    }

    const noviBroj = brojPretraga + 1;

    const { error: updateError } = await supabase
      .from('profili')
      .update({
        ai_chef_pretrage: noviBroj,
        ai_chef_datum: danas,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) {
      console.error('❌ Greška pri ažuriranju pretrage:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    let novoPreostalo = Math.max(videoAdCount - noviBroj, 0);
    novoPreostalo = Math.min(novoPreostalo, maxPretraga);

    res.json({
      success: true,
      message: '✅ Pretraga otključana!',
      broj_pretraga: noviBroj,
      max_pretraga: maxPretraga,
      preostalo: novoPreostalo,
      moze: novoPreostalo > 0,
      videoAdCount: videoAdCount
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

    const brojVideoReklama = user?.video_ad_count || 0;
    console.log(`📺 ${email}: ${brojVideoReklama}/3 video reklama`);

    res.json({
      success: true,
      broj_video_reklama: brojVideoReklama
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 25. 🔥🔥🔥 AI CHEF - PRETRAGA SA BAZOM I AI FALLBACKOM
// ============================================================
app.post('/api/ai-chef', async (req, res) => {
  try {
    const { tekst, email, jezik } = req.body;
    
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
    
    // 🔥 OCR se radi na frontendu, šalje se samo tekst
    let inputText = tekst || '';

    if (!inputText || inputText.trim() === '') {
      return res.json([]);
    }

    // 🔥🔥🔥 SORTIRAJ SASTOJKE PRIJE HASHIRANJA 🔥🔥🔥
    // Ovo osigurava da "jaja, brašno, mlijeko" i "mlijeko, jaja, brašno" daju ISTI hash!
    const sortedInput = inputText
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0)
      .sort()
      .join(', ');

    console.log(`📦 Originalni tekst: ${inputText}`);
    console.log(`📦 Sortirani tekst za hash: ${sortedInput}`);

    // Koristi sortirani tekst za hash (bolji cache hit!)
    const textHash = generateHash(sortedInput, 'tekst');
    
    const cachedText = await checkCache(textHash);
    if (cachedText) {
      console.log('✅ Keš pronađen za tekst!');
      res.setHeader('X-Cache-Hit', 'true');
      res.setHeader('X-Cache-Date', cachedText.created_at);
      return res.json(cachedText.results);
    }

    // 🔥 KORISTI ORIGINALNI TEKST ZA PRETRAGU (da ne izgubimo kontekst)
    const sastojci = inputText.split(',').map(s => s.trim().toLowerCase());
    console.log('📦 Sastojci za pretragu:', sastojci);

    // 🔥 PREVOD RECEPATA IZ BAZE:
    let query = supabase
      .from('recepti')
      .select(`
        *,
        prevod:recepti_prevodi(
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

    let recepti = [];
    const baseTimeout = 7000;
    
    try {
      console.log(`⏰ Pokrećem pretragu baze (timeout: ${baseTimeout}ms)...`);
      
      const bazaPretraga = async () => {
        const { data, error } = await query;
        if (error) throw error;
        return data;
      };
      
      recepti = await Promise.race([
        bazaPretraga(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('BAZA_TIMEOUT')), baseTimeout)
        )
      ]);
      
      console.log(`✅ Baza odgovorila za manje od ${baseTimeout}ms, pronađeno ${recepti?.length || 0} recepata`);
      
    } catch (error) {
      if (error.message === 'BAZA_TIMEOUT') {
        console.warn(`⏰ Baza pretraga traje predugo (>${baseTimeout}ms), prelazim na OpenAI...`);
        recepti = [];
      } else {
        console.error('❌ Greška pri dohvatu recepata:', error);
        throw error;
      }
    }

    let bazaRezultati = [];
    
    if (recepti && recepti.length > 0) {
      bazaRezultati = recepti.filter(recept => {
        if (!recept.sastojci || recept.sastojci.length === 0) return false;
        const receptSastojci = recept.sastojci.map(s => s.toLowerCase());
        const imaSastojak = sastojci.some(sastojak => 
          receptSastojci.some(rs => rs.includes(sastojak))
        );
        if (!imaSastojak) return false;
        
        if (restrikcije && restrikcije.length > 0) {
          const hasNoRestrictions = restrikcije.some(r => 
            r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
          );
          
          if (!hasNoRestrictions) {
            const izbjegava = recept.izbjegava || [];
            const imaSveRestrikcije = restrikcije.every(r => izbjegava.includes(r));
            if (!imaSveRestrikcije) return false;
          }
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
    }

    console.log(`✅ U bazi pronađeno ${bazaRezultati.length} recepata`);

    if (bazaRezultati.length > 0) {
      let results = bazaRezultati.map(recipe => {
        if (recipe.prevod && recipe.prevod.length > 0 && jezik && jezik !== 'hr') {
          const prevod = recipe.prevod[0];
          return {
            ...recipe,
            naziv: prevod.naziv || recipe.naziv,
            opis: prevod.opis || recipe.opis,
            sastojci: prevod.sastojci || recipe.sastojci,
            upute: prevod.upute || recipe.upute,
            nacin_pripreme: prevod.nacin_pripreme || recipe.nacin_pripreme
          };
        }
        const clean = { ...recipe };
        delete clean.prevod;
        return clean;
      });

      // 🔥 KORISTI SORTIRANI TEKST ZA HASH (BOLJI CACHE HIT!)
      const hashToSave = textHash;  // ← OVO JE SADA SORTIRANI HASH
      const typeToSave = 'tekst';
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

    console.log('❌ Nema recepata u bazi (ili timeout), pozivam OpenAI...');

    if (!openai) {
      console.warn('⚠️ OpenAI nije dostupan, vraćam prazan niz');
      res.setHeader('X-Cache-Hit', 'false');
      res.setHeader('X-Source', 'empty');
      return res.json([]);
    }

    try {
      console.log('🤖 Generišem AI recepte na osnovu sastojaka...');
      console.log('⏰ OpenAI timeout postavljen na 25 sekundi');

      let restrikcijePrompt = 'Nema posebnih restrikcija.';
      let alergeniPrompt = '';
      let dijetnePrompt = '';
      
      if (restrikcije && restrikcije.length > 0) {
        const alergeniList = ['gluten', 'laktoza', 'jaja', 'orašasti', 'orasasti', 'soja', 'kikiriki', 'morski plodovi'];
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ OpenAI timeout nakon 25 sekundi!');
      }, 25000);

      let response;
      try {
        response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          response_format: { type: "json_object" },
          timeout: 25000
        }, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (openaiTimeoutError) {
        clearTimeout(timeoutId);
        if (openaiTimeoutError.code === 'ETIMEDOUT' || openaiTimeoutError.name === 'AbortError') {
          console.error('⏰ OpenAI timeout - prekidam zahtjev');
          return res.status(504).json({
            error: '⏰ AI pretraga traje predugo. Pokušajte ponovo za nekoliko sekundi.',
            timeout: true
          });
        }
        throw openaiTimeoutError;
      }

      const aiData = JSON.parse(response.choices[0].message.content);
      console.log('✅ OpenAI generisao recepte:', aiData.recepti?.length || 0);

      let aiResults = aiData.recepti || [];
      
      aiResults = aiResults.map((r, index) => ({
        ...r,
        id: `ai-${Date.now()}-${index}`,
        _ai_generated: true,
        alergeni: restrikcije || []
      }));

      // 🔥 KORISTI SORTIRANI TEKST ZA HASH (BOLJI CACHE HIT!)
      const hashToSave = textHash;  // ← OVO JE SADA SORTIRANI HASH
      const typeToSave = 'tekst';
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
// 30. 🔥 NOTIFIKACIJE - GENERIŠI PREPORUKE (SVAKIH 4 SATA)
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
    const danas = new Date().toISOString().split('T')[0];

    // 🔥 PROVJERI KOJE NOTIFIKACIJE SMO VEĆ POSLALI DANAS (UKLJUČUJUĆI I OBRISANE)
    const { data: existingNotifications, error: existingError } = await supabase
      .from('notifikacije')
      .select('tip, created_at, obrisano')
      .eq('korisnik_email', email)
      .gte('created_at', `${danas}T00:00:00.000Z`);

    if (existingError) {
      console.error('❌ Greška pri provjeri postojanih notifikacija:', existingError);
    }

    // 🔥 PROVJERI DA LI JE NOTIFIKACIJA POSLANA U ZADNJIH 4 SATA (ČAK I OBRISANA)
    const hasSentRecently = (tip) => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      return existingNotifications?.some(n => 
        n.tip === tip && new Date(n.created_at) > fourHoursAgo
      ) || false;
    };

    // 🔥 PROVJERI DA LI JE POSLANA DANAS (ZA DNEVNE PREPORUKE) - ČAK I OBRISANA
    const hasSentToday = (tip) => {
      return existingNotifications?.some(n => n.tip === tip) || false;
    };

    console.log(`📊 Već poslano danas: ${existingNotifications?.map(n => n.tip).join(', ') || 'ništa'}`);

    // ============================================================
    // 1. ZDRAVSTVENE PREPORUKE (SAMO JEDNOM DNEVNO)
    // ============================================================
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

      if (prosjekSna < 6 && !hasSentToday('san')) {
        preporuke.push({
          tip: 'san',
          poruka: `😴 ${ime}, primjećujem da spavaš manje od 6 sati u prosjeku. Pokušaj ranije na spavanje večeras!`,
          link: '/'
        });
      }

      if (prosjekStresa > 6 && !hasSentToday('coach')) {
        preporuke.push({
          tip: 'coach',
          poruka: `🧘 ${ime}, primjećujem da si pod stresom. Isprobaj vježbe disanja ili čaj od kamilice.`,
          link: '/'
        });
      }

      if (prosjekEnergije < 5 && !hasSentToday('energija')) {
        preporuke.push({
          tip: 'energija',
          poruka: `⚡ ${ime}, energija ti je na niskom nivou. Probaj smoothie od banane ili proteinski obrok.`,
          link: '/recipes?preferencije=Visokoproteinski'
        });
      }

      if (prosjekSna >= 7 && prosjekStresa < 4 && prosjekEnergije >= 7 && !hasSentToday('motivacija')) {
        preporuke.push({
          tip: 'motivacija',
          poruka: `🌟 Odlično, ${ime}! San, energija i stres su na dobrom nivou. Nastavi ovako!`,
          link: '/profile'
        });
      }
    }

    // ============================================================
    // 2. 🛒 PREPORUKA ZA KUPOVINU (SVAKIH 4 SATA)
    // ============================================================
    const namirnice = profil.namirnice || [];
    if (namirnice.length < 3 && !hasSentRecently('kupovina')) {
      preporuke.push({
        tip: 'kupovina',
        poruka: `🛒 ${ime}, primjećujem da ti ponestaje namirnica (${namirnice.length} komada). Vrijeme je za odlazak u trgovinu!`,
        link: '/grocery-list'
      });
    }

    // ============================================================
    // 3. 💧 PREPORUKA ZA VODU (SVAKIH 4 SATA)
    // ============================================================
    const { data: vodaDanas, error: vodaError } = await supabase
      .from('voda')
      .select('kolicina_ml')
      .eq('korisnik_email', email)
      .eq('datum', danas);

    if (vodaError) {
      console.error('❌ Greška pri dohvatu vode:', vodaError);
    }

    const ukupnoVode = vodaDanas?.reduce((sum, v) => sum + v.kolicina_ml, 0) || 0;
    const ciljVode = profil.cilj_voda || 2000;

    if (ukupnoVode < ciljVode * 0.5 && !hasSentRecently('voda')) {
      const preostalo = ciljVode - ukupnoVode;
      preporuke.push({
        tip: 'voda',
        poruka: `💧 ${ime}, danas si popio/la ${ukupnoVode}ml od cilja ${ciljVode}ml. Potrebno je još ${preostalo}ml vode!`,
        link: '/water-tracker'
      });
    }

    // ============================================================
    // 4. 🍽️ PREPORUKE ZA OBROKE (SVAKIH 4 SATA)
    // ============================================================
    const { data: danasnjiObroci, error: obrociError } = await supabase
      .from('obroci')
      .select('*')
      .eq('email', email)
      .eq('datum', danas);

    if (obrociError) {
      console.error('❌ Greška pri dohvatu obroka:', obrociError);
    }

    const imaDoručak = danasnjiObroci?.some(o => o.tip === 'Doručak') || false;
    const imaRučak = danasnjiObroci?.some(o => o.tip === 'Ručak') || false;
    const imaVečeru = danasnjiObroci?.some(o => o.tip === 'Večera') || false;

    // Doručak - samo ujutro, jednom dnevno
    if (sat >= 7 && sat <= 10 && !imaDoručak && !hasSentToday('dorucak')) {
      preporuke.push({
        tip: 'dorucak',
        poruka: `🌅 ${ime}, vrijeme je za doručak! Dobre jutarnje navike počinju obrokom bogatim proteinima.`,
        link: '/food-planner'
      });
    }

    // Ručak - samo u podne, jednom dnevno
    if (sat >= 12 && sat <= 15 && !imaRučak && !hasSentToday('rucak')) {
      preporuke.push({
        tip: 'rucak',
        poruka: `🍽️ ${ime}, vrijeme je za ručak! Ne preskači glavni obrok u danu.`,
        link: '/food-planner'
      });
    }

    // Večera - samo uveče, jednom dnevno
    if (sat >= 18 && sat <= 21 && !imaVečeru && !hasSentToday('vecera')) {
      preporuke.push({
        tip: 'vecera',
        poruka: `🌙 ${ime}, vrijeme je za laganu večeru! Izbjegavaj tešku hranu prije spavanja.`,
        link: '/food-planner'
      });
    }

    // ============================================================
    // 5. PREPORUKE ZA RECEPTE (JEDNOM DNEVNO)
    // ============================================================
    if (!hasSentToday('recepti')) {
      let query = supabase.from('recepti').select('*').limit(3);
      
      if (profil.vrsta && profil.vrsta.length > 0) {
        const vrste = profil.vrsta.filter(v => v !== 'Svejedno');
        if (vrste.length > 0) {
          query = query.in('vrsta', vrste);
        }
      }
      
      if (restrikcije && restrikcije.length > 0) {
        const hasNoRestrictions = restrikcije.some(r => 
          r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
        );
        
        if (!hasNoRestrictions) {
          query = query.not('izbjegava', '&&', restrikcije);
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
    }

    // ============================================================
    // 6. KREIRAJ NOTIFIKACIJE (SAMO AKO NISU POSLANE U ZADNJIH 4 SATA)
    // ============================================================
    let kreirano = 0;
    for (const preporuka of preporuke) {
      // 🔥 DODATNA PROVJERA - 4 SATA (UKLJUČUJUĆI I OBRISANE)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      const { data: checkExisting } = await supabase
        .from('notifikacije')
        .select('id')
        .eq('korisnik_email', email)
        .eq('tip', preporuka.tip)
        .eq('poruka', preporuka.poruka)
        .gte('created_at', fourHoursAgo.toISOString())
        .maybeSingle();

      if (!checkExisting) {
        await createNotification(
          email,
          preporuka.tip,
          preporuka.poruka,
          preporuka.link || '/'
        );
        kreirano++;
      }
    }

    console.log(`✅ Kreirano ${kreirano} novih preporuka za ${email}`);

    // ============================================================
    // 7. VRATI SVE NOTIFIKACIJE (SAMO ONE KOJE NISU OBRISANE)
    // ============================================================
    const { data: notifikacije, error: notifError } = await supabase
      .from('notifikacije')
      .select('*')
      .eq('korisnik_email', email)
      .eq('obrisano', false)  // 🔥 SAMO NE-OBRISANE
      .order('created_at', { ascending: false });

    if (notifError) throw notifError;

    res.json({
      success: true,
      notifikacije: notifikacije || [],
      _nove_preporuke: kreirano
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
      .eq('obrisano', false)  // 🔥 SAMO NE-OBRISANE
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
      .eq('id', id)
      .eq('obrisano', false);

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
      .eq('procitano', false)
      .eq('obrisano', false);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 34. NOTIFIKACIJE - IZBRIŠI (MEKO BRISANJE)
// ============================================================
app.delete('/api/notifikacije/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Meko brisanje notifikacije: ${id}`);
    
    // 🔥 SAMO OZNAČI KAO OBRISANO (NE BRIŠI POTPUNO!)
    const { error } = await supabase
      .from('notifikacije')
      .update({ 
        obrisano: true,
        procitano: true
      })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Notifikacija obrisana.' });
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
    const { email, naziv, vrsta, opis, sastojci, izbjegava, vrijeme, tezina, kalorije } = req.body;
    const slika = req.file;
    
    console.log(`📝 Kreiranje objave za: ${email}`);
    console.log(`📦 Izbjegava:`, izbjegava);
    console.log(`⏱️ Vrijeme:`, vrijeme);
    console.log(`👨‍🍳 Težina:`, tezina);
    console.log(`🍽️ Vrsta:`, vrsta);
    console.log(`🔥 Kalorije:`, kalorije);
    
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('id, ime, email')
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

    let izbjegavaArray = [];
    try {
      izbjegavaArray = izbjegava ? JSON.parse(izbjegava) : [];
    } catch (e) {
      console.warn('⚠️ Greška pri parsiranju izbjegava:', e);
      izbjegavaArray = [];
    }

    const sastojciArray = sastojci ? sastojci.split(',').map(s => s.trim()).filter(s => s) : [];

    const { data, error } = await supabase
      .from('objave')
      .insert([{
        korisnik_id: user.id,
        korisnik_email: user.email,
        korisnik_ime: user.ime || 'Korisnik',
        naziv: naziv,
        vrsta: vrsta || '',
        opis: opis || '',
        sastojci: sastojciArray,
        slika: slikaUrl,
        izbjegava: izbjegavaArray,
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
// 45. AI SOMELIER (SA KEŠOM!)
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
// 54. 🔥 CRON JOB - AI CHEF RESET + PREMIUM ISTEK + CACHE CLEANUP
// ============================================================
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('\n🔄 === DNEVNI RESET ===');
    console.log(`📅 Datum: ${new Date().toISOString()}`);
    
    const danas = new Date().toISOString().split('T')[0];
    const prije7Dana = new Date();
    prije7Dana.setDate(prije7Dana.getDate() - 7);
    const prije7DanaStr = prije7Dana.toISOString().split('T')[0];
    
    console.log('🧹 Čistim istekli AI Chef keš (stariji od 120 dana)...');
    const { error: cacheError } = await supabase
      .from('ai_chef_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (cacheError) {
      console.error('❌ Greška pri čišćenju AI Chef keša:', cacheError);
    } else {
      console.log('✅ Itekli AI Chef keš očišćen (120 dana)');
    }

    console.log('🧹 Čistim istekli Sommelier keš (stariji od 30 dana)...');
    const { error: sommelierError } = await supabase
      .from('ai_sommelier_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
    
    if (sommelierError) {
      console.error('❌ Greška pri čišćenju Sommelier keša:', sommelierError);
    } else {
      console.log('✅ Itekli Sommelier keš očišćen (30 dana)');
    }

    console.log('🧹 Brišem stare AI Chef podatke (starije od 7 dana)...');
    
    const { error: deleteLimitError } = await supabase
      .from('user_daily_limits')
      .delete()
      .lt('datum', prije7DanaStr);
    
    if (deleteLimitError) {
      console.error('❌ Greška pri brisanju starih limita:', deleteLimitError);
    } else {
      console.log('✅ Stari limiti obrisani');
    }
    
    const { error: deleteVideoError } = await supabase
      .from('ai_chef_video_ads')
      .delete()
      .lt('datum', prije7DanaStr);
    
    if (deleteVideoError) {
      console.error('❌ Greška pri brisanju starih video reklama:', deleteVideoError);
    } else {
      console.log('✅ Stare video reklame obrisane');
    }
    
    console.log('🔄 Resetujem AI Chef podatke za danas...');
    
    const { error: resetLimitError } = await supabase
      .from('user_daily_limits')
      .update({ 
        broj_pretraga: 0,
        updated_at: new Date().toISOString()
      })
      .eq('datum', danas)
      .in('korisnik_id', 
        supabase.from('profili').select('id').eq('premium', false)
      );
    
    if (resetLimitError) {
      console.error('❌ Greška pri resetovanju limita:', resetLimitError);
    } else {
      console.log('✅ Broj pretraga resetovan na 0');
    }
    
    const { error: resetVideoError } = await supabase
      .from('ai_chef_video_ads')
      .update({ 
        broj_video_reklama: 0,
        updated_at: new Date().toISOString()
      })
      .eq('datum', danas)
      .in('korisnik_id', 
        supabase.from('profili').select('id').eq('premium', false)
      );
    
    if (resetVideoError) {
      console.error('❌ Greška pri resetovanju video reklama:', resetVideoError);
    } else {
      console.log('✅ Broj video reklama resetovan na 0');
    }
    
    console.log('🔄 Provjeravam Premium istoke...');
    
    const { data: expiredUsers, error: premiumError } = await supabase
      .from('profili')
      .select('email, ime, premium_do')
      .eq('premium', true)
      .lt('premium_do', danas);
    
    if (premiumError) {
      console.error('❌ Greška pri dohvatu Premium korisnika:', premiumError);
    } else if (expiredUsers && expiredUsers.length > 0) {
      console.log(`⏰ Pronađeno ${expiredUsers.length} korisnika sa isteklim Premiumom:`);
      
      for (const user of expiredUsers) {
        console.log(`   - ${user.email} (Premium istekao: ${user.premium_do})`);
        
        const { error: updateError } = await supabase
          .from('profili')
          .update({ 
            premium: false,
            premium_do: null,
            updated_at: new Date().toISOString()
          })
          .eq('email', user.email);
        
        if (updateError) {
          console.error(`❌ Greška pri deaktivaciji ${user.email}:`, updateError);
        } else {
          console.log(`✅ Deaktiviran: ${user.email}`);
          
          try {
            await createNotification(
              user.email,
              'premium_istek',
              `⚠️ Vaš Premium nalog je istekao ${user.premium_do}. Obnovite ga da biste nastavili koristiti Premium funkcionalnosti!`,
              '/premium'
            );
          } catch (notifError) {
            console.error(`❌ Greška pri slanju notifikacije za ${user.email}:`, notifError);
          }
        }
      }
      
      console.log(`✅ Deaktivirano ${expiredUsers.length} korisnika.`);
    } else {
      console.log('✅ Nema isteklih Premium korisnika');
    }
    
    console.log('✅ Dnevni reset završen!');
    console.log('=================================\n');
    
  } catch (error) {
    console.error('❌ Cron greška:', error);
  }
});

console.log('⏰ Cron job za AI Chef reset, Premium istok i Cache čišćenje postavljen (svaki dan u 00:00)');

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
// 🎯 GOALS ENDPOINTS
// ============================================================

app.post('/api/goals', async (req, res) => {
  try {
    const { email, weight, bodyFat, water, steps } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email je obavezan.' });
    }

    const { data, error } = await supabase
      .from('profili')
      .update({ 
        cilj_tezina: weight || null,
        cilj_masti: bodyFat || null,
        cilj_voda: water || null,
        cilj_koraci: steps || null,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data: data });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 📊 MICRO NUTRIENTS ENDPOINTS
// ============================================================

// SAČUVAJ MIKRONUTRIJENTE (POST)
app.post('/api/micro-nutrients', async (req, res) => {
  try {
    const { email, date, vitaminA, vitaminC, vitaminD, iron, magnesium, calcium, zinc } = req.body;

    console.log('\n📊 === ČUVANJE MIKRONUTRIJENATA ===');
    console.log('📧 Email:', email);
    console.log('📅 Datum:', date);
    console.log('📦 Vitamin A:', vitaminA);
    console.log('📦 Vitamin C:', vitaminC);
    console.log('📦 Vitamin D:', vitaminD);
    console.log('📦 Željezo:', iron);
    console.log('📦 Magnezij:', magnesium);
    console.log('📦 Kalcij:', calcium);
    console.log('📦 Cink:', zinc);

    if (!email || !date) {
      console.log('❌ Email ili datum nedostaju');
      return res.status(400).json({ 
        success: false, 
        error: 'Email i datum su obavezni.' 
      });
    }

    // Provjeri da li korisnik postoji
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      console.error('❌ Korisnik nije pronađen:', email);
      return res.status(404).json({ 
        success: false, 
        error: 'Korisnik nije pronađen.' 
      });
    }

    console.log('✅ Korisnik pronađen');

    // Provjeri da li već postoji unos za danas
    const { data: existing, error: existingError } = await supabase
      .from('mikronutrijenti')
      .select('id')
      .eq('korisnik_email', email)
      .eq('datum', date)
      .maybeSingle();

    if (existingError) {
      console.error('❌ Greška pri provjeri:', existingError);
    }

    let result;

    if (existing) {
      console.log('📝 Ažuriram postojeći unos (ID:', existing.id, ')');
      
      const { data, error } = await supabase
        .from('mikronutrijenti')
        .update({
          vitamin_a: parseFloat(vitaminA) || 0,
          vitamin_c: parseFloat(vitaminC) || 0,
          vitamin_d: parseFloat(vitaminD) || 0,
          zelezo: parseFloat(iron) || 0,
          magnezij: parseFloat(magnesium) || 0,
          kalcij: parseFloat(calcium) || 0,
          cink: parseFloat(zinc) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select();

      if (error) {
        console.error('❌ Greška pri ažuriranju:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
      result = data;
      console.log('✅ Mikronutrijenti ažurirani');
    } else {
      console.log('🆕 Kreiram novi unos');
      
      const { data, error } = await supabase
        .from('mikronutrijenti')
        .insert([{
          korisnik_email: email,
          datum: date,
          vitamin_a: parseFloat(vitaminA) || 0,
          vitamin_c: parseFloat(vitaminC) || 0,
          vitamin_d: parseFloat(vitaminD) || 0,
          zelezo: parseFloat(iron) || 0,
          magnezij: parseFloat(magnesium) || 0,
          kalcij: parseFloat(calcium) || 0,
          cink: parseFloat(zinc) || 0
        }])
        .select();

      if (error) {
        console.error('❌ Greška pri kreiranju:', error);
        return res.status(500).json({ 
          success: false, 
          error: error.message 
        });
      }
      result = data;
      console.log('✅ Mikronutrijenti kreirani');
    }

    console.log('📤 Vraćam odgovor:', result);
    res.json({ success: true, data: result?.[0] || null });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DOHVATI MIKRONUTRIJENTE ZA KORISNIKA (GET)
app.get('/api/micro-nutrients/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log('\n📊 === DOHVATANJE MIKRONUTRIJENATA ===');
    console.log('📧 Email:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    const { data, error } = await supabase
      .from('mikronutrijenti')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false });

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log(`✅ Dohvaćeno ${data?.length || 0} unosa`);
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DOHVATI DANAŠNJE MIKRONUTRIJENTE (GET)
app.get('/api/micro-nutrients/today/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const today = new Date().toISOString().split('T')[0];

    console.log('\n📊 === DOHVATANJE DANAŠNJIH MIKRONUTRIJENATA ===');
    console.log('📧 Email:', email);
    console.log('📅 Datum:', today);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    const { data, error } = await supabase
      .from('mikronutrijenti')
      .select('*')
      .eq('korisnik_email', email)
      .eq('datum', today)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('✅ Dohvaćeno:', data || 'Nema unosa');
    res.json({ 
      success: true, 
      data: data || null
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 🤖 AI CHAT ENDPOINT - SA GROQ
// ============================================================

app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, email } = req.body;

    if (!message || !email) {
      return res.status(400).json({ error: 'Poruka i email su obavezni.' });
    }

    // 🔥 MAKSIMALAN BROJ PORUKA ZA PREMIUM KORISNIKE
    const MAX_DAILY_MESSAGES = 10;

    // Provjeri korisnika
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('premium, ai_chat_count, ai_chat_date, ime')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('❌ Supabase greška:', userError);
      return res.status(500).json({ error: userError.message });
    }

    if (!user) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    // 🔥 1. PROVJERA: SAMO PREMIUM KORISNICI
    if (!user.premium) {
      return res.status(403).json({ 
        error: 'Ova funkcionalnost je dostupna samo Premium korisnicima. Postanite Premium za korištenje AI Chata.' 
      });
    }

    // 🔥 2. PROVJERA: LIMIT OD 10 PORUKA DNEVNO
    const today = new Date().toISOString().split('T')[0];
    let count = user.ai_chat_date === today ? user.ai_chat_count : 0;

    console.log(`🤖 AI Chat zahtjev od: ${email}`);
    console.log(`📊 Trenutni broj poruka: ${count}/${MAX_DAILY_MESSAGES}`);

    if (count >= MAX_DAILY_MESSAGES) {
      return res.status(429).json({ 
        error: `Dostigli ste limit od ${MAX_DAILY_MESSAGES} poruka dnevno. Pokušajte ponovo sutra.` 
      });
    }

    // 🔥 3. PROVJERA: DA LI JE GROQ DOSTUPAN
    if (!groq) {
      return res.status(503).json({ 
        error: 'AI usluga trenutno nije dostupna. Molimo pokušajte kasnije.' 
      });
    }

    const systemPrompt = `
      Ti si AI asistent za ishranu i zdravlje aplikacije OS Zdravlja.
      Korisnik se zove ${user.ime || 'Korisnik'}.
      
      Pravila:
      1. Odgovaraj kratko i korisno (max 200 riječi)
      2. Ako ne znaš, reci da ne znaš
      3. Ne daj medicinske savjete - uvijek preporuči ljekara
      4. Budi prijateljski i motivirajući
      5. Odgovaraj na jeziku na kojem je pitanje postavljeno
      
      Tema: Ishrana, recepti, zdrave navike, wellness
    `;

    // 🔥 POZIV GROQ
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: message
          }
        ],
        model: "groq/compound",  // 🔥 NAJBOLJI BESPLATNI MODEL!
        temperature: 0.7,
        max_tokens: 300,
      });

      const answer = chatCompletion.choices[0]?.message?.content || "Nema odgovora.";

      // Spremi u bazu (history)
      await supabase
        .from('ai_chat_history')
        .insert([{ 
          korisnik_email: email, 
          poruka: message, 
          odgovor: answer,
          model: 'groq/compound',
          created_at: new Date().toISOString()
        }]);

      // Ažuriraj broj poruka
      const newCount = count + 1;
      await supabase
        .from('profili')
        .update({ 
          ai_chat_count: newCount,
          ai_chat_date: today
        })
        .eq('email', email);

      console.log(`✅ Groq odgovorio za: ${email}`);
      res.json({ response: answer });

    } catch (groqError) {
      console.error('❌ Groq greška:', groqError);
      
      // 🔥 FALLBACK: Ako Groq ne radi, vrati poruku
      return res.status(503).json({ 
        error: 'AI usluga trenutno ne odgovara. Molimo pokušajte ponovo za nekoliko sekundi.' 
      });
    }

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 💧 WATER TRACKER ENDPOINTS - POTPUNO POPRAVLJENI
// ============================================================

// DOHVATI SVE UNOSE VODE ZA KORISNIKA (GET)
app.get('/api/water/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    console.log('💧 Dohvatam vodu za:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    const { data, error } = await supabase
      .from('voda')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false });

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log(`✅ Dohvaćeno ${data?.length || 0} unosa vode`);
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DOHVATI DANAŠNJI UNOS VODE (GET)
app.get('/api/water/today/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const today = new Date().toISOString().split('T')[0];

    console.log('💧 Dohvatam današnji unos vode za:', email);
    console.log('📅 Datum:', today);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    const { data, error } = await supabase
      .from('voda')
      .select('*')
      .eq('korisnik_email', email)
      .eq('datum', today);

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    const total = data?.reduce((sum, item) => sum + item.kolicina_ml, 0) || 0;

    console.log(`✅ Danas uneseno: ${total}ml (${data?.length || 0} unosa)`);
    res.json({ 
      success: true, 
      data: data || [],
      total: total
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DODAJ VODU (POST)
app.post('/api/water', async (req, res) => {
  try {
    const { email, amount, date } = req.body;
    
    console.log('💧 Dodajem vodu za:', email);
    console.log('📊 Količina:', amount, 'ml');
    console.log('📅 Datum:', date);

    if (!email || !amount || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email, količina i datum su obavezni.' 
      });
    }

    if (amount < 50 || amount > 5000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Količina mora biti između 50 i 5000 ml.' 
      });
    }

    // Provjeri da li korisnik postoji
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      console.error('❌ Korisnik nije pronađen:', email);
      return res.status(404).json({ 
        success: false, 
        error: 'Korisnik nije pronađen.' 
      });
    }

    const { data, error } = await supabase
      .from('voda')
      .insert([{ 
        korisnik_email: email, 
        datum: date, 
        kolicina_ml: amount 
      }])
      .select();

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('✅ Voda dodana:', data);
    res.json({ success: true, data: data[0] });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// RESET VODE (POST) - BRIŠE SVE UNOSE ZA DANAŠNJI DAN
app.post('/api/water/reset', async (req, res) => {
  try {
    const { email, date } = req.body;

    console.log('🔄 Resetujem vodu za:', email);
    console.log('📅 Datum:', date);

    if (!email || !date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email i datum su obavezni.' 
      });
    }

    const { error } = await supabase
      .from('voda')
      .delete()
      .eq('korisnik_email', email)
      .eq('datum', date);

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('✅ Voda resetovana za:', email);
    res.json({ success: true, message: 'Svi unosi vode za danas su obrisani.' });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// DOHVATI CILJ VODE ZA KORISNIKA (GET)
app.get('/api/water/goal/:email', async (req, res) => {
  try {
    const { email } = req.params;

    console.log('🎯 Dohvatam cilj vode za:', email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    const { data, error } = await supabase
      .from('profili')
      .select('cilj_voda')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    const cilj = data?.cilj_voda || 2000;
    console.log(`✅ Cilj vode za ${email}: ${cilj}ml`);
    res.json({ 
      success: true, 
      cilj_voda: cilj
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// AŽURIRAJ CILJ VODE (PUT)
app.put('/api/water/goal/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { cilj_voda } = req.body;

    console.log('🎯 Ažuriram cilj vode za:', email);
    console.log('📊 Novi cilj:', cilj_voda, 'ml');

    if (!email || !cilj_voda) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email i cilj su obavezni.' 
      });
    }

    if (cilj_voda < 500 || cilj_voda > 10000) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cilj mora biti između 500 i 10000 ml.' 
      });
    }

    // Provjeri da li korisnik postoji
    const { data: user, error: userError } = await supabase
      .from('profili')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user) {
      console.error('❌ Korisnik nije pronađen:', email);
      return res.status(404).json({ 
        success: false, 
        error: 'Korisnik nije pronađen.' 
      });
    }

    const { data, error } = await supabase
      .from('profili')
      .update({ 
        cilj_voda: cilj_voda,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (error) {
      console.error('❌ Supabase greška:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log('✅ Cilj ažuriran:', data);
    res.json({ 
      success: true, 
      data: data?.[0] || null,
      message: `Cilj postavljen na ${cilj_voda}ml` 
    });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 📊 HEALTH - CACHE I RATE LIMIT
// ============================================================

const NodeCache = require('node-cache');
const healthCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 minuta

// Rate limiter za sinhronizaciju
const healthSyncLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minuta
  max: 5, // 5 sinhronizacija
  message: {
    success: false,
    error: '⏳ Previše sinhronizacija. Sačekajte 5 minuta.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter za dohvat podataka
const healthDataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minut
  max: 30, // 30 dohvata
  message: {
    success: false,
    error: '⏳ Previše zahtjeva. Sačekajte minut.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================
// 📊 56. HEALTH - SINHRONIZACIJA PODATAKA
// ============================================================
app.post('/api/health/sync', healthSyncLimiter, async (req, res) => {
  try {
    const { 
      email, 
      steps, 
      sleep, 
      water, 
      calories, 
      heart_rate, 
      date,
      source = 'smartwatch'
    } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    console.log(`📱 Sinhronizacija za: ${email}`);
    console.log(`📊 Koraci: ${steps}, San: ${sleep}h, Voda: ${water}ml`);

    // 🔥 POZIV SQL FUNKCIJE (batch procesiranje)
    const { data, error } = await supabase.rpc('sync_health_data', {
      p_email: email,
      p_steps: steps || 0,
      p_sleep: sleep || 0,
      p_water: water || 0,
      p_calories: calories || 0,
      p_heart_rate: heart_rate || 0,
      p_date: date || new Date().toISOString().split('T')[0],
      p_source: source
    });

    if (error) {
      console.error('❌ Greška pri sinhronizaciji:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    // 🔥 INVALIDIRAJ CACHE
    healthCache.del(email);

    res.json({
      success: true,
      message: '✅ Podaci uspješno sinhronizovani!',
      data: data
    });

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 📊 57. HEALTH - DOHVATI PODATAKA (SA CACHE-OM)
// ============================================================
app.get('/api/health/data/:email', healthDataLimiter, async (req, res) => {
  try {
    const { email } = req.params;
    const { days = 7 } = req.query;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    // 🔥 PROVJERI CACHE
    const cacheKey = `${email}_${days}`;
    const cached = healthCache.get(cacheKey);
    if (cached) {
      console.log(`💾 Cache hit za: ${email}`);
      res.setHeader('X-Cache-Hit', 'true');
      return res.json(cached);
    }

    console.log(`📊 Dohvatam podatke za: ${email}`);

    // Dohvati profil
    const { data: profil, error: profilError } = await supabase
      .from('profili')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (profilError || !profil) {
      return res.status(404).json({ 
        success: false, 
        error: 'Korisnik nije pronađen.' 
      });
    }

    // Dohvati zdravstvene podatke
    const { data: zdravstveni, error: zdravError } = await supabase
      .from('zdravstveni_podaci')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false })
      .limit(parseInt(days));

    if (zdravError) {
      console.error('❌ Greška pri dohvatu zdravstvenih podataka:', zdravError);
      return res.status(500).json({ 
        success: false, 
        error: zdravError.message 
      });
    }

    // Dohvati podatke o vodi
    const { data: voda, error: vodaError } = await supabase
      .from('voda')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false })
      .limit(parseInt(days));

    if (vodaError) {
      console.error('❌ Greška pri dohvatu podataka o vodi:', vodaError);
      return res.status(500).json({ 
        success: false, 
        error: vodaError.message 
      });
    }

    // Pripremi odgovor
    const response = {
      success: true,
      profil: {
        cilj_tezina: profil.cilj_tezina,
        cilj_masti: profil.cilj_masti,
        cilj_voda: profil.cilj_voda,
        cilj_koraci: profil.cilj_koraci,
        koraci_danas: profil.koraci_danas || 0,
        zadnja_sinhronizacija: profil.zadnja_sinhronizacija,
        zadnji_izvor: profil.zadnji_izvor
      },
      zdravstveni: zdravstveni || [],
      voda: voda || []
    };

    // 🔥 SPREMI U CACHE
    healthCache.set(cacheKey, response);

    res.json(response);

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 📊 58. HEALTH - NAPREDNA ANALITIKA (SAMO PREMIUM)
// ============================================================
app.get('/api/health/analytics/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email je obavezan.' 
      });
    }

    // 🔥 PROVJERI PREMIUM STATUS
    const { data: profil, error: profilError } = await supabase
      .from('profili')
      .select('premium, ime')
      .eq('email', email)
      .maybeSingle();

    if (profilError || !profil) {
      return res.status(404).json({ 
        success: false, 
        error: 'Korisnik nije pronađen.' 
      });
    }

    if (!profil.premium) {
      return res.status(403).json({
        success: false,
        error: 'Ova funkcionalnost je dostupna samo Premium korisnicima.',
        premium_required: true
      });
    }

    // Dohvati zadnjih 30 dana podataka
    const { data: zdravstveni, error: zdravError } = await supabase
      .from('zdravstveni_podaci')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false })
      .limit(30);

    if (zdravError) {
      return res.status(500).json({ 
        success: false, 
        error: zdravError.message 
      });
    }

    // Generiši analitiku
    const analytics = generateAnalytics(zdravstveni || []);

    res.json({
      success: true,
      data: {
        ...analytics,
        user: {
          ime: profil.ime,
          email: email,
          premium: true
        }
      }
    });

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================
// 📊 POMOĆNA FUNKCIJA - GENERIŠI ANALITIKU
// ============================================================
function generateAnalytics(data) {
  if (!data || data.length === 0) {
    return {
      averageSteps: 0,
      averageSleep: 0,
      averageHeartRate: 0,
      totalCalories: 0,
      trends: { steps: [], sleep: [], heartRate: [] },
      recommendations: ['Nema dovoljno podataka za analizu.']
    };
  }

  const validData = data.filter(d => d !== null);
  const days = validData.length;

  const avgSteps = validData.reduce((sum, d) => sum + (d.koraci_danas || 0), 0) / days;
  const avgSleep = validData.reduce((sum, d) => sum + (d.san_sati || 0), 0) / days;
  const avgHeartRate = validData.reduce((sum, d) => sum + (d.otkucaji_srca || 0), 0) / days;
  const totalCalories = validData.reduce((sum, d) => sum + (d.kalorije_sagorene || 0), 0);

  const trends = {
    steps: validData.slice(0, 7).map(d => d.koraci_danas || 0),
    sleep: validData.slice(0, 7).map(d => d.san_sati || 0),
    heartRate: validData.slice(0, 7).map(d => d.otkucaji_srca || 0)
  };

  // Generiši preporuke
  const recommendations = [];

  if (avgSleep < 6) {
    recommendations.push('😴 Spavaš manje od 6 sati. Pokušaj ranije na spavanje!');
  } else if (avgSleep > 9) {
    recommendations.push('😴 Spavaš više od 9 sati. Možda je previše, probaj sa 7-8 sati.');
  } else {
    recommendations.push('😴 Odličan san! Nastavi ovako.');
  }

  if (avgSteps < 5000) {
    recommendations.push('🚶 Manje od 5000 koraka dnevno. Pokušaj više hodati!');
  } else if (avgSteps < 8000) {
    recommendations.push('🚶 Dobro, ali može bolje. Ciljaj 8000+ koraka dnevno.');
  } else {
    recommendations.push('🚶 Odlična aktivnost! Nastavi ovako.');
  }

  if (avgHeartRate > 100) {
    recommendations.push('❤️ Povišen srčani ritam. Preporučujemo lagane vježbe i opuštanje.');
  } else if (avgHeartRate < 60 && avgHeartRate > 0) {
    recommendations.push('❤️ Nizak srčani ritam. Ako nisi sportista, provjeri kod ljekara.');
  }

  return {
    averageSteps: Math.round(avgSteps),
    averageSleep: Math.round(avgSleep * 10) / 10,
    averageHeartRate: Math.round(avgHeartRate),
    totalCalories: Math.round(totalCalories),
    trends,
    recommendations,
    daysTracked: days
  };
}

// ============================================================
// POKRENI SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('\n=================================');
  console.log(`✅ Server pokrenut na http://localhost:${PORT}`);
  console.log('=================================\n');
});