"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authSchemas_1 = require("../../../validation/authSchemas");
const rateLimiters_1 = require("../../../middleware/rateLimiters");
const asyncHandler_1 = require("../../../lib/asyncHandler");
const errors_1 = require("../../../lib/errors");
const authTokens_1 = require("../../../lib/authTokens");
const password_service_1 = require("./password.service");
const router = (0, express_1.Router)();
router.post('/login/password', rateLimiters_1.authLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.passwordLoginSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]
            ?.message ??
            'اطلاعات ورود نامعتبره');
    }
    const ip = req.ip ?? 'unknown';
    const result = await (0, password_service_1.loginWithPassword)(parsed.data, ip);
    (0, authTokens_1.setRefreshCookie)(res, result.refreshToken, result.rememberMe);
    return res.json({
        accessToken: result.accessToken,
        user: result.user,
    });
}));
router.post('/reset-password', rateLimiters_1.authLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]
            ?.message ??
            'اطلاعات نامعتبره');
    }
    const result = await (0, password_service_1.resetPassword)(parsed.data.resetTicket, parsed.data.newPassword);
    return res.json(result);
}));
exports.default = router;
