// آیکون‌های شبکه‌های اجتماعی به‌صورت SVG دستی - نه از lucide-react، چون
// آیکون‌های برند (اینستاگرام/تلگرام/...) تو نسخه‌های جدیدتر lucide حذف
// شدن. سبک خط (stroke, viewBox ۲۴×۲۴، گوشه‌های گرد) عمداً هم‌شکل با بقیه‌ی
// آیکون‌های سایت (لوسید) طراحی شده تا با بقیه‌ی UI هماهنگ بمونه.

type IconProps = {
  size?: number;
  className?: string;
};

export function InstagramIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TelegramIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

export function LinkedinIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="7" y1="10" x2="7" y2="17" />
      <circle cx="7" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <line x1="11.5" y1="17" x2="11.5" y2="11" />
      <path d="M11.5 13.5a2.5 2.5 0 0 1 5 0V17" />
    </svg>
  );
}

export function TwitterXIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.5 4.5 19.5 19.5" />
      <path d="M19.5 4.5 4.5 19.5" />
    </svg>
  );
}

export function YoutubeIcon({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M10 9.5v5l4.5-2.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
