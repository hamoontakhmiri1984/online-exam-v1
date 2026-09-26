"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const redis_1 = require("redis");
const env_1 = require("../config/env");
exports.redis = (0, redis_1.createClient)({
    url: env_1.env.REDIS_URL,
});
exports.redis.on('error', (err) => console.error('Redis Client Error', err));
if (!exports.redis.isOpen) {
    exports.redis.connect();
}
