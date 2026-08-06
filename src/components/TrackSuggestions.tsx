import React from 'react';

import styles from '../css/app.module.scss';
import { TrackSuggestion } from '../search';

type TrackSuggestionsProps = {
  listboxId: string;
  suggestions: TrackSuggestion[];
  highlightedIndex: number;
  onSelect: (suggestion: TrackSuggestion) => void;
};

const TrackSuggestions = ({
  listboxId,
  suggestions,
  highlightedIndex,
  onSelect,
}: TrackSuggestionsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <div
      id={listboxId}
      className={styles.suggestions}
      role="listbox"
      aria-label="Song suggestions"
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