import { useEffect, useRef, useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import useTheme from '../../hooks/useTheme';

// محدوده‌ی مجاز عرض ویجت رسمی گوگل (پیکسل)
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

type GoogleSignInButtonProps = {
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  onCredential: (idToken: string) => void;
  onError?: () => void;
};

// ویجت رسمی گوگل (برخلاف بقیه‌ی دکمه‌های سایت) عرض درصدی قبول نمی‌کنه،
// فقط یه عدد پیکسل ثابت - پس عرض کانتینر والد رو با ResizeObserver اندازه
// می‌گیریم تا هم‌عرض بقیه‌ی دکمه‌های فرم بمونه، نه یه مقدار هاردکد که رو
// صفحه‌های خیلی کوچیک overflow کنه یا رو صفحه‌های بزرگ باریک بمونه
function GoogleSignInButton({
  text = 'continue_with',
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const { isDark } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(
        Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, Math.round(entry.contentRect.width))
        )
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function handleSuccess(response: CredentialResponse) {
    if (response.credential) onCredential(response.credential);
    else onError?.();
  }

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={onError}
        theme={isDark ? 'filled_black' : 'outline'}
        shape="pill"
        size="large"
        text={text}
        width={width}
      />
    </div>
  );
}

export default GoogleSignInButton;
