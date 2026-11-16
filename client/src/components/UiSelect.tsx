import { Children, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type ComponentPropsWithoutRef, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

type Props = Omit<ComponentPropsWithoutRef<'select'>, 'multiple' | 'size' | 'children'> & { children: ReactNode };
type Choice = { value: string; label: ReactNode; disabled: boolean };

export default function UiSelect({ className = '', children, value, defaultValue, onChange, disabled, name, id, 'aria-label': ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(String(defaultValue ?? ''));
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const choices: Choice[] = Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return [];
    if (child.type === 'option') return [{ value: String(child.props.value ?? ''), label: child.props.children, disabled: Boolean(child.props.disabled) }];
    if (child.type === 'optgroup') return Children.toArray(child.props.children).flatMap(option =>
      isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(option) && option.type === 'option'
        ? [{ value: String(option.props.value ?? ''), label: option.props.children, disabled: Boolean(option.props.disabled) }] : []);
    return [];
  });
  const selected = String(value ?? internal);
  const current = choices.find(c => c.value === selected);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  function choose(choice: Choice) {
    if (choice.disabled) return;
    if (value === undefined) setInternal(choice.value);
    onChange?.({ target: { value: choice.value, name }, currentTarget: { value: choice.value, name } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    // Restoring keyboard focus must not reposition the surrounding page/modal.
    ref.current?.querySelector<HTMLButtonElement>('[role="combobox"]')?.focus({ preventScroll: true });
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      setActive(-1);
      setOpen(true);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') { const choice = choices[active]; if (choice) choose(choice); return; }
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    let i = active < 0 ? (delta === 1 ? -1 : 0) : active;
    for (let n = 0; n < choices.length; n++) {
      i = (i + delta + choices.length) % choices.length;
      if (!choices[i].disabled) { setActive(i); break; }
    }
  }
  return (
    <div ref={ref} className={`ui-select-custom relative min-w-0 ${className}`} dir="rtl">
      {name && <input type="hidden" name={name} value={selected} />}
      <button type="button" id={id} role="combobox" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={menuId} disabled={disabled}
        onClick={() => { setActive(-1); setOpen(x => !x); }}
        onKeyDown={keyboard} className="ui-select-trigger flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-violet-200/70 bg-white/90 px-4 py-2.5 text-right text-sm text-slate-800 transition-colors hover:border-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/25 dark:bg-slate-800/85 dark:text-white">
        <span className="min-w-0 truncate">{current?.label ?? 'انتخاب کنید'}</span>
        <ChevronDown size={17} aria-hidden="true" className={`shrink-0 text-violet-600 transition-transform dark:text-violet-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div id={menuId} role="listbox" aria-label={ariaLabel} className="ui-select-menu absolute inset-x-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-violet-200 bg-white p-1.5 shadow-xl shadow-violet-950/10 dark:border-violet-400/25 dark:bg-slate-800">
        {choices.map((choice, index) => (
          <button key={index} type="button" role="option" aria-selected={choice.value === selected} disabled={choice.disabled}
            // Keep the trigger focused while choosing; native option-button focus
            // can scroll the document even though the menu is absolutely placed.
            onMouseDown={event => event.preventDefault()}
            onMouseEnter={() => setActive(index)} onClick={() => choose(choice)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition-colors disabled:opacity-40 ${active === index ? 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100' : 'text-slate-700 hover:bg-violet-50 dark:text-slate-200 dark:hover:bg-violet-500/10'}`}>
            <span>{choice.label}</span>{choice.value === selected && <Check size={15} className="text-violet-600 dark:text-violet-300" />}
          </button>
        ))}
      </div>}
    </div>
  );
}
