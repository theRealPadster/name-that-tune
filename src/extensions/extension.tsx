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

  // TODO: what is URIs?
  function sendToSpurdle(uris: string[]) {
    Spicetify.showNotification(`Sending ${uris.length} tracks to Spurdle`);
    console.log('Sending URIs:', uris);

    Spicetify.Platform.History.push({
      pathname: '/spurdle',
      state: {
        data: {
          uris,
        },
      },
    });
  }

  // TODO: set this properly
  function shouldDisplayContextMenu(uris: string[]) {
    if (uris.length > 1) {
      return false;
    }
    const uri = uris[0];
    const uriObj = Spicetify.URI.fromString(uri);
    if (uriObj.type === Spicetify.URI.Type.TRACK || uriObj.type === Spicetify.URI.Type.ARTIST) {
      return true;
    }
    return false;
  }

  const contextMenuItem = new Spicetify.ContextMenu.Item(
      'Play Spurdle',
      sendToSpurdle,
      shouldDisplayContextMenu,
  );

  contextMenuItem.register();
})();
