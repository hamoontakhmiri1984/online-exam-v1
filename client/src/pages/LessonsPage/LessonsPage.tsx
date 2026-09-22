import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Video, Layers, XCircle } from 'lucide-react';
import AppLayout from '../../components/AppLayout/AppLayout';
import Spinner from '../../components/Spinner/Spinner';
import Toast from '../../components/Toast/Toast';
import useGroups from '../../hooks/useGroups';
import useScope from '../../hooks/useScope';
import { getSessions, type LessonSession } from '../../api/lessonApi';
import EmptyState from '../../components/EmptyState/EmptyState';

function LessonsPage() {
  const navigate = useNavigate();
  const {
    visibleGroups,
    visibleGroupIds,
    currentUser,
    loading: groupsLoading,
  } = useGroups();

  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  useEffect(() => {
    // قبلاً اینجا catch نداشت: اگه getSessions() به هر دلیلی reject می‌شد
    // (خطای سرور، توکن و ...)، sessionsLoading برای همیشه true می‌موند و
    // کل صفحه رو یه اسپینر بی‌نهایت می‌گرفت - نه خطایی نشون داده می‌شد نه
    // محتوایی. حالا finally همیشه loading رو false می‌کنه و خطا هم نشون
    // داده می‌شه.
    getSessions()
      .then((data) => {
        setSessions(data);
      })
      .catch(() => {
        setSessionsError('دریافت درس‌ها با خطا مواجه شد');
      })
      .finally(() => {
        setSessionsLoading(false);
      });
  }, []);

  const { visibleItems: visibleSessions } = useScope(
    sessions,
    (session) => session.groupIds,
    { visibleGroupIds, currentUser }
  );

  const loading = groupsLoading || sessionsLoading;

  return (
    <AppLayout title="درس‌ها">
      {sessionsError && (
        <Toast
          message={sessionsError}
          tone="danger"
          icon={XCircle}
          onDismiss={() => setSessionsError(null)}
        />
      )}
      {loading ? (
        <Spinner />
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-6 dark:text-white">درس‌ها</h1>

          {visibleGroups.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="هنوز عضو هیچ گروهی نیستی"
              description="محتوای آموزشی هر گروه، جدا از بقیه‌ست. وقتی عضو یک گروه بشی، درس‌هاش اینجا نشون داده می‌شن."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleGroups.map((group) => {
                const count = visibleSessions.filter((s) =>
                  s.groupIds.includes(group.id)
                ).length;

                return (
                  <button
                    key={group.id}
                    onClick={() => navigate(`/lessons/${group.id}`)}
                    className="flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-6 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-600/15 dark:text-brand-400">
                      <Video size={20} />
                    </div>
                    <h2 className="font-bold text-gray-900 dark:text-white">
                      {group.name}
                    </h2>
                    <p className="text-xs text-gray-400">{group.category}</p>
                    <p className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <PlayCircle size={14} />
                      {count.toLocaleString('fa-IR')} جلسه
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

export default LessonsPage;
