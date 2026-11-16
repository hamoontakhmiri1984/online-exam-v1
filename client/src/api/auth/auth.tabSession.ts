const TAB_AUTH_KEY = 'exam-active-login-this-tab';

/**
 * Re-opening the public site in a new tab starts as a visitor.
 * A previously signed-in tab may restore its session on reload so a dashboard
 * refresh doesn't unexpectedly log out an active user.
 */
export function shouldRestoreSessionOnLoad(pathname: string, signedInThisTab: boolean): boolean {
  if (signedInThisTab) return true;
  return !(
    pathname === '/' ||
    pathname === '/blog' ||
    pathname.startsWith('/blog/') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  );
}

export function isTabLoginActive(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(TAB_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

export function markTabLoginActive(): void {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(TAB_AUTH_KEY, '1');
  } catch {
    // Storage access is optional; interactive login still works.
  }
}

export function clearTabLogin(): void {
  try {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(TAB_AUTH_KEY);
  } catch {
    // Never prevent logout if storage is unavailable.
  }
}
