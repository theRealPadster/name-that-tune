import styles from '../css/name-that-tune.module.scss';
// import '../css/app.global.scss';
import React from 'react';
import { TFunction } from 'i18next';

import GuessItem from '../components/GuessItem';
import Button from '../components/Button';
import TrackSuggestions from '../components/TrackSuggestions';

import {
  initialize,
  toggleIsGuessing,
  checkGuess,
  saveStats,
  stageToTime,
} from '../logic';
import AudioManager from '../AudioManager';
import { searchTracks, TrackSuggestion } from '../search';

const TRACK_SUGGESTIONS_LISTBOX_ID = 'track-suggestions-listbox';

enum GameState {
  Playing,
  Won,
  Lost,
}

class Game extends React.Component<
  {
    URIs?: string[],
    t: TFunction,
  },
  {
    stage: number;
    guess: string;
    guesses: (string | null)[];
    gameState: GameState;
    suggestions: TrackSuggestion[];
    highlightedIndex: number;
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
    suggestions: [] as TrackSuggestion[],
    highlightedIndex: -1,
  };

  URIs?: string[];
  audioManager: AudioManager;

  searchTimeout?: ReturnType<typeof setTimeout>;
  searchRequest = 0;

  constructor(props) {
    super(props);

    // Undefined when opened from the header bar rather than the context menu,
    // in which case we just use whatever is currently playing
    this.URIs = props.URIs;
    this.audioManager = new AudioManager();
  }

  componentDidMount() {
    console.log('App mounted, URIs: ', this.URIs);
    initialize(this.URIs);
    this.audioManager.listen();
  }

  componentWillUnmount() {
    this.cancelSearch();
    this.audioManager.unlisten();
  }

  playClick = () => {
    this.audioManager.play();
  };

  guessChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const guess = event.target.value;

    this.cancelSearch();
    const requestId = this.searchRequest;

    this.setState({
      guess,
      suggestions: [],
      highlightedIndex: -1,
    });

    if (guess.trim().length < 2) {
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      try {
        const suggestions = await searchTracks(guess);

        if (requestId !== this.searchRequest) {
          return;
        }

        this.setState({
          suggestions,
          highlightedIndex: -1,
        });
      } catch (error) {
        if (requestId !== this.searchRequest) {
          return;
        }

        console.error('Unable to load song suggestions:', error);

        this.setState({
          suggestions: [],
          highlightedIndex: -1,
        });
      }
    }, 250);
  };

  cancelSearch = () => {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = undefined;
    }

    this.searchRequest += 1;
  };

  selectSuggestion = (suggestion: TrackSuggestion) => {
    this.cancelSearch();

    this.setState({
      guess: suggestion.title,
      suggestions: [],
      highlightedIndex: -1,
    });
  };

  guessKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { suggestions, highlightedIndex } = this.state;

    if (event.key === 'Escape') {
      this.closeSuggestions();
      return;
    }

    if (suggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      this.setState({
        highlightedIndex:
          highlightedIndex < suggestions.length - 1
            ? highlightedIndex + 1
            : 0,
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      this.setState({
        highlightedIndex:
          highlightedIndex > 0
            ? highlightedIndex - 1
            : suggestions.length - 1,
      });
      return;
    }

    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault();
      this.selectSuggestion(suggestions[highlightedIndex]);
    }
  };

  closeSuggestions = () => {
    this.cancelSearch();

    this.setState({
      suggestions: [],
      highlightedIndex: -1,
    });
  };

  skipGuess = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    this.closeSuggestions();

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

  submitGuess = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    // Don't allow empty guesses
    if (this.state.guess.trim().length === 0) {
      return;
    }

    this.closeSuggestions();

    const won = checkGuess(this.state.guess);
    if (won) {
      saveStats(this.state.stage);
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
      if (won) {
        this.audioManager.setEnd(0);
        Spicetify.Player.seek(0);
        Spicetify.Player.play();
        toggleIsGuessing(false);
      } else {
        this.audioManager.setEnd(stageToTime(this.state.stage));
      }
    });
  };

  giveUp = () => {
    this.closeSuggestions();
    this.audioManager.setEnd(0);
    Spicetify.Player.seek(0);
    Spicetify.Player.play();
    toggleIsGuessing(false);
    saveStats(-1);

    this.setState({
      gameState: GameState.Lost,
    });
  };

  nextSong = () => {
    this.closeSuggestions();
    toggleIsGuessing(true);
    Spicetify.Player.next();
    Spicetify.Player.seek(0);
    Spicetify.Player.pause();
    this.audioManager.setEnd(1);

    this.setState({
      guesses: [],
      // Reset the guess
      guess: '',
      // Reset the stage
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
  };

  render() {
    const gameWon = this.state.gameState === GameState.Won;
    const isPlaying = this.state.gameState === GameState.Playing;
    const { t } = this.props;

    const suggestionsOpen = this.state.suggestions.length > 0;

    // What a skip actually buys you, so the button can price itself. Derived
    // from the curve rather than hardcoded, so it stays right if that changes.
    const skipCost =
      stageToTime(this.state.stage + 1) - stageToTime(this.state.stage);

    const activeSuggestionId =
      this.state.highlightedIndex >= 0
        ? `${TRACK_SUGGESTIONS_LISTBOX_ID}-option-${this.state.highlightedIndex}`
        : undefined;

    return (
      <>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1 className={styles.title}>{t('title')}</h1>

            <Button
              variant={'tertiary'}
              onClick={this.goToStats}
              classes={[styles.StatsButton]}
            >
              <svg
                width={16}
                height={16}
                viewBox={'0 0 24 24'}
                fill={'currentColor'}
                aria-hidden={true}
              >
                <rect x={3} y={12} width={4} height={9} rx={1} />
                <rect x={10} y={7} width={4} height={14} rx={1} />
                <rect x={17} y={3} width={4} height={18} rx={1} />
              </svg>
              <span className={styles.statsLabel}>{t('stats.title')}</span>
            </Button>
          </header>

          {gameWon ? (
            <h2 className={styles.subtitle}>{t('winMsg')}</h2>
          ) : null}

          <form
            className={styles.guessForm}
            onSubmit={this.submitGuess}
          >
            <div className={styles.inputContainer}>
              <input
                type={'text'}
                className={styles.input}
                placeholder={t('guessPlaceholder') as string}
                value={this.state.guess}
                disabled={!isPlaying}
                onChange={this.guessChange}
                onKeyDown={this.guessKeyDown}
                onBlur={this.closeSuggestions}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestionsOpen}
                aria-controls={
                  suggestionsOpen
                    ? TRACK_SUGGESTIONS_LISTBOX_ID
                    : undefined
                }
                aria-activedescendant={activeSuggestionId}
              />

              <TrackSuggestions
                listboxId={TRACK_SUGGESTIONS_LISTBOX_ID}
                label={t('suggestionsLabel')}
                suggestions={this.state.suggestions}
                highlightedIndex={this.state.highlightedIndex}
                onSelect={this.selectSuggestion}
              />
            </div>

            <div className={styles.formButtonContainer}>
              <Button
                variant={'primary'}
                classes={[styles.guessButton]}
                onClick={() => this.submitGuess()}
                disabled={!isPlaying}
              >
                {t('guessBtn')}
              </Button>

              <Button
                variant={'secondary'}
                onClick={this.skipGuess}
                disabled={!isPlaying}
              >
                {t('skipBtn', { count: skipCost })}
              </Button>
            </div>
          </form>

          {isPlaying ? (
            <Button onClick={this.playClick}>
              {t('playXSeconds', {
                count: stageToTime(this.state.stage),
              })}
            </Button>
          ) : null}

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

          <Button
            variant={isPlaying ? 'tertiary' : 'primary'}
            onClick={isPlaying ? this.giveUp : this.nextSong}
          >
            {isPlaying ? t('giveUp') : t('nextSong')}
          </Button>
        </div>
      </>
    );
  }
}

export default Game;
