import styles from '../css/app.module.scss';
// import '../css/app.global.scss';
import React from 'react';

import GuessItem from '../components/GuessItem';
import Button from '../components/Button';

import { initialize, toggleNowPlaying, checkGuess, saveStats, stageToTime } from '../logic';
import AudioManager from '../AudioManager';

enum GameState {
  Playing,
  Won,
  Lost,
}

class Game extends React.Component<
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

  playClick = () => {
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
      this.audioManager.setEnd(stageToTime(this.state.stage));
    });
  };

  submitGuess = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Don't allow empty guesses
    if (this.state.guess.trim().length === 0) return;

    const won = checkGuess(this.state.guess);
    if (won) saveStats(this.state.stage);

    // Add the guess to the guess list in the state
    this.setState({
      guesses: [...this.state.guesses, this.state.guess],
      // Reset the guess
      guess: '',
      // Increment the stage
      stage: this.state.stage + 1,
      gameState: won ? GameState.Won : GameState.Playing,
    }, () => {
      if (won) {
        this.audioManager.setEnd(0);
        Spicetify.Player.seek(0);
        Spicetify.Player.play();
        toggleNowPlaying(true);
      } else {
        this.audioManager.setEnd(stageToTime(this.state.stage));
      }
    });
  };

  giveUp = () => {
    this.audioManager.setEnd(0);
    Spicetify.Player.seek(0);
    Spicetify.Player.play();
    toggleNowPlaying(true);
    saveStats(-1);

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
      this.audioManager.setEnd(stageToTime(this.state.stage));
    });
  };

  goToStats = () => {
    Spicetify.Platform.History.push({
      pathname: '/name-that-tune/stats',
      state: {
        data: {
          // title: this.props.item.title,
          // user: this.props.item.user,
          // repo: this.props.item.repo,
          // branch: this.props.item.branch,
          // readmeURL: this.props.item.readmeURL,
        },
      },
    });
  }

  render() {
    const gameWon = this.state.gameState === GameState.Won;
    const isPlaying = this.state.gameState === GameState.Playing;

    return (
      <>
        <div className={styles.container}>
          <h1 className={styles.title}>{'🎵 Name That Tune'}</h1>
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
            >{`Play ${stageToTime(this.state.stage)}s`}</Button>
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
          <Button onClick={this.goToStats} classes={[styles.StatsButton]}>
            Stats
          </Button>
        </div>
      </>
    );
  }
}

export default Game;
