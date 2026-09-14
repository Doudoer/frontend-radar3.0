import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'

declare const __APP_BUILD_ID__: string;

const BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
const BUILD_STORAGE_KEY = 'radar_build_id';
const BUILD_RELOAD_GUARD = 'radar_build_reload_once';
const CHUNK_RELOAD_GUARD = 'radar_chunk_reload_once';

const recoverFromStaleBuild = () => {
  try {
    const previousBuild = localStorage.getItem(BUILD_STORAGE_KEY);
    const alreadyReloaded = sessionStorage.getItem(BUILD_RELOAD_GUARD) === '1';

    if (previousBuild && previousBuild !== BUILD_ID && !alreadyReloaded) {
      sessionStorage.setItem(BUILD_RELOAD_GUARD, '1');
      localStorage.setItem(BUILD_STORAGE_KEY, BUILD_ID);

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('v', BUILD_ID);
      window.location.replace(nextUrl.toString());
      return;
    }

    localStorage.setItem(BUILD_STORAGE_KEY, BUILD_ID);
    sessionStorage.removeItem(BUILD_RELOAD_GUARD);
  } catch {
    // Avoid blocking app render if storage is unavailable.
  }
};

const isChunkLoadingError = (message: string) => {
  const chunkPatterns = [
    /Failed to fetch dynamically imported module/i,
    /Importing a module script failed/i,
    /ChunkLoadError/i,
    /Loading chunk [\w-]+ failed/i,
  ];

  return chunkPatterns.some((pattern) => pattern.test(message));
};

const recoverFromChunkError = () => {
  const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_GUARD) === '1';
  if (alreadyReloaded) return;

  sessionStorage.setItem(CHUNK_RELOAD_GUARD, '1');

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('v', BUILD_ID);
  window.location.replace(nextUrl.toString());
};

recoverFromStaleBuild();

window.addEventListener('error', (event) => {
  const message = String((event as ErrorEvent).message || '');
  if (isChunkLoadingError(message)) {
    recoverFromChunkError();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = (event as PromiseRejectionEvent).reason;
  const message = String(reason?.message || reason || '');
  if (isChunkLoadingError(message)) {
    recoverFromChunkError();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster 
      position="top-right" 
      containerStyle={{ zIndex: 999999 }}
      toastOptions={{
        style: {
          background: 'rgba(15,15,20,0.9)',
          color: '#fff',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(10px)',
        }
      }} />
    <App />
  </StrictMode>,
)
