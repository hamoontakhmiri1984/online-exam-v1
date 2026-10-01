type SessionUnavailableProps = { onRetry: () => void };

function SessionUnavailable({ onRetry }: SessionUnavailableProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" dir="rtl" role="alert">
      <p>سرویس موقتاً در دسترس نیست. نشست شما حفظ شده؛ چند لحظه بعد دوباره تلاش کنید.</p>
      <button type="button" onClick={onRetry} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
        تلاش مجدد
      </button>
    </div>
  );
}

export default SessionUnavailable;