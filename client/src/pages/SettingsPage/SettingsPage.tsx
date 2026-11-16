import { useState, type KeyboardEvent } from 'react';
import ApprovalPolicySection from './components/ApprovalPolicySection';
import { XCircle, UserRound, LockKeyhole, Palette, Users, ShieldCheck, Link2 } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Toast from '../../components/Toast/Toast';
import useTheme from '../../hooks/useTheme';
import useGroupMembership from '../../hooks/useGroupMembership';
import { getCurrentUser } from '../../api/authApi';
import ProfileSection from './components/ProfileSection';
import PasswordSection from './components/PasswordSection';
import GroupMembershipSection from './components/GroupMembershipSection';
import AppearanceSection from './components/AppearanceSection';
import ConnectedAccountsSection from './components/ConnectedAccountsSection';

function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const currentUser = getCurrentUser();
  const isStudent = currentUser?.role === 'Student';
  const [activeTab, setActiveTab] = useState('profile');

  const {
    myGroups,
    groupsLoading,
    joinCode,
    setJoinCode,
    joining,
    joinError,
    setJoinError,
    joinSuccess,
    setJoinSuccess,
    handleJoinGroup,
  } = useGroupMembership(isStudent ? currentUser?.id : undefined);

  const tabs = [
    { id: 'profile', label: 'پروفایل', icon: UserRound, content: <ProfileSection currentUser={currentUser} /> },
    { id: 'password', label: 'امنیت', icon: LockKeyhole, content: <PasswordSection /> },
    { id: 'connections', label: 'حساب‌های متصل', icon: Link2, content: <ConnectedAccountsSection /> },
    ...(isStudent ? [{
      id: 'groups',
      label: 'گروه‌ها',
      icon: Users,
      content: (
        <GroupMembershipSection
          myGroups={myGroups}
          groupsLoading={groupsLoading}
          joinCode={joinCode}
          onJoinCodeChange={setJoinCode}
          joining={joining}
          onSubmit={handleJoinGroup}
        />
      ),
    }] : []),
    ...(currentUser?.role === 'SuperAdmin' ? [{
      id: 'approvals', label: 'تأییدها', icon: ShieldCheck, content: <ApprovalPolicySection />,
    }] : []),
    {
      id: 'appearance',
      label: 'ظاهر برنامه',
      icon: Palette,
      content: <AppearanceSection isDark={isDark} onToggle={toggleTheme} userId={currentUser?.id} />,
    },
  ];
  const selected = tabs.some(tab => tab.id === activeTab) ? activeTab : 'profile';

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowLeft': next = (index + 1) % tabs.length; break;
      case 'ArrowRight': next = (index + tabs.length - 1) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActiveTab(tabs[next].id);
    document.getElementById(`settings-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <AppLayout title="تنظیمات">
      {joinError && (
        <Toast
          message={joinError}
          tone="danger"
          icon={XCircle}
          onDismiss={() => setJoinError(null)}
        />
      )}
      {joinSuccess && (
        <Toast
          message={joinSuccess}
          tone="success"
          onDismiss={() => setJoinSuccess(null)}
        />
      )}
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تنظیمات حساب</h1>
        <div className="overflow-hidden rounded-2xl border border-violet-200/70 bg-white/85 dark:border-violet-400/25 dark:bg-slate-900">
          <div role="tablist" aria-label="بخش‌های تنظیمات" className="flex flex-wrap gap-1.5 border-b border-violet-200/60 p-2.5 dark:border-violet-400/20">
            {tabs.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                id={`settings-tab-${id}`}
                type="button"
                role="tab"
                aria-controls={`settings-${id}`}
                aria-selected={selected === id}
                tabIndex={selected === id ? 0 : -1}
                onClick={() => setActiveTab(id)}
                onKeyDown={event => handleTabKey(event, index)}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 aria-selected:bg-violet-100 aria-selected:text-brand-ink dark:text-gray-200 dark:hover:bg-violet-500/10 dark:aria-selected:bg-violet-500/20"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {tabs.map(({ id, content }) => (
            <section
              key={id}
              id={`settings-${id}`}
              role="tabpanel"
              aria-labelledby={`settings-tab-${id}`}
              hidden={selected !== id}
              tabIndex={0}
              className="min-h-52 min-w-0 p-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 sm:p-6"
            >
              <div className="max-w-2xl">{content}</div>
            </section>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export default SettingsPage;
