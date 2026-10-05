import { useNavigate } from 'react-router-dom';
import SignupForm from '../../components/SignupForm/SignupForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';

function SignupPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="ساخت حساب رایگان"
      subtitle="در کمتر از ۲ دقیقه شروع کنید، بدون نیاز به کارت بانکی"
      footer={
        <>
          قبلاً حساب ساخته‌اید؟{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            ورود به حساب
          </button>
        </>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}

export default SignupPage;