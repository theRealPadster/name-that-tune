import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../css/name-that-tune.module.scss';

const GuessItem = (props: {
  guesses: string[];
  won: boolean;
  index: number;
}) => {
  const { t } = useTranslation();
  const correct = props.won && (props.index === props.guesses.length - 1);
  return (
    <li className={correct ? styles.correct : undefined}>
      {correct ? '✔' : 'x'} {props.guesses[props.index] || t('skipped')}
    </li>
  );
};

export default GuessItem;
