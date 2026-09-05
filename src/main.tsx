import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically route relative /api/* requests to remote server if VITE_API_URL is set
const customApiBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
if (customApiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = `${customApiBase}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api/')) {
      input = new URL(`${customApiBase}${input.pathname}${input.search}`);
    }
    return originalFetch.call(this, input, init);
  };
}

// Global capture for PWA install prompt
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__deferredPWAInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa:prompt-ready'));
  });

  // Register PWA Service Worker for cache-first static resources
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker успешно зарегистрирован:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Ошибка регистрации Service Worker:', err);
        });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

