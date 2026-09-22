import { useEffect, useState } from 'react';
import type { Exam } from '../../api/examApi';
import type { Question } from '../../api/questionApi';

export type AnswersMap = Record<string, number>;

function useExamAnswers(
  questions: Question[],
  exam: Exam | null,
  initialAnswers: AnswersMap | null,
  onFinish: () => void
) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  // وقتی initialAnswers از سرور می‌رسه (شروع تازه یا resume)، answers رو
  // باهاش seed می‌کنیم - فقط همون لحظه‌ای که از null به یه مقدار واقعی
  // تغییر می‌کنه
  useEffect(() => {
    if (initialAnswers) {
      setAnswers(initialAnswers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAnswers]);

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex === questions.length - 1;

  function selectAnswer(optionIndex: number) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionIndex }));
  }

  function goToNext() {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
  }

  function goToPrevious() {
    if (exam && !exam.allowReview) return;
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }

  function goToQuestion(index: number) {
    setCurrentIndex(Math.max(0, Math.min(index, questions.length - 1)));
    setIsReviewing(false);
  }

  function proceedFromLastQuestion() {
    if (exam?.allowReview) {
      setIsReviewing(true);
    } else {
      onFinish();
    }
  }

  return {
    currentQuestion,
    currentIndex,
    isLastQuestion,
    answers,
    isReviewing,
    selectAnswer,
    goToNext,
    goToPrevious,
    goToQuestion,
    proceedFromLastQuestion,
  };
}

export default useExamAnswers;
