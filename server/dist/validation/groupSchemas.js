"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinGroupSchema = exports.updateGroupSchema = exports.createGroupSchema = void 0;
const zod_1 = require("zod");
exports.createGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    category: zod_1.z.string().min(1),
    studentIds: zod_1.z.array(zod_1.z.string().min(1)).max(500).default([]),
});
exports.updateGroupSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    category: zod_1.z.string().min(1),
    studentIds: zod_1.z.array(zod_1.z.string().min(1)).max(500).default([]),
});
exports.joinGroupSchema = zod_1.z.object({
    joinCode: zod_1.z.string().min(4).max(32),
});
