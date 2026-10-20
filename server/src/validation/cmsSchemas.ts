import { z } from 'zod';

// Keep CMS section keys aligned with the client editor registry.
export const SITE_CONTENT_SECTIONS = [
  'hero',
  'about',
  'features',
  'pricing',
  'news',
  'footer',
] as const;

export type SiteContentSection = (typeof SITE_CONTENT_SECTIONS)[number];

export function isSiteContentSection(
  value: string
): value is SiteContentSection {
  return (SITE_CONTENT_SECTIONS as readonly string[]).includes(value);
}

export const updateSiteContentSchema = z.object({
  data: z.record(z.string(), z.unknown()),
});
