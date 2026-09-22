type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
}

const SIZE_MAP: Record<LogoSize, { box: string; icon: number; text: string }> =
  {
    sm: { box: 'h-8 w-8', icon: 16, text: 'text-sm' },
    md: { box: 'h-9 w-9', icon: 18, text: 'text-base' },
    lg: { box: 'h-14 w-14', icon: 28, text: 'text-xl' },
  };

function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const s = SIZE_MAP[size];

  return (
    <div className={`group flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex ${s.box} shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
      >
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* برگه‌ی آزمون با گوشه‌ی تاشده */}
          <path
            d="M6.5 4H14L18.5 8.5V20H6.5V4Z"
            stroke="white"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M14 4V8.5H18.5"
            stroke="white"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* علامت تیک قبولی */}
          <path
            d="M9 13.4L11.1 15.5L15.5 10.7"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <span className={`${s.text} font-bold text-gray-900 dark:text-white`}>
          سامانه آزمون
        </span>
      )}
    </div>
  );
}

export default Logo;
