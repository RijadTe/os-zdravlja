// frontend/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Provjeri da li su varijable postavljene
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL ili ANON KEY nisu definisani!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Postoji' : '❌ Nedostaje');
}

export const supabase = createClient(supabaseUrl, supabaseKey);