import { Platform } from 'react-native';

/**
 * Derives the API base URL at runtime.
 *
 * In the Replit environment the Expo web preview is served from a domain like:
 *   c3199f00.expo.worf.replit.dev
 * while the shared reverse-proxy (and therefore the api-server) lives at:
 *   c3199f00.worf.replit.dev
 *
 * We strip the ".expo." segment to jump from the Expo domain to the proxy domain.
 * On native (iOS / Android) we fall back to EXPO_PUBLIC_API_BASE.
 */
export function getApiBase(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Replit Expo web: *.expo.*  →  *.* (drop the ".expo." segment)
    const apiHost = host.replace('.expo.', '.');
    const protocol = window.location.protocol;
    return `${protocol}//${apiHost}`;
  }
  // Native: use EXPO_PUBLIC_API_BASE (set this to your deployed domain)
  return process.env['EXPO_PUBLIC_API_BASE'] ?? '';
}

export function apiUrl(path: string): string {
  return `${getApiBase()}/api${path}`;
}
