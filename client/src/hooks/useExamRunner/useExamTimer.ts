import { useEffect, useRef, useState } from 'react';

export type TimeWarning = '5min' | '1min' | null;

const FIVE_MIN_SECONDS = 5 * 60;
const ONE_MIN_SECONDS = 60;

function useExamTimer(
  durationSeconds: number,
  isActive: boolean,
  onTimeout: () => void
) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [activeWarning, setActiveWarning] = useState<TimeWarning>(null);

  // جلوگیری از نمایش تکراری هشدار در هر ثانیه‌ای که زیر آستانه‌ست
  const warnedRef = useRef<{ five: boolean; one: boolean }>({
    five: false,
    one: false,
  });

  // وقتی مدت‌زمان آزمون از بیرون مشخص می‌شه (بعد از لود شدن exam)، شمارنده ریست می‌شه
  useEffect(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

  // شمارش معکوس: یک interval واحد که خودش دقیق تا صفر می‌شمره و متوقف می‌شه
  // فقط وقتی isActive باشه فعاله (بعد از شروع آزمون و قبل از پایانش)
  useEffect(() => {
    if (!isActive) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isActive]);

  // پایان خودکار آزمون وقتی زمان تمام شد
  useEffect(() => {
    if (isActive && timeLeft <= 0) {
      onTimeout();
    }
  }, [timeLeft, isActive, onTimeout]);

  // هشدارهای زمانی: هرکدوم دقیقاً یک‌بار فعال می‌شن
  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= ONE_MIN_SECONDS && timeLeft > 0 && !warnedRef.current.one) {
      warnedRef.current.one = true;
      setActiveWarning('1min');
    } else if (
      timeLeft <= FIVE_MIN_SECONDS &&
      timeLeft > ONE_MIN_SECONDS &&
      !warnedRef.current.five
    ) {
      warnedRef.current.five = true;
      setActiveWarning('5min');
    }
  }, [timeLeft, isActive]);

  function dismissWarning() {
    setActiveWarning(null);
  }

  return { timeLeft, activeWarning, dismissWarning };
}

export default useExamTimer;