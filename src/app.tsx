/// <reference path='../../spicetify-cli/globals.d.ts' />
/// <reference path='../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import styles from './css/app.module.scss';
// import './css/app.global.scss';
import React from 'react';

import GuessItem from './components/GuessItem';
import Button from './components/Button';

import { initialize, toggleNowPlaying, playSegment, checkGuess } from './logic';
import AudioManager from './AudioManager';

enum GameState {
  Playing,
  Won,
  Lost,
}

class App extends React.Component<
  { URIs?: string[] },
  {
    stage: number;
    guess: string;
    guesses: (string | null)[];
    gameState: GameState;
  }
> {
  state = {
    // What guess you're on
    stage: 0,
    // The current guess
    guess: '',
    // Past guesses
    guesses: [],
    gameState: GameState.Playing,
  };

  URIs?: string[];
  audioManager: AudioManager;
  constructor(props: any) {
    super(props);
    //@ts-ignore
    this.URIs = Spicetify.Platform.History.location.state.URIs;
    this.audioManager = new AudioManager();
  }

  componentDidMount() {
    console.log('App mounted, URIs: ', this.URIs);
    initialize(this.URIs);
    this.audioManager.listen();
  }

  componentWillUnmount() {
    this.audioManager.unlisten();
  }

  /*
   * Don't just add the same amount of time for each guess
   * Heardle offsets:
   * 1s, +1s, +2s, +3s, +4s, +5s
   * Which is this equation:
   * s = 1 + 0.5x + 0.5x^2
   */
  timeAllowed = () => {
    return (1 + 0.5 * (this.state.stage + this.state.stage ** 2));
  }

  playClick = () => {
    // playSegment(this.state.timeAllowed);
    this.audioManager.play();
  };

  guessChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    this.setState({ guess: e.target.value });

  skipGuess = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Add the guess to the guess list in the state
    this.setState({
      guesses: [...this.state.guesses, null],
      // Reset the guess
      guess: '',
      // Increment the stage
      stage: this.state.stage + 1,
    }, () => {
      this.audioManager.setEnd(this.timeAllowed());
    });
  };

  submitGuess = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Don't allow empty guesses
    if (this.state.guess.trim().length === 0) return;

    const won = checkGuess(this.state.guess);

    if (won) {
      Spicetify.Player.seek(0);
      Spicetify.Player.play();
      toggleNowPlaying(true);
    }

    // Add the guess to the guess list in the state
    this.setState({
      guesses: [...this.state.guesses, this.state.guess],
      // Reset the guess
      guess: '',
      // Increment the stage
      stage: this.state.stage + 1,
      gameState: won ? GameState.Won : GameState.Playing,
    }, () => {
      this.audioManager.setEnd(this.timeAllowed());
    });
  };

  giveUp = () => {
    Spicetify.Player.seek(0);
    Spicetify.Player.play();
    toggleNowPlaying(true);
    this.audioManager.setEnd(0);

    this.setState({
      gameState: GameState.Lost,
    });
  };

  nextSong = () => {
    toggleNowPlaying(false);
    Spicetify.Player.next();
    Spicetify.Player.seek(0);
    Spicetify.Player.pause();
    this.audioManager.setEnd(1);

    this.setState({
      guesses: [],
      // Reset the guess
      guess: '',
      // Increment the stage
      stage: 0,
      gameState: GameState.Playing,
    }, () => {
      this.audioManager.setEnd(this.timeAllowed());
    });
  };

  render() {
    const gameWon = this.state.gameState === GameState.Won;
    const isPlaying = this.state.gameState === GameState.Playing;

    return (
      <>
        <div className={styles.container}>
          <h1 className={styles.title}>{'🎵 Spurdle!'}</h1>
          {gameWon ? <h2 className={styles.subtitle}>{'You won!'}</h2> : null}

          <form onSubmit={this.submitGuess}>
            <input
              type={'text'}
              className={styles.input}
              placeholder='Guess the song'
              value={this.state.guess}
              disabled={!isPlaying}
              onChange={this.guessChange}
            />
            <div className={styles.formButtonContainer}>
              <Button onClick={this.submitGuess} disabled={!isPlaying}>
                {'Guess'}
              </Button>
              <Button onClick={this.skipGuess} disabled={!isPlaying}>
                {'Skip'}
              </Button>
            </div>
          </form>

          {isPlaying ? (
            <Button
              onClick={this.playClick}
            >{`Play ${this.timeAllowed()}s`}</Button>
          ) : null}

          <Button onClick={isPlaying ? this.giveUp : this.nextSong}>
            {isPlaying ? 'Give up' : 'Next song'}
          </Button>

          <ol className={styles.guessList}>
            {this.state.guesses.map((guess, i) => (
              <GuessItem
                key={i}
                index={i}
                guesses={this.state.guesses}
                won={gameWon}
              />
            ))}
          </ol>
        </div>
      </>
    );
  }
}

export default App;
