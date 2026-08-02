// frontend/src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    ime: '',
    lozinka: '',
    lozinkaPotvrda: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validacija
    if (!formData.email || !formData.ime || !formData.lozinka || !formData.lozinkaPotvrda) {
      setError('❌ Sva polja su obavezna.');
      setLoading(false);
      return;
    }

    if (formData.lozinka !== formData.lozinkaPotvrda) {
      setError('❌ Lozinke se ne podudaraju.');
      setLoading(false);
      return;
    }

    if (formData.lozinka.length < 6) {
      setError('❌ Lozinka mora imati najmanje 6 karaktera.');
      setLoading(false);
      return;
    }

    try {
      console.log('📝 Registracija sa Supabase...');

      // 🔍 1. PROVJERI DA LI EMAIL VEĆ POSTOJI
      console.log('🔍 Provjeravam email:', formData.email);
      
      const { data: existingUser, error: checkError } = await supabase
        .from('profili')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Greška pri provjeri:', checkError);
      }

      if (existingUser) {
        console.log('⚠️ Email već postoji:', formData.email);
        setError('❌ Korisnik sa ovim emailom već postoji. Molimo prijavite se.');
        setLoading(false);
        return;
      }

      console.log('✅ Email slobodan:', formData.email);

      // 📝 2. KREIRAJ KORISNIKA U SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.lozinka,
        options: {
          data: {
            ime: formData.ime
          }
        }
      });

      if (authError) {
        console.error('❌ Auth greška:', authError);
        if (authError.message.includes('already registered')) {
          setError('❌ Korisnik sa ovim emailom već postoji. Molimo prijavite se.');
        } else {
          setError('❌ ' + authError.message);
        }
        setLoading(false);
        return;
      }

      console.log('✅ Auth korisnik kreiran:', authData.user?.id);

      // 📊 3. KREIRAJ PROFIL U TABELI "profili"
      const { data: profileData, error: profileError } = await supabase
        .from('profili')
        .insert([{
          id: authData.user?.id,
          email: formData.email,
          ime: formData.ime,
          premium: false,
          kviz_zavrsen: false,
          vrsta: [],
          izbjegava: [],
          preferencije: [],
          created_at: new Date().toISOString()
        }])
        .select();

      if (profileError) {
        console.error('❌ Greška pri kreiranju profila:', profileError);
        if (profileError.code === '23505') {
          console.log('ℹ️ Profil već postoji, nastavljam...');
        } else {
          setError('❌ Greška pri kreiranju profila: ' + profileError.message);
          setLoading(false);
          return;
        }
      }

      console.log('✅ Profil kreiran:', profileData);

      // 💾 4. SAČUVAJ KORISNIKA U LOCALSTORAGE
      const userData = {
        id: authData.user?.id || '',
        email: formData.email,
        ime: formData.ime,
        premium: false
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userName', formData.ime);
      
      if (authData.session) {
        localStorage.setItem('supabase_session', JSON.stringify(authData.session));
      }

      console.log('👤 Sačuvan user:', userData);

      setSuccess('✅ Registracija uspješna! Preusmjeravam...');

      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('❌ Greška:', error);
      setError('❌ Greška pri registraciji: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-screen bg-white dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8 mt-6">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-2">
          👋 Kreiraj nalog
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-300 mb-6">
          Pridružite se i otkrijte savršene recepte!
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-green-600 dark:text-green-300 p-3 rounded-xl mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              📧 Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="vas@email.com"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              👤 Ime *
            </label>
            <input
              type="text"
              name="ime"
              value={formData.ime}
              onChange={handleChange}
              placeholder="Marko Marković"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 Lozinka *
            </label>
            <input
              type="password"
              name="lozinka"
              value={formData.lozinka}
              onChange={handleChange}
              placeholder="•••••••• (min 6 karaktera)"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-1">
              🔒 Potvrdi lozinku *
            </label>
            <input
              type="password"
              name="lozinkaPotvrda"
              value={formData.lozinkaPotvrda}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-400 focus:outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 rounded-xl font-semibold transition shadow-md hover:shadow-lg"
          >
            {loading ? '⏳ Kreiranje...' : '✅ Registruj se'}
          </button>
        </form>

        <p className="text-center text-gray-500 dark:text-gray-400 mt-6 text-sm">
          Već imaš nalog?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Prijavi se
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;