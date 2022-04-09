/// <reference path='../../spicetify-cli/globals.d.ts' />
/// <reference path='../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import styles from './css/app.module.scss';
// import './css/app.global.scss';
import React from 'react';

import GuessItem from './components/GuessItem';

import {
  playSegment,
  toggleNowPlaying,
} from './logic';

class App extends React.Component<{}, {
  stage: number,
  timeAllowed: number,
  guess: string,
  guesses: string[],
  won: boolean ,
}> {
  state = {
    // What guess you're on
    stage: 0,
    // How many seconds you're given
    timeAllowed: 1,
    // The current guess
    guess: '',
    // Past guesses
    guesses: [],
    // If you've won
    won: false,
  };

  // TODO: don't just add the same amount of time for each guess
  /*
    Heardle offsets:
    1s, +1s, +3s, +3s +4s, +4s
   */

  playSegmentClick = () => {
    playSegment(this.state.timeAllowed);
  };

  submitGuess = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const guess = this.state.guess.trim();
    if (guess.length === 0) return;

    console.log(e);
    console.log(`title: ${Spicetify.Player.data.track.metadata.title}`);
    console.log(`artist_name: ${Spicetify.Player.data.track.metadata.artist_name}`);
    console.log(`album_artist_name: ${Spicetify.Player.data.track.metadata.album_artist_name}`);

    const won = guess === Spicetify.Player.data.track.metadata.title;

    if (won) toggleNowPlaying(true);

    // Add the guess to the guess list in the state
    this.setState({
      guesses: [
        ...this.state.guesses,
        guess,
      ],
      // Reset the guess
      guess: '',
      // Increment the stage
      stage: this.state.stage + 1,
      // Increment the time allowed
      timeAllowed: this.state.timeAllowed + 1,
      won,
    });
  }

  guessChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ guess: e.target.value});

  render() {
    return <>
      <div className={styles.container}>
        <h1 className={styles.title}>{'🎵 Spurdle!'}</h1>
        {this.state.won ? <h2 className={styles.subtitle}>{'You won!'}</h2> : null }

        <ul className={styles.guessList}>
          {this.state.guesses.map((guess, i) => <GuessItem key={i} value={guess} />)}
        </ul>

        <p>Time: {this.state.timeAllowed}s</p>

        <button className={styles.button} onClick={this.playSegmentClick}>{'Play'}</button>

        <form id='guessForm' onSubmit={this.submitGuess}>
          <input type={'text'} className={styles.input} placeholder='Guess the song' value={this.state.guess} onChange={this.guessChange} />
          <button type={'submit'} className={styles.button}>{'Guess'}</button>
        </form>
      </div>
    </>
  }
};

export default App;
