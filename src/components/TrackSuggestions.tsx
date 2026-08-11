import React from 'react';

import styles from '../css/name-that-tune.module.scss';
import { TrackSuggestion } from '../search';

type TrackSuggestionsProps = {
  listboxId: string;
  label: string;
  suggestions: TrackSuggestion[];
  highlightedIndex: number;
  onSelect: (suggestion: TrackSuggestion) => void;
};

const TrackSuggestions = ({
  listboxId,
  label,
  suggestions,
  highlightedIndex,
  onSelect,
}: TrackSuggestionsProps) => {
  const listRef = React.useRef<HTMLDivElement>(null);

  // The arrow keys move aria-activedescendant, which is only a virtual focus --
  // the real one stays on the input, so the browser has nothing to scroll to
  // and the highlight walks off the bottom of the list on its own. More
  // suggestions fit in MAX_SUGGESTIONS than fit in the dropdown's max-height,
  // so this is reachable with any full set of results.
  //
  // Declared before the early return below, since hooks cannot run conditionally.
  React.useEffect(() => {
    if (highlightedIndex < 0) {
      return;
    }

    const option = listRef.current?.children[highlightedIndex];
    option?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      id={listboxId}
      ref={listRef}
      className={styles.suggestions}
      role="listbox"
      aria-label={label}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.uri}
          id={`${listboxId}-option-${index}`}
          type="button"
          tabIndex={-1}
          role="option"
          aria-selected={index === highlightedIndex}
          className={`${styles.suggestion} ${
            index === highlightedIndex ? styles.highlightedSuggestion : ''
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(suggestion)}
        >
          <span className={styles.suggestionTitle}>
            {suggestion.title}
          </span>

          {suggestion.artist ? (
            <span className={styles.suggestionArtist}>
              {suggestion.artist}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
};

export default TrackSuggestions;
