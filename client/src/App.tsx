import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    // reducedMotion="user" یعنی framer-motion خودش تنظیمِ سیستم‌عاملِ
    // کاربر رو چک می‌کنه و برای کسی که "حرکتِ کم" رو فعال کرده، انیمیشن‌ها
    // رو خودکار به یه fade ساده تبدیل می‌کنه (بدون این‌که لازم باشه تو
    // هر کامپوننت جدا هندلش کنیم)
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;
