/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

const DEBOUNCE_TIME = 500;

export const playSegment = (endSeconds: number) => {
  console.log(`Playing section ${endSeconds}`);

  // Spicetify uses ms
  const endMillis = endSeconds * 1000;
  const songLengthMillis = Spicetify.Player.getDuration();
  if (endMillis > songLengthMillis) return;

  Spicetify.showNotification(`Playing from 0s to ${endSeconds}s`);
  Spicetify.Player.seek(0);
  Spicetify.Player.play();

  let debouncing = 0;
  const stopListener = (event: Event) => {
    if (debouncing) {
      console.log('debouncing');
      if (event.timeStamp - debouncing > DEBOUNCE_TIME) {
        debouncing = 0;
        console.log('reset debouncing');
      }
      return;
    }
    const currentProgress = songLengthMillis * Spicetify.Player.getProgressPercent();
    console.log({ currentProgress, endMilliseconds: endMillis });
    if (currentProgress > endMillis) {
      debouncing = event.timeStamp;
      Spicetify.Player.pause();
      console.log('stopping');
      Spicetify.Player.removeEventListener('onprogress', stopListener);
      return;
    }
  }

  Spicetify.Player.addEventListener('onprogress', stopListener);
};

export const toggleNowPlaying = (visible: boolean) => {
  // Hide items that give away information while playing
  [ // The left side chunk with the title, artist, album art, etc.
    document.querySelector('.main-nowPlayingWidget-nowPlaying'),
    // Play/pause/next/previous/etc.
    document.querySelector('.player-controls__buttons'),
  ].forEach((item) => {
    if (item) {
      item.style.opacity = visible ? '1' : '0';
    }
  });

  // Disable playback bar interaction while playing
  const playbackBar = document.querySelector('.playback-bar');
  if (playbackBar) {
    playbackBar.style.pointerEvents = visible ? 'auto' : 'none';
  }
}
