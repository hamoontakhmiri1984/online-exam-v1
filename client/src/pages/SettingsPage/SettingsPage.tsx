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
      <div className="settings-hero mb-6"><p className="text-xs font-bold text-violet-600 dark:text-violet-300">حساب کاربری</p><h1 className="mt-2 text-3xl font-extrabold dark:text-white">تنظیمات</h1><p className="mt-2 text-sm text-gray-500 dark:text-gray-400">اطلاعات حساب، امنیت و ظاهر برنامه را مدیریت کنید.</p></div>

      <div className="settings-layout settings-layout-refined grid grid-cols-1 items-start gap-6"><aside className="settings-nav settings-nav-refined flex flex-wrap items-center gap-1 rounded-3xl p-3"><p className="mb-4 px-3 text-xs font-semibold text-gray-400">بخش‌های تنظیمات</p><a href="#settings-profile"><UserRound size={17}/> پروفایل</a><a href="#settings-password"><LockKeyhole size={17}/> امنیت</a><a href="#settings-connections"><Link2 size={17}/> حساب‌های متصل</a>{isStudent && <a href="#settings-groups"><Users size={17}/> گروه‌ها</a>}{currentUser?.role === 'SuperAdmin' && <a href="#settings-approvals"><ShieldCheck size={17}/> تأییدها</a>}<a href="#settings-appearance"><Palette size={17}/> ظاهر برنامه</a></aside><div className="settings-content settings-content-refined grid min-w-0 gap-5">
        {currentUser?.role === 'SuperAdmin' && <section id="settings-approvals"><ApprovalPolicySection /></section>}
        <section id="settings-profile"><ProfileSection currentUser={currentUser} /></section>

        <section id="settings-password"><PasswordSection /></section>

        <section id="settings-connections"><ConnectedAccountsSection /></section>

        {isStudent && (
          <section id="settings-groups"><GroupMembershipSection
            myGroups={myGroups}
            groupsLoading={groupsLoading}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            joining={joining}
            onSubmit={handleJoinGroup}
          /></section>
        )}

        <section id="settings-appearance"><AppearanceSection isDark={isDark} onToggle={toggleTheme} userId={currentUser?.id} /></section>
      </div></div>
    </AppLayout>
  );
}

export default SettingsPage;
