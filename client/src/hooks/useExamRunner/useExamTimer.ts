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

  // Emit each countdown warning once.
  const warnedRef = useRef<{ five: boolean; one: boolean }>({
    five: false,
    one: false,
  });

  useEffect(() => {
    setTimeLeft(durationSeconds);
  }, [durationSeconds]);

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

  useEffect(() => {
    if (isActive && timeLeft <= 0) {
      onTimeout();
    }
  }, [timeLeft, isActive, onTimeout]);

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