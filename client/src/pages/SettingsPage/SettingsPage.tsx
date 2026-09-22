import { XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Toast from '../../components/Toast/Toast';
import useTheme from '../../hooks/useTheme';
import useGroupMembership from '../../hooks/useGroupMembership';
import { getCurrentUser } from '../../api/authApi';
import ProfileSection from './components/ProfileSection';
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
      <h1 className="text-2xl font-bold mb-6 dark:text-white">تنظیمات</h1>

      <div className="flex flex-col gap-4 max-w-xl">
        <ProfileSection currentUser={currentUser} />

        <ConnectedAccountsSection />

        {isStudent && (
          <GroupMembershipSection
            myGroups={myGroups}
            groupsLoading={groupsLoading}
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            joining={joining}
            onSubmit={handleJoinGroup}
          />
        )}

        <AppearanceSection isDark={isDark} onToggle={toggleTheme} />
      </div>
    </AppLayout>
  );
}

export default SettingsPage;
