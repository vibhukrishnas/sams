/**
 * 🎯 SAMS Frontend App Component
 * Main application component for testing
 */

import React from 'react';

const App = () => {
  return (
    <div className="app">
      <header>
        <h1>SAMS - Server Alert Management System</h1>
      </header>
      <main>
        <p>Welcome to SAMS Frontend Testing</p>
        <div className="features">
          <h2>Features</h2>
          <ul>
            <li>Real-time server monitoring</li>
            <li>Alert management</li>
            <li>Performance analytics</li>
            <li>User management</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default App;
