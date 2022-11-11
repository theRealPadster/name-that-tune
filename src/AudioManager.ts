export default class AudioManager {
  end: number;
  debouncing: number;
  DEBOUNCE_TIME = 300;
  listener: Function;

  constructor() {
    this.end = 1;
    this.debouncing = 0;
    this.listener = (event: Event) => {
      if (!this.end) return;

      if (this.debouncing) {
        console.debug('debouncing');
        if (event.timeStamp - this.debouncing > this.DEBOUNCE_TIME) {
          this.debouncing = 0;
          console.debug('reset debouncing');
        }
        return;
      }

      this.debouncing = event.timeStamp;

      // TODO: calculate and update song length etc on song change
      // Spicetify uses ms
      const endMillis = this.end * 1000;
      const songLengthMillis = Spicetify.Player.getDuration();
      if (endMillis > songLengthMillis) return;

      const currentProgress =
        songLengthMillis * Spicetify.Player.getProgressPercent();
      // console.debug({ currentProgress, endMilliseconds: endMillis });
      if (currentProgress > endMillis) {
        Spicetify.Player.pause();
        Spicetify.Player.skipBack();
        return;
      }
    };
  }

  setEnd(end: number) {
    this.end = end;
  }

  listen() {
    Spicetify.Player.addEventListener('onprogress', this.listener);
  }

  unlisten() {
    Spicetify.Player.removeEventListener('onprogress', this.listener);
  }

  play() {
    try {
      Spicetify.Player.pause();
    } catch (e) {
      console.error(e);
    }
    Spicetify.Player.skipBack();
    // Spicetify.Player.seek(0);
    Spicetify.Player.play();
  }
}
