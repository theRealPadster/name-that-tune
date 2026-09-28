export default class AudioManager {
  startSeconds = 0;
  durationSeconds = 1;
  debouncing = 0;
  readonly DEBOUNCE_TIME = 150;

  listener = (event: Event | undefined) => {
    if (!this.durationSeconds || !event) {
      return;
    }

    if (
      this.debouncing
      && event.timeStamp - this.debouncing < this.DEBOUNCE_TIME
    ) {
      return;
    }
    this.debouncing = event.timeStamp;

    const songLengthMillis = Spicetify.Player.getDuration();
    if (!songLengthMillis) {
      return;
    }

    // Stop just before the track boundary so Spotify cannot automatically
    // advance and expose the next answer when the requested clue is longer
    // than a particularly short song.
    const latestSafeEnd = Math.max(0, songLengthMillis - 250);
    const requestedEnd = (
      this.startSeconds + this.durationSeconds
    ) * 1000;
    const effectiveEnd = Math.min(requestedEnd, latestSafeEnd);

    if (Spicetify.Player.getProgress() >= effectiveEnd) {
      Spicetify.Player.pause();
      Spicetify.Player.seek(this.startSeconds * 1000);
    }
  };

  setWindow(startSeconds: number, durationSeconds: number) {
    this.startSeconds = Math.max(0, startSeconds);
    this.durationSeconds = Math.max(0, durationSeconds);
  }

  clearWindow() {
    this.startSeconds = 0;
    this.durationSeconds = 0;
  }

  listen() {
    Spicetify.Player.addEventListener('onprogress', this.listener);
  }

  unlisten() {
    Spicetify.Player.removeEventListener('onprogress', this.listener);
  }

  play() {
    Spicetify.Player.pause();
    Spicetify.Player.seek(this.startSeconds * 1000);
    Spicetify.Player.play();
  }

  reveal() {
    this.clearWindow();
    Spicetify.Player.seek(0);
    Spicetify.Player.play();
  }

  stop() {
    Spicetify.Player.pause();
  }
}
