// frontend/src/components/VoiceRecipeReader.jsx
import React, { useState, useEffect, useRef } from 'react';

const VoiceRecipeReader = ({ recipe }) => {
  const [isReading, setIsReading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const utteranceRef = useRef(null);
  const steps = recipe?.upute || [];

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
  }, []);

  // Zaustavi čitanje kad se komponenta unmounta
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakStep = (stepIndex) => {
    if (!speechSupported) {
      alert('❌ Vaš pretraživač ne podržava glasovno čitanje.');
      return;
    }

    if (stepIndex >= steps.length) {
      setIsReading(false);
      setCurrentStep(0);
      return;
    }

    const text = `Korak ${stepIndex + 1}: ${steps[stepIndex]}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hr';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utteranceRef.current = utterance;

    utterance.onend = () => {
      if (isReading && !isPaused) {
        const nextStep = stepIndex + 1;
        if (nextStep < steps.length) {
          setCurrentStep(nextStep);
          setTimeout(() => speakStep(nextStep), 500);
        } else {
          setIsReading(false);
          setCurrentStep(0);
          alert('🎉 Recept je završen! Dobar tek!');
        }
      }
    };

    utterance.onerror = () => {
      setIsReading(false);
      setCurrentStep(0);
    };

    window.speechSynthesis.speak(utterance);
  };

  const startReading = () => {
    if (steps.length === 0) {
      alert('⚠️ Ovaj recept nema upute za čitanje.');
      return;
    }

    if (isReading) {
      // Ako već čita, nastavi (ako je pauzirano)
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      }
      return;
    }

    setIsReading(true);
    setIsPaused(false);
    setCurrentStep(0);
    speakStep(0);
  };

  const pauseReading = () => {
    if (isReading && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    setIsPaused(false);
    setCurrentStep(0);
  };

  const skipStep = () => {
    if (isReading) {
      window.speechSynthesis.cancel();
      const nextStep = currentStep + 1;
      if (nextStep < steps.length) {
        setCurrentStep(nextStep);
        setIsPaused(false);
        setTimeout(() => speakStep(nextStep), 300);
      } else {
        stopReading();
        alert('🎉 Recept je završen! Dobar tek!');
      }
    }
  };

  const prevStep = () => {
    if (isReading && currentStep > 0) {
      window.speechSynthesis.cancel();
      const prev = currentStep - 1;
      setCurrentStep(prev);
      setIsPaused(false);
      setTimeout(() => speakStep(prev), 300);
    }
  };

  if (!recipe || steps.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900 dark:to-blue-900 rounded-2xl p-4 md:p-6 border-2 border-purple-200 dark:border-purple-600">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
          🎤 Glasovno kuhanje
          <span className="inline-block bg-yellow-200 dark:bg-yellow-600 text-yellow-800 dark:text-yellow-200 text-[10px] px-2 py-0.5 rounded-full font-bold">⭐ PREMIUM</span>
        </h3>
        <div className="flex items-center gap-2">
          {!isReading ? (
            <button
              onClick={startReading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
            >
              🔊 Počni čitanje
            </button>
          ) : (
            <>
              <button
                onClick={pauseReading}
                disabled={isPaused}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
              >
                ⏸️ Pauza
              </button>
              <button
                onClick={startReading}
                className={`${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white px-4 py-2 rounded-lg font-semibold transition`}
                disabled={!isPaused}
              >
                ▶️ Nastavi
              </button>
              <button
                onClick={stopReading}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                ⏹️ Stop
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      {isReading && (
        <div className="mt-3">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Korak {currentStep + 1} od {steps.length}</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
            <p className="text-gray-700 dark:text-gray-300 text-sm md:text-base">
              <span className="font-bold text-purple-600 dark:text-purple-400">Korak {currentStep + 1}:</span> {steps[currentStep]}
            </p>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={prevStep}
              disabled={currentStep === 0 || !isReading}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              ⬅️ Prethodni
            </button>
            <button
              onClick={skipStep}
              disabled={!isReading}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-lg text-sm disabled:opacity-50 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Sljedeći ➡️
            </button>
          </div>
        </div>
      )}

      {isReading && !isPaused && (
        <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <span className="animate-pulse">🔴</span> Čitam...
        </div>
      )}
      {isReading && isPaused && (
        <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
          <span>⏸️</span> Pauzirano
        </div>
      )}
      {!speechSupported && (
        <p className="text-red-500 text-sm mt-2">❌ Vaš pretraživač ne podržava glasovno čitanje.</p>
      )}
    </div>
  );
};

export default VoiceRecipeReader;