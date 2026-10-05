import { useNavigate } from 'react-router-dom';
import LoginForm from '../../components/LoginForm/LoginForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';

function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="ورود به حساب"
      subtitle="به سامانه آزمون آنلاین خوش آمدید"
      footer={
        <>
          حساب ندارید؟{' '}
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            ساخت حساب
          </button>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}

export default LoginPage;