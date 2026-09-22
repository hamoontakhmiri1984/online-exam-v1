import { Palette } from 'lucide-react';
import ToggleSwitch from '../../../components/ToggleSwitch/ToggleSwitch';

function AppearanceSection({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
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
    </div>
  );
}

export default AppearanceSection;
