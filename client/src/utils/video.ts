export function toEmbedUrl(url: string): string {
  const trimmed = url.trim();

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([\w-]+)/
  );
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  const aparatMatch = trimmed.match(/aparat\.com\/(?:v|video)\/([\w-]+)/);
  if (aparatMatch)
    return `https://www.aparat.com/video/embed/${aparatMatch[1]}`;

  // Only HTTP(S) links may reach the player; reject unsafe stored schemes too.
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return withScheme;
    }
  } catch {

  }
  return '';
}
