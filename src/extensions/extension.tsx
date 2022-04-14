/// <reference path='../../../spicetify-cli/globals.d.ts' />
/// <reference path='../../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import { toggleNowPlaying } from '../logic';

(async () => {
  while (!(Spicetify?.Platform
        && Spicetify?.ContextMenu
        && Spicetify?.URI
        && Spicetify?.showNotification)) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Show/hide the now playing info on navigation
  Spicetify.Platform.History.listen((data) =>{
    console.log('History changed', data);

    const onApp = data.pathname.indexOf('spurdle') != -1;
    toggleNowPlaying(!onApp);
  });

  function sendToSpurdle(URIs: string[]) {
    Spicetify.showNotification(`Sending ${URIs.length} URIs to Spurdle`);
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
      pathname: '/spurdle',
      state: {
        URIs,
      },
    });
  }

  // TODO: set this properly
  function shouldDisplayContextMenu(URIs: string[]) {
    return true;
    // if (URIs.length > 1) {
    //   return false;
    // }
    // const uri = uris[0];
    // const uriObj = Spicetify.URI.fromString(uri);
    // if (uriObj.type === Spicetify.URI.Type.TRACK || uriObj.type === Spicetify.URI.Type.ARTIST) {
    //   return true;
    // }
    // return false;
  }

  const contextMenuItem = new Spicetify.ContextMenu.Item(
      'Play Spurdle',
      sendToSpurdle,
      shouldDisplayContextMenu,
  );

  contextMenuItem.register();
})();
