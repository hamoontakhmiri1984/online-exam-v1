import { useCallback, useEffect, useRef, useState } from 'react';
import type { Exam } from '../../api/examApi';
import { autosaveAnswers } from '../../api/examAttemptApi';
import { ApiError } from '../../lib/apiClient';
import type { AnswersMap } from './useExamAnswers';
import {
  createAutosaveController,
  type AutosaveController,
  type AutosaveStatus,
} from './autosaveController';

export type { AutosaveStatus };

// هر بار answers عوض می‌شه، بعد از یه مکث کوتاه (debounce) سمت سرور ذخیره
// می‌شه - جلوی از دست رفتن پاسخ‌ها با رفرش/قطعی صفحه رو می‌گیره.
//
// چرا قبلاً پاسخ قدیمی می‌تونست جای جدید بشینه: هر تغییر یه درخواست مستقل
// می‌فرستاد و ترتیب رسیدنشون به سرور تضمین نبود. الان (autosaveController.ts):
//  ۱) همیشه حداکثر *یک* درخواست در راهه؛ آخرین وضعیت یک‌جا فرستاده می‌شه
//  ۲) هر ذخیره یه revision صعودی داره و سرور ذخیره‌ی قدیمی‌تر رو رد می‌کنه
//  ۳) اگه ذخیره شکست بخوره، با backoff دوباره تلاش می‌شه و وضعیت به کاربر
//     نشون داده می‌شه (نه بی‌صدا نادیده گرفته بشه)
//
// قبل از شروع یا بعد از پایان آزمون autosave نمی‌شه
function useExamAutosave(
  examId: string,
  exam: Exam | null,
  hasStarted: boolean,
  isFinished: boolean,
  answers: AnswersMap,
  initialRevision: number
) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const examIdRef = useRef(examId);
  const isFirstRunRef = useRef(true);
  const controllerRef = useRef<AutosaveController | null>(null);

  useEffect(() => {
    examIdRef.current = examId;
  }, [examId]);

  if (controllerRef.current === null) {
    controllerRef.current = createAutosaveController({
      initialRevision,
      save: (payload, revision) =>
        autosaveAnswers(examIdRef.current, payload, revision),
      // ۴۰۹: آزمون قبلاً ثبت شده یا زمانش تموم شده - مسیر اصلیِ ثبت نمره
      // finish ـه، نه autosave
      isConflict: (err) => err instanceof ApiError && err.status === 409,
      onStatus: setStatus,
    });
  }
  const controller = controllerRef.current;

  // شمارنده از آخرین revision سرور ادامه پیدا می‌کنه (بعد از رفرش صفر نمی‌شه)
  useEffect(() => {
    controller.raiseRevision(initialRevision);
  }, [controller, initialRevision]);

  // بعد از finish (یا قبل از start) هیچ ذخیره‌ای نباید بره
  useEffect(() => {
    if (hasStarted && !isFinished) controller.start();
    else controller.stop();
    return () => controller.stop();
  }, [controller, hasStarted, isFinished]);

  useEffect(() => {
    controller.setLatest(answers);
    if (!hasStarted || isFinished || !exam) return;

    // اولین باری که answers ست می‌شه (شروع تازه {} یا seed شده از resume)
    // نیازی به ذخیره‌ی فوری نیست - چیزی تغییر نکرده
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    controller.markChanged(answers);
  }, [controller, answers, exam, hasStarted, isFinished]);

  // تب مخفی شد (عوض کردن تب/قفل شدن گوشی) یا اینترنت برگشت: منتظر debounce
  // نمی‌مونیم و همین الان ذخیره می‌کنیم
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    function flushNow() {
      controller.flushNow();
    }
    function handleVisibility() {
      if (document.visibilityState === 'hidden') flushNow();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', flushNow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', flushNow);
    };
  }, [controller, hasStarted, isFinished]);

  // دکمه‌ی «تلاش دوباره» - بدون انتظار برای backoff
  const retry = useCallback(() => controller.retry(), [controller]);

  return { status, retry };
}

export default useExamAutosave;
