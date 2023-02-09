import React from 'react';

import i18n, { t } from 'i18next';
import en from './locales/en.json';
import de from './locales/de.json';
import esLatin from './locales/es-419.json';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import Game from './pages/Game';
import Stats from './pages/Stats';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .use(LanguageDetector)
  .init({
    // the translations
    resources: {
      en,
      de,
      // TODO: change this to 'es-419' (latin spanish) if someone adds a european spanish translation
      es: esLatin,
    },
    detection: {
      order: [ 'navigator', 'htmlTag' ],
    },
    // lng: "en", // if you're using a language detector, do not define the lng option
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });

class App extends React.Component {
  render() {
    const { location } = Spicetify.Platform.History;
    // If page state set to stats, render it
    if (location.pathname === '/name-that-tune/stats') {
      return <Stats t={t} />;
    } // Otherwise, render the main Game
    else {
      return <Game t={t} />;
    }
  }
}

export default App;
