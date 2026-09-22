import { useEffect, useState } from 'react';
import { getSiteContent, type SiteContentMap } from '../api/cmsApi';

// هوک عمومی (بدون نیاز به لاگین) - فقط صفحه‌ی فرود استفاده‌ش می‌کنه. همه‌ی
// ۶ section رو با یه درخواست می‌گیره (نه اینکه هر کامپوننتِ section جدا
// فچ کنه) و LandingPage همینو بین Hero/About/Features/Pricing/News/Footer
// به اشتراک می‌ذاره.
//
// تا وقتی درخواست تموم نشده (یا اگه خطا بخوره) sections رو null برمی‌گردونه.
// کامپوننت‌های مصرف‌کننده باید تو اون حالت از متنِ پیش‌فرضِ هاردکدِ خودشون
// استفاده کنن - این صفحه‌ی عمومیه، نباید هیچ‌وقت به‌خاطرِ کندی/خطای این
// درخواست خالی یا کرش‌شده دیده بشه.
function useSiteContent(): SiteContentMap | null {
  const [sections, setSections] = useState<SiteContentMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSiteContent()
      .then((res) => {
        if (!cancelled) setSections(res.sections);
      })
      .catch(() => {
        // عمداً silent - صفحه با پیش‌فرض‌های هاردکدِ هر بخش رندر می‌مونه
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return sections;
}

export default useSiteContent;
