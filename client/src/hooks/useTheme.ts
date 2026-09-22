import { useEffect, useState } from 'react';

function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(
    localStorage.getItem('theme') === 'dark'
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggleTheme: () => setIsDark((prev) => !prev) };
}

export default useTheme;
