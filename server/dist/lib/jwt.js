"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const duration_1 = require("./duration");
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, {
        expiresIn: (0, duration_1.durationToSeconds)(env_1.env.JWT_ACCESS_EXPIRES_IN),
    });
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_REFRESH_SECRET, {
        expiresIn: (0, duration_1.durationToSeconds)(env_1.env.JWT_REFRESH_EXPIRES_IN),
    });
}
const ROLES = ['SuperAdmin', 'Instructor', 'Student'];
// reset-ticket هم با JWT_ACCESS_SECRET امضا می‌شه؛ برای اینکه هیچ‌وقت به‌جای
// access token پذیرفته نشه، شکل payload صریحاً چک می‌شه (sub/sid/role)
function verifyAccessToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET);
    if (typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string' ||
        !ROLES.includes(payload.role) ||
        payload.purpose !== undefined) {
        throw new Error('invalid access token');
    }
    return payload;
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, env_1.env.JWT_REFRESH_SECRET);
}
