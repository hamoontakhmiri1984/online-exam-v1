import { useEffect, useState } from 'react';
import { getSiteContent, type SiteContentMap } from '../api/cmsApi';

type PublicContentState = { sections: SiteContentMap | null; loading: boolean; error: boolean };

// Wait for the public CMS response; never flash template defaults while fetching.
function useSiteContent(): PublicContentState {
  const [state, setState] = useState<PublicContentState>({ sections: null, loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    getSiteContent()
      .then(res => {
        if (!cancelled) setState({ sections: res.sections, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ sections: null, loading: false, error: true });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

export default useSiteContent;
