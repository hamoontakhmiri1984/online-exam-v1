import { ArrowRight } from 'lucide-react';
import { Link, type To } from 'react-router-dom';

type Props = {
  label: string;
  className?: string;
  iconOnly?: boolean;
} & (
  | { to: To; onClick?: never; disabled?: never }
  | { to?: never; onClick: () => void; disabled?: boolean }
);

export default function PanelBack({ label, className = '', iconOnly, to, onClick, disabled }: Props) {
  const classes = `inline-flex min-h-11 w-fit items-center gap-2.5 rounded-xl border border-violet-200/70 bg-white/65 py-1.5 ps-1.5 text-sm font-semibold text-brand-ink transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/25 dark:bg-violet-500/10 dark:hover:bg-violet-500/20 ${iconOnly ? 'min-w-11 justify-center pe-1.5' : 'pe-3.5'} ${className}`;
  const content = (
    <>
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-violet-100/80 dark:bg-violet-400/15">
        <ArrowRight size={16} aria-hidden="true" />
      </span>
      {iconOnly ? <span className="sr-only">{label}</span> : label}
    </>
  );

  return to !== undefined ? (
    <Link to={to} className={classes}>{content}</Link>
  ) : (
    <button type="button" className={classes} onClick={onClick} disabled={disabled}>{content}</button>
  );
}
