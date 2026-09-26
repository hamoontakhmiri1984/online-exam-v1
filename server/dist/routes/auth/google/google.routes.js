"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../../lib/prisma");
const requireAuth_1 = require("../../../middleware/requireAuth");
const authSchemas_1 = require("../../../validation/authSchemas");
const rateLimiters_1 = require("../../../middleware/rateLimiters");
const asyncHandler_1 = require("../../../lib/asyncHandler");
const errors_1 = require("../../../lib/errors");
const authTokens_1 = require("../../../lib/authTokens");
const auth_helpers_1 = require("../auth.helpers");
const google_service_1 = require("./google.service");
const router = (0, express_1.Router)();
router.post('/google/unlink', requireAuth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const existing = await prisma_1.prisma.user.findUnique({
        where: {
            id: req.user.sub,
        },
    });
    if (!existing) {
        throw new errors_1.AppError(401, 'کاربر پیدا نشد');
    }
    if (!existing.googleId) {
        throw (0, errors_1.badRequest)('حساب گوگلی به این اکانت وصل نیست');
    }
    const user = await prisma_1.prisma.user.update({
        where: {
            id: req.user.sub,
        },
        data: {
            googleId: null,
        },
    });
    res.json((0, auth_helpers_1.serializeMe)(user));
}));
router.post('/google/link', rateLimiters_1.authLimiter, requireAuth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    try {
        const user = await (0, google_service_1.linkGoogleAccount)(req.user.sub, parsed.data.idToken);
        return res.json(user);
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        return res.status(401).json({
            error: 'اتصال حساب گوگل ناموفق بود',
        });
    }
}));
router.post('/google', rateLimiters_1.authLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    try {
        const result = await (0, google_service_1.loginWithGoogle)(parsed.data.idToken);
        if (result.type === 'pending') {
            return res.json({
                pendingApproval: true,
                message: result.message,
            });
        }
        (0, authTokens_1.setRefreshCookie)(res, result.refreshToken);
        return res.json({
            accessToken: result.accessToken,
            user: result.user,
        });
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            throw error;
        }
        return res.status(401).json({
            error: 'ورود با گوگل ناموفق بود',
        });
    }
}));
exports.default = router;
