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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

