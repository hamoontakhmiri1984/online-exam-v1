"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instructorApprovalBlockMessage = void 0;
exports.serializeMe = serializeMe;
exports.resolveIdentifier = resolveIdentifier;
const identifier_1 = require("../../lib/identifier");
var accountAccess_1 = require("../../lib/accountAccess");
Object.defineProperty(exports, "instructorApprovalBlockMessage", { enumerable: true, get: function () { return accountAccess_1.instructorApprovalBlockMessage; } });
function serializeMe(user) {
    return {
        id: user.id,
        name: user.name,
        role: user.role,
        username: user.username,
        googleLinked: Boolean(user.googleId),
        hasPassword: Boolean(user.passwordHash),
        onboardingCompleted: user.onboardingCompleted,
        organizationName: user.organizationName,
    };
}
function resolveIdentifier(raw) {
    const type = (0, identifier_1.detectIdentifierType)(raw);
    if (!type) {
        return null;
    }
    return {
        type,
        value: (0, identifier_1.normalizeIdentifier)(raw, type),
        channel: type === 'EMAIL'
            ? 'EMAIL'
            : 'SMS',
    };
}
