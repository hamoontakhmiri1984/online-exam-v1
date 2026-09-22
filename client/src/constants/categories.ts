// قبلاً این‌جا یه لیستِ ثابتِ CATEGORIES بود که تو GroupFormModal/ExamFormModal
// مستقیم رندر می‌شد. الان دسته‌بندی‌ها دیتابیسی و قابل‌مدیریت‌ان (ببین
// api/categoryApi.ts + hooks/useCategories.ts + components/CategorySelect) -
// این فایل فقط برای این نگه داشته شده که Category به‌عنوان یه type اسمی
// تو بقیه‌ی جاهایی که قبلاً ازش استفاده می‌کردن (groupApi.ts، examApi.ts،
// lessonApi.ts، ...) بدونِ تغییرِ اون فایل‌ها هنوز معتبر بمونه.
export type Category = string;
