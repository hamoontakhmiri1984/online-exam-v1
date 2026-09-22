// نمایش استاندارد تاریخ+ساعت آزمون (ISO -> رشته‌ی خوانا با اعداد فارسی)،
// هم‌راستا با الگوی موجود تو MyResultsPage.tsx و RecentAttemptsTable.tsx
// که برای attempt.finishedAt از toLocaleDateString('fa-IR') استفاده می‌کنن
export function formatExamDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

// فقط تاریخ (بدون ساعت) - برای جاهایی مثل کارتِ پست بلاگ که ساعتِ دقیق
// مهم نیست
export function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString('fa-IR', { dateStyle: 'short' });
}
