import {
  detectIdentifierType,
  normalizeIdentifier,
} from '../../lib/identifier';

export { instructorApprovalBlockMessage } from '../../lib/accountAccess';

type SerializableUser = {
  id: string;
  name: string | null;
  role: string;
  username: string | null;
  googleId: string | null;
  passwordHash: string | null;
  onboardingCompleted: boolean;
  organizationName: string | null;
};

export function serializeMe(user: SerializableUser) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    username: user.username,
    googleLinked: Boolean(user.googleId),
    hasPassword: Boolean(user.passwordHash),
    onboardingCompleted: user.onboardingCompleted,
    organizationName: user.organizationName,
  };
}

export function resolveIdentifier(raw: string) {
  const type = detectIdentifierType(raw);

  if (!type) {
    return null;
  }

  return {
    type,
    value: normalizeIdentifier(raw, type),
    channel:
      type === 'EMAIL'
        ? ('EMAIL' as const)
        : ('SMS' as const),
  };
}