/// <reference path='../../../spicetify-cli/globals.d.ts' />
/// <reference path='../../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import styles from '../css/app.module.scss';
// import '../css/app.global.scss';
import React from 'react';

import GuessItem from '../components/GuessItem';
import Button from '../components/Button';

class Stats extends React.Component {
  state = {
    // // What guess you're on
    // stage: 0,
    // // The current guess
    // guess: '',
    // // Past guesses
    // guesses: [],
    // gameState: GameState.Playing,
  };

  constructor(props: any) {
    super(props);
  }

  componentDidMount() {

  }

  componentWillUnmount() {

  }

  render() {
    return (
      <>
        <div className={styles.container}>
          <h1 className={styles.title}>{'🎵 Name That Tune'}</h1>
          <h2>Stats</h2>
        </div>
      </>
    );
  }
}

export default Stats;
