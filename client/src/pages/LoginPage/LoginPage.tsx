import LoginForm from '../../components/LoginForm/LoginForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
export default function LoginPage() {
  return (
    <AuthLayout
      title="ورود یا ثبت‌نام"
      subtitle="به سامانه آزمون آنلاین خوش آمدید"
      footer={null}
    >
      <LoginForm />
    </AuthLayout>
  );
}
