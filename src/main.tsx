import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/app/App';
import '@/index.css';

window.addEventListener('vite:preloadError', () => {
  const key = 'cs2dx.chunk-reload';
  try {
    if (sessionStorage.getItem(key) === '1') return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* private mode: reload anyway */
  }
  window.location.reload();
});

window.addEventListener('load', () => {
  try {
    sessionStorage.removeItem('cs2dx.chunk-reload');
  } catch {
    /* ignore */
  }
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
