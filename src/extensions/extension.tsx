import { toggleNowPlaying } from '../logic';

import i18n, { t } from 'i18next';
import en from '../locales/en.json';
import de from '../locales/de.json';
import esLatin from '../locales/es-419.json';
import fr from '../locales/fr.json';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
      fr,
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

(async () => {
  while (
    !(
      Spicetify?.Platform &&
      Spicetify?.ContextMenu &&
      Spicetify?.URI &&
      Spicetify?.showNotification
    )
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('running name-that-tune extension');

  // Show/hide the now playing info on navigation
  Spicetify.Platform.History.listen((data: any) => {
    console.log('History changed', data);

    const onApp = data.pathname.indexOf('name-that-tune') != -1;
    toggleNowPlaying(!onApp);
  });

  function sendToApp(URIs: string[]) {
    Spicetify.showNotification(t('sendingURIs', { count: URIs.length }));
    console.log('Sending URIs:', URIs);
    // example artist: spotify:artist:5k979N1TnPncUyqlXlaRSv
    // example playlist: spotify:playlist:37i9dQZF1DZ06evO38b2WA

    URIs.forEach((uri) => {
      const uriObj = Spicetify.URI.fromString(uri);
      console.log('uriObj:', uriObj);
    });

    // TODO: If artist, add tracks from artist
    // TODO: If album, add tracks from album
    // TODO: If playlist, add tracks from playlist
    // TODO: Other sources?

    // Ooh, I can just use Spicetify.Player.playUri(uri) and it will work with whatever you send it!

    Spicetify.Platform.History.push({
      pathname: '/name-that-tune',
      state: {
        URIs,
      },
    });
  }

  function shouldDisplayContextMenu(URIs: string[]) {
    if (URIs.length === 1) {
      const uriObj = Spicetify.URI.fromString(URIs[0]);
      switch (uriObj.type) {
      case Spicetify.URI.Type.SHOW:
      case Spicetify.URI.Type.PLAYLIST:
      case Spicetify.URI.Type.PLAYLIST_V2:
      case Spicetify.URI.Type.FOLDER:
      case Spicetify.URI.Type.ALBUM:
      case Spicetify.URI.Type.COLLECTION:
      case Spicetify.URI.Type.ARTIST:
        return true;
      }
      return false;
    }
    // User selects multiple tracks in a list.
    return true;
  }

  const contextMenuItem = new Spicetify.ContextMenu.Item(
    t('menuEntry'),
    sendToApp,
    shouldDisplayContextMenu,
    'gamepad',
    // 'chevron-right',
    // 'play',
  );

  contextMenuItem.register();
})();
