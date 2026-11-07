import { Platform } from 'react-native';

/**
 * Derives the API base URL at runtime.
 *
 * Browser requests stay on their current origin. The artifact router forwards
 * /api before the Expo catch-all, without a cross-origin preflight or guessed host.
 * Native clients use the configured server address.
 */
export function getApiBase(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Native: use EXPO_PUBLIC_API_BASE (set this to your deployed domain)
  const explicit = process.env['EXPO_PUBLIC_API_BASE'];
  if (explicit) return explicit.replace(/\/$/, '');
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) throw new Error('The game server address is not configured.');
  return `https://${domain}`;
}

export function apiUrl(path: string): string {
  return `${getApiBase()}/api${path}`;
}
