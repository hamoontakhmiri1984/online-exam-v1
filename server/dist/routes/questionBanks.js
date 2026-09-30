"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const banks_routes_1 = __importDefault(require("./questionBanks/banks.routes"));
const bankQuestions_routes_1 = __importDefault(require("./questionBanks/bankQuestions.routes"));
const router = (0, express_1.Router)();
router.use('/', banks_routes_1.default);
router.use('/', bankQuestions_routes_1.default);
exports.default = router;
