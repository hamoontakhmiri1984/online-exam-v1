"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllReadSchema = void 0;
const zod_1 = require("zod");
exports.markAllReadSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1),
});
