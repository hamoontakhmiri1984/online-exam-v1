import { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/Toast/Toast';

function GlobalSaveNotifications() {
  const [notification, setNotification] = useState<{ id: number; message: string; tone: 'success' | 'danger' } | null>(null);
  useEffect(() => {
    let count = 0;
    const onSaved = (event: Event) => {
      count += 1;
      setNotification({ id: count, message: (event as CustomEvent<string>).detail || 'تغییرات با موفقیت ذخیره شد', tone: 'success' });
    };
    const onFailed = (event: Event) => {
      count += 1;
      setNotification({ id: count, message: (event as CustomEvent<string>).detail || 'ثبت اطلاعات انجام نشد', tone: 'danger' });
    };
    window.addEventListener('app:save-success', onSaved);
    window.addEventListener('app:save-error', onFailed);
    return () => {
      window.removeEventListener('app:save-success', onSaved);
      window.removeEventListener('app:save-error', onFailed);
    };
  }, []);
  return notification ? (
    <Toast
      key={notification.id}
      tone={notification.tone}
      duration={3000}
      message={notification.message}
      onDismiss={() => setNotification(current => current?.id === notification.id ? null : current)}
    />
  ) : null;
}

function App() {
  return (
    <AuthProvider>
        <AppRoutes />
        <GlobalSaveNotifications />
    </AuthProvider>
  );
}

export default App;
