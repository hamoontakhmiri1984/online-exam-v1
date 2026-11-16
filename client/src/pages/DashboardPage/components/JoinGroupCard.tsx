import { useId, useState, type ChangeEvent } from 'react';
import { LogIn, UsersRound, X } from 'lucide-react';
import type useGroupMembership from '../../../hooks/useGroupMembership';
import {
  isJoinCodeComplete,
  JOIN_CODE_MAX_LENGTH,
  normalizeJoinCode,
} from '../joinCode';

type Membership = ReturnType<typeof useGroupMembership>;

const cardBase =
  'mb-7 border border-violet-200/50 bg-white/80 shadow-sm dark:border-violet-400/20 dark:bg-slate-800/70';
const iconBox =
  'grid shrink-0 place-items-center rounded-2xl bg-violet-100 text-brand-ink dark:bg-violet-500/20';

function CodeForm({
  membership,
  autoFocus = false,
}: {
  membership: Membership;
  autoFocus?: boolean;
}) {
  const { joinCode, setJoinCode, joining, joinError, setJoinError, handleJoinGroup } =
    membership;
  const inputId = useId();
  const errorId = `${inputId}-error`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setJoinCode(normalizeJoinCode(event.target.value));
    setJoinError(null);
  }

  return (
    <form onSubmit={handleJoinGroup} noValidate>
      <label htmlFor={inputId} className="sr-only">
        کد عضویت گروه
      </label>
      <div className="relative">
        <input
          id={inputId}
          dir="ltr"
          value={joinCode}
          onChange={handleChange}
          placeholder="کد عضویت گروه"
          maxLength={JOIN_CODE_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          autoFocus={autoFocus}
          spellCheck={false}
          enterKeyHint="go"
          aria-invalid={joinError ? true : undefined}
          aria-describedby={joinError ? errorId : undefined}
          className="h-12 w-full rounded-xl border border-violet-200 bg-white pl-40 pr-4 text-right text-sm font-semibold tracking-wider outline-none placeholder:font-normal placeholder:tracking-normal dark:border-violet-400/25 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={joining || !isJoinCodeComplete(joinCode)}
          className="ui-primary-gradient absolute bottom-1.5 left-1.5 top-1.5 inline-flex items-center gap-2 rounded-lg px-4 text-sm font-bold disabled:cursor-not-allowed"
        >
          <LogIn size={16} aria-hidden="true" />
          {joining ? 'در حال بررسی…' : 'پیوستن'}
        </button>
      </div>
      {joinError && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-300">
          {joinError}
        </p>
      )}
    </form>
  );
}

function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="status" className="mt-3 text-sm text-emerald-600 dark:text-emerald-300">
      {message}
    </p>
  );
}

// A student without a group sees the full card; once they belong to a group it
// collapses into a slim bar so the dashboard stays focused on exams.
function JoinGroupCard({ membership }: { membership: Membership }) {
  const { myGroups, groupsLoading, joinSuccess, setJoinSuccess, setJoinError } = membership;
  const [expanded, setExpanded] = useState(false);

  const initialLoading =
    groupsLoading && myGroups.length === 0 && !joinSuccess && !membership.joinError;
  if (initialLoading) return null;

  if (myGroups.length === 0) {
    return (
      <section className={`${cardBase} w-full max-w-xl rounded-3xl p-5 sm:p-6`}>
        <div className="mb-4 flex items-center gap-3">
          <span className={`${iconBox} h-11 w-11`}>
            <UsersRound size={21} aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white">پیوستن به گروه کلاس</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              کدی که مدرس داده رو وارد کن تا آزمون‌های گروهت رو ببینی.
            </p>
          </div>
        </div>
        <CodeForm membership={membership} />
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          حروف بزرگ و کوچک فرقی نداره.
        </p>
        <SuccessMessage message={joinSuccess} />
      </section>
    );
  }

  // After a successful join the form closes by itself and the message shows.
  const open = expanded && !joinSuccess;

  function openForm() {
    setJoinSuccess(null);
    setExpanded(true);
  }

  function closeForm() {
    setJoinError(null);
    setExpanded(false);
  }

  return (
    <section className={`${cardBase} rounded-2xl px-4 py-3 sm:px-5`}>
      {open ? (
        <div className="max-w-xl">
          <div className="mb-3 flex items-center gap-3">
            <span className={`${iconBox} h-10 w-10`}>
              <UsersRound size={19} aria-hidden="true" />
            </span>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              پیوستن به یک گروه دیگه
            </h2>
            <button
              type="button"
              onClick={closeForm}
              aria-label="بستن"
              className="ms-auto grid h-11 w-11 place-items-center rounded-xl text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <CodeForm membership={membership} autoFocus />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className={`${iconBox} h-10 w-10`}>
            <UsersRound size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              کد گروه دیگه‌ای داری؟
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              با کد عضویت جدید، آزمون‌های اون گروه هم برات باز می‌شه.
            </p>
          </div>
          <button
            type="button"
            onClick={openForm}
            aria-expanded={false}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300 px-4 text-sm font-semibold text-brand-ink hover:bg-violet-50 dark:border-violet-400/30 dark:hover:bg-violet-500/10"
          >
            <LogIn size={16} aria-hidden="true" />
            وارد کردن کد
          </button>
        </div>
      )}
      <SuccessMessage message={joinSuccess} />
    </section>
  );
}

export default JoinGroupCard;
