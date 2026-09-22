import { useState } from 'react';
import type { Exam } from '../api/examApi';

export const DURATION_PRESETS = [10, 15, 30, 60];

// همون حداقل سرور برای عنوان آزمون (createExamSchema)
const MIN_TITLE_LENGTH = 2;

type ExamInput = Omit<Exam, 'id'>;

type UseExamFormModalParams = {
  exams: Exam[];
  addItem: (input: ExamInput) => Promise<unknown>;
  updateItem: (id: string, input: ExamInput) => Promise<unknown>;
};

// input[type=datetime-local] تو خیلی مرورگرها (بخصوص فایرفاکس‌های قدیمی‌تر و
// بعضی نسخه‌های سافاری) اصلاً پشتیبانی نمی‌شه یا تقویمش قابل‌کلیک نیست -
// این‌جا برای همین به دو تا input جدا (date + time) تقسیمش کردیم که پشتیبانی‌ش
// خیلی گسترده‌تره. این دو تابع بینِ اون دو مقدارِ محلی و ISO (که examApi.ts و
// بقیه‌ی اپ باهاش کار می‌کنن) تبدیل می‌کنن
function isoToLocalDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function localDateAndTimeToIso(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

function useExamFormModal({
  exams,
  addItem,
  updateItem,
}: UseExamFormModalParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [scheduledDate, setScheduledDate] = useState(''); // 'YYYY-MM-DD'
  const [scheduledTime, setScheduledTime] = useState(''); // 'HH:mm'
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [allowReview, setAllowReview] = useState(true);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setTitle('');
    setCategory('');
    setScheduledDate('');
    setScheduledTime('');
    setDurationMinutes(30);
    setAllowReview(true);
    setGroupIds([]);
    setIsOpen(true);
  }

  function openEdit(exam: Exam) {
    setEditingId(exam.id);
    setTitle(exam.title);
    setCategory(exam.category);
    const { date, time } = isoToLocalDateAndTime(exam.date);
    setScheduledDate(date);
    setScheduledTime(time);
    setDurationMinutes(exam.durationMinutes);
    setAllowReview(exam.allowReview);
    setGroupIds(exam.groupIds);
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function toggleGroup(id: string) {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (
      !title.trim() ||
      !category.trim() ||
      !Number.isFinite(durationMinutes) ||
      durationMinutes <= 0
    ) {
      setValidationError(
        'لطفاً عنوان، دسته‌بندی و مدت زمان معتبر آزمون را پر کنید'
      );
      return;
    }

    if (title.trim().length < MIN_TITLE_LENGTH) {
      setValidationError(
        `عنوان آزمون باید حداقل ${MIN_TITLE_LENGTH} کاراکتر باشه`
      );
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setValidationError('لطفاً تاریخ و ساعت برگزاری آزمون را انتخاب کنید');
      return;
    }

    if (groupIds.length === 0) {
      setValidationError(
        'حداقل یک گروه رو انتخاب کن، وگرنه این آزمون برای هیچ‌کس قابل دیدن نیست'
      );
      return;
    }

    const existingExam = editingId
      ? exams.find((exam) => exam.id === editingId)
      : undefined;

    const scheduledIso = localDateAndTimeToIso(scheduledDate, scheduledTime);

    // زمان گذشته فقط موقع ساخت، یا وقتی زمانِ آزمونِ موجود تغییر کرده رد
    // می‌شه؛ ویرایش بقیه‌ی فیلدهای آزمونِ قدیمی (با همون زمان) مجازه.
    // مقایسه تا دقیقه‌ست تا انتخابِ «همین الان» رد نشه
    const currentMinute = Math.floor(Date.now() / 60_000);
    const isScheduledInPast =
      Math.floor(Date.parse(scheduledIso) / 60_000) < currentMinute;
    const isScheduleChanged =
      !existingExam ||
      Math.floor(Date.parse(existingExam.date) / 60_000) !==
        Math.floor(Date.parse(scheduledIso) / 60_000);

    if (isScheduledInPast && isScheduleChanged) {
      setValidationError('زمان برگزاری آزمون نمی‌تونه گذشته باشه');
      return;
    }

    const examData: ExamInput = {
      title: title.trim(),
      category: category.trim() as Exam['category'],
      date: scheduledIso,
      participants: existingExam?.participants ?? 0,
      status: existingExam?.status ?? ('upcoming' as const),
      durationMinutes,
      allowReview,
      groupIds,
    };

    const saved = editingId
      ? await updateItem(editingId, examData)
      : await addItem(examData);

    // useCrud موقع خطا پیام رو تو Toast نشون می‌ده و undefined برمی‌گردونه؛
    // تو اون حالت مودال باز می‌مونه تا اطلاعات واردشده از بین نره
    if (saved) {
      setIsOpen(false);
    }
  }

  return {
    isOpen,
    editingId,
    title,
    setTitle,
    category,
    setCategory,
    scheduledDate,
    setScheduledDate,
    scheduledTime,
    setScheduledTime,
    durationMinutes,
    setDurationMinutes,
    allowReview,
    setAllowReview,
    groupIds,
    toggleGroup,
    validationError,
    dismissValidationError: () => setValidationError(null),
    openAdd,
    openEdit,
    close,
    handleSubmit,
  };
}

export default useExamFormModal;
