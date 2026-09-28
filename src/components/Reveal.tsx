import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../css/name-that-tune.module.scss';
import { RoundTrack } from '../round';

/**
 * Shown once a round ends, win or lose. Until this existed the answer only
 * appeared because the guessing body class dropped and Spotify's own now-playing
 * bar came back, so the payoff happened in someone else's UI.
 */
const Reveal = (props: {
  won: boolean;
  attempts: number;
  track: RoundTrack;
}) => {
  const { t } = useTranslation();

  const verdictClasses = [styles.revealVerdict];
  if (!props.won) {
    verdictClasses.push(styles.revealVerdictLost);
  }

  return (
    // The win or loss is otherwise silent to a screen reader, since nothing
    // takes focus when the round ends.
    <div className={styles.reveal} aria-live={'polite'}>
      {props.track.artwork ? (
        // Decorative: the title sits directly below, so alt text would only
        // make a screen reader announce the same track twice.
        <img className={styles.revealArt} src={props.track.artwork} alt={''} />
      ) : null}

      <p className={verdictClasses.join(' ')}>
        {props.won
          ? t('reveal.wonIn', { count: props.attempts })
          : t('reveal.gaveUpAfter', { count: props.attempts })}
      </p>

      <h2 className={styles.revealTitle}>{props.track.title}</h2>

      {props.track.artists ? (
        <p className={styles.revealArtist}>{props.track.artists}</p>
      ) : null}

      {!props.won ? (
        <p className={styles.revealMeta}>{t('reveal.playingInFull')}</p>
      ) : null}
    </div>
  );
};

export default Reveal;
