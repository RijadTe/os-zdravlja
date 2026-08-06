// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
// PROVJERA ENV VARIJABLI
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
// 🔥 RATE LIMIT
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
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: '⏳ Previše pokušaja prijave. Pokušajte za minutu.'
  },
  skipSuccessfulRequests: true,
});

const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: '⏳ Previše AI pretraga. Pokušajte za minutu.'
  }
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
console.log('   - Auth: 100 pokušaja/min');
console.log('   - AI: 200 pretraga/min');
console.log('   - Teški endpointi: 500 zahtjeva/min');

// ============================================================
// MIDDLEWARE - CORS
// ============================================================
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://10.129.62.121:5173',
    'http://10.129.62.121:5174',
    'https://os-zdravlja.vercel.app',
    'https://os-zdravlja-backend.onrender.com',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

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
// FALLBACK PLAN GENERATOR
// ============================================================
function generateFallbackPlan(kalorije, proteini, ugljikohidrati, masti, restrikcije) {
  const hasRestriction = (food) => {
    if (!restrikcije || restrikcije.length === 0) return false;
    return restrikcije.some(r => 
      food.toLowerCase().includes(r.toLowerCase()) || 
      r.toLowerCase().includes(food.toLowerCase())
    );
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
          const alternatives = {
            'Pileća prsa': 'Pileći file',
            'Losos': 'Riba',
            'Tofu': 'Soja',
            'Jaja': 'Tofu jaja',
            'Mlijeko': 'Sojino mlijeko',
            'Sir': 'Veganski sir',
            'Pizza': 'Pizza bez glutena',
            'Palačinke': 'Palačinke od heljde',
            'Kajgana': 'Kajgana od tofua'
          };
          
          for (const [key, value] of Object.entries(alternatives)) {
            if (newDan[obrok].includes(key)) {
              newDan[obrok] = newDan[obrok].replace(key, value);
              break;
            }
          }
        }
      });
      
      return newDan;
    });
    
    console.log('🔒 Restrikcije primijenjene na plan');
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
// 5. REGISTRACIJA
// ============================================================
app.post('/api/auth/register', async (req, res) => {
  console.log('\n📝 === REGISTRACIJA ===');
  console.log('📦 Podaci:', req.body);
  
  try {
    const { email, ime, lozinka } = req.body;

    if (!email || !ime || !lozinka) {
      return res.status(400).json({ error: '❌ Sva polja su obavezna.' });
    }

    if (lozinka.length < 6) {
      return res.status(400).json({ error: '❌ Lozinka mora imati najmanje 6 karaktera.' });
    }

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
});

// ============================================================
// 6. PRIJAVA (LOGIN)
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  console.log('\n🔐 === PRIJAVA ===');
  console.log('📦 Podaci:', req.body);
  
  try {
    const { email, lozinka } = req.body;

    if (!email || !lozinka) {
      return res.status(400).json({ error: '❌ Email i lozinka su obavezni.' });
    }

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
});

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
// 9. QUIZ ENDPOINT
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
// 10. 🔥 DOHVATI RECEPTE SA FILTERIMA + PAGINACIJA
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
      search
    } = req.query;
    
    console.log('📊 Dohvatam recepte sa paginacijom:');
    console.log('   Page:', page);
    console.log('   Limit:', limit);
    console.log('   Search:', search);
    console.log('   Email:', email);
    console.log('   Vrsta:', vrsta);
    console.log('   Restrikcije:', restrikcije);
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let userRestrictions = [];
    let userPreferences = [];
    let userVrsta = [];
    let userVrijeme = '';
    let userTezina = '';
    let userKalorije = '';
    
    // 🔥 1. DOHVATI RESTRIKCIJE IZ PROFILA
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
    
    // 🔥 2. RESTRIKCIJE IZ QUERY PARAMETRA
    let restrikcijeArray = [];
    if (restrikcije) {
      restrikcijeArray = Array.isArray(restrikcije) 
        ? restrikcije 
        : restrikcije.split(',').filter(r => r.trim() !== '');
      console.log('🔒 Query restrikcije:', restrikcijeArray);
    } else if (userRestrictions.length > 0) {
      restrikcijeArray = userRestrictions;
    }
    
    // 🔥 3. KREIRAJ QUERY SA BROJANJEM
    let query = supabase
      .from('recepti')
      .select('*', { count: 'exact' });

    // FILTRIRAJ PO VRSTI
    let vrstaFilter = vrsta ? vrsta.split(',') : [];
    if (vrstaFilter.length === 0 && userVrsta.length > 0) {
      vrstaFilter = userVrsta.filter(v => v !== 'Svejedno');
    }
    if (vrstaFilter.length > 0) {
      query = query.in('vrsta', vrstaFilter);
      console.log('✅ Filtriram po vrsti:', vrstaFilter);
    }

    // FILTRIRAJ PO VREMENU
    let vrijemeFilter = vrijeme || userVrijeme;
    if (vrijemeFilter) {
      query = query.eq('vrijeme', vrijemeFilter);
      console.log('✅ Filtriram po vremenu:', vrijemeFilter);
    }

    // FILTRIRAJ PO TEŽINI
    let tezinaFilter = tezina || userTezina;
    if (tezinaFilter) {
      query = query.eq('tezina', tezinaFilter);
      console.log('✅ Filtriram po težini:', tezinaFilter);
    }

    // FILTRIRAJ PO KALORIJAMA
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

    // 🔥🔥🔥 FILTRIRAJ PO RESTRIKCIJAMA
    if (restrikcijeArray.length > 0) {
      const hasNoRestrictions = restrikcijeArray.some(r => 
        r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        query = query.not('alergeni', '&&', restrikcijeArray);
        console.log('✅ Filtriram po restrikcijama (alergeni):', restrikcijeArray);
      } else {
        console.log('✅ Korisnik nema restrikcija - prikazujem sve');
      }
    }

    // FILTRIRAJ PO PREFERENCIJAMA
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

    // 🔥 PRETRAGA
    if (search && search.trim()) {
      query = query.ilike('naziv', `%${search.trim()}%`);
      console.log('✅ Pretraga:', search.trim());
    }

    // 🔥 SORTIRANJE
    query = query.order('created_at', { ascending: false });

    // 🔥🔥🔥 PAGINACIJA
    query = query.range(offset, offset + parseInt(limit) - 1);

    // IZVRŠI QUERY
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Greška:', error);
      return res.status(500).json({ error: error.message });
    }
    
    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata (od ${count || 0} ukupno)`);
    
    // 🔥 VRATI SA PAGINACIJOM
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
// 11. 🔥 DOHVATI RECEPTE ZA KORISNIKA (ISPRAVLJENO!)
// ============================================================
app.get('/api/recepti/korisnik/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`👤 Dohvatam recepte za korisnika: ${email}`);
    
    // 1. DOHVATI KORISNIKOV PROFIL
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

    // 2. KREIRAJ QUERY
    let query = supabase
      .from('recepti')
      .select('*');

    // FILTRIRAJ PO VRSTI
    if (profil.vrsta && profil.vrsta.length > 0) {
      const vrste = profil.vrsta.filter(v => v !== 'Svejedno');
      if (vrste.length > 0) {
        query = query.in('vrsta', vrste);
        console.log('✅ Filtriram po vrsti:', vrste);
      }
    }

    // FILTRIRAJ PO VREMENU
    if (profil.vrijeme && profil.vrijeme !== '') {
      query = query.eq('vrijeme', profil.vrijeme);
      console.log('✅ Filtriram po vremenu:', profil.vrijeme);
    }

    // FILTRIRAJ PO TEŽINI
    if (profil.tezina && profil.tezina !== '') {
      query = query.eq('tezina', profil.tezina);
      console.log('✅ Filtriram po težini:', profil.tezina);
    }

    // FILTRIRAJ PO KALORIJAMA
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

    // 🔥🔥🔥 FILTRIRAJ PO RESTRIKCIJAMA (ALERGENIMA) - ISPRAVLJENO!
    const restrikcije = profil.izbjegava || [];
    if (restrikcije.length > 0) {
      const hasNoRestrictions = restrikcije.some(r => 
        r === 'Bez restrikcija' || r === 'No restrictions' || r === 'Keine Einschränkungen'
      );
      
      if (!hasNoRestrictions) {
        // 🔥 ISPRAVNO: FILTRIRAJ PO 'alergeni' KOLONI!
        query = query.not('alergeni', '&&', restrikcije);
        console.log('✅ Filtriram po restrikcijama (alergeni):', restrikcije);
      } else {
        console.log('✅ Korisnik nema restrikcija - prikazujem sve');
      }
    }

    // FILTRIRAJ PO PREFERENCIJAMA
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

    // IZVRŠI QUERY
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
// 12. DOHVATI JEDAN RECEPT
// ============================================================
app.get('/api/recepti/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('recepti')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Recept nije pronađen' });
      }
      throw error;
    }
    res.json(data);
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
// 17. HEALTHY CHEF - KATEGORIJE
// ============================================================
app.get('/api/healthy-chef/kategorije', async (req, res) => {
  try {
    console.log('🌿 Dohvatam HealthyChef kategorije...');
    
    const { data, error } = await supabase
      .from('healthy_chef_kategorije')
      .select('*')
      .order('redoslijed', { ascending: true });

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} kategorija`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška pri dohvatu kategorija:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 18. HEALTHY CHEF - FAZE PO KATEGORIJI
// ============================================================
app.get('/api/healthy-chef/faze/:kategorijaId', async (req, res) => {
  try {
    const { kategorijaId } = req.params;
    console.log(`🌿 Dohvatam faze za kategoriju: ${kategorijaId}`);
    
    const { data, error } = await supabase
      .from('healthy_chef_faze')
      .select('*')
      .eq('kategorija_id', kategorijaId)
      .order('redoslijed', { ascending: true });

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} faza`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška pri dohvatu faza:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 19. HEALTHY CHEF - RECEPTI ZA FAZU (SA PAGINACIJOM)
// ============================================================
app.get('/api/healthy-chef/recepti', async (req, res) => {
  try {
    const { 
      fazaId, 
      email, 
      vrsta, 
      vrijeme, 
      tezina,
      page = 1,
      limit = 20
    } = req.query;
    
    console.log(`🌿 Dohvatam recepte za fazu: ${fazaId}`);
    console.log('📦 Filteri:', { vrsta, vrijeme, tezina });
    console.log('📦 Page:', page, 'Limit:', limit);
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = supabase
      .from('recepti')
      .select('*', { count: 'exact' });

    if (fazaId) {
      query = query.eq('faza_id', fazaId);
    }

    if (vrsta) query = query.eq('vrsta', vrsta);
    if (vrijeme) query = query.eq('vrijeme', vrijeme);
    if (tezina) query = query.eq('tezina', tezina);

    // 🔥 SORTIRANJE
    query = query.order('created_at', { ascending: false });

    // 🔥 PAGINACIJA
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    
    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata (od ${count || 0} ukupno)`);
    
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
// 20a. WEEKLY PLAN - HYBRID: Baza → OpenAI (fallback)
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

    // ============================================================
    // 1. DOHVATI RECEPTE IZ BAZE
    // ============================================================
    const { data: recepti, error } = await supabase
      .from('recepti')
      .select('*');

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ error: 'Greška pri dohvatu recepata' });
    }

    console.log(`📚 Ukupno recepata u bazi: ${recepti?.length || 0}`);

    // ============================================================
    // 2. FILTRIRAJ RECEPTE
    // ============================================================
    let filtered = [...recepti];

    // 2a. Restrikcije
    if (restrikcije && restrikcije.length > 0) {
      filtered = filtered.filter(recipe => {
        const alergeni = recipe.alergeni || [];
        return !restrikcije.some(r => alergeni.includes(r));
      });
      console.log(`📊 Nakon restrikcija: ${filtered.length} recepata`);
    }

    // 2b. Kalorije (50% - 130% od cilja po obroku)
    const kalorijePoObroku = Math.round((kalorije || 2200) / 3);
    const minKcal = Math.round(kalorijePoObroku * 0.5);
    const maxKcal = Math.round(kalorijePoObroku * 1.3);
    
    filtered = filtered.filter(recipe => {
      const kcal = recipe.kalorije || 0;
      return kcal >= minKcal && kcal <= maxKcal;
    });
    console.log(`📊 Nakon kalorija (${minKcal}-${maxKcal} kcal): ${filtered.length} recepata`);

    // 2c. Sastojci iz frižidera
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
    // 3. AKO IMA DOVOLJNO RECEPATA → KORISTI BAZU
    // ============================================================
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

      // Sačuvaj plan u bazu
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

    // ============================================================
    // 4. NEMA DOVOLJNO RECEPATA → OPENAI FALLBACK
    // ============================================================
    console.log(`⚠️ Premalo recepata u bazi (${filtered.length}), prelazim na OpenAI...`);

    // Provjeri da li OpenAI radi
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

    // OpenAI generisanje
    try {
      const ime = email?.split('@')[0] || 'Korisnik';
      const restrikcijeTekst = restrikcije && restrikcije.length > 0 
        ? `IZBJEGAVAJ: ${restrikcije.join(', ')}. Ove namirnice su ZABRANJENE!` 
        : 'Nema posebnih restrikcija.';
      
      const sastojciTekst = sastojci && sastojci.length > 0
        ? `Koristi dostupne namirnice: ${sastojci.join(', ')}.`
        : 'Koristi uobičajene namirnice.';

      const bazaPrimjeri = filtered.length > 0 
        ? `\nDostupni recepti iz baze (možeš ih koristiti): ${filtered.slice(0, 10).map(r => r.naziv).join(', ')}`
        : '';

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
        ${bazaPrimjeri}
        
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
      
      const aiPlan = JSON.parse(response.choices[0].message.content);
      console.log('✅ AI plan generiran sa OpenAI');

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
      console.log('🔄 Koristim fallback plan');
      
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
// 21. TAJNI RECEPT - SA RESTRIKCIJAMA KORISNIKA!
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
// 23. AI CHEF - OTKLJUČAJ PRETRAGU
// ============================================================
app.post('/api/ai-chef/unlock', async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`🔓 Otključavanje pretrage za: ${email}`);

    if (!email) {
      return res.status(400).json({ error: 'Email je obavezan.' });
    }

    const danas = new Date().toISOString().split('T')[0];
    const maxPretraga = 3;

    const { data: existing, error: fetchError } = await supabase
      .from('profili')
      .select('ai_chef_pretrage, ai_chef_datum, premium')
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

    const { error: updateError } = await supabase
      .from('profili')
      .update({
        ai_chef_pretrage: noviBroj,
        ai_chef_datum: danas
      })
      .eq('email', email);

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: '✅ Otključano!',
      broj_pretraga: noviBroj,
      max_pretraga: maxPretraga,
      preostalo: preostalo,
      moze: preostalo > 0
    });
  } catch (error) {
    console.error('❌ Greška pri otključavanju:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🔥 24. AI CHEF - PRETRAGA (SA RESTRIKCIJAMA I SPAVANJEM!)
// ============================================================
app.post('/api/ai-chef', upload.single('slika'), async (req, res) => {
  try {
    const { tekst, email } = req.body;
    const slika = req.file;
    
    console.log(`🤖 AI Chef pretraga za: ${email}`);
    
    let restrikcije = [];
    let zdravstveniPodaci = null;
    
    if (email) {
      const { data: profil, error: profilError } = await supabase
        .from('profili')
        .select('izbjegava')
        .eq('email', email)
        .maybeSingle();
      
      if (profilError) {
        console.error('❌ Greška pri dohvatu restrikcija:', profilError);
      }
      
      if (profil?.izbjegava) {
        restrikcije = profil.izbjegava;
        console.log('🔒 Restrikcije korisnika:', restrikcije);
      }
      
      const { data: zdravstveni, error: zdravError } = await supabase
        .from('zdravstveni_podaci')
        .select('*')
        .eq('korisnik_email', email)
        .order('datum', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (zdravError) {
        console.error('❌ Greška pri dohvatu zdravstvenih podataka:', zdravError);
      }
      
      if (zdravstveni) {
        zdravstveniPodaci = zdravstveni;
        console.log('😴 Zdravstveni podaci:', zdravstveni);
      }
    }
    
    let inputText = tekst || '';
    let inputType = 'tekst';
    let imageHash = null;
    let slikaPutanja = null;

    if (slika) {
      inputType = 'slika';
      slikaPutanja = slika.path;
      console.log('📸 Primljena slika:', slika.originalname);
      console.log('📏 Veličina:', slika.size, 'bytes');
      console.log('📁 Putanja:', slikaPutanja);

      imageHash = generateHash(slikaPutanja, 'slika');
      
      const cached = await checkCache(imageHash);
      if (cached) {
        console.log('✅ Keš pronađen za sliku!');
        if (fs.existsSync(slikaPutanja)) {
          fs.unlink(slikaPutanja, (err) => { if (err) console.error('⚠️ Greška pri brisanju slike:', err); });
        }
        return res.json(cached.results);
      }

      const analysis = await analyzeImage(slikaPutanja);
      inputText = analysis.sastojci.join(', ');
      
      if (fs.existsSync(slikaPutanja)) {
        fs.unlink(slikaPutanja, (err) => { if (err) console.error('⚠️ Greška pri brisanju slike:', err); });
      }
      
      console.log('📝 Sastojci sa slike:', inputText);
    }

    if (!inputText || inputText.trim() === '') {
      return res.json([]);
    }

    const textHash = generateHash(inputText, 'tekst');
    
    const cachedText = await checkCache(textHash);
    if (cachedText) {
      console.log('✅ Keš pronađen za tekst!');
      return res.json(cachedText.results);
    }

    const sastojci = inputText.split(',').map(s => s.trim().toLowerCase());
    console.log('📦 Sastojci za pretragu:', sastojci);

    const { data: recepti, error } = await supabase
      .from('recepti')
      .select('*');

    if (error) throw error;

    const filtrirani = recepti.filter(recept => {
      if (!recept.sastojci || recept.sastojci.length === 0) return false;
      const receptSastojci = recept.sastojci.map(s => s.toLowerCase());
      const imaSastojak = sastojci.some(sastojak => 
        receptSastojci.some(rs => rs.includes(sastojak))
      );
      if (!imaSastojak) return false;
      
      if (restrikcije && restrikcije.length > 0) {
        const alergeni = recept.alergeni || [];
        const imaRestrikciju = restrikcije.some(r => alergeni.includes(r));
        if (imaRestrikciju) return false;
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

    console.log(`✅ Pronađeno ${filtrirani.length} recepata (sa restrikcijama i zdravstvenim podacima)`);

    const results = filtrirani;
    const hashToSave = imageHash || textHash;
    const typeToSave = slika ? 'slika' : 'tekst';
    
    await saveToCache(hashToSave, typeToSave, results);

    res.json(results);

  } catch (error) {
    console.error('❌ Greška pri AI pretrazi:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 25. AI CHEF - OČISTI STARI KEŠ
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
// 26. PDF IZVJEŠTAJ
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
// 27. ZDRAVSTVENI PODACI - SAČUVAJ
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
// 28. ZDRAVSTVENI PODACI - DOHVATI
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
// 29. 🔥 NOTIFIKACIJE - GENERIŠI PREPORUKE SA PREMIUM DODACIMA!
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
// 30. NOTIFIKACIJE - DOHVATI
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
// 31. NOTIFIKACIJE - OZNAČI KAO PROČITANO
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
// 32. NOTIFIKACIJE - OZNAČI SVE KAO PROČITANO
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
// 33. NOTIFIKACIJE - IZBRIŠI
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
// 34. OBROCI - DOHVATI OBROKE
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
// 35. OBROCI - KREIRAJ OBROK
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
// 36. OBROCI - IZBRIŠI OBROK
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
// 37. COMMUNITY - DOHVATI OBJAVE (SA PAGINACIJOM)
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
// 38. COMMUNITY - KREIRAJ OBJAVU (SA CLOUDINARY)
// ============================================================
app.post('/api/community/objave', upload.single('slika'), async (req, res) => {
  try {
    const { email, naziv, opis, sastojci } = req.body;
    const slika = req.file;
    
    console.log(`📝 Kreiranje objave za: ${email}`);
    
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

    const sastojciArray = sastojci ? sastojci.split(',').map(s => s.trim()).filter(s => s) : [];

    const { data, error } = await supabase
      .from('objave')
      .insert([{
        korosnik_id: user.id,
        korisnik_ime: user.ime || 'Korisnik',
        korisnik_email: email,
        naziv: naziv,
        opis: opis || '',
        sastojci: sastojciArray,
        slika: slikaUrl,
        lajkovi: 0,
        lajkovi_korisnici: []
      }])
      .select();

    if (error) throw error;
    console.log('✅ Objava kreirana:', data);
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 39. COMMUNITY - LAJKUJ OBJAVU
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
// 40. COMMUNITY - IZBRIŠI OBJAVU
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
// 41. ZABORAVLJENA LOZINKA
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
// 42. RESET LOZINKE
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
// 43. TEST QUIZ ENDPOINT
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
// 44. AI SOMELIJER (SA KEŠOM!)
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
// 45. OČISTI SOMELIJER KEŠ
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
// 46. STRIPE - KREIRAJ CHECKOUT SESSION
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
// 47. VERIFIKACIJA PLAĆANJA - SA PREMIUM_DO!
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
// 48. STRIPE WEBHOOK - POTVRDA PLAĆANJA
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
// 49. NOTIFIKACIJE - REGISTRUJ PUSH SUBSCRIPTION
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
// 50. PREVOD RECEPATA (i18n)
// ============================================================
app.post('/api/recepti/translate', async (req, res) => {
  try {
    const { receptId, jezik } = req.body;
    
    if (!receptId || !jezik) {
      return res.status(400).json({ error: 'receptId i jezik su obavezni.' });
    }

    console.log(`🔄 Prevodenje recepta ${receptId} na jezik: ${jezik}`);

    const { data: recept, error: receptError } = await supabase
      .from('recepti')
      .select('*')
      .eq('id', receptId)
      .single();

    if (receptError) throw receptError;

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

    if (!openai) {
      console.warn('⚠️ OpenAI nije dostupan, koristim fallback');
      return res.json({
        success: true,
        data: {
          naziv: recept.naziv,
          opis: recept.opis || '',
          sastojci: recept.sastojci || [],
          upute: recept.upute || []
        },
        cached: false,
        fallback: true
      });
    }

    const jezikMap = {
      'en': 'engleski',
      'de': 'njemački',
      'fr': 'francuski',
      'it': 'talijanski',
      'es': 'španjolski',
      'sr': 'srpski'
    };

    const jezikNaziv = jezikMap[jezik] || jezik;

    const prompt = `
      Prevedi sljedeći recept na ${jezikNaziv} jezik.
      
      Naziv: ${recept.naziv}
      Opis: ${recept.opis || ''}
      Sastojci: ${recept.sastojci?.join(', ') || ''}
      Upute: ${recept.upute?.join('. ') || ''}
      
      Odgovori isključivo u JSON formatu:
      {
        "naziv": "...",
        "opis": "...",
        "sastojci": ["...", "..."],
        "upute": ["...", "..."]
      }
      
      Prevedi prirodno i sačuvaj kontekst kulinarskih termina.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const translated = JSON.parse(response.choices[0].message.content);

    const { data: saved, error: saveError } = await supabase
      .from('recepti_prevodi')
      .insert([{
        recept_id: receptId,
        jezik: jezik,
        naziv: translated.naziv || recept.naziv,
        opis: translated.opis || recept.opis || '',
        sastojci: translated.sastojci || recept.sastojci || [],
        upute: translated.upute || recept.upute || []
      }])
      .select()
      .single();

    if (saveError) {
      console.error('❌ Greška pri spremanju prevoda:', saveError);
      return res.json({
        success: true,
        data: {
          naziv: translated.naziv || recept.naziv,
          opis: translated.opis || recept.opis || '',
          sastojci: translated.sastojci || recept.sastojci || [],
          upute: translated.upute || recept.upute || []
        },
        cached: false,
        fallback: false
      });
    }

    console.log('✅ Prevod sačuvan za recept:', receptId);
    res.json({ success: true, data: saved, cached: false });

  } catch (error) {
    console.error('❌ Greška pri prevodu recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 51. 🔥 CRON JOB - PREMIUM ISTEK (SVAKI DAN U 00:00)
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
// 52. FALLBACK RUTA
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