import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { loader } from '@monaco-editor/react';

// Configure Monaco Editor to load from local first-party assets instead of CDN
// This eliminates Microsoft Edge "Tracking Prevention blocked access to storage for cdn.jsdelivr.net"
loader.config({
  paths: {
    vs: '/monaco/vs',
  },
});

// Suppress benign Monaco Editor internal cancellation events (e.g. clicking away or typing during intellisense)
const originalConsoleError = console.error;
console.error = function (...args: any[]) {
  const first = args[0];
  if (
    typeof first === 'string' &&
    (first.includes('Canceled') || first.includes('ERR Canceled') || first.includes('of.cancel'))
  ) {
    return;
  }
  if (first && (first.message === 'Canceled' || first.name === 'Canceled')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

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

// Set Monaco's internal unexpected error handler once initialized
loader.init().then((monaco) => {
  monaco.errors?.setUnexpectedErrorHandler?.((err: any) => {
    if (
      err === 'Canceled' ||
      err?.message === 'Canceled' ||
      err?.name === 'Canceled' ||
      (typeof err?.message === 'string' && err.message.includes('Canceled'))
    ) {
      return;
    }
    originalConsoleError(err);
  });
}).catch(() => {});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
