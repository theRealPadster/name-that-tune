import React from 'react';

import styles from '../css/name-that-tune.module.scss';

const GuessItem = (props: {
  guesses: string[];
  won: boolean;
  index: number;
}) => {
  const guess = props.guesses[props.index];
  const correct = props.won && (props.index === props.guesses.length - 1);
  const skipped = !guess;

  const classList = [styles.guessItem];
  if (correct) {
    classList.push(styles.correct);
  }
  if (skipped) {
    classList.push(styles.skipped);
  }

  // The markers are not aria-hidden on purpose: they are the only thing telling
  // a screen reader whether a row was right, wrong or skipped.
  return (
    <li className={classList.join(' ')}>
      <span className={styles.guessMark}>
        {correct ? '✔' : skipped ? '–' : '✕'}
      </span>
      <span className={styles.guessText}>{guess || 'SKIPPED'}</span>
    </li>
  );
};

export default GuessItem;
