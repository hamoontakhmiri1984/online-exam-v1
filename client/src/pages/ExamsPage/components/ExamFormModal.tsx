import { useEffect, useState } from 'react';
import { Clock, Save } from 'lucide-react';
import Modal from '../../../components/Modal/Modal';
import { DURATION_PRESETS } from '../../../hooks/useExamFormModal';
import CategorySelect from '../../../components/CategorySelect/CategorySelect';
import PersianDatePicker from '../../../components/PersianDatePicker/PersianDatePicker';
import TimePicker from '../../../components/TimePicker/TimePicker';
import type { Group } from '../../../api/groupApi';

type ExamFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting?: boolean;
  title: string;
  onTitleChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  scheduledDate: string;
  onScheduledDateChange: (value: string) => void;
  scheduledTime: string;
  onScheduledTimeChange: (value: string) => void;
  durationMinutes: number;
  onDurationChange: (value: number) => void;
  allowReview: boolean;
  onAllowReviewChange: () => void;
  availableGroups: Group[];
  groupIds: string[];
  validationError?: string | null;
  saveError?: string | null;
  onToggleGroup: (id: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
};

function ExamFormModal({
  isOpen,
  isEditing,
  isSubmitting = false,
  title,
  onTitleChange,
  category,
  onCategoryChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  durationMinutes,
  onDurationChange,
  allowReview,
  onAllowReviewChange,
  availableGroups,
  groupIds,
  validationError,
  saveError,
  onToggleGroup,
  onSubmit,
  onClose,
}: ExamFormModalProps) {
  const [attempted, setAttempted] = useState(false);
  useEffect(() => { if (!isOpen) setAttempted(false); }, [isOpen]);
  const showErrors = attempted || Boolean(validationError);
  const titleError = showErrors && title.trim().length < 2;
  const categoryError = showErrors && !category.trim();
  const dateError = showErrors && !scheduledDate;
  const timeError = showErrors && !scheduledTime;
  const durationError = showErrors && (!Number.isFinite(durationMinutes) || durationMinutes <= 0);
  const groupsError = showErrors && groupIds.length === 0;
  return (
    <Modal isOpen={isOpen} onClose={onClose} wide label={isEditing ? 'ویرایش آزمون' : 'آزمون جدید'}>
      <h2 className="mb-3 text-lg font-bold dark:text-white">
        {isEditing ? 'ویرایش آزمون' : 'آزمون جدید'}
      </h2>
      <form onSubmit={(event) => { setAttempted(true); onSubmit(event); }} className="flex flex-col gap-3" noValidate>
        {validationError && <p role="alert" className="form-inline-error">{validationError}</p>}
        {saveError && <p role="alert" className="form-inline-error">{saveError}</p>}
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            عنوان آزمون
          </label>
          <input
            value={title}
            aria-invalid={titleError}
            onChange={(e) => onTitleChange(e.target.value)}
            className={`border bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white min-h-10 w-full rounded-xl px-3 py-2 text-sm outline-none focus:border-brand-400 transition ${titleError ? "border-rose-500 ring-2 ring-rose-500/15" : "border-gray-200 dark:border-gray-600"}`}
            placeholder="مثلاً: مبانی جاوااسکریپت"
          />
          {titleError && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-300">{title.trim() ? 'عنوان آزمون باید حداقل ۲ حرف باشد.' : 'عنوان آزمون الزامی است.'}</p>}
        </div>

        <div className={`min-w-0 ${categoryError ? "[&_select]:!border-rose-500" : ""}`}><CategorySelect
          label="دسته‌بندی"
          value={category}
          onChange={onCategoryChange}
        />{categoryError && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">دسته‌بندی آزمون را انتخاب کنید.</p>}</div>

        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            تاریخ و ساعت برگزاری
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:items-start">
            <div className={`min-w-0 [&>div>div>button:first-child]:min-h-11 ${dateError ? "[&_button:first-of-type]:!border-rose-500" : ""}`}>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">تاریخ</label>
              <PersianDatePicker
                value={scheduledDate}
                onChange={onScheduledDateChange}
              />
              {dateError && <p role="alert" className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-300">تاریخ برگزاری الزامی است.</p>}
            </div>
            <div className="min-w-0">
              <label htmlFor="exam-start-time" className="mb-1 block text-xs text-gray-500 dark:text-gray-400">ساعت برگزاری (انتخاب ۱۲ یا ۲۴ ساعته)</label>
              <TimePicker value={scheduledTime} onChange={onScheduledTimeChange} invalid={timeError} />
              {timeError && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-300">ساعت برگزاری الزامی است.</p>}
              <p className="mt-1 text-[11px] font-medium text-brand-ink">{scheduledTime ? `زمان انتخابی: ${scheduledTime}` : "مثلاً ۱۴:۳۰"}</p>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            مدت زمان آزمون (دقیقه)
          </label>
          <div className="relative">
            <Clock
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="number"
              min={1}
              aria-invalid={durationError}
              value={durationMinutes}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className="min-h-10 w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl pr-10 pl-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
              placeholder="مثلاً: ۳۰"
            />
          </div>
          {durationError && <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-300">مدت آزمون باید بیشتر از صفر باشد.</p>}
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onDurationChange(preset)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
                  durationMinutes === preset
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                {preset.toLocaleString('fa-IR')} دقیقه
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800/60">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              اجازه‌ی مرور قبل از ثبت نهایی
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              دانشجو بتونه به سوالات قبلی برگرده و قبل از اتمام، پاسخ‌ها رو مرور
              کنه
            </p>
          </div>
          <button
            type="button"
            onClick={onAllowReviewChange}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              allowReview ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                allowReview ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            گروه‌های مجاز به دیدن این آزمون
          </label>
          {groupsError && <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">حداقل یک گروه را انتخاب کنید.</p>}
          {availableGroups.length === 0 ? (
            <p className="text-xs text-gray-400">
              هنوز هیچ گروهی نساختی — اول از صفحه‌ی گروه‌ها یکی بساز.
            </p>
          ) : (
            <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {availableGroups.map((g) => (
                <label
                  key={g.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${groupIds.includes(g.id) ? "border-violet-400 bg-violet-50/70 dark:bg-violet-500/10" : "border-gray-200 hover:border-violet-300 dark:border-gray-700"}`}
                >
                  <input
                    type="checkbox"
                    checked={groupIds.includes(g.id)}
                    onChange={() => onToggleGroup(g.id)}
                    className="h-4 w-4 shrink-0 rounded border-violet-300 accent-violet-600 focus:ring-violet-500"
                  />
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="ui-primary-gradient flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold text-white transition"
        >
          <Save size={17}/>{isSubmitting ? 'در حال ذخیره…' : isEditing ? 'ذخیره تغییرات' : 'افزودن آزمون'}
        </button>
      </form>
    </Modal>
  );
}

export default ExamFormModal;
