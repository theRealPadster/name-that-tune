import React from 'react';

import i18n, { t } from 'i18next';
import ca from './locales/ca.json';
import el from './locales/el.json';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import esLatin from './locales/es-419.json';
import fr from './locales/fr.json';
import pl from './locales/pl.json';
import ptBR from './locales/pt-BR.json';
import uk from './locales/uk.json';
import { initReactI18next } from 'react-i18next';

import Game from './pages/Game';
import Stats from './pages/Stats';

import './css/app.global.scss';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    resources: {
      ca,
      el,
      en,
      de,
      es,
      'es-419': esLatin,
      fr,
      pl,
      ptBR,
      uk,
    },
    // Use the locale the user picked in Spotify, not the embedded browser's — they can differ
    lng: Spicetify.Locale.getLocale(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
  });

type HistoryLocation = {
  pathname: string;
  key?: string;
  state?: { URIs?: string[] };
};

class App extends React.Component<Record<string, never>, { location: HistoryLocation }> {
  state: { location: HistoryLocation } = {
    location: Spicetify.Platform.History.location,
  };

  unlisten?: () => void;

  // Spotify's router doesn't necessarily re-render us on its own, so listen
  // ourselves to make sure relaunching the game picks up the new URIs
  componentDidMount() {
    this.unlisten = Spicetify.Platform.History.listen((location: HistoryLocation) => {
      this.setState({ location });
    });
  }

  componentWillUnmount() {
    this.unlisten?.();
  }

  render() {
    const { location } = this.state;
    // If page state set to stats, render it
    if (location.pathname === '/name-that-tune/stats') {
      return <Stats t={t} />;
    } // Otherwise, render the main Game
    else {
      // Keyed on the history entry so that relaunching from the game page
      // remounts with the new URIs rather than reusing the running game
      return <Game key={location.key} URIs={location.state?.URIs} t={t} />;
    }
  }
}

export default App;
