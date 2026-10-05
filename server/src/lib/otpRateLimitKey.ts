import type { Request } from 'express';
import { detectIdentifierType, normalizeIdentifier } from './identifier';

// Separate user journeys; different spellings of the same phone/email share a bucket.
export function otpSendKey(req: Request): string {
  const raw =
    typeof req.body?.identifier === 'string' ? req.body.identifier.trim() : '';
  const type = detectIdentifierType(raw);
  const identifier = type ? normalizeIdentifier(raw, type) : 'invalid';
  const purpose = /^\/register\/?$/i.test(req.path)
    ? 'REGISTER'
    : ['REGISTER', 'LOGIN', 'RESET_PASSWORD'].includes(req.body?.purpose)
      ? req.body.purpose
      : 'invalid';
  return JSON.stringify([req.ip ?? 'unknown', identifier, purpose]);
}
