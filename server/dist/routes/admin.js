"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const instructors_routes_1 = __importDefault(require("./admin/instructors.routes"));
const categories_routes_1 = __importDefault(require("./admin/categories.routes"));
const router = (0, express_1.Router)();
// فقط SuperAdmin به این route ها دسترسی داره
router.use(requireAuth_1.requireAuth, (0, requireAuth_1.requireRole)('SuperAdmin'));
router.use('/instructors', instructors_routes_1.default);
router.use('/categories', categories_routes_1.default);
exports.default = router;
