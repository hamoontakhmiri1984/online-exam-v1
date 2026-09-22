import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm/LoginForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="سامانه آزمون آنلاین"
      subtitle="برای ادامه وارد حساب خود شوید"
      footer={
        <>
          حساب نداری؟{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            ثبت‌نام رایگان
          </button>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}

export default LoginPage;