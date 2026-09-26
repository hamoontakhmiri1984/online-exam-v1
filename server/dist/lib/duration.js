"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.durationToSeconds = durationToSeconds;
const UNIT_TO_SECONDS = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
};
function durationToSeconds(input) {
    const match = /^(\d+)\s*(s|m|h|d)$/.exec(input.trim());
    if (!match) {
        throw new Error(`Invalid duration string: "${input}". Use formats like 15m, 2h, 30d.`);
    }
    const [, amountStr, unit] = match;
    return Number(amountStr) * UNIT_TO_SECONDS[unit];
}
