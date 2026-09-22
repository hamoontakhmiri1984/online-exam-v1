import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  PartyPopper,
} from 'lucide-react';

import AuthLayout from '../../components/AuthLayout/AuthLayout';
import StepIndicator from '../../components/StepIndicator/StepIndicator';
import TextBox from '../../components/TextBox/TextBox';
import Button from '../../components/Button/Button';

import {
  getCurrentUser,
  completeOnboarding,
} from '../../api/authApi';

import { joinGroupByCode } from '../../api/groupApi';
import { ApiError } from '../../lib/apiClient';

type Step = 'profile' | 'complete';

const STEP_LABELS = [
  'تکمیل پروفایل',
  'آماده‌سازی',
];

function OnboardingPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [step, setStep] =
    useState<Step>('profile');

  const [
    organizationName,
    setOrganizationName,
  ] = useState('');

  const [joinCode, setJoinCode] =
    useState('');

  const [error, setError] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [
    joinedGroupName,
    setJoinedGroupName,
  ] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login', {
        replace: true,
      });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const isInstructor =
    user.role === 'Instructor';

  const isStudent =
    user.role === 'Student';

  async function handleProfileSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      if (
        isStudent &&
        joinCode.trim()
      ) {
        try {
          const group =
            await joinGroupByCode(
              joinCode.trim(),
            );

          setJoinedGroupName(
            group.name,
          );
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : 'کد کلاس نامعتبره یا مشکلی پیش اومد',
          );

          return;
        }
      }

      const result =
        await completeOnboarding(
          isInstructor &&
            organizationName.trim()
            ? organizationName.trim()
            : undefined,
        );

      if (
        result.status ===
        'success'
      ) {
        setStep('complete');
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setError('');
    setLoading(true);

    try {
      const result =
        await completeOnboarding();

      if (
        result.status ===
        'success'
      ) {
        setStep('complete');
        return;
      }

      setError(result.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'complete') {
    const subtitle =
      isInstructor
        ? 'حساب مدرس شما آماده است.'
        : isStudent &&
            joinedGroupName
          ? `به کلاس «${joinedGroupName}» پیوستید.`
          : 'حساب شما آماده است.';

    return (
      <AuthLayout
        title="همه چیز آماده است 🎉"
        subtitle={subtitle}
        footer={null}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
            <PartyPopper size={28} />
          </div>

          <div className="w-full">
            <Button
              type="button"
              onClick={() =>
                navigate('/dashboard')
              }
            >
              ورود به داشبورد
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  const title = isInstructor
    ? 'پروفایل مدرس شما'
    : isStudent
      ? 'تقریباً آماده‌اید 🎉'
      : 'تکمیل حساب';

  const subtitle = isInstructor
    ? 'در صورت تمایل نام آموزشگاه یا مجموعه را وارد کنید.'
    : isStudent
      ? 'می‌توانید به اولین کلاس خود بپیوندید.'
      : 'حساب شما آماده‌ی استفاده است.';

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      footer={null}
    >
      <form
        onSubmit={handleProfileSubmit}
        className="flex flex-col gap-5"
      >
        <StepIndicator
          steps={STEP_LABELS}
          currentIndex={0}
        />

        {error && (
          <p className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-400">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>
          </p>
        )}

        {isInstructor && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">
              نام آموزشگاه / مجموعه
            </label>

            <TextBox
              type="text"
              placeholder="اختیاری"
              value={
                organizationName
              }
              onChange={(event) =>
                setOrganizationName(
                  event.target.value,
                )
              }
            />
          </div>
        )}

        {isStudent && (
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">
              کد کلاس
            </label>

            <TextBox
              type="text"
              placeholder="مثال: ABC123"
              value={joinCode}
              onChange={(event) =>
                setJoinCode(
                  event.target.value,
                )
              }
            />
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2
                size={15}
                className="animate-spin"
              />

              در حال ثبت...
            </span>
          ) : isStudent ? (
            joinCode.trim()
              ? 'پیوستن به کلاس'
              : 'ادامه'
          ) : (
            'تکمیل و ورود به داشبورد'
          )}
        </Button>

        {(isInstructor ||
          isStudent) && (
          <button
            type="button"
            onClick={() =>
              void handleSkip()
            }
            disabled={loading}
            className="mx-auto cursor-pointer text-xs text-gray-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-gray-300 dark:text-gray-400 dark:hover:text-brand-400"
          >
            {isInstructor
              ? 'بعداً تکمیل می‌کنم'
              : 'فعلاً رد می‌کنم'}
          </button>
        )}
      </form>
    </AuthLayout>
  );
}

export default OnboardingPage;