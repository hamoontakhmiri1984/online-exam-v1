"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rateLimiters_1 = require("../../../middleware/rateLimiters");
const authSchemas_1 = require("../../../validation/authSchemas");
const asyncHandler_1 = require("../../../lib/asyncHandler");
const errors_1 = require("../../../lib/errors");
const authTokens_1 = require("../../../lib/authTokens");
const otp_service_1 = require("./otp.service");
const router = (0, express_1.Router)();
router.post('/otp/request', rateLimiters_1.otpSendLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.otpRequestSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]
            ?.message ??
            'اطلاعات درخواست کد نامعتبره');
    }
    const result = await (0, otp_service_1.requestOtp)(parsed.data, req.ip ?? 'unknown');
    return res.json(result);
}));
router.post('/otp/verify', rateLimiters_1.otpVerifyLimiter, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.otpVerifySchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0]
            ?.message ??
            'اطلاعات کد تایید نامعتبره');
    }
    const result = await (0, otp_service_1.verifyOtpCode)(parsed.data);
    if (result.type === 'reset') {
        return res.json({
            resetTicket: result.resetTicket,
        });
    }
    if (result.type === 'pending') {
        return res.json({
            pendingApproval: true,
            message: result.message,
        });
    }
    (0, authTokens_1.setRefreshCookie)(res, result.refreshToken, result.rememberMe);
    return res.json({
        accessToken: result.accessToken,
        user: result.user,
    });
}));
exports.default = router;
