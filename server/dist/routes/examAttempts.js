"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attemptLifecycle_routes_1 = __importDefault(require("./examAttempts/attemptLifecycle.routes"));
const attemptQueries_routes_1 = __importDefault(require("./examAttempts/attemptQueries.routes"));
const router = (0, express_1.Router)({ mergeParams: true });
router.use('/', attemptLifecycle_routes_1.default);
router.use('/', attemptQueries_routes_1.default);
exports.default = router;
