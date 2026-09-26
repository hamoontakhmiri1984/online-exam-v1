"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const captcha_1 = require("../../lib/captcha");
const username_1 = require("../../lib/username");
const rateLimiters_1 = require("../../middleware/rateLimiters");
const asyncHandler_1 = require("../../lib/asyncHandler");
const router = (0, express_1.Router)();
router.get('/username-available', rateLimiters_1.usernameCheckLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const raw = typeof req.query.username === 'string'
        ? req.query.username
        : '';
    const formatCheck = (0, username_1.validateUsernameFormat)(raw);
    if (!formatCheck.valid) {
        return res.json({
            available: false,
            reason: formatCheck.error ??
                'نام کاربری نامعتبره',
        });
    }
    const username = (0, username_1.normalizeUsername)(raw);
    const taken = await (0, username_1.isUsernameTaken)(username);
    if (taken) {
        const suggestions = await (0, username_1.suggestUsernameAlternatives)(raw);
        return res.json({
            available: false,
            reason: 'این نام کاربری قبلاً گرفته شده',
            suggestions,
        });
    }
    return res.json({
        available: true,
    });
}));
router.get('/captcha', rateLimiters_1.captchaLimiter, (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const { captchaId, svg, } = await (0, captcha_1.createCaptcha)();
    return res.json({
        captchaId,
        svg,
    });
}));
exports.default = router;
