import { Check, Save } from 'lucide-react';
import { userDisplayName } from '../../../lib/userDisplayName';
import Modal from '../../../components/Modal/Modal';
import type { Category } from '../../../constants/categories';
import type { Student } from '../../../api/studentApi';
import CategorySelect from '../../../components/CategorySelect/CategorySelect';
import {
  GROUP_CARD_COLOR_OPTIONS,
  GROUP_CARD_DEFAULT_COLOR,
  type GroupCardColor,
} from '../../../constants/groupCardColors';

type GroupFormModalProps = {
  isOpen: boolean;
  isEditing: boolean;
  name: string;
  onNameChange: (value: string) => void;
  category: Category | '';
  onCategoryChange: (value: Category) => void;
  cardColor: GroupCardColor;
  onCardColorChange: (value: GroupCardColor) => void;
  students: Student[];
  studentIds: string[];
  onToggleStudent: (studentId: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  validationError?: string | null;
  onClose: () => void;
};

function GroupFormModal({
  isOpen,
  isEditing,
  name,
  onNameChange,
  category,
  onCategoryChange,
  cardColor,
  onCardColorChange,
  students,
  studentIds,
  onToggleStudent,
  onSubmit,
  validationError,
  onClose,
}: GroupFormModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-lg font-bold mb-4 dark:text-white">
        {isEditing ? 'ویرایش گروه' : 'گروه جدید'}
      </h2>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {validationError && <p role="alert" className="form-inline-error">{validationError}</p>}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            نام گروه
          </label>
          <input
            value={name}
            required
            minLength={2}
            aria-invalid={!!validationError && name.trim().length < 2}
            onChange={(e) => onNameChange(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
            placeholder="مثلاً: کلاس ریاضی - ترم پاییز"
          />
        </div>

        <div className={validationError && !category ? "form-invalid-field" : ""}><CategorySelect
          label="دسته‌بندی موضوعی"
          value={category}
          onChange={(value) => onCategoryChange(value as Category)}
        /></div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-200">
            رنگ کارت <span className="font-normal text-gray-400">(اختیاری)</span>
          </legend>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
            اگر رنگی انتخاب نکنی، رنگ بنفش فعلی حفظ می‌شود.
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            <button
              type="button"
              aria-label="رنگ پیش‌فرض فعلی"
              aria-pressed={cardColor === GROUP_CARD_DEFAULT_COLOR}
              onClick={() => onCardColorChange(GROUP_CARD_DEFAULT_COLOR)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-gray-200 p-2 text-xs text-gray-600 transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <span className="grid size-7 place-items-center rounded-full border border-violet-300 bg-[linear-gradient(135deg,#d8c6fa,#f0e9ff)]">
                {cardColor === GROUP_CARD_DEFAULT_COLOR && <Check size={15} className="text-violet-800" />}
              </span>
              <span className="text-center leading-4">پیش‌فرض</span>
            </button>
            {GROUP_CARD_COLOR_OPTIONS.map((option) => {
              const isSelected = cardColor === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={isSelected}
                  onClick={() => onCardColorChange(option.value)}
                  className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 ${isSelected ? 'border-violet-500 bg-violet-50 dark:border-violet-300 dark:bg-violet-950/30' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}
                >
                  <span
                    className="grid size-7 place-items-center rounded-full border border-black/10"
                    style={{ backgroundColor: option.swatch }}
                  >
                    {isSelected && <Check size={15} className="text-slate-700" />}
                  </span>
                  <span className="w-full text-center leading-4 text-gray-600 dark:text-gray-300">{option.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">
            اعضای گروه ({studentIds.length.toLocaleString('fa-IR')} نفر
            انتخاب‌شده)
          </label>
          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {students.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">
                هنوز دانشجویی ثبت نشده
              </p>
            ) : (
              students.map((student) => (
                <label
                  key={student.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-sm last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
                >
                  <input
                    type="checkbox"
                    checked={studentIds.includes(student.id)}
                    onChange={() => onToggleStudent(student.id)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-ink focus:ring-brand-400 dark:border-gray-600"
                  />
                  <span className="text-gray-700 dark:text-gray-200">
                    {userDisplayName(student)}
                  </span>
                  <span className="mr-auto text-xs text-gray-400">
                    {student.username}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <button
          type="submit"
          className="ui-primary-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white transition"
        >
          <Save size={17} /> {isEditing ? 'ذخیره تغییرات' : 'ساخت گروه'}
        </button>
      </form>
    </Modal>
  );
}

export default GroupFormModal;
