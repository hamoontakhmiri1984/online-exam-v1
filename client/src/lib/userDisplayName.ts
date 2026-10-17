type UserLabel = { name?: string | null; username?: string | null; email?: string | null; phone?: string | null };
export function userDisplayName(user: UserLabel | null | undefined): string {
  if (!user) return 'کاربر در دسترس نیست';
  return [user.name, user.username, user.email, user.phone].find(value => value?.trim())?.trim() || 'بدون نام';
}
