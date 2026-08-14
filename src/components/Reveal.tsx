import React from 'react';
import { useTranslation } from 'react-i18next';

import styles from '../css/name-that-tune.module.scss';

/**
 * Shown once a round ends, win or lose. Until this existed the answer only
 * appeared because the guessing body class dropped and Spotify's own now-playing
 * bar came back, so the payoff happened in someone else's UI.
 */
const Reveal = (props: {
  won: boolean;
  attempts: number;
}) => {
  const { t } = useTranslation();

  const item = Spicetify.Player.data?.item;

  // Spotify serves these as spotify:image: URIs rather than https, and the
  // client resolves them natively - no need to rewrite them to the CDN host.
  const artwork = item?.metadata?.image_xlarge_url;

  // The artists array credits everyone; metadata.artist_name only carries the
  // first, which drops the second name on a collaboration.
  const artists = (item?.artists ?? []).map((artist) => artist.name).join(' · ');

  const verdictClasses = [styles.revealVerdict];
  if (!props.won) {
    verdictClasses.push(styles.revealVerdictLost);
  }

  return (
    // The win or loss is otherwise silent to a screen reader, since nothing
    // takes focus when the round ends.
    <div className={styles.reveal} aria-live={'polite'}>
      {artwork ? (
        // Decorative: the title sits directly below, so alt text would only
        // make a screen reader announce the same track twice.
        <img className={styles.revealArt} src={artwork} alt={''} />
      ) : null}

      <p className={verdictClasses.join(' ')}>
        {props.won
          ? t('reveal.wonIn', { count: props.attempts })
          : t('reveal.gaveUpAfter', { count: props.attempts })}
      </p>

      <h2 className={styles.revealTitle}>{item?.name}</h2>

      {artists ? (
        <p className={styles.revealArtist}>{artists}</p>
      ) : null}

      {!props.won ? (
        <p className={styles.revealMeta}>{t('reveal.playingInFull')}</p>
      ) : null}
    </div>
  );
};

export default Reveal;
