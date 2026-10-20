import { useEffect, useState } from 'react';
import { getSiteContent, type SiteContentMap } from '../api/cmsApi';

// Share one public CMS request; consumers render defaults while content is unavailable.
function useSiteContent(): SiteContentMap | null {
  const [sections, setSections] = useState<SiteContentMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSiteContent()
      .then((res) => {
        if (!cancelled) setSections(res.sections);
      })
      .catch(() => {
        // Keep the default public content when CMS loading fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return sections;
}

export default useSiteContent;
