"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authSchemas_1 = require("../../../validation/authSchemas");
const rateLimiters_1 = require("../../../middleware/rateLimiters");
const asyncHandler_1 = require("../../../lib/asyncHandler");
const errors_1 = require("../../../lib/errors");
const register_service_1 = require("./register.service");
const router = (0, express_1.Router)();
router.post('/register', rateLimiters_1.otpSendLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.registerSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]
            ?.message ??
            'اطلاعات ثبت‌نام نامعتبره');
    }
    const result = await (0, register_service_1.registerUser)(parsed.data, req.ip ?? 'unknown');
    if (result.status ===
        'username_taken') {
        return res.status(409).json({
            error: result.message,
            suggestions: result.usernameSuggestions,
        });
    }
    return res.status(201).json({
        message: 'کد تایید ارسال شد',
        identifier: result.identifier,
    });
}));
exports.default = router;
