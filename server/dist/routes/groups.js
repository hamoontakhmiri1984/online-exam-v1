"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const groups_routes_1 = __importDefault(require("./groups/groups.routes"));
const groupMembership_routes_1 = __importDefault(require("./groups/groupMembership.routes"));
const router = (0, express_1.Router)();
router.use(requireAuth_1.requireAuth);
router.use('/', groups_routes_1.default);
router.use('/', groupMembership_routes_1.default);
exports.default = router;
