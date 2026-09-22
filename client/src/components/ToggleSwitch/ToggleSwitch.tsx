type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  /** نام دسترس‌پذیر (screen reader) - چون خودِ دکمه متنی نداره */
  label: string;
};

function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? 'right-0.5' : 'right-5'
        }`}
      />
    </button>
  );
}

export default ToggleSwitch;
