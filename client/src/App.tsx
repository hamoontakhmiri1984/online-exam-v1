import { MotionConfig } from 'framer-motion';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;
