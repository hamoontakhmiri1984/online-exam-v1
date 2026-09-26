"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSiteContentSchema = exports.SITE_CONTENT_SECTIONS = void 0;
exports.isSiteContentSection = isSiteContentSection;
const zod_1 = require("zod");
// بخش‌های قابل‌ویرایشِ صفحه‌ی فرود. این لیست تنها منبعِ معتبرِ اسمِ section
// ـه - هم سمت سرور (GET/PUT /cms/:section زیر همینو چک می‌کنن) هم سمت
// کلاینت (client/src/constants -> همین لیست کپی می‌شه برای ساختِ فرم‌های
// ادمین). اضافه‌کردنِ section جدید یعنی این‌جا اضافه بشه + یه فرم متناظر تو
// پنل ادمین + استفاده‌ازش تو کامپوننتِ مربوطه‌ی صفحه‌ی فرود.
exports.SITE_CONTENT_SECTIONS = [
    'hero',
    'about',
    'features',
    'pricing',
    'news',
    'footer',
];
function isSiteContentSection(value) {
    return exports.SITE_CONTENT_SECTIONS.includes(value);
}
// شکل داخلی data عمداً آزاده (z.record) - هر section شکل خودش رو داره
// (hero یه عنوان/زیرعنوان داره، pricing یه آرایه از پلن) و اعتبارسنجیِ
// دقیق‌ترش (اگه لازم شد) می‌تونه بعداً per-section اضافه بشه؛ همینجا فقط
// مطمئن می‌شیم یه object معتبره (نه آرایه/رشته/عدد خام) تا کلاینت همیشه
// بتونه با Object.entries/بازش کنه
exports.updateSiteContentSchema = zod_1.z.object({
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
