import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

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

/**
 * Shared i18next setup for both bundles.
 *
 * The app and the extension are built separately and share no runtime state, so
 * each ends up with its own i18next instance — this is a single source for the
 * configuration, not a single instance.
 *
 * Adding a locale means adding the JSON to `src/locales/` and one line here.
 *
 * Must be called, not run on import: it reads `Spicetify.Locale`, and the
 * extension loads at Spotify startup before that necessarily exists. The
 * extension calls this only after its poll confirms it.
 */
export default function initI18n() {
  return i18n
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
        'pt-BR': ptBR,
        uk,
      },
      // Use the locale the user picked in Spotify, not the embedded browser's — they can differ
      lng: Spicetify.Locale.getLocale(),
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false, // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
      },
    });
}
