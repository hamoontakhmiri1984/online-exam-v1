import { useState } from 'react';
import { X } from 'lucide-react';
import useCategories from '../../hooks/useCategories';

type CategorySelectProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

const inputClassName =
  'border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition';

// جایگزینِ دراپ‌داونِ ثابتِ CATEGORIES قبلی. دسته‌بندی‌ها رو دینامیک از
// سرور می‌گیره (GET /categories) و یه گزینه‌ی «افزودنِ دسته‌بندی جدید» هم
// داره که inline یه اینپوت باز می‌کنه - دسته‌ی تازه‌پیشنهادی بلافاصله بعدِ
// ثبت انتخاب می‌شه، حتی قبل از تاییدِ SuperAdmin (چون فقط خودِ همین مدرس
// می‌بینتش، طبقِ منطقِ سرور)
function CategorySelect({ value, onChange, label }: CategorySelectProps) {
  const { categories, loading, isProposing, addCategory, error, clearError } =
    useCategories();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  // نکته: این کامپوننت داخل <form> فرم‌های ساخت بانک/گروه/آزمون رندر می‌شه؛
  // <form> تو <form> تو HTML مجاز نیست (دکمه‌ی «افزودن» فرم بیرونی رو submit
  // می‌کرد و صفحه رفرش می‌شد). برای همین اینجا form نداریم: دکمه type="button"
  // ـه و Enter هم دستی مدیریت می‌شه
  async function handleAdd() {
    if (isProposing || !newName.trim()) return;
    const created = await addCategory(newName);
    if (created) {
      onChange(created.name);
      setNewName('');
      setIsAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm text-gray-600 dark:text-gray-300">
          {label}
        </label>
      )}

      {error && (
        <p className="text-xs text-danger-600 flex items-center justify-between">
          {error}
          <button
            type="button"
            onClick={clearError}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={12} />
          </button>
        </p>
      )}

      {isAdding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder="مثلاً: زبان آلمانی"
            className={`${inputClassName} min-w-0 flex-1`}
          />
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isProposing || !newName.trim()}
            className="shrink-0 whitespace-nowrap rounded-xl bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            افزودن
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setNewName('');
            }}
            className="shrink-0 whitespace-nowrap rounded-xl border border-gray-200 dark:border-gray-600 px-3 text-sm text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            انصراف
          </button>
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === '__add__') {
              setIsAdding(true);
              return;
            }
            onChange(e.target.value);
          }}
          className={inputClassName}
        >
          <option value="">
            {loading ? 'در حال بارگذاری...' : 'انتخاب کنید'}
          </option>
          {value && !categories.some((c) => c.name === value) && (
            <option value={value}>{value}</option>
          )}
          {categories.map((category) => (
            <option key={category.id} value={category.name}>
              {category.name}
            </option>
          ))}
          <option value="__add__">+ افزودنِ دسته‌بندیِ جدید</option>
        </select>
      )}
    </div>
  );
}

export default CategorySelect;