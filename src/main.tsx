import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

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

// Global capture for PWA install prompt & cleanup of legacy caches
if (typeof window !== 'undefined') {
  // Purge any stale cache entries that could return corrupted responses
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name).catch(() => {});
      });
    }).catch(() => {});
  }

  // Unregister any stale Service Worker to avoid intercepting manifest or dev requests
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        reg.unregister().catch(() => {});
      }
    }).catch(() => {});
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).__deferredPWAInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa:prompt-ready'));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

