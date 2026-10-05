import { useEffect, useSyncExternalStore } from 'react';

const CHANGE_EVENT = 'app-theme-change';
function snapshot() {
  return typeof window !== 'undefined' && window.localStorage.getItem('theme') === 'dark';
}
function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
}

// Every mounted consumer (layout, Google widget, dialogs) shares the same value.
function useTheme() {
  const isDark = useSyncExternalStore(subscribe, snapshot, () => false);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);
  function toggleTheme() {
    const next = !snapshot();
    window.localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  return { isDark, toggleTheme };
}
export default useTheme;
