import { useNavigate } from 'react-router-dom';
import SignupForm from '../../components/SignupForm/SignupForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';

function SignupPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="ساخت حساب رایگان"
      subtitle="در کمتر از ۲ دقیقه شروع کن، بدون کارت بانکی"
      footer={
        <>
          قبلاً حساب داری؟{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            وارد شو
          </button>
        </>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}

export default SignupPage;