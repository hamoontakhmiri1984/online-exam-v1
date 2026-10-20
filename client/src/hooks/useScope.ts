import { useMemo } from 'react';
import type { User } from '../api/authApi';

type ScopeContext = {
  visibleGroupIds: string[];
  currentUser: User | null;
};

// Display filtering only; the server enforces authorization. Reuse caller-provided groups to avoid duplicate fetches.
function useScope<T>(
  items: T[],
  getGroupIds: (item: T) => string[],
  { visibleGroupIds, currentUser }: ScopeContext
) {
  const visibleItems = useMemo(() => {
    if (currentUser?.role === 'Instructor' || currentUser?.role === 'Student') {
      return items.filter((item) =>
        getGroupIds(item).some((groupId) => visibleGroupIds.includes(groupId))
      );
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, visibleGroupIds, currentUser?.role]);

  return { currentUser, visibleItems };
}

export default useScope;
