import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';

import { env } from '../src/config/env';
import { signRefreshToken, verifyRefreshToken } from '../src/lib/jwt';

test('refresh token preserves the remember-me boolean', () => {
  const token = signRefreshToken({
    sub: 'user-1',
    sid: 'session-1',
    rememberMe: false,
  });

  const payload = verifyRefreshToken(token);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.sid, 'session-1');
  assert.equal(payload.rememberMe, false);
});

test('refresh token verification rejects malformed payload fields', () => {
  const invalidPayloads = [
    { sub: 123, sid: 'session-1', rememberMe: true },
    { sub: 'user-1', sid: 123, rememberMe: true },
    { sub: 'user-1', sid: 'session-1', rememberMe: 'true' },
    {
      sub: 'user-1',
      sid: 'session-1',
      rememberMe: true,
      purpose: 'password-reset',
    },
  ];

  for (const payload of invalidPayloads) {
    const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      algorithm: 'HS256',
      expiresIn: '1m',
    });

    assert.throws(() => verifyRefreshToken(token), /invalid refresh token/);
  }
});
