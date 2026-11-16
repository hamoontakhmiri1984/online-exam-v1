import { Palette } from 'lucide-react';
import ToggleSwitch from '../../../components/ToggleSwitch/ToggleSwitch';
import useWorkspaceBackground, { WORKSPACE_BACKGROUNDS } from '../../../hooks/useWorkspaceBackground';

function AppearanceSection({
  isDark,
  onToggle,
  userId,
}: {
  isDark: boolean;
  onToggle: () => void;
  userId?: string;
}) {
  const { selected, setBackground } = useWorkspaceBackground(userId);
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600 dark:bg-accent-500/15 dark:text-accent-500">
          <Palette size={18} />
        </div>
        <h2 className="font-semibold text-gray-900 dark:text-white">ظاهر</h2>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          حالت شب
        </span>
        <ToggleSwitch checked={isDark} onChange={onToggle} label="حالت شب" />
      </div>
      <div className="mt-6 border-t border-violet-100 pt-5 dark:border-violet-400/15">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">پس‌زمینه فضای کاری</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">طرح مورد علاقه خود را انتخاب کنید. این انتخاب برای حساب شما ذخیره می‌شود.</p>
        <div role="group" aria-label="انتخاب پس‌زمینه فضای کاری" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {WORKSPACE_BACKGROUNDS.map(({ id, label, description }) => (
            <button key={id} type="button" aria-pressed={selected === id} onClick={() => setBackground(id)}
              className={`rounded-2xl border p-2 text-right transition hover:-translate-y-0.5 hover:shadow-md ${selected === id ? 'border-violet-500 ring-2 ring-violet-400/30' : 'border-slate-200 dark:border-slate-700'}`}>
              <span className={`workspace-preview workspace-preview-${id} mb-2 block h-17 rounded-xl border border-white/50`}/>
              <span className="block text-xs font-bold text-slate-800 dark:text-white">{label}</span>
              <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">{description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AppearanceSection;
