import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress benign Monaco Editor internal cancellation events (e.g. clicking away or typing during intellisense)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (
    reason === 'Canceled' ||
    reason?.message === 'Canceled' ||
    reason?.name === 'Canceled' ||
    (typeof reason?.message === 'string' && reason.message.includes('Canceled'))
  ) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
