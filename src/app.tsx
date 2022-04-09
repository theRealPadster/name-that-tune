/// <reference path="../../spicetify-cli/globals.d.ts" />
/// <reference path="../../spicetify-cli/jsHelper/spicetifyWrapper.js" />

import styles from './css/app.module.scss';
// import './css/app.global.scss';
import React from 'react';

import { playSection } from './logic';

class App extends React.Component<{}, {count: number}> {
  state = {
    count: 0,
  };

  stopConfettiTimeout: NodeJS.Timeout | null = null;

  onButtonClick = () => {
    this.setState((state) => {
      return {
        count: state.count+1,
      }
    });
  };

  playSectionClick = (e: React.MouseEvent<HTMLElement>) => {
    const section = e.target.dataset.section;
    playSection(section);
  };

  render() {
    return <>
      <div className={styles.container}>
        <div className={styles.title}>{"🎵 Spurdle!"}</div>
        <button className={styles.button} onClick={this.onButtonClick}>{"Count up"}</button>

        <button className={styles.button} data-section={1} onClick={this.playSectionClick}>{"Play Section 1 (0-1)"}</button>
        <button className={styles.button} data-section={2} onClick={this.playSectionClick}>{"Play Section 2 (1-2"}</button>
        <button className={styles.button} data-section={3} onClick={this.playSectionClick}>{"Play Section 3 (2-4)"}</button>
        <button className={styles.button} data-section={4} onClick={this.playSectionClick}>{"Play Section 4 (4-10)"}</button>
        <button className={styles.button} data-section={5} onClick={this.playSectionClick}>{"Play Section 5 (10-15)"}</button>
        <button className={styles.button} data-section={6} onClick={this.playSectionClick}>{"Play Section 6 (15-20)"}</button>
        <button className={styles.button} data-section={7} onClick={this.playSectionClick}>{"Play Section 7 (20-30)"}</button>

        <div className={styles.counter}>{this.state.count}</div>
      </div>
    </>
  }
};

export default App;
