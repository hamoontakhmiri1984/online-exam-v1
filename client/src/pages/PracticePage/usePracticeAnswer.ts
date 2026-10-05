import { useRef, useState } from "react";
import { answerPractice, type PracticeAnswer } from "../../api/practiceApi";
import { getCurrentUser } from "../../api/authApi";
import { ApiError } from "../../lib/apiClient";
type PendingAnswer = { id: string; option: number };
function readPending(key: string, count: number): PendingAnswer | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    return value &&
      typeof value.id === "string" &&
      Number.isInteger(value.option) &&
      value.option >= 0 &&
      value.option < count
      ? value
      : null;
  } catch {
    return null;
  }
}
export default function usePracticeAnswer(
  practiceId: string,
  questionId: string,
  optionCount: number,
  onSaved: (result: PracticeAnswer) => void,
) {
  const key = `practice-answer:${getCurrentUser()?.id}:${practiceId}:${questionId}`;
  const [initial] = useState(() => readPending(key, optionCount));
  const request = useRef<PendingAnswer | null>(initial);
  const pending = useRef(false);
  const [selected, setSelected] = useState<number | null>(
    initial?.option ?? null,
  );
  const [feedback, setFeedback] = useState<PracticeAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(!!initial);
  const [error, setError] = useState("");
  async function submit() {
    if (pending.current || selected === null || feedback) return;
    pending.current = true;
    setBusy(true);
    setError("");
    request.current ??= { id: crypto.randomUUID(), option: selected };
    try {
      sessionStorage.setItem(key, JSON.stringify(request.current));
    } catch {
      /* memory still protects retries */
    }
    try {
      const result = await answerPractice(
        practiceId,
        questionId,
        request.current.id,
        request.current.option,
      );
      setFeedback(result);
      setUncertain(false);
      onSaved(result);
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* harmless replay returns the same result */
      }
    } catch (e) {
      const rejected =
        e instanceof ApiError && [400, 403, 404, 409].includes(e.status);
      if (rejected) {
        request.current = null;
        try {
          sessionStorage.removeItem(key);
        } catch {
          /* storage disabled */
        }
      }
      setUncertain(!rejected);
      setError(
        e instanceof ApiError
          ? e.message
          : "نتیجهٔ ثبت دریافت نشد. با تلاش مجدد، همین پاسخ بررسی می‌شود.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function repeat() {
    request.current = null;
    setFeedback(null);
    setSelected(null);
    setError("");
    setUncertain(false);
  }
  return {
    selected,
    setSelected,
    feedback,
    busy,
    uncertain,
    error,
    submit,
    repeat,
  };
}
