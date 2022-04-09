/// <reference path="../../../spicetify-cli/globals.d.ts" />
/// <reference path="../../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

const toggleNowPlaying = (visible: boolean) => {
  // The left side chunk with the title, artist, album art, etc.
  const nowPlaying = document.querySelector('.main-nowPlayingWidget-nowPlaying');
  if (nowPlaying) {
    nowPlaying.style.opacity = visible ? '1' : '0';
  }
}

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
