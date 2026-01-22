import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { initializeStores } from './stores';

// Wrapper component to initialize stores
function AppWrapper() {
  useEffect(() => {
    // Initialize all stores on mount
    initializeStores();
  }, []);

  return <App />;
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);
