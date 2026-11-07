/** Public contact supplied by the app owner. Never invent a support destination. */
export const SUPPORT_CONTACT: string | null = 'azrain.popatiya202@gmail.com';

export function supportContactUrl(contact: string | null): string | null {
  const value = contact?.trim();
  if (!value || /[\r\n]/.test(value)) return null;
  if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
    return `mailto:${value}?subject=GoldRush%20Arena%20support`;
  }
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}
