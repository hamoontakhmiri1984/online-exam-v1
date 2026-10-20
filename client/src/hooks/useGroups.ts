import { useEffect, useMemo, useState } from 'react';
import { getGroups, type Group } from '../api/groupApi';
import { getCurrentUser } from '../api/authApi';

function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getGroups()
      .then(setGroups)
      .catch(() => {

      })
      .finally(() => setLoading(false));
  }, []);

  const currentUser = getCurrentUser();

  // Stable array references prevent dependent effects from refetching on every render.
  const visibleGroups = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SuperAdmin') return groups;
    if (currentUser.role === 'Instructor') {
      return groups.filter((g) => g.instructorId === currentUser.id);
    }
    return groups.filter((g) => g.studentIds.includes(currentUser.id));
  }, [groups, currentUser]);

  const visibleGroupIds = useMemo(
    () => visibleGroups.map((g) => g.id),
    [visibleGroups]
  );

  return { groups, visibleGroups, visibleGroupIds, loading, currentUser };
}

export default useGroups;
