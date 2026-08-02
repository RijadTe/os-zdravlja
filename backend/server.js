// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// ============================================================
// PROVJERA ENV
// ============================================================
console.log('🔍 Provjera .env:');
console.log('PORT:', process.env.PORT || '5000');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅' : '❌');
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
// MIDDLEWARE - CORS (SA SVIM DOZVOLJENIM DOMENAMA)
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
    'https://os-zdravlja.vercel.app',        // ← DODANO!
    'https://os-zdravlja-backend.onrender.com',
    'https://os-zdravlja.vercel.app/',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// SUPABASE CLIENT
// ============================================================
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase povezan!\n');

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
// 2. REGISTRACIJA
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
// 3. PRIJAVA (LOGIN)
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
// 4. DOHVATI TRENUTNOG KORISNIKA
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
// 5. ODJAVA (LOGOUT)
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
// 6. QUIZ ENDPOINT - SA FILTERIMA
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
    
    // Vrati ažurirani profil
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
// 7. DOHVATI RECEPTE SA FILTERIMA
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
      kalorije 
    } = req.query;
    
    console.log('📊 Dohvatam recepte sa filterima:', { email, vrsta, restrikcije, preferencije, vrijeme, tezina, kalorije });
    
    let query = supabase
      .from('recepti')
      .select('*');

    // Prvo primijeni filtere iz kviza (ako postoje)
    if (vrsta) {
      const vrstaArray = Array.isArray(vrsta) ? vrsta : [vrsta];
      query = query.in('vrsta', vrstaArray);
    }

    if (vrijeme) {
      query = query.eq('vrijeme', vrijeme);
    }

    if (tezina) {
      query = query.eq('tezina', tezina);
    }

    // Restrikcije - izbaci recepte koji sadrže te sastojke
    if (restrikcije) {
      const restrikcijeArray = Array.isArray(restrikcije) ? restrikcije : [restrikcije];
      for (let r of restrikcijeArray) {
        // Ovo je pojednostavljeno - u pravoj implementaciji bi trebalo
        // provjeravati sastojke recepta
        query = query.not('sastojci', 'cs', `{${r}}`);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 8. DOHVATI RECEPTE ZA KORISNIKA (SA NJEGOVIM FILTERIMA)
// ============================================================
app.get('/api/recepti/korisnik/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`👤 Dohvatam recepte za korisnika: ${email}`);
    
    // Prvo dohvati profil korisnika
    const { data: profil, error: profilError } = await supabase
      .from('profili')
      .select('vrsta, izbjegava, preferencije, vrijeme, tezina, kalorije')
      .eq('email', email)
      .maybeSingle();

    if (profilError) throw profilError;
    if (!profil) {
      return res.status(404).json({ error: 'Korisnik nije pronađen.' });
    }

    console.log('📋 Korisnički filteri:', profil);

    let query = supabase
      .from('recepti')
      .select('*');

    // Primijeni filtere iz profila
    if (profil.vrsta && profil.vrsta.length > 0) {
      query = query.in('vrsta', profil.vrsta);
    }

    if (profil.vrijeme) {
      query = query.eq('vrijeme', profil.vrijeme);
    }

    if (profil.tezina) {
      query = query.eq('tezina', profil.tezina);
    }

    // Restrikcije
    if (profil.izbjegava && profil.izbjegava.length > 0) {
      for (let r of profil.izbjegava) {
        // Ovo je pojednostavljeno - u pravoj implementaciji bi trebalo
        // provjeravati sastojke recepta
        query = query.not('sastojci', 'cs', `{${r}}`);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata za korisnika`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 9. DOHVATI JEDAN RECEPT
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
// 10. DOHVATI PROFIL
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
// 11. AŽURIRAJ PROFIL
// ============================================================
app.put('/api/profil/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const updates = req.body;
    
    console.log(`📝 Ažuriranje profila: ${email}`);
    
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
// 12. KREIRAJ PROFIL
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
// 13. IZBRIŠI PROFIL
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
// 14. HEALTHY CHEF - KATEGORIJE
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
// 15. HEALTHY CHEF - FAZE PO KATEGORIJI
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
// 16. HEALTHY CHEF - RECEPTI ZA FAZU
// ============================================================
app.get('/api/healthy-chef/recepti', async (req, res) => {
  try {
    const { fazaId, email, vrsta, vrijeme, tezina } = req.query;
    
    console.log(`🌿 Dohvatam recepte za fazu: ${fazaId}`);
    console.log('📦 Filteri:', { vrsta, vrijeme, tezina });
    
    let query = supabase
      .from('recepti')
      .select('*');

    if (fazaId) {
      query = query.eq('faza_id', fazaId);
    }

    if (vrsta) query = query.eq('vrsta', vrsta);
    if (vrijeme) query = query.eq('vrijeme', vrijeme);
    if (tezina) query = query.eq('tezina', tezina);

    const { data, error } = await query;

    if (error) throw error;
    console.log(`✅ Dohvaćeno ${data?.length || 0} recepata`);
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška pri dohvatu recepata:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 17. AI WEEKLY PLAN (FoodPlanner)
// ============================================================
app.post('/api/ai-weekly-plan', async (req, res) => {
  try {
    const { email, sastojci } = req.body;
    console.log('🤖 Generišem sedmični plan za:', email);
    console.log('📦 Sastojci:', sastojci);

    const plan = {
      dani: [
        { naziv: 'Pon', dorucak: 'Ovsena kaša sa voćem', rucak: 'Pileća prsa sa povrćem', vecera: 'Losos sa krompirom' },
        { naziv: 'Uto', dorucak: 'Jaja na oko', rucak: 'Salata sa tunjevinom', vecera: 'Tofu sa rižom' },
        { naziv: 'Sri', dorucak: 'Smoothie bowl', rucak: 'Riba na žaru', vecera: 'Krompir sa povrćem' },
        { naziv: 'Čet', dorucak: 'Palenta sa sirom', rucak: 'Piletina sa rižom', vecera: 'Povrće na žaru' },
        { naziv: 'Pet', dorucak: 'Musli sa jogurtom', rucak: 'Burger sa salatom', vecera: 'Pizza sa povrćem' },
        { naziv: 'Sub', dorucak: 'Palačinke', rucak: 'Ćevapi sa lukom', vecera: 'Riba sa blitvom' },
        { naziv: 'Ned', dorucak: 'Kajgana sa šunkom', rucak: 'Pečenje sa krompirom', vecera: 'Salata sa piletinom' },
      ]
    };

    res.json(plan);
  } catch (error) {
    console.error('❌ Greška pri generisanju plana:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 18. TAJNI RECEPT
// ============================================================
app.get('/api/tajni-recept', async (req, res) => {
  try {
    console.log('🔮 Dohvatam današnji tajni recept...');
    
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

      return res.json({
        ...recept,
        _tajni_datum: tajni.datum
      });
    }

    console.log('🔄 Nema tajnog recepta za danas, biram novi...');
    
    const { data: sviRecepti, error: sviError } = await supabase
      .from('recepti')
      .select('id')
      .limit(100);

    if (sviError) {
      console.error('❌ Greška pri dohvatu recepata:', sviError);
      return res.status(500).json({ error: sviError.message });
    }

    if (!sviRecepti || sviRecepti.length === 0) {
      return res.status(404).json({ error: 'Nema recepata u bazi.' });
    }

    const randomIndex = Math.floor(Math.random() * sviRecepti.length);
    const odabraniId = sviRecepti[randomIndex].id;

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
// 19. AI CHEF - DOHVATI LIMIT
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
// 20. AI CHEF - OTKLJUČAJ PRETRAGU (VIDEO)
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
// 21. AI CHEF - PRETRAGA (SA SLIKOM + OCR + KEŠ)
// ============================================================
app.post('/api/ai-chef', upload.single('slika'), async (req, res) => {
  try {
    const { tekst, email } = req.body;
    const slika = req.file;
    
    console.log(`🤖 AI Chef pretraga za: ${email}`);
    
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
      return sastojci.some(sastojak => 
        receptSastojci.some(rs => rs.includes(sastojak))
      );
    });

    console.log(`✅ Pronađeno ${filtrirani.length} recepata`);

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
// 22. AI CHEF - OČISTI STARI KEŠ
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
// 23. PDF IZVJEŠTAJ
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

    // Header
    doc.fontSize(24).fillColor('#2563eb').text('🏥 OS Zdravlja', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#1f2937').text('📊 Izvještaj o ishrani', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#4b5563').text(`Korisnik: ${user?.ime || email}`, { align: 'center' });
    doc.text(`Email: ${email}`, { align: 'center' });
    const datumIzvjestaja = datum || new Date().toISOString().split('T')[0];
    doc.text(`Datum: ${datumIzvjestaja}`, { align: 'center' });
    doc.moveDown(1);

    // Linija
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    // Statistika
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

    // Linija
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.moveDown(1);

    // Tabela
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
// 24. ZDRAVSTVENI PODACI - SAČUVAJ
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
// 25. ZDRAVSTVENI PODACI - DOHVATI
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
// 26. NOTIFIKACIJE - GENERIŠI PREPORUKE
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
    const preporuke = [];

    // Dohvati zdravstvene podatke (zadnjih 7 dana)
    const { data: zdravstveni, error: zdravError } = await supabase
      .from('zdravstveni_podaci')
      .select('*')
      .eq('korisnik_email', email)
      .order('datum', { ascending: false })
      .limit(7);

    if (zdravError) throw zdravError;

    // Analiziraj zdravstvene podatke
    if (zdravstveni && zdravstveni.length > 0) {
      const prosjekSna = zdravstveni.reduce((acc, z) => acc + (z.san_sati || 0), 0) / zdravstveni.length;
      const prosjekStresa = zdravstveni.reduce((acc, z) => acc + (z.nivo_stresa || 0), 0) / zdravstveni.length;
      const prosjekEnergije = zdravstveni.reduce((acc, z) => acc + (z.energija || 0), 0) / zdravstveni.length;

      // 😴 LOŠ SAN
      if (prosjekSna < 6) {
        preporuke.push({
          tip: 'san',
          poruka: `😴 ${ime}, primjećujem da spavaš manje od 6 sati u prosjeku. Pokušaj ranije na spavanje večeras!`,
          link: '/'
        });
      }

      // 🧘 VISOK STRES
      if (prosjekStresa > 6) {
        preporuke.push({
          tip: 'coach',
          poruka: `🧘 ${ime}, primjećujem da si pod stresom. Isprobaj vježbe disanja ili čaj od kamilice.`,
          link: '/'
        });
      }

      // 💪 NISKA ENERGIJA
      if (prosjekEnergije < 5) {
        preporuke.push({
          tip: 'energija',
          poruka: `⚡ ${ime}, energija ti je na niskom nivou. Probaj smoothie od banane ili proteinski obrok.`,
          link: '/recipes?preferencije=Visokoproteinski'
        });
      }

      // 🌟 DOBRO STANJE
      if (prosjekSna >= 7 && prosjekStresa < 4 && prosjekEnergije >= 7) {
        preporuke.push({
          tip: 'motivacija',
          poruka: `🌟 Odlično, ${ime}! San, energija i stres su na dobrom nivou. Nastavi ovako!`,
          link: '/profile'
        });
      }
    }

    // 🛒 PODSJETNIK ZA TRGOVINU
    const namirnice = profil.namirnice || [];
    if (namirnice.length < 3) {
      preporuke.push({
        tip: 'kupovina',
        poruka: `🛒 ${ime}, primjećujem da ti ponestaje namirnica. Vrijeme je za odlazak u trgovinu!`,
        link: '/'
      });
    }

    // 🍽️ PODSJETNIK ZA OBROKE
    const { data: obroci, error: obrociError } = await supabase
      .from('obroci')
      .select('*')
      .eq('email', email)
      .eq('datum', new Date().toISOString().split('T')[0]);

    if (obrociError) throw obrociError;

    const sat = new Date().getHours();
    if (obroci.length === 0 && sat >= 12 && sat < 14) {
      preporuke.push({
        tip: 'rucak',
        poruka: `🍽️ ${ime}, još nisi unio/la današnje obroke. Ne zaboravi na ručak!`,
        link: '/food-planner'
      });
    }

    // Sačuvaj preporuke
    for (const preporuka of preporuke) {
      const { data: postoji } = await supabase
        .from('notifikacije')
        .select('id')
        .eq('korisnik_email', email)
        .eq('tip', preporuka.tip)
        .gte('created_at', new Date().toISOString().split('T')[0])
        .maybeSingle();

      if (!postoji) {
        await supabase
          .from('notifikacije')
          .insert([{
            korisnik_email: email,
            tip: preporuka.tip,
            poruka: preporuka.poruka,
            link: preporuka.link || '/',
            procitano: false,
            created_at: new Date().toISOString()
          }]);
      }
    }

    // Vrati notifikacije
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
// 27. NOTIFIKACIJE - DOHVATI
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
// 28. NOTIFIKACIJE - OZNAČI KAO PROČITANO
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
// 29. NOTIFIKACIJE - IZBRIŠI
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
// 30. OBROCI - DOHVATI OBROKE ZA KORISNIKA
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
// 31. OBROCI - KREIRAJ OBROK
// ============================================================
app.post('/api/obroci', async (req, res) => {
  try {
    const { email, naziv, kalorije, proteini, ugljikohidrati, masti, tip, mood_before, mood_after, mood_note } = req.body;
    
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
        datum: new Date().toISOString().split('T')[0]
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
// 32. OBROCI - IZBRIŠI OBROK
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
// 33. COMMUNITY - DOHVATI SVE OBJAVE
// ============================================================
app.get('/api/community/objave', async (req, res) => {
  try {
    console.log('📝 Dohvatam sve objave...');
    
    const { data, error } = await supabase
      .from('objave')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 34. COMMUNITY - KREIRAJ OBJAVU
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
      slikaUrl = `/uploads/${slika.filename}`;
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
// 35. COMMUNITY - LAJKUJ OBJAVU
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

    // Kreiraj notifikaciju za lajk
    if (lajkovao && objava.korisnik_email && objava.korisnik_email !== email) {
      const { data: userData } = await supabase
        .from('profili')
        .select('ime')
        .eq('email', email)
        .maybeSingle();

      const ime = userData?.ime || 'Neko';
      
      await supabase
        .from('notifikacije')
        .insert([{
          korisnik_email: objava.korisnik_email,
          tip: 'lajk',
          poruka: `${ime} je lajkovao/la vašu objavu "${objava.naziv}"`,
          link: `/community`,
          procitano: false,
          created_at: new Date().toISOString()
        }]);
    }

    res.json({ lajkovi: noviLajkovi, lajkovao });
  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 36. COMMUNITY - IZBRIŠI OBJAVU
// ============================================================
app.delete('/api/community/objave/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Brisanje objave: ${id}`);
    
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
// 37. ZABORAVLJENA LOZINKA - POŠALJI LINK
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
// 38. RESET LOZINKE
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
// 39. TEST QUIZ ENDPOINT
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
// 40. FALLBACK RUTA
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
  console.log('=================================');
  console.log('=================================\n');
});