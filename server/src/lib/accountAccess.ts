type ApprovalUser = {
  role: string;
  approvalStatus: string;
};

export function instructorApprovalBlockMessage(user: ApprovalUser): string | null {
  if (user.role !== 'Instructor' || user.approvalStatus === 'Approved') {
    return null;
  }
  return user.approvalStatus === 'Rejected'
    ? 'درخواست ثبت‌نام مدرسی‌ت رد شده'
    : 'حساب مدرس‌ت منتظر تایید مدیر سیستمه. بعد از تایید می‌تونی وارد بشی';
}
