import { toggleIsGuessing } from '../logic';

import { t } from 'i18next';

import initI18n from '../i18n';

(async () => {
  while (
    !(
      Spicetify?.Platform &&
      Spicetify?.ContextMenu &&
      Spicetify?.URI &&
      Spicetify?.Locale &&
      Spicetify?.showNotification
    )
  ) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Only after the poll above — initI18n reads Spicetify.Locale.
  initI18n();

  console.log('running name-that-tune extension');

  // Show/hide the now playing info on navigation
  Spicetify.Platform.History.listen((data) => {
    console.log('History changed', data);

    const onApp = data.pathname.indexOf('name-that-tune') != -1;

    // Add class to main container to indicate that the app is open
    document.body.classList.toggle('name-that-tune', onApp);

    // When app is first launched, it starts in guessing mode
    toggleIsGuessing(onApp);
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
      // Pushing an identical location is a no-op, so without something unique
      // here you can't start a new game while already on the game page
      search: `?t=${Date.now()}`,
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
