import LoginForm from '../../components/LoginForm/LoginForm';
import AuthLayout from '../../components/AuthLayout/AuthLayout';
export default function LoginPage() {
  return (
    <AuthLayout
      title="ورود یا ثبت‌نام"
      subtitle="با شماره موبایل یا ایمیل، امن و سریع وارد شوید"
      footer={null}
    >
      <LoginForm />
    </AuthLayout>
  );
}
