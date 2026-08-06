import React from 'react';

import styles from '../css/app.module.scss';
import { TrackSuggestion } from '../search';

type TrackSuggestionsProps = {
  suggestions: TrackSuggestion[];
  highlightedIndex: number;
  onSelect: (suggestion: TrackSuggestion) => void;
};

const TrackSuggestions = ({
  suggestions,
  highlightedIndex,
  onSelect,
}: TrackSuggestionsProps) => {
  if (suggestions.length === 0) return null;

  return (
    <div
      className={styles.suggestions}
      role="listbox"
      aria-label="Song suggestions"
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.uri}
          type="button"
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