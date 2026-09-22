import Toast from '../../../components/Toast/Toast';

interface ExamWarningsProps {
  activeWarning: '5min' | '1min' | null;
  onDismiss: () => void;
}

function ExamWarnings({ activeWarning, onDismiss }: ExamWarningsProps) {
  if (!activeWarning) return null;

  if (activeWarning === '5min') {
    return (
      <Toast
        key="5min"
        tone="warning"
        message="کمتر از ۵ دقیقه به پایان آزمون باقی مانده"
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <Toast
      key="1min"
      tone="danger"
      message="۱ دقیقه دیگر آزمون به‌صورت خودکار پایان می‌یابد!"
      onDismiss={onDismiss}
    />
  );
}

export default ExamWarnings;