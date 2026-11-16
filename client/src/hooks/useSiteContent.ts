import { useEffect, useState } from 'react';
import { getSiteContent, type SiteContentMap } from '../api/cmsApi';

type PublicContentState = { sections: SiteContentMap | null; hiddenSections: string[]; loading: boolean; error: boolean };

// Wait for the public CMS response; never flash template defaults while fetching.
function useSiteContent(): PublicContentState {
  const [state, setState] = useState<PublicContentState>({ sections: null, hiddenSections: [], loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    getSiteContent()
      .then(res => {
        if (!cancelled) setState({ sections: res.sections, hiddenSections: res.hiddenSections ?? [], loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ sections: null, hiddenSections: [], loading: false, error: true });
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

export default useSiteContent;
