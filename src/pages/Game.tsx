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
  /** The sixth clue was missed; waiting for the player to keep guessing or reveal. */
  askingToKeepGuessing: boolean;
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
    askingToKeepGuessing: false,
  };

  URIs?: string[];
  audioManager: AudioManager;
  searchTimeout?: ReturnType<typeof setTimeout>;
  searchRequest = 0;
  mounted = false;
  titleRequest = 0;
  inputRef = React.createRef<HTMLInputElement>();
  nextButtonRef = React.createRef<HTMLButtonElement>();
  keepGuessingRef = React.createRef<HTMLButtonElement>();

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
      askingToKeepGuessing: false,
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

  /**
   * Best effort, not a guarantee. AppTitle only overrides Spotify's idle title:
   * while a clip plays, Spotify shows "Artist - Song" instead, so the answer is
   * still briefly visible in the window title (on Windows, when hovering the
   * taskbar icon). This mostly covers the paused moments between clips.
   */
  protectWindowTitle = async () => {
    if (!Spicetify.AppTitle?.set) {
      return;
    }

    // set() replaces any override it made before and reset() removes it, so
    // there is no handle to keep. The handle it resolves to has cancel(), not
    // the clear() that spicetify.d.ts declares.
    const request = ++this.titleRequest;
    try {
      await Spicetify.AppTitle.set(this.props.t('appName'));
      // The round ended while set() was in flight, so undo it.
      if (request !== this.titleRequest || !this.mounted) {
        await Spicetify.AppTitle.reset?.();
      }
    } catch (error) {
      console.error('Unable to hide the song from the app title:', error);
    }
  };

  releaseWindowTitle = () => {
    this.titleRequest += 1;
    Spicetify.AppTitle?.reset?.()?.catch((error) => {
      console.error('Unable to restore the app title:', error);
    });
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

  /**
   * Record a skip or wrong guess. Moves on to the next clue, except after the
   * sixth, where the player chooses to keep guessing or reveal the answer.
   */
  missAttempt = (guesses: (string | null)[]) => {
    this.cancelSearch();
    const cleared = {
      guesses,
      guess: '',
      suggestions: [],
      highlightedIndex: -1,
      searchState: 'idle' as const,
    };

    if (isFinalStage(this.state.stage)) {
      this.setState(
        { ...cleared, askingToKeepGuessing: true },
        () => this.keepGuessingRef.current?.focus(),
      );
      return;
    }

    const stage = this.state.stage + 1;
    this.setAudioWindow(stage);
    this.setState({ ...cleared, stage }, () => this.inputRef.current?.focus());
  };

  skipGuess = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (this.state.gameState !== GameState.Playing || this.state.askingToKeepGuessing) {
      return;
    }

    this.missAttempt([...this.state.guesses, null]);
  };

  submitGuess = (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const { gameState, guess, track, askingToKeepGuessing } = this.state;
    if (gameState !== GameState.Playing || askingToKeepGuessing || !track || !guess.trim()) {
      return;
    }

    const guesses = [...this.state.guesses, guess];
    if (checkGuess(guess, track.title)) {
      this.finishRound(true, guesses);
      return;
    }

    this.missAttempt(guesses);
  };

  keepGuessing = () => {
    if (this.state.gameState !== GameState.Playing || !this.state.askingToKeepGuessing) {
      return;
    }

    const stage = this.state.stage + 1;
    this.setAudioWindow(stage);
    this.setState(
      { askingToKeepGuessing: false, stage },
      () => this.inputRef.current?.focus(),
    );
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
      askingToKeepGuessing,
    } = this.state;
    const { t } = this.props;
    const gameWon = gameState === GameState.Won;
    const isPlaying = gameState === GameState.Playing;
    const suggestionsOpen = suggestions.length > 0;
    const nextClueCost = stageToTime(stage + 1) - stageToTime(stage);
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

            {askingToKeepGuessing ? (
              <div className={styles.keepGuessingPrompt} aria-live="polite">
                <p>{t('outOfClues')}</p>
                <div className={styles.formButtonContainer}>
                  <Button
                    buttonRef={this.keepGuessingRef}
                    variant={'primary'}
                    classes={[styles.guessButton]}
                    onClick={this.keepGuessing}
                  >
                    {t('keepGuessing', { count: nextClueCost })}
                  </Button>

                  <Button variant={'secondary'} onClick={this.giveUp}>
                    {t('giveUp')}
                  </Button>
                </div>
              </div>
            ) : (
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
                    {t('skipBtn', { count: nextClueCost })}
                  </Button>
                </div>
              </form>
            )}

            <Button onClick={this.playClick}>
              {t('playXSeconds', { count: stageToTime(stage) })}
            </Button>

            {guessList}

            {askingToKeepGuessing ? null : (
              <Button variant={'tertiary'} onClick={this.giveUp}>
                {t('giveUp')}
              </Button>
            )}
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
