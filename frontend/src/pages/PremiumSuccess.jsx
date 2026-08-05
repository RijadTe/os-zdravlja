// frontend/src/pages/PremiumSuccess.jsx
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation }react-i18next';
import { supabase } from '../supabaseClient';

const PremiumSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log('🔍 Provjeravam plaćanje, session_id:', sessionId);
        
        if (!sessionId) {
          setError(t('premiumsuccess.errors.no_session'));
          setLoading(false);
          return;
        }

        // 🔥 DOHVATI SESSION IZ STRIPE (preko Supabase Edge Function ili direktno)
        // NAJBOLJE: koristi Stripe direktno preko Edge Function
        
        // 🔥 ZA SADA - RUČNO AŽURIRAJ PREMIUM
        const user = JSON.parse(localStorage.getItem('user'));
        const email = user?.email || localStorage.getItem('userEmail');
        
        if (email) {
          // 🔥 AŽURIRAJ SUPABASE DIREKTNO
          const { data, error } = await supabase
            .from('profili')
            .update({ premium: true })
            .eq('email', email)
            .select();
          
          if (error) {
            console.error('❌ Greška pri ažuriranju premiuma:', error);
            setError('Došlo je do greške pri aktivaciji premiuma.');
          } else {
            console.log('✅ Premium aktiviran za:', email);
            
            // 🔥 OSVJEŽI LOCALSTORAGE
            const updatedUser = { ...user, premium: true };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            setSuccess(true);
          }
        } else {
          setError('Nema emaila za ažuriranje premiuma.');
        }
      } catch (error) {
        console.error('❌ Greška:', error);
        setError(t('premiumsuccess.errors.verification'));
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, t]);

  // ... ostatak koda (render) ostaje isti
};

export default PremiumSuccess;