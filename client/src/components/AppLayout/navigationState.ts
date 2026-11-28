import type { NavigationGroupId, NavigationSection } from './navigationItems';

export const ADMIN_NAVIGATION_STORAGE_PREFIX = 'adminNavigationExpandedGroups:';

const navigationGroupIds: NavigationGroupId[] = [
  'requests',
  'education',
  'content',
  'finance',
  'system',
];

export type NavigationStorage = Pick<Storage, 'getItem' | 'setItem'>;

type RoutableNavigationItem = { to: string };

function normalizePath(path: string): string {
  if (path.length > 1) return path.replace(/\/+$/, '');
  return path;
}

export function getNavigationGroupForPath<T extends RoutableNavigationItem>(
  sections: readonly NavigationSection<T>[],
  pathname: string
): NavigationGroupId | undefined {
  const currentPath = normalizePath(pathname);

  return sections.find((section) =>
    section.group && section.items.some(({ to }) => {
      const itemPath = normalizePath(to);
      return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
    })
  )?.group;
}

export function toggleNavigationGroup(
  groups: readonly NavigationGroupId[],
  group: NavigationGroupId
): NavigationGroupId[] {
  return groups.includes(group)
    ? groups.filter((item) => item !== group)
    : [...groups, group];
}

export function ensureNavigationGroupExpanded(
  groups: readonly NavigationGroupId[],
  group: NavigationGroupId
): NavigationGroupId[] {
  return groups.includes(group) ? [...groups] : [...groups, group];
}

export function readExpandedNavigationGroups(
  storage: Pick<NavigationStorage, 'getItem'> | null,
  storageKey: string
): NavigationGroupId[] {
  if (!storage || !storageKey) return [];

  try {
    const saved: unknown = JSON.parse(storage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(saved)) return [];
    return Array.from(new Set(saved.filter(
      (group): group is NavigationGroupId =>
        typeof group === 'string' && navigationGroupIds.includes(group as NavigationGroupId)
    )));
  } catch {
    return [];
  }
}

export function writeExpandedNavigationGroups(
  storage: Pick<NavigationStorage, 'setItem'> | null,
  storageKey: string,
  groups: readonly NavigationGroupId[]
): void {
  if (!storage || !storageKey) return;

  try {
    storage.setItem(storageKey, JSON.stringify(groups));
  } catch {
    // The navigation remains usable when browser storage is unavailable.
  }
}
