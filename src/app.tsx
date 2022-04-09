/// <reference path='../../spicetify-cli/globals.d.ts' />
/// <reference path='../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import styles from './css/app.module.scss';
// import './css/app.global.scss';
import React from 'react';

import {
  playSection,
  toggleNowPlaying,
} from './logic';

class App extends React.Component<{}, { guess: string, won: boolean }> {
  state = {
    guess: '',
    won: false,
  };

  stopConfettiTimeout: NodeJS.Timeout | null = null;

  playSectionClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const section = e.target.dataset.section;
    playSection(section);
  };

  submitGuess = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // const guess = e.target.value;
    console.log(e);
    console.log(`title: ${Spicetify.Player.data.track.metadata.title}`);
    console.log(`artist_name: ${Spicetify.Player.data.track.metadata.artist_name}`);
    console.log(`album_artist_name: ${Spicetify.Player.data.track.metadata.album_artist_name}`);

    if (this.state.guess === Spicetify.Player.data.track.metadata.title) {
      toggleNowPlaying(true);
      this.setState({
        won: true,
      });
    }

  }

  guessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      guess: e.target.value,
    });
  }

  render() {
    return <>
      <div className={styles.container}>
        <div className={styles.title}>{'🎵 Spurdle!'}</div>

        {this.state.won ? <h2 className={styles.title}>{'You won!'}</h2> : null }


        <button className={styles.button} data-section={1} onClick={this.playSectionClick}>{'Play Section 1 (0-1)'}</button>
        <button className={styles.button} data-section={2} onClick={this.playSectionClick}>{'Play Section 2 (1-2'}</button>
        <button className={styles.button} data-section={3} onClick={this.playSectionClick}>{'Play Section 3 (2-4)'}</button>
        <button className={styles.button} data-section={4} onClick={this.playSectionClick}>{'Play Section 4 (4-10)'}</button>
        <button className={styles.button} data-section={5} onClick={this.playSectionClick}>{'Play Section 5 (10-15)'}</button>
        <button className={styles.button} data-section={6} onClick={this.playSectionClick}>{'Play Section 6 (15-20)'}</button>
        <button className={styles.button} data-section={7} onClick={this.playSectionClick}>{'Play Section 7 (20-30)'}</button>

        <form id='guessForm' onSubmit={this.submitGuess}>
          <input type="text" className={styles.input} placeholder='Guess the song' value={this.state.guess} onChange={this.guessChange} />
          <button type='submit' className={styles.button}>{'Guess'}</button>
        </form>
      </div>
    </>
  }
};

export default App;
