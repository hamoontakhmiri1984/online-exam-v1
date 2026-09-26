import Button from '../../Button/Button';
import PasswordField from '../../PasswordField/PasswordField';

type Props = {
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (value: string) => void;
  loading: boolean;
  onSubmit: (event: React.FormEvent) => void;
};

function NewPasswordStep({
  newPassword,
  onNewPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  loading,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <PasswordField
        label="رمز عبور جدید"
        id="forgot-new-password"
        name="new-password"
        autoComplete="new-password"
        autoFocus
        placeholder="حداقل ۶ کاراکتر، ترکیبی از حرف و عدد"
        value={newPassword}
        onChange={(e) => onNewPasswordChange(e.target.value)}
        showStrength
      />
      <PasswordField
        label="تکرار رمز عبور جدید"
        id="forgot-confirm-password"
        name="new-password"
        autoComplete="new-password"
        placeholder="دوباره وارد کن"
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        error={
          confirmPassword && confirmPassword !== newPassword
            ? 'با رمز عبور بالا یکسان نیست'
            : undefined
        }
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'در حال ثبت...' : 'تغییر رمز عبور'}
      </Button>
    </form>
  );
}

export default NewPasswordStep;