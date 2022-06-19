import React from 'react';
import Game from './pages/Game';
import Stats from './pages/Stats';

class App extends React.Component {
  render() {
    const { location } = Spicetify.Platform.History;
    // If page state set to stats, render it
    if (location.pathname === '/name-that-tune/stats') {
      return <Stats />;
    } // Otherwise, render the main Game
    else {
      return <Game />;
    }
  }
}

export default App;
