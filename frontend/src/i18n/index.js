// frontend/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 🔥 PREVODI DIREKTNO U KODU - BEZ FETCH-A, BEZ DETEKTORA!
const resources = {
  hr: {
    translation: {
      "common": {
        "loading": "Učitavanje...",
        "error": "Došlo je do greške.",
        "success": "Uspješno!",
        "close": "Zatvori",
        "save": "Sačuvaj",
        "cancel": "Otkaži",
        "delete": "Obriši",
        "edit": "Uredi",
        "search": "Pretraži...",
        "back": "Nazad",
        "light": "Svijetlo",
        "dark": "Tamno"
      },
      "nav": {
        "home": "Početna",
        "community": "Zajednica",
        "profile": "Profil",
        "login": "Prijava",
        "quiz": "Kviz",
        "premium": "Premium",
        "recipes": "Recepti"
      },
      "home": {
        "hero": {
          "title": "OS Zdravlja",
          "subtitle": "Operativni sistem za tvoje zdravlje",
          "description": "Otkrivajte recepte prilagođene vašim potrebama, dijetama i ukusu.",
          "start_quiz": "Započni kviz",
          "ai_chef": "AI Chef pretraga"
        },
        "categories": {
          "title": "IZABERI KATEGORIJU",
          "diet": "DIJETALNO",
          "desserts": "DESERTI",
          "savory": "SLANA JELA",
          "quiz": "KVIZ",
          "ai_chef": "AI CHEF",
          "drinks": "NAPITKI"
        }
        // ... DODAJ SVE PREVODE
      }
    }
  },
  en: {
    translation: {
      "common": {
        "loading": "Loading...",
        "error": "An error occurred.",
        "success": "Success!",
        "close": "Close",
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "search": "Search...",
        "back": "Back",
        "light": "Light",
        "dark": "Dark"
      },
      "nav": {
        "home": "Home",
        "community": "Community",
        "profile": "Profile",
        "login": "Login",
        "quiz": "Quiz",
        "premium": "Premium",
        "recipes": "Recipes"
      },
      "home": {
        "hero": {
          "title": "OS Health",
          "subtitle": "Operating system for your health",
          "description": "Discover recipes tailored to your needs, diets and taste.",
          "start_quiz": "Start quiz",
          "ai_chef": "AI Chef search"
        },
        "categories": {
          "title": "CHOOSE CATEGORY",
          "diet": "DIET",
          "desserts": "DESSERTS",
          "savory": "SAVORY",
          "quiz": "QUIZ",
          "ai_chef": "AI CHEF",
          "drinks": "DRINKS"
        }
      }
    }
  },
  de: {
    translation: {
      "common": {
        "loading": "Laden...",
        "error": "Ein Fehler ist aufgetreten.",
        "success": "Erfolg!",
        "close": "Schließen",
        "save": "Speichern",
        "cancel": "Abbrechen",
        "delete": "Löschen",
        "edit": "Bearbeiten",
        "search": "Suchen...",
        "back": "Zurück",
        "light": "Hell",
        "dark": "Dunkel"
      },
      "nav": {
        "home": "Startseite",
        "community": "Community",
        "profile": "Profil",
        "login": "Anmelden",
        "quiz": "Quiz",
        "premium": "Premium",
        "recipes": "Rezepte"
      },
      "home": {
        "hero": {
          "title": "OS Gesundheit",
          "subtitle": "Betriebssystem für deine Gesundheit",
          "description": "Entdecke Rezepte, die auf deine Bedürfnisse, Diäten und Geschmack zugeschnitten sind.",
          "start_quiz": "Quiz starten",
          "ai_chef": "AI Chef Suche"
        },
        "categories": {
          "title": "KATEGORIE WÄHLEN",
          "diet": "DIÄT",
          "desserts": "DESSERTS",
          "savory": "HERZHAFT",
          "quiz": "QUIZ",
          "ai_chef": "AI CHEF",
          "drinks": "GETRÄNKE"
        }
      }
    }
  }
};

// 🔥 INICIJALIZACIJA - ODMAH, BEZ ČEKANJA!
i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hr',
    lng: 'hr', // ⬅️ HRVATSKI JE DEFAULT!
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // ⬅️ NEMA ČEKANJA!
    },
  });

console.log('✅ i18n inicijaliziran! (HR default)');
export default i18n;