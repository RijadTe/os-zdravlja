// frontend/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dedbkxpxytfkaqrojqje.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZGJreHB4eXRma2Fxcm9qcWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTA1MDQsImV4cCI6MjEwMDI4NjUwNH0.Tm74kiEqEN6wJYDM1LRTLvDWCiRvJF7Nvs9A-AAtWt0'; 

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('✅ Supabase povezan!');