import React from 'react';
import { Router } from '@reach/router';

import AssignUsers from './components/AssignUsers';
import Preparation from './components/Preparation';
import Sign from './components/Sign';
import View from './components/View';
import Header from './components/Header';
import Welcome from './components/Welcome';

import './App.css';

const App = () => {
  return (
    <div>
      <Header />
      <Router>
        <Welcome path="/" />
        <AssignUsers path="/assignUsers" />
        <Preparation path="/prepareDocument" />
        <Sign path="/signDocument" />
        <View path="/viewDocument" />
      </Router>
    </div>
  );
};

export default App;