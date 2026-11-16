import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem('sidebarCollapsed') === 'true';
  } catch {
    return false;
  }
}

function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    readCollapsed()
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    try {
      window.localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    } catch {
      // Persist when supported; do not crash the dashboard otherwise.
    }
  }, [isCollapsed]);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  return {
    isCollapsed: isCollapsed && isDesktop,
    toggleCollapse: () => setIsCollapsed((prev) => !prev),
  };
}

export default useSidebarCollapse;
