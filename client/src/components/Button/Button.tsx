type ButtonProps = {
  children: React.ReactNode;
  type: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
};

function Button({ children, type, disabled, onClick }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full bg-brand-600 text-white font-medium px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 dark:shadow-none hover:bg-brand-700 hover:shadow-lg active:scale-[0.98] transition disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-brand-600 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

export default Button;
