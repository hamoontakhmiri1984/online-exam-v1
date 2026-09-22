import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, ChevronLeft } from 'lucide-react';
import jalaali from 'jalaali-js';

type PersianDatePickerProps = {
  // مقدارِ ورودی/خروجی همیشه میلادیِ 'YYYY-MM-DD' ـه (همون چیزی که بقیه‌ی
  // اپ - useExamFormModal، examApi و سرور - باهاش کار می‌کنن)؛ فقط نمایشش
  // شمسیه. این‌جوری هیچ فایل دیگه‌ای (سرور، دیتابیس) لازم نیست عوض بشه.
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

const MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// هفته‌ی شمسی از شنبه شروع می‌شه
const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toPersianDigits(input: string): string {
  const digits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return input.replace(/[0-9]/g, (d) => digits[Number(d)]);
}

function gregorianStringToJalali(
  value: string
): { jy: number; jm: number; jd: number } | null {
  if (!value) return null;
  const [gy, gm, gd] = value.split('-').map(Number);
  if (!gy || !gm || !gd) return null;
  return jalaali.toJalaali(gy, gm, gd);
}

function jalaliToGregorianString(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

function todayJalali() {
  const now = new Date();
  return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// روزِ هفته‌ی روزِ اولِ یه ماهِ شمسیِ خاص، به شکلِ اندیسِ ستونِ تقویمِ ما
// (۰=شنبه ... ۶=جمعه). new Date().getDay() جاوااسکریپتی ۰=یکشنبه می‌ده،
// برای همین با (jsDay + 1) % 7 می‌چرخونیمش به مبنای «شنبه = ۰»
function firstWeekdayOfJalaliMonth(jy: number, jm: number): number {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, 1);
  const jsDay = new Date(gy, gm - 1, gd).getDay();
  return (jsDay + 1) % 7;
}

const inputClassName =
  'w-full flex items-center justify-between gap-2 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition';

function PersianDatePicker({ value, onChange, label }: PersianDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = gregorianStringToJalali(value);
  const [viewYear, setViewYear] = useState(() => (selected ?? todayJalali()).jy);
  const [viewMonth, setViewMonth] = useState(() => (selected ?? todayJalali()).jm);
  const containerRef = useRef<HTMLDivElement>(null);

  // اگه مقدار از بیرون عوض شد (مثلاً موقع باز کردنِ فرمِ ویرایشِ یه آزمونِ
  // موجود)، ماهِ نمایش‌داده‌شده رو هم باهاش هماهنگ کن
  useEffect(() => {
    const jalaliValue = gregorianStringToJalali(value);
    if (jalaliValue) {
      setViewYear(jalaliValue.jy);
      setViewMonth(jalaliValue.jm);
    }
  }, [value]);

  // بستنِ پیکر با کلیکِ بیرون یا Escape - برخلافِ input[type=date] بومیِ
  // مرورگر (که رفتارِ باز/بسته‌شدنش دستِ خودمون نبود و همینم شکایتِ اصلی
  // بود)، این‌جا کاملاً خودمون کنترلش می‌کنیم
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function goToPrevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day: number) {
    onChange(jalaliToGregorianString(viewYear, viewMonth, day));
    setIsOpen(false);
  }

  function handleToday() {
    const t = todayJalali();
    setViewYear(t.jy);
    setViewMonth(t.jm);
    onChange(jalaliToGregorianString(t.jy, t.jm, t.jd));
    setIsOpen(false);
  }

  const daysInMonth = jalaali.jalaaliMonthLength(viewYear, viewMonth);
  const firstWeekday = firstWeekdayOfJalaliMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const displayText = selected
    ? toPersianDigits(
        `${selected.jy}/${pad2(selected.jm)}/${pad2(selected.jd)}`
      )
    : '';

  return (
    <div className="flex flex-col gap-1" ref={containerRef}>
      {label && (
        <label className="text-sm text-gray-600 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={inputClassName}
        >
          <span className={displayText ? '' : 'text-gray-400'}>
            {displayText || 'انتخاب تاریخ'}
          </span>
          <CalendarDays size={16} className="shrink-0 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPrevMonth}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="ماه قبل"
              >
                <ChevronRight size={18} />
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {MONTH_NAMES[viewMonth - 1]} {toPersianDigits(String(viewYear))}
              </span>
              <button
                type="button"
                onClick={goToNextMonth}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="ماه بعد"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 text-center text-xs text-gray-400">
              {WEEKDAY_LABELS.map((w, i) => (
                <span key={`${w}-${i}`}>{w}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, index) =>
                day === null ? (
                  <span key={`empty-${index}`} />
                ) : (
                  <button
                    type="button"
                    key={day}
                    onClick={() => handleSelectDay(day)}
                    className={`rounded-lg py-1.5 text-sm transition ${
                      selected &&
                      selected.jy === viewYear &&
                      selected.jm === viewMonth &&
                      selected.jd === day
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-700 hover:bg-brand-50 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {toPersianDigits(String(day))}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="mt-2 w-full rounded-lg py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-gray-700"
            >
              امروز
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PersianDatePicker;
