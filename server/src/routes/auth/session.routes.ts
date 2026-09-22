import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { AppError } from '../../lib/errors';
import {
  setRefreshCookie, clearRefreshCookie, getRefreshCookieName,
} from '../../lib/authTokens';
import { revokeSession } from '../../lib/session';
import { forceLogoutOtherSessions } from '../../realtime/socket';
import { refreshUserSession, resolveLogoutSubject } from './session.service';

const router = Router();

router.post('/refresh', asyncHandler(async (req, res) => {
  try {
    const tokens = await refreshUserSession(req.cookies?.[getRefreshCookieName()]);
    setRefreshCookie(res, tokens.refreshToken, tokens.rememberMe);
    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      clearRefreshCookie(res);
    }
    throw error;
  }
}));

router.post('/logout', asyncHandler(async (req, res) => {
  try {
    const userId = await resolveLogoutSubject(req);
    if (userId) {
      await revokeSession(userId);
      forceLogoutOtherSessions(userId, undefined, 'logged-out');
    }
  } finally {
    clearRefreshCookie(res);
  }
  res.json({ message: 'خارج شدی' });
}));

export default router;
