/// <reference path='../../../spicetify-cli/globals.d.ts' />
/// <reference path='../../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import { toggleNowPlaying } from '../logic';

(async () => {
  while (!Spicetify?.showNotification) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  Spicetify.Platform.History.listen((data) =>{
    console.log('History changed', data);

    const onApp = data.pathname.indexOf('spurdle') != -1;
    toggleNowPlaying(!onApp);
  });
})();
