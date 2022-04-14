/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

const DEBOUNCE_TIME = 500;

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
};


export const playSegment = (endSeconds: number) => {
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

// TODO: potentially tweak this (e.g. accept '&'/'and' or other things)
const normalize = (str: string) => {
  return str.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export const checkGuess = (guess: string) => {
  console.log({guess});
  console.log(`title: ${Spicetify.Player.data.track.metadata.title}`);
  console.log(`artist_name: ${Spicetify.Player.data.track.metadata.artist_name}`);
  console.log(`album_artist_name: ${Spicetify.Player.data.track.metadata.album_artist_name}`);

  const normalizedGuess = normalize(guess);
  const normalizedAnswer = normalize(Spicetify.Player.data.track.metadata.title);

  return normalizedGuess === normalizedAnswer;
};
