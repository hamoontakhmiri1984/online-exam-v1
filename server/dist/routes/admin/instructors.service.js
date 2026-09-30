"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeInstructor = serializeInstructor;
function serializeInstructor(user) {
    return {
        id: user.id,
        name: user.name ?? '',
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        username: user.username ?? undefined,
        approvalStatus: user.approvalStatus,
        createdAt: user.createdAt.toISOString(),
    };
}
