import { useEffect, useState } from 'react';
import { User, Check } from 'lucide-react';
import {
  updateCurrentUserName,
  type User as UserType,
} from '../../../api/authApi';

function ProfileSection({ currentUser }: { currentUser: UserType | null }) {
  const initialName = currentUser?.name ?? currentUser?.username ?? '';
  const [name, setName] = useState<string>(initialName);
  // آخرین نامِ ذخیره‌شده تو سرور - نه prop ـِ currentUser که بعد از ذخیره
  // تا رندر بعدیِ والد قدیمی می‌مونه؛ وگرنه برگردوندنِ نام به مقدار
  // اولیه «بدون تغییر» حساب می‌شد و هیچ‌وقت ذخیره نمی‌شد
  const [savedName, setSavedName] = useState<string>(initialName);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  async function handleNameBlur() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === savedName) {
      setName(savedName);
      return;
    }
    setError('');
    const result = await updateCurrentUserName(trimmed);
    if (result.status === 'success') {
      setSavedName(trimmed);
      setName(trimmed);
      setJustSaved(true);
    } else {
      setError(result.message);
      setName(savedName);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
          <User size={18} />
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-white">پروفایل</h2>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="profile-name"
            className="text-sm text-gray-600 dark:text-gray-300"
          >
            نام
          </label>
          <input
            id="profile-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            className="mt-1 w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-50 dark:focus:ring-brand-900 transition"
          />
          {justSaved && (
            <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-success-600 dark:text-success-500">
              <Check size={13} />
              ذخیره شد
            </span>
          )}
          {error && (
            <span className="mt-1.5 block text-xs font-medium text-danger-600 dark:text-danger-400">
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSection;
