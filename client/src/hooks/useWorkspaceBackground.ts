import { useSyncExternalStore } from 'react';

export type WorkspaceBackground = 'aurora' | 'mist' | 'lavender' | 'ocean' | 'minimal';
export const WORKSPACE_BACKGROUNDS: { id: WorkspaceBackground; label: string; description: string }[] = [
  { id: 'aurora', label: 'شفق بنفش', description: 'بنفش و آبی ملایم' },
  { id: 'mist', label: 'مه صبحگاهی', description: 'روشن و خنثی' },
  { id: 'lavender', label: 'یاسی', description: 'بنفش لطیف و گرم' },
  { id: 'ocean', label: 'آبی آرام', description: 'آبی و فیروزه‌ای' },
  { id: 'minimal', label: 'ساده', description: 'پس‌زمینه مینیمال' },
];
const CHANGE_EVENT = 'workspace-background-change';
const keyFor = (id: string) => `workspace-background:${id}`;
function read(id: string): WorkspaceBackground {
  if (!id || typeof window === 'undefined') return 'aurora';
  try {
    const value = window.localStorage.getItem(keyFor(id));
    return WORKSPACE_BACKGROUNDS.some(item => item.id === value) ? value as WorkspaceBackground : 'aurora';
  } catch { return 'aurora'; }
}
export default function useWorkspaceBackground(userId?: string) {
  const id = userId ?? '';
  const selected = useSyncExternalStore(
    (notify) => {
      window.addEventListener('storage', notify);
      window.addEventListener(CHANGE_EVENT, notify);
      return () => {
        window.removeEventListener('storage', notify);
        window.removeEventListener(CHANGE_EVENT, notify);
      };
    },
    () => read(id),
    () => 'aurora'
  );
  function setBackground(value: WorkspaceBackground) {
    if (!id || !WORKSPACE_BACKGROUNDS.some(item => item.id === value)) return;
    try {
      window.localStorage.setItem(keyFor(id), value);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch { /* Storage unavailable; keep the default. */ }
  }
  return { selected, setBackground };
}
