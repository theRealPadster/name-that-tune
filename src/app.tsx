import React from 'react';

import { t } from 'i18next';

import initI18n from './i18n';

import Game from './pages/Game';
import Stats from './pages/Stats';

import './css/app.global.scss';

// Safe at module scope: the app bundle is only loaded once the user navigates
// to it, by which point Spicetify.Locale exists.
initI18n();

type HistoryLocation = {
  pathname: string;
  key?: string;
  state?: { URIs?: string[] };
};

class App extends React.Component<Record<string, never>, { location: HistoryLocation }> {
  state: { location: HistoryLocation } = {
    location: Spicetify.Platform.History.location,
  };

  unlisten?: () => void;

  // Spotify's router doesn't necessarily re-render us on its own, so listen
  // ourselves to make sure relaunching the game picks up the new URIs
  componentDidMount() {
    this.unlisten = Spicetify.Platform.History.listen((location: HistoryLocation) => {
      this.setState({ location });
    });
  }

  componentWillUnmount() {
    this.unlisten?.();
  }

  render() {
    const { location } = this.state;
    // If page state set to stats, render it
    if (location.pathname === '/name-that-tune/stats') {
      return <Stats t={t} />;
    } // Otherwise, render the main Game
    else {
      // Keyed on the history entry so that relaunching from the game page
      // remounts with the new URIs rather than reusing the running game
      return <Game key={location.key} URIs={location.state?.URIs} t={t} />;
    }
  }
}

export default App;
