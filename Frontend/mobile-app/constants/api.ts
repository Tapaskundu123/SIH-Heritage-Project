import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reads from mobile-app/.env (EXPO_PUBLIC_ prefix is automatically bundled by Expo)
// Only EXPO_PUBLIC_API_URL is needed — all AI calls are proxied through the backend.
// Re-run start-remote-tunnels.ps1 when the tunnel URL changes.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.249:5000';
export const AI_URL = process.env.EXPO_PUBLIC_AI_URL || 'http://192.168.29.249:8000'; // kept for legacy compat, not used for requests

// ---------------------------------------------------------------
// Helper: throws a clear error if a Cloudflare error HTML page is
// returned instead of JSON. Prevents cryptic "<!DOCTYPE html>" errors.
// ---------------------------------------------------------------
export function assertNotHtml(data: any, url?: string): void {
  const raw = typeof data === 'string' ? data : '';
  if (raw.trimStart().startsWith('<!DOCTYPE') || raw.trimStart().startsWith('<html')) {
    throw new Error(
      'Cloudflare tunnel has expired. Please restart the tunnel on the server and update EXPO_PUBLIC_API_URL.' +
      (url ? ` [URL: ${url}]` : '')
    );
  }
}

/**
 * Resolves any product image URL to a fully-qualified URL that React Native can render.
 * - Leaves http/https, data:image, file:// as-is
 * - Prepends BASE_URL to relative paths like /uploads/...
 */
export function resolveImageUrl(url?: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:image/') ||
    url.startsWith('file://') ||
    url.startsWith('content://')
  ) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_URL}${cleanUrl}`;
}

// ---------------------------------------------------------------
// Multi-tier AI request helper
// ALL tiers route through the BACKEND (Cloudflare tunnel → localhost:5000)
// The backend internally calls AI at localhost:8000 — the AI_URL is never
// called from the mobile app directly.
//
// Remote users (different city / cellular): only Tier 1 is attempted.
// Local users (same Wi-Fi): update EXPO_PUBLIC_API_URL to 192.168.29.249:5000
// ---------------------------------------------------------------
export async function apiPostWithFallback(
  endpoint: string,
  data: FormData | Record<string, any>,
  options: { timeout?: number; isFormData?: boolean; responseType?: 'json' | 'arraybuffer' | 'blob' | 'text' } = {}
): Promise<any> {
  const { timeout = 120000, isFormData = false, responseType } = options;
  const headers: Record<string, string> = { 'bypass-tunnel-reminder': 'true' };
  // When sending FormData in React Native, do NOT set 'Content-Type': 'multipart/form-data'.
  // Setting it manually strips the boundary parameter. React Native/Axios generates it automatically.
  if (!isFormData && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = await AsyncStorage.getItem('ks_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Single tier — always route through backend Cloudflare tunnel / Wi-Fi IP.
  // The backend proxies all /api/ai/* calls to the local AI service.
  const url = `${BASE_URL}/api${endpoint}`;
  try {
    const res = await axios.post(url, data, { headers, timeout, ...(responseType ? { responseType } : {}) });
    if (typeof res.data === 'string') assertNotHtml(res.data, url);
    return res;
  } catch (err: any) {
    const status = err?.response?.status;

    console.warn('[API Request Failed]', {
      url,
      status,
      code: err?.code,
      message: err?.message,
      data: err?.response?.data,
    });

    // Gracefully handle expired/invalid JWT: clear poisoned token and retry once without auth header
    if (status === 401 && headers['Authorization']) {
      console.warn('[API] Token expired or invalid (401). Purging stale token and retrying request...');
      await AsyncStorage.removeItem('ks_token');
      delete headers['Authorization'];
      try {
        const retryRes = await axios.post(url, data, { headers, timeout, ...(responseType ? { responseType } : {}) });
        if (typeof retryRes.data === 'string') assertNotHtml(retryRes.data, url);
        return retryRes;
      } catch (retryErr: any) {
        err = retryErr;
      }
    }

    const isTunnel = BASE_URL.includes('trycloudflare.com');
    if (status === 502 || status === 504 || status === 522 || status === 523 || status === 530) {
      if (isTunnel) {
        throw new Error(
          `Cannot reach the server. The Cloudflare tunnel (${BASE_URL}) may have expired. ` +
          `Please ask the host to run start-remote-tunnels.ps1 and share the new QR code.`
        );
      }
    }

    if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED') {
      const hint = isTunnel
        ? `Cannot reach the server. The Cloudflare tunnel (${BASE_URL}) may have expired. Please run start-remote-tunnels.ps1.`
        : `Cannot reach backend at ${BASE_URL}. Ensure your phone and PC are connected to the same Wi-Fi network and backend is running.`;
      throw new Error(hint);
    }
    throw err;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 45000,
  headers: {
    'bypass-tunnel-reminder': 'true',
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('ks_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — guards against Cloudflare HTML error pages
// and provides clear actionable errors for tunnel failures.
api.interceptors.response.use(
  (response) => {
    if (typeof response.data === 'string') {
      assertNotHtml(response.data, response.config?.url);
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // Purge invalid/expired token so user can re-authenticate or continue as guest
      await AsyncStorage.removeItem('ks_token');
    }

    const isTunnelError =
      status === 530 || status === 502 || status === 504 || status === 522 || status === 523 ||
      error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED';

    if (isTunnelError) {
      const actionable = new Error(
        `Server tunnel error (${status || error?.code}). The Cloudflare tunnel may have expired. ` +
        `Run start-remote-tunnels.ps1 on the server and reload the app.`
      );
      return Promise.reject(actionable);
    }
    return Promise.reject(error);
  }
);

export default api;

