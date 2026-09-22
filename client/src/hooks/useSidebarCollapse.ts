import { useEffect, useState } from 'react';

const DESKTOP_QUERY = '(min-width: 768px)';

function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [isDesktop, setIsDesktop] = useState<boolean>(
    () => window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);

  // فقط تو دسکتاپ معنی داره؛ تو موبایل همیشه false برمی‌گرده
  // که رفتار فعلیِ باز/بسته‌شدنِ کامل سایدبار دست‌نخورده بمونه
  return {
    isCollapsed: isCollapsed && isDesktop,
    toggleCollapse: () => setIsCollapsed((prev) => !prev),
  };
}

export default useSidebarCollapse;
