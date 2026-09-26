"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instructorApprovalBlockMessage = instructorApprovalBlockMessage;
function instructorApprovalBlockMessage(user) {
    if (user.role !== 'Instructor' || user.approvalStatus === 'Approved') {
        return null;
    }
    return user.approvalStatus === 'Rejected'
        ? 'درخواست ثبت‌نام مدرسی‌ت رد شده'
        : 'حساب مدرس‌ت منتظر تایید مدیر سیستمه. بعد از تایید می‌تونی وارد بشی';
}
