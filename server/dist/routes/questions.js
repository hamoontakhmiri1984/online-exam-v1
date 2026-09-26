"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const examQuestions_routes_1 = __importDefault(require("./questions/examQuestions.routes"));
const questionBankImport_routes_1 = __importDefault(require("./questions/questionBankImport.routes"));
const router = (0, express_1.Router)({
    mergeParams: true,
});
router.use('/', examQuestions_routes_1.default);
router.use('/', questionBankImport_routes_1.default);
exports.default = router;
