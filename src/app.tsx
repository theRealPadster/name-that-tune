/// <reference path='../../spicetify-cli/globals.d.ts' />
/// <reference path='../../spicetify-cli/jsHelper/spicetifyWrapper.js' />

import React from 'react';
import Game from './pages/Game';
import Stats from './pages/Stats';

class App extends React.Component {
  render() {
    const { location } = Spicetify.Platform.History;
    // If page state set to stats, render it
    if (location.pathname === '/name-that-tune/stats') {
      console.log('Rendering stats');
      return <Stats />;
    } // Otherwise, render the main Game
    else {
      console.log('Rendering game');
      return <Game />;
    }
  }
}

export default App;
