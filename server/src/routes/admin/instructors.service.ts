export function serializeInstructor(user: {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  username: string | null;
  approvalStatus: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? undefined,
    phone: user.phone ?? undefined,
    username: user.username ?? undefined,
    approvalStatus: user.approvalStatus,
    createdAt: user.createdAt.toISOString(),
  };
}