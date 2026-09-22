import Logo from '../../../components/Logo/Logo';
import {
  InstagramIcon,
  TelegramIcon,
  LinkedinIcon,
  TwitterXIcon,
  YoutubeIcon,
} from '../../../components/SocialIcons/SocialIcons';
import Reveal from '../../../components/motion/Reveal';

type FooterProps = {
  // خروجیِ FooterSectionForm (پنل ادمین -> /site-content)
  data?: Record<string, unknown>;
};

type LinkItem = { label: string; href: string };
type SocialLinkItem = { platform: string; href: string };

const DEFAULT_LINKS: LinkItem[] = [
  { label: 'ویژگی‌ها', href: '#features' },
  { label: 'اخبار', href: '#news' },
  { label: 'درباره ما', href: '#about' },
  { label: 'تعرفه‌ها', href: '#pricing' },
];

const DEFAULT_DESCRIPTION =
  'سامانه‌ی ساده و حرفه‌ای برای برگزاری آزمون‌های آنلاین، از بانک سوال تا اعلام نتیجه.';

const DEFAULT_COPYRIGHT = '© ۱۴۰۵ سامانه آزمون آنلاین. تمامی حقوق محفوظ است.';

// همون اسم‌هایی که FooterSectionForm تو پنل ادمین از بینشون انتخاب می‌کنه
// (client/src/pages/AdminSiteContentPage/components/FooterSectionForm.tsx
// -> SOCIAL_PLATFORMS) باید عیناً همین‌جا هم باشه
const SOCIAL_ICON_BY_PLATFORM: Record<string, typeof InstagramIcon> = {
  Instagram: InstagramIcon,
  Telegram: TelegramIcon,
  LinkedIn: LinkedinIcon,
  TwitterX: TwitterXIcon,
  YouTube: YoutubeIcon,
};

function readString(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key];
  return typeof value === 'string' && value.trim() ? value : '';
}

function readLinks(data: Record<string, unknown> | undefined): LinkItem[] {
  const value = data?.links;
  if (!Array.isArray(value) || value.length === 0) return DEFAULT_LINKS;
  const parsed = value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      label: typeof v.label === 'string' ? v.label : '',
      href: typeof v.href === 'string' ? v.href : '',
    }))
    .filter((l) => l.label && l.href);
  return parsed.length > 0 ? parsed : DEFAULT_LINKS;
}

function readSocialLinks(data: Record<string, unknown> | undefined): SocialLinkItem[] {
  const value = data?.socialLinks;
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map((v) => ({
      platform: typeof v.platform === 'string' ? v.platform : '',
      href: typeof v.href === 'string' ? v.href : '',
    }))
    // فقط پلتفرم‌های شناخته‌شده + لینکِ واقعی (نه خالی) - لینکِ مرده‌ای که
    // تو تب جدید باز بشه بدتر از نبودنِ آیکونه
    .filter((s) => s.href && s.platform in SOCIAL_ICON_BY_PLATFORM);
}

function Footer({ data }: FooterProps) {
  const description = readString(data, 'description') || DEFAULT_DESCRIPTION;
  const copyrightText = readString(data, 'copyrightText') || DEFAULT_COPYRIGHT;
  const links = readLinks(data);
  const socialLinks = readSocialLinks(data);

  return (
    <footer className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-surface-dark">
      <Reveal className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <Logo />
            <p className="max-w-xs text-center text-xs leading-6 text-gray-500 dark:text-gray-400 sm:text-right">
              {description}
            </p>

            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2">
                {socialLinks.map((social, index) => {
                  const Icon = SOCIAL_ICON_BY_PLATFORM[social.platform];
                  return (
                    <a
                      key={`${social.platform}-${index}`}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.platform}
                      title={social.platform}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-brand-900 dark:hover:bg-brand-950/40 dark:hover:text-brand-400"
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:justify-start">
            {links.map((link, index) => (
              <a
                key={`${link.href}-${index}`}
                href={link.href}
                className="text-xs font-medium text-gray-500 transition hover:text-brand-600 dark:text-gray-400 dark:hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center dark:border-gray-800">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {copyrightText}
          </p>
        </div>
      </Reveal>
    </footer>
  );
}

export default Footer;