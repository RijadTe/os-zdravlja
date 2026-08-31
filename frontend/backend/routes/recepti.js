// backend/routes/recepti.js
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import express from 'express';

const router = express.Router();

// ============================================================
// 🔐 SUPABASE KONFIGURACIJA
// ============================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// 🤖 OPENAI KONFIGURACIJA
// ============================================================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================
// 🔄 FUNKCIJA ZA PREVOD RECEPTA PREKO OPENAI
// ============================================================
async function translateRecipe(recipe, targetLang) {
  const langName = targetLang === 'en' ? 'engleski' : 'njemački';
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: `Ti si profesionalni prevoditelj za kulinarske recepte. 
          Prevedi sljedeći recept na ${langName} jezik.
          
          Vrati odgovor u JSON formatu sa sljedećim poljima:
          {
            "naziv": "prevedeni naziv",
            "opis": "prevedeni opis",
            "sastojci": ["prevedeni sastojak1", "prevedeni sastojak2"],
            "upute": ["prevedeni korak1", "prevedeni korak2"],
            "nacin_pripreme": "prevedeni način pripreme (ako postoji)"
          }
          
          Zadrži isti broj sastojaka i koraka.
          Ako neko polje nedostaje, ostavi ga prazno.`
        },
        { 
          role: 'user', 
          content: JSON.stringify({
            naziv: recipe.naziv || '',
            opis: recipe.opis || '',
            sastojci: recipe.sastojci || [],
            upute: recipe.upute || [],
            nacin_pripreme: recipe.nacin_pripreme || ''
          })
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('❌ Greška pri prevodu:', error);
    throw error;
  }
}

// ============================================================
// 📤 1. DOHVATI SVE RECEPTE (SA PREVODOM)
// ============================================================
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, jezik = 'hr' } = req.query;
    const offset = (page - 1) * limit;

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
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Ako je jezik različit od HR, dohvati prevod
    if (jezik !== 'hr') {
      query = query.eq('prevod.jezik', jezik);
    }

    const { data: recipes, error, count } = await query;

    if (error) throw error;

    // 🔥 Ako postoji prevod, zamijeni originalne vrijednosti
    const processedRecipes = recipes.map(recipe => {
      if (recipe.prevod && jezik !== 'hr') {
        return {
          ...recipe,
          naziv: recipe.prevod.naziv || recipe.naziv,
          opis: recipe.prevod.opis || recipe.opis,
          sastojci: recipe.prevod.sastojci || recipe.sastojci,
          upute: recipe.prevod.upute || recipe.upute,
          nacin_pripreme: recipe.prevod.nacin_pripreme || recipe.nacin_pripreme,
          prevod: undefined // Uklonimo prevod iz odgovora
        };
      }
      return {
        ...recipe,
        prevod: undefined
      };
    });

    res.json({
      success: true,
      data: processedRecipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0
      }
    });

  } catch (error) {
    console.error('❌ Greška pri dohvatu recepata:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 📤 2. DOHVATI JEDAN RECEPT (SA PREVODOM)
// ============================================================
router.get('/:id', async (req, res) => {
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

    // Ako je jezik različit od HR, dohvati prevod
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

    // 🔥 Ako postoji prevod, zamijeni originalne vrijednosti
    if (recipe.prevod && jezik !== 'hr') {
      recipe.naziv = recipe.prevod.naziv || recipe.naziv;
      recipe.opis = recipe.prevod.opis || recipe.opis;
      recipe.sastojci = recipe.prevod.sastojci || recipe.sastojci;
      recipe.upute = recipe.prevod.upute || recipe.upute;
      recipe.nacin_pripreme = recipe.prevod.nacin_pripreme || recipe.nacin_pripreme;
    }

    // Uklonimo prevod iz odgovora
    delete recipe.prevod;

    res.json({ success: true, data: recipe });

  } catch (error) {
    console.error('❌ Greška pri dohvatu recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 📤 3. DODAJ NOVI RECEPT (SA AUTOMATSKIM PREVODOM)
// ============================================================
router.post('/', async (req, res) => {
  try {
    const { 
      naziv, 
      opis, 
      sastojci, 
      upute, 
      nacin_pripreme,
      vrijeme,
      tezina,
      kalorije,
      vrsta,
      alergeni,
      healthy_chef,
      slika,
      broj_osoba,
      proteini,
      ugljikohidrati,
      masti,
      vlakna,
      natrij,
      dijetne_oznake,
      bez_alergena
    } = req.body;

    // 1️⃣ Spremi recept u bazu
    const { data: recipe, error } = await supabase
      .from('recepti')
      .insert({
        naziv,
        opis,
        sastojci: sastojci || [],
        upute: upute || [],
        nacin_pripreme: nacin_pripreme || '',
        vrijeme: vrijeme || '',
        tezina: tezina || '',
        kalorije: kalorije || '',
        vrsta: vrsta || '',
        alergeni: alergeni || [],
        healthy_chef: healthy_chef || [],
        slika: slika || '',
        broj_osoba: broj_osoba || 4,
        proteini: proteini || 0,
        ugljikohidrati: ugljikohidrati || 0,
        masti: masti || 0,
        vlakna: vlakna || 0,
        natrij: natrij || 0,
        dijetne_oznake: dijetne_oznake || [],
        bez_alergena: bez_alergena || []
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Recept dodan: ${recipe.naziv}`);

    // 2️⃣ 🔥 AUTOMATSKI PREVEDI NA EN I DE
    let enTranslation = null;
    let deTranslation = null;

    try {
      [enTranslation, deTranslation] = await Promise.all([
        translateRecipe(recipe, 'en'),
        translateRecipe(recipe, 'de')
      ]);

      // 3️⃣ Spremi prevode u bazu
      await supabase.from('recepti_prevodi').insert([
        { 
          recept_id: recipe.id, 
          jezik: 'en', 
          naziv: enTranslation.naziv || recipe.naziv,
          opis: enTranslation.opis || recipe.opis,
          sastojci: enTranslation.sastojci || recipe.sastojci,
          upute: enTranslation.upute || recipe.upute,
          nacin_pripreme: enTranslation.nacin_pripreme || recipe.nacin_pripreme
        },
        { 
          recept_id: recipe.id, 
          jezik: 'de', 
          naziv: deTranslation.naziv || recipe.naziv,
          opis: deTranslation.opis || recipe.opis,
          sastojci: deTranslation.sastojci || recipe.sastojci,
          upute: deTranslation.upute || recipe.upute,
          nacin_pripreme: deTranslation.nacin_pripreme || recipe.nacin_pripreme
        }
      ]);

      console.log(`✅ Preveden na EN i DE: ${recipe.naziv}`);
    } catch (translateError) {
      console.error('❌ Greška pri prevodu:', translateError);
      // Nastavljamo dalje - recept je dodan, prevod će se kasnije ponoviti
    }

    res.status(201).json({ success: true, data: recipe });

  } catch (error) {
    console.error('❌ Greška pri dodavanju recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🔄 4. AŽURIRAJ RECEPT (SA AUTOMATSKIM REPREVODOM)
// ============================================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 1️⃣ Ažuriraj recept
    const { data: recipe, error } = await supabase
      .from('recepti')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Recept ažuriran: ${recipe.naziv}`);

    // 2️⃣ 🔥 PONOVO PREVEDI AKO SU SE PROMIJENILI TEKSTUALNI DIJELOVI
    const textFieldsChanged = ['naziv', 'opis', 'sastojci', 'upute', 'nacin_pripreme']
      .some(field => updates[field] !== undefined);

    if (textFieldsChanged) {
      try {
        // Obriši stare prevode
        await supabase
          .from('recepti_prevodi')
          .delete()
          .eq('recept_id', id);

        // Prevedi ponovo
        const [enTranslation, deTranslation] = await Promise.all([
          translateRecipe(recipe, 'en'),
          translateRecipe(recipe, 'de')
        ]);

        // Spremi nove prevode
        await supabase.from('recepti_prevodi').insert([
          { 
            recept_id: recipe.id, 
            jezik: 'en', 
            naziv: enTranslation.naziv || recipe.naziv,
            opis: enTranslation.opis || recipe.opis,
            sastojci: enTranslation.sastojci || recipe.sastojci,
            upute: enTranslation.upute || recipe.upute,
            nacin_pripreme: enTranslation.nacin_pripreme || recipe.nacin_pripreme
          },
          { 
            recept_id: recipe.id, 
            jezik: 'de', 
            naziv: deTranslation.naziv || recipe.naziv,
            opis: deTranslation.opis || recipe.opis,
            sastojci: deTranslation.sastojci || recipe.sastojci,
            upute: deTranslation.upute || recipe.upute,
            nacin_pripreme: deTranslation.nacin_pripreme || recipe.nacin_pripreme
          }
        ]);

        console.log(`✅ Ponovno preveden: ${recipe.naziv}`);
      } catch (translateError) {
        console.error('❌ Greška pri ponovnom prevodu:', translateError);
      }
    }

    res.json({ success: true, data: recipe });

  } catch (error) {
    console.error('❌ Greška pri ažuriranju recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🗑️ 5. OBRISI RECEPT
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Prvo obriši prevode (zbog CASCADE-a, ali može i automatski)
    await supabase
      .from('recepti_prevodi')
      .delete()
      .eq('recept_id', id);

    // Onda obriši recept
    const { error } = await supabase
      .from('recepti')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Recept obrisan' });

  } catch (error) {
    console.error('❌ Greška pri brisanju recepta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🔄 6. PREVEDI SVE POSTOJEĆE RECEPTE (MASOVNI PREVOD)
// ============================================================
router.post('/translate-all', async (req, res) => {
  try {
    // 1️⃣ Dohvati recepte koji nemaju prevod
    const { data: recipes, error } = await supabase
      .from('recepti')
      .select('id, naziv, opis, sastojci, upute, nacin_pripreme')
      .not('id', 'in', (
        supabase.from('recepti_prevodi').select('recept_id')
      ));

    if (error) throw error;

    if (!recipes || recipes.length === 0) {
      return res.json({
        success: true,
        message: 'Svi recepti su već prevedeni',
        total: 0,
        translated: 0,
        failed: 0
      });
    }

    console.log(`📊 Pronađeno ${recipes.length} recepata za prevod`);

    let translated = 0;
    let failed = 0;
    const errors = [];

    for (const recipe of recipes) {
      try {
        // Prevedi na EN i DE
        const [enTranslation, deTranslation] = await Promise.all([
          translateRecipe(recipe, 'en'),
          translateRecipe(recipe, 'de')
        ]);

        // Spremi prevode
        await supabase.from('recepti_prevodi').insert([
          { 
            recept_id: recipe.id, 
            jezik: 'en', 
            naziv: enTranslation.naziv || recipe.naziv,
            opis: enTranslation.opis || recipe.opis,
            sastojci: enTranslation.sastojci || recipe.sastojci,
            upute: enTranslation.upute || recipe.upute,
            nacin_pripreme: enTranslation.nacin_pripreme || recipe.nacin_pripreme
          },
          { 
            recept_id: recipe.id, 
            jezik: 'de', 
            naziv: deTranslation.naziv || recipe.naziv,
            opis: deTranslation.opis || recipe.opis,
            sastojci: deTranslation.sastojci || recipe.sastojci,
            upute: deTranslation.upute || recipe.upute,
            nacin_pripreme: deTranslation.nacin_pripreme || recipe.nacin_pripreme
          }
        ]);

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
// 🔄 7. PREVEDI JEDAN RECEPT PO ID-U
// ============================================================
router.post('/translate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { jezik } = req.body; // 'en' ili 'de'

    // 1️⃣ Dohvati recept
    const { data: recipe, error } = await supabase
      .from('recepti')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // 2️⃣ Ako je specificiran jezik, prevedi samo na njega
    if (jezik && ['en', 'de'].includes(jezik)) {
      const translation = await translateRecipe(recipe, jezik);

      await supabase.from('recepti_prevodi').upsert({
        recept_id: id,
        jezik: jezik,
        naziv: translation.naziv || recipe.naziv,
        opis: translation.opis || recipe.opis,
        sastojci: translation.sastojci || recipe.sastojci,
        upute: translation.upute || recipe.upute,
        nacin_pripreme: translation.nacin_pripreme || recipe.nacin_pripreme
      }, { onConflict: 'recept_id, jezik' });

      res.json({ success: true, message: `Prevedeno na ${jezik}` });
      return;
    }

    // 3️⃣ Prevedi na oba jezika
    const [enTranslation, deTranslation] = await Promise.all([
      translateRecipe(recipe, 'en'),
      translateRecipe(recipe, 'de')
    ]);

    await supabase.from('recepti_prevodi').upsert([
      { 
        recept_id: id, 
        jezik: 'en', 
        naziv: enTranslation.naziv || recipe.naziv,
        opis: enTranslation.opis || recipe.opis,
        sastojci: enTranslation.sastojci || recipe.sastojci,
        upute: enTranslation.upute || recipe.upute,
        nacin_pripreme: enTranslation.nacin_pripreme || recipe.nacin_pripreme
      },
      { 
        recept_id: id, 
        jezik: 'de', 
        naziv: deTranslation.naziv || recipe.naziv,
        opis: deTranslation.opis || recipe.opis,
        sastojci: deTranslation.sastojci || recipe.sastojci,
        upute: deTranslation.upute || recipe.upute,
        nacin_pripreme: deTranslation.nacin_pripreme || recipe.nacin_pripreme
      }
    ], { onConflict: 'recept_id, jezik' });

    res.json({ success: true, message: 'Prevedeno na EN i DE' });

  } catch (error) {
    console.error('❌ Greška pri prevodu:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// 🔍 8. PROVJERI STATUS PREVODA
// ============================================================
router.get('/translate/status', async (req, res) => {
  try {
    // Dohvati broj recepata koji nemaju prevod
    const { count: withoutTranslation, error } = await supabase
      .from('recepti')
      .select('*', { count: 'exact', head: true })
      .not('id', 'in', (
        supabase.from('recepti_prevodi').select('recept_id')
      ));

    if (error) throw error;

    // Dohvati ukupan broj recepata
    const { count: total, error: totalError } = await supabase
      .from('recepti')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    res.json({
      success: true,
      total_recipes: total || 0,
      without_translation: withoutTranslation || 0,
      translated: (total || 0) - (withoutTranslation || 0)
    });

  } catch (error) {
    console.error('❌ Greška:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;