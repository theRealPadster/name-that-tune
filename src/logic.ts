/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

// const SECTION_PERCENTS = [ 0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9 ];
// const SECTION_STARTS = [ 0, 1.1, 2, 4, 10, 15, 20, 30 ];
const DEBOUNCE_TIME = 500;

const SECTIONS = [
  [ 0, 1 ],
  [ 1, 2 ],
  [ 2, 4 ],
  [ 4, 10 ],
  [ 10, 15 ],
  [ 15, 20 ],
  [ 20, 30 ],
];

/*
heardle offsets
1s,
+1s,
+3s,
+3s
+4s,
+4s,
*/

export const playSection = (section: number) => {
  console.log(`Playing section ${section}`);
  if (section > SECTIONS.length) return;

  // Spicetify uses ms
  let [ startPosition, endPosition ] = SECTIONS[section - 1];
  Spicetify.showNotification(`Playing from ${startPosition}s to ${endPosition}s`);
  startPosition *= 1000;
  endPosition *= 1000;

  Spicetify.Player.seek(startPosition);
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
    const currentProgress = Spicetify.Player.getDuration() * Spicetify.Player.getProgressPercent();
    console.log({currentProgress, startPosition, endPosition});
    if (currentProgress > endPosition || currentProgress < startPosition) {
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
  // The left side chunk with the title, artist, album art, etc.
  const nowPlaying = document.querySelector('.main-nowPlayingWidget-nowPlaying');
  if (nowPlaying) {
    nowPlaying.style.opacity = visible ? '1' : '0';
  }
}
