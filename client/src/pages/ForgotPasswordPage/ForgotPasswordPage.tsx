import { useNavigate } from 'react-router-dom';
import ForgotPasswordForm from '../../components/ForgotPasswordForm/ForgotPasswordForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';

function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="بازیابی رمز عبور"
      subtitle="شناسه‌ت رو وارد کن تا کد تایید برات بفرستیم"
      footer={
        <>
          رمزت یادت اومد؟{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            وارد شو
          </button>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
