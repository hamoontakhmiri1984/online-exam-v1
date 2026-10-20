import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '@fontsource-variable/vazirmatn';
import './index.css';
import App from './App.tsx';
import { ExamGuardProvider } from './context/ExamGuardContext.tsx';

const googleClientId =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ExamGuardProvider>
          <App />
        </ExamGuardProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>
);
