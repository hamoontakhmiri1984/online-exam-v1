"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../lib/prisma");
const requireAuth_1 = require("../../middleware/requireAuth");
const authSchemas_1 = require("../../validation/authSchemas");
const asyncHandler_1 = require("../../lib/asyncHandler");
const errors_1 = require("../../lib/errors");
const auth_helpers_1 = require("./auth.helpers");
const router = (0, express_1.Router)();
router.get('/me', requireAuth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: {
            id: req.user.sub,
        },
    });
    if (!user) {
        throw new errors_1.AppError(401, 'کاربر پیدا نشد');
    }
    res.json((0, auth_helpers_1.serializeMe)(user));
}));
router.patch('/me', requireAuth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    const user = await prisma_1.prisma.user.update({
        where: {
            id: req.user.sub,
        },
        data: {
            name: parsed.data.name,
        },
    });
    res.json((0, auth_helpers_1.serializeMe)(user));
}));
router.post('/onboarding', requireAuth_1.requireAuth, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const parsed = authSchemas_1.onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
        throw (0, errors_1.badRequest)(parsed.error.issues[0].message);
    }
    const existing = await prisma_1.prisma.user.findUnique({
        where: {
            id: req.user.sub,
        },
    });
    if (!existing) {
        throw new errors_1.AppError(401, 'کاربر پیدا نشد');
    }
    const user = await prisma_1.prisma.user.update({
        where: {
            id: req.user.sub,
        },
        data: {
            onboardingCompleted: true,
            ...(existing.role === 'Instructor' && parsed.data.organizationName
                ? {
                    organizationName: parsed.data.organizationName,
                }
                : {}),
        },
    });
    res.json((0, auth_helpers_1.serializeMe)(user));
}));
exports.default = router;
