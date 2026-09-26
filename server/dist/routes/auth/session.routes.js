"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const authTokens_1 = require("../../lib/authTokens");
const session_1 = require("../../lib/session");
const socket_1 = require("../../realtime/socket");
const session_service_1 = require("./session.service");
const router = (0, express_1.Router)();
router.post('/refresh', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const tokens = await (0, session_service_1.refreshUserSession)(req.cookies?.[(0, authTokens_1.getRefreshCookieName)()]);
        (0, authTokens_1.setRefreshCookie)(res, tokens.refreshToken, tokens.rememberMe);
        res.json({ accessToken: tokens.accessToken });
    }
    catch (error) {
        if (error instanceof errors_1.AppError && error.statusCode === 401) {
            (0, authTokens_1.clearRefreshCookie)(res);
        }
        throw error;
    }
}));
router.post('/logout', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const userId = await (0, session_service_1.resolveLogoutSubject)(req);
        if (userId) {
            await (0, session_1.revokeSession)(userId);
            (0, socket_1.forceLogoutOtherSessions)(userId, undefined, 'logged-out');
        }
    }
    finally {
        (0, authTokens_1.clearRefreshCookie)(res);
    }
    res.json({ message: 'خارج شدی' });
}));
exports.default = router;
