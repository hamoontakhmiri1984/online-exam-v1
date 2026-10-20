import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { User, Check, Loader2 } from 'lucide-react';
import {
  removeAvatar,
  updateCurrentUserName,
  uploadAvatar,
  type User as UserType,
} from '../../../api/authApi';
import { useAuth } from '../../../context/AuthContext';
import Avatar from '../../../components/Avatar/Avatar';

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

function ProfileSection({ currentUser }: { currentUser: UserType | null }) {
  const { user } = useAuth();
  const initialName = currentUser?.name ?? '';
  const [name, setName] = useState<string>(initialName);
  // Compare against the last saved name, not the parent prop that may still be stale.
  const [savedName, setSavedName] = useState<string>(initialName);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

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

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError('فقط تصویر JPEG، PNG یا WEBP مجاز است');
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError('حجم تصویر نباید بیشتر از ۵ مگابایت باشد');
      return;
    }

    setAvatarError('');
    setAvatarBusy(true);
    try {
      const result = await uploadAvatar(file);
      if (result.status === 'error') setAvatarError(result.message);
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleAvatarRemove() {
    setAvatarError('');
    setAvatarBusy(true);
    try {
      const result = await removeAvatar();
      if (result.status === 'error') setAvatarError(result.message);
    } finally {
      setAvatarBusy(false);
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={savedName || user?.username}
            src={user?.avatarUrl}
            size={64}
          />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept={AVATAR_TYPES.join(',')}
                onChange={handleAvatarChange}
                className="hidden"
                aria-label="انتخاب تصویر پروفایل"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {avatarBusy && <Loader2 size={13} className="animate-spin" />}
                {user?.avatarUrl ? 'تغییر تصویر' : 'انتخاب تصویر'}
              </button>
              {user?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleAvatarRemove}
                  disabled={avatarBusy}
                  className="cursor-pointer text-xs font-medium text-danger-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-danger-400"
                >
                  حذف تصویر
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              JPEG، PNG یا WEBP تا ۵ مگابایت
            </span>
            {avatarError && (
              <span role="alert" className="text-xs font-medium text-danger-600 dark:text-danger-400">
                {avatarError}
              </span>
            )}
          </div>
        </div>

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
            placeholder="نام و نام خانوادگی"
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
