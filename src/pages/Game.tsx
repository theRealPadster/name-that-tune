import React from 'react';
import { TFunction } from 'i18next';

import styles from '../css/name-that-tune.module.scss';
import GuessItem from '../components/GuessItem';
import Button from '../components/Button';
import Reveal from '../components/Reveal';
import TrackSuggestions from '../components/TrackSuggestions';
import {
  advanceToNextTrack,
  initialize,
  toggleIsGuessing,
  checkGuess,
  saveStats,
} from '../logic';
import AudioManager from '../AudioManager';
import { searchTracks, TrackSuggestion } from '../search';
import { MODE_KEY } from '../constants';
import {
  GameMode,
  isFinalStage,
  pickSnippetStart,
  RoundTrack,
  stageToTime,
} from '../round';

const TRACK_SUGGESTIONS_LISTBOX_ID = 'track-suggestions-listbox';
const GUESS_INPUT_ID = 'name-that-tune-guess';

enum GameState {
  Loading,
  Playing,
  Won,
  Lost,
  Error,
}

type SearchState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

type GameComponentState = {
  stage: number;
  guess: string;
  guesses: (string | null)[];
  gameState: GameState;
  suggestions: TrackSuggestion[];
  highlightedIndex: number;
  searchState: SearchState;
  mode: GameMode;
  snippetStart: number;
  track?: RoundTrack;
  error?: string;
};

class Game extends React.Component<
  {
    URIs?: string[];
    t: TFunction;
  },
  GameComponentState
> {
  state: GameComponentState = {
    stage: 0,
    guess: '',
    guesses: [],
    gameState: GameState.Loading,
    suggestions: [],
    highlightedIndex: -1,
    searchState: 'idle',
    mode: localStorage.getItem(MODE_KEY) === 'random' ? 'random' : 'intro',
    snippetStart: 0,
  };

  URIs?: string[];
  audioManager: AudioManager;
  searchTimeout?: ReturnType<typeof setTimeout>;
  searchRequest = 0;
  mounted = false;
  titleRequest = 0;
  titleOverride?: { clear: () => void };
  inputRef = React.createRef<HTMLInputElement>();
  nextButtonRef = React.createRef<HTMLButtonElement>();

  constructor(props) {
    super(props);
    this.URIs = props.URIs;
    this.audioManager = new AudioManager();
  }

  componentDidMount() {
    this.mounted = true;
    this.audioManager.listen();
    Spicetify.Player.addEventListener('songchange', this.handleUnexpectedSongChange);
    void this.loadRound(() => initialize(this.URIs));
  }

  componentWillUnmount() {
    this.mounted = false;
    this.cancelSearch();
    this.audioManager.stop();
    this.releaseWindowTitle();
    this.audioManager.unlisten();
    Spicetify.Player.removeEventListener('songchange', this.handleUnexpectedSongChange);
  }

  getSnippetStart = (track: RoundTrack, mode = this.state.mode) => (
    mode === 'random' ? pickSnippetStart(track.durationMs) : 0
  );

  setAudioWindow = (stage: number, snippetStart = this.state.snippetStart) => {
    this.audioManager.setWindow(snippetStart, stageToTime(stage));
  };

  loadRound = async (loader: () => Promise<RoundTrack>) => {
    this.cancelSearch();
    this.audioManager.stop();
    toggleIsGuessing(true);

    this.setState({
      stage: 0,
      guess: '',
      guesses: [],
      gameState: GameState.Loading,
      suggestions: [],
      highlightedIndex: -1,
      searchState: 'idle',
      snippetStart: 0,
      track: undefined,
      error: undefined,
    });

    try {
      const track = await loader();
      if (!this.mounted) {
        return;
      }

      const snippetStart = this.getSnippetStart(track);
      this.audioManager.setWindow(snippetStart, stageToTime(0));
      void this.protectWindowTitle();

      this.setState({
        track,
        snippetStart,
        gameState: GameState.Playing,
      }, () => this.inputRef.current?.focus());
    } catch (error) {
      if (!this.mounted) {
        return;
      }

      this.audioManager.stop();
      this.releaseWindowTitle();
      toggleIsGuessing(false);
      this.setState({
        gameState: GameState.Error,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  handleUnexpectedSongChange = () => {
    const { gameState, track } = this.state;
    if (gameState !== GameState.Playing || !track) {
      return;
    }

    if (Spicetify.Player.data?.item?.uri === track.uri) {
      return;
    }

    this.cancelSearch();
    this.audioManager.stop();
    this.releaseWindowTitle();
    toggleIsGuessing(false);
    this.setState({
      gameState: GameState.Error,
      suggestions: [],
      searchState: 'idle',
      error: this.props.t('errors.trackChanged'),
    });
  };

  changeMode = (mode: GameMode) => {
    const { gameState, guesses, track } = this.state;
    if (gameState !== GameState.Playing || guesses.length > 0 || !track) {
      return;
    }

    const snippetStart = this.getSnippetStart(track, mode);
    localStorage.setItem(MODE_KEY, mode);
    this.audioManager.stop();
    this.audioManager.setWindow(snippetStart, stageToTime(0));
    this.setState({ mode, snippetStart });
  };

  playClick = () => {
    if (this.state.gameState === GameState.Playing) {
      this.audioManager.play();
      setTimeout(this.protectWindowTitle, 0);
    }
  };

  protectWindowTitle = async () => {
    if (!Spicetify.AppTitle?.set) {
      return;
    }

    const request = ++this.titleRequest;
    try {
      const override = await Spicetify.AppTitle.set(this.props.t('appName'));
      if (request !== this.titleRequest || !this.mounted) {
        override.clear();
        return;
      }

      this.titleOverride?.clear();
      this.titleOverride = override;
    } catch (error) {
      console.error('Unable to hide the song from the app title:', error);
    }
  };

  releaseWindowTitle = () => {
    this.titleRequest += 1;
    this.titleOverride?.clear();
    this.titleOverride = undefined;
    void Spicetify.AppTitle?.reset?.();
  };

  guessChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const guess = event.target.value;
    this.cancelSearch();
    const requestId = this.searchRequest;

    this.setState({
      guess,
      suggestions: [],
      highlightedIndex: -1,
      searchState: guess.trim().length >= 2 ? 'loading' : 'idle',
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
          searchState: suggestions.length > 0 ? 'ready' : 'empty',
        });
      } catch (error) {
        if (requestId !== this.searchRequest) {
          return;
        }

        console.error('Unable to load song suggestions:', error);
        this.setState({
          suggestions: [],
          highlightedIndex: -1,
          searchState: 'error',
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
      searchState: 'idle',
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
      searchState: 'idle',
    });
  };

  finishRound = (
    won: boolean,
    guesses: (string | null)[],
  ) => {
    this.cancelSearch();
    this.releaseWindowTitle();
    saveStats(won ? this.state.stage : -1);
    this.audioManager.reveal();
    toggleIsGuessing(false);

    this.setState({
      guesses,
      guess: '',
      suggestions: [],
      highlightedIndex: -1,
      searchState: 'idle',
      gameState: won ? GameState.Won : GameState.Lost,
    }, () => this.nextButtonRef.current?.focus());
  };

  skipGuess = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (this.state.gameState !== GameState.Playing) {
      return;
    }

    const guesses = [...this.state.guesses, null];
    if (isFinalStage(this.state.stage)) {
      this.finishRound(false, guesses);
      return;
    }

    const stage = this.state.stage + 1;
    this.cancelSearch();
    this.setAudioWindow(stage);
    this.setState({
      guesses,
      guess: '',
      suggestions: [],
      highlightedIndex: -1,
      searchState: 'idle',
      stage,
    }, () => this.inputRef.current?.focus());
  };

  submitGuess = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const { gameState, guess, track, stage } = this.state;
    if (gameState !== GameState.Playing || !track || !guess.trim()) {
      return;
    }

    const guesses = [...this.state.guesses, guess];
    const won = checkGuess(guess, track.title);

    if (won || isFinalStage(stage)) {
      this.finishRound(won, guesses);
      return;
    }

    const nextStage = stage + 1;
    this.cancelSearch();
    this.setAudioWindow(nextStage);
    this.setState({
      guesses,
      guess: '',
      suggestions: [],
      highlightedIndex: -1,
      searchState: 'idle',
      stage: nextStage,
    }, () => this.inputRef.current?.focus());
  };

  giveUp = () => {
    if (this.state.gameState === GameState.Playing) {
      this.finishRound(false, this.state.guesses);
    }
  };

  nextSong = () => {
    void this.loadRound(advanceToNextTrack);
  };

  retryRound = () => {
    void this.loadRound(() => initialize(this.URIs));
  };

  goToStats = () => {
    Spicetify.Platform.History.push({
      pathname: '/name-that-tune/stats',
    });
  };

  renderSearchStatus() {
    const { searchState } = this.state;
    if (searchState === 'loading') {
      return this.props.t('search.loading');
    }
    if (searchState === 'empty') {
      return this.props.t('search.empty');
    }
    if (searchState === 'error') {
      return this.props.t('search.error');
    }
    return '';
  }

  render() {
    const {
      gameState,
      guesses,
      highlightedIndex,
      mode,
      stage,
      suggestions,
      track,
    } = this.state;
    const { t } = this.props;
    const gameWon = gameState === GameState.Won;
    const isPlaying = gameState === GameState.Playing;
    const suggestionsOpen = suggestions.length > 0;
    const skipCost = isFinalStage(stage)
      ? 0
      : stageToTime(stage + 1) - stageToTime(stage);
    const activeSuggestionId = highlightedIndex >= 0
      ? `${TRACK_SUGGESTIONS_LISTBOX_ID}-option-${highlightedIndex}`
      : undefined;

    const guessList = (
      <ol className={styles.guessList} aria-label={t('attemptsLabel')}>
        {guesses.map((guess, index) => (
          <GuessItem
            key={index}
            index={index}
            guesses={guesses}
            won={gameWon}
          />
        ))}
      </ol>
    );

    return (
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

        {gameState === GameState.Loading ? (
          <div className={styles.statusCard} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <p>{t('loadingTrack')}</p>
          </div>
        ) : null}

        {gameState === GameState.Error ? (
          <div className={styles.statusCard} role="alert">
            <h2>{t('errors.title')}</h2>
            <p>{this.state.error || t('errors.generic')}</p>
            <Button variant={'primary'} onClick={this.retryRound}>
              {t('tryAgain')}
            </Button>
          </div>
        ) : null}

        {isPlaying ? (
          <>
            <fieldset className={styles.modePicker} disabled={guesses.length > 0}>
              <legend>{t('mode.label')}</legend>
              <button
                type="button"
                aria-pressed={mode === 'intro'}
                className={mode === 'intro' ? styles.activeMode : ''}
                onClick={() => this.changeMode('intro')}
              >
                {t('mode.intro')}
              </button>
              <button
                type="button"
                aria-pressed={mode === 'random'}
                className={mode === 'random' ? styles.activeMode : ''}
                onClick={() => this.changeMode('random')}
              >
                {t('mode.random')}
              </button>
            </fieldset>

            <form className={styles.guessForm} onSubmit={this.submitGuess}>
              <div className={styles.inputContainer}>
                <label className={styles.inputLabel} htmlFor={GUESS_INPUT_ID}>
                  {t('guessLabel')}
                </label>
                <input
                  ref={this.inputRef}
                  id={GUESS_INPUT_ID}
                  type={'text'}
                  className={styles.input}
                  placeholder={t('guessPlaceholder') as string}
                  value={this.state.guess}
                  onChange={this.guessChange}
                  onKeyDown={this.guessKeyDown}
                  onBlur={this.closeSuggestions}
                  autoComplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={suggestionsOpen}
                  aria-controls={
                    suggestionsOpen ? TRACK_SUGGESTIONS_LISTBOX_ID : undefined
                  }
                  aria-activedescendant={activeSuggestionId}
                />

                <TrackSuggestions
                  listboxId={TRACK_SUGGESTIONS_LISTBOX_ID}
                  label={t('suggestionsLabel')}
                  suggestions={suggestions}
                  highlightedIndex={highlightedIndex}
                  onSelect={this.selectSuggestion}
                />
              </div>

              <p className={styles.searchStatus} aria-live="polite">
                {this.renderSearchStatus()}
              </p>

              <div className={styles.formButtonContainer}>
                <Button
                  htmlType="submit"
                  variant={'primary'}
                  classes={[styles.guessButton]}
                  disabled={!this.state.guess.trim()}
                >
                  {t('guessBtn')}
                </Button>

                <Button variant={'secondary'} onClick={this.skipGuess}>
                  {isFinalStage(stage)
                    ? t('skipAndReveal')
                    : t('skipBtn', { count: skipCost })}
                </Button>
              </div>
            </form>

            <Button onClick={this.playClick}>
              {t(mode === 'random' ? 'playRandomXSeconds' : 'playXSeconds', {
                count: stageToTime(stage),
              })}
            </Button>

            {guessList}

            <Button variant={'tertiary'} onClick={this.giveUp}>
              {t('giveUp')}
            </Button>
          </>
        ) : null}

        {(gameState === GameState.Won || gameState === GameState.Lost) && track ? (
          <>
            <Reveal
              won={gameWon}
              attempts={guesses.length}
              track={track}
            />

            <Button
              buttonRef={this.nextButtonRef}
              variant={'primary'}
              onClick={this.nextSong}
            >
              {t('nextSong')}
            </Button>

            {guessList}
          </>
        ) : null}
      </div>
    );
  }
}

export default Game;
