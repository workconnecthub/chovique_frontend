/**
 * Centralized API client for Chovique frontend.
 * Connects to a FastAPI backend. Base URL is configured via VITE_API_URL env var.
 *
 * Auth Strategy:
 *  - The backend sets httpOnly cookies (access_token, refresh_token) on login/register.
 *  - All requests use credentials: 'include' so cookies are sent automatically.
 *  - NO JWT stored in localStorage. NO Bearer token header injection.
 *  - 401 → redirect to /login (session expired or not authenticated).
 */

const getNormalizedBaseUrl = (): string => {
  const rawUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!rawUrl) {
    return 'http://127.0.0.1:8000/api/v1';
  }
  let cleanUrl = rawUrl.replace(/\/+$/, '');
  // On Windows, Chromium resolves 'localhost' to IPv6 [::1] where Python uvicorn
  // is often not bound. Map localhost:8000 -> 127.0.0.1:8000 for seamless local dev.
  if (cleanUrl.includes('localhost:8000')) {
    cleanUrl = cleanUrl.replace('localhost:8000', '127.0.0.1:8000');
  }
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

export const BASE_URL = getNormalizedBaseUrl();

export const setAuthToken = (token?: string | null): void => {
  if (token) {
    localStorage.setItem('chovique_access_token', token);
  } else {
    localStorage.removeItem('chovique_access_token');
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('chovique_access_token');
};

/** Build default headers — JSON + Bearer token fallback (cookies also sent via credentials: include) */
const buildHeaders = (isFormData = false): HeadersInit => {
  const headers: Record<string, string> = isFormData ? {} : { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/** Handle 401 Unauthorized globally — skip redirect for session rehydration (/users/me) or public pages */
const handleUnauthorized = (path?: string): void => {
  if (path && path.includes('/users/me')) {
    return;
  }
  const { pathname } = window.location;
  const publicPages = ['/', '/shop', '/our-story', '/contact', '/product', '/cart', '/wishlist', '/login', '/register', '/forgot-password', '/reset-password', '/verify-otp'];
  const isPublicPage = publicPages.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p)));
  if (!isPublicPage) {
    window.location.href = '/login';
  }
};

/** Generic API error */
export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/** Safely parse JSON response with clear error messages if HTML or malformed data is returned */
const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text || !text.trim()) {
    return undefined as T;
  }
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
    console.error(`[API Error] Received HTML response instead of JSON from: ${response.url}`, text.slice(0, 300));
    throw new ApiError(
      response.status,
      `API server returned an HTML page instead of JSON (HTTP ${response.status}). ` +
      `Please ensure your backend service on Railway is running and that VITE_API_URL is properly configured to your backend domain.`
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(`[API Error] Failed to parse JSON from: ${response.url}`, err, text.slice(0, 300));
    throw new ApiError(
      response.status,
      `Failed to parse server response as JSON (HTTP ${response.status}).`
    );
  }
};

/** Parse error response from FastAPI */
const parseError = async (response: Response): Promise<ApiError> => {
  try {
    const text = await response.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE')) {
      return new ApiError(
        response.status,
        `Backend service returned an HTML error page (HTTP ${response.status}). The backend on Railway may be starting up, crashed, or unreachable.`
      );
    }
    const data = JSON.parse(text);
    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : JSON.stringify(data.detail) || 'An unexpected error occurred';
    return new ApiError(response.status, detail);
  } catch {
    return new ApiError(response.status, response.statusText || 'An unexpected error occurred');
  }
};

const safeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  try {
    return await fetch(input, init);
  } catch (err: unknown) {
    // If request failed and URL contains localhost:8000, fallback to 127.0.0.1:8000
    if (typeof input === 'string' && input.includes('localhost:8000')) {
      try {
        const fallbackUrl = input.replace('localhost:8000', '127.0.0.1:8000');
        return await fetch(fallbackUrl, init);
      } catch {}
    } else if (input instanceof URL && input.host === 'localhost:8000') {
      try {
        const fallbackUrl = new URL(input.toString().replace('localhost:8000', '127.0.0.1:8000'));
        return await fetch(fallbackUrl, init);
      } catch {}
    }
    console.warn('safeFetch connection error:', err, input);
    throw new ApiError(
      0,
      'Unable to connect to the backend API server. Please verify your network connection or that the API service is reachable.'
    );
  }
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

const fetchCsrfToken = async (): Promise<string | null> => {
  const cookieToken = getCookie('csrf_token');
  if (cookieToken) {
    csrfToken = cookieToken;
    return csrfToken;
  }
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = safeFetch(`${BASE_URL}/auth/csrf`, {
      method: 'GET',
      headers: buildHeaders(),
      credentials: 'include',
    }).then(async (res) => {
      csrfPromise = null;
      if (res.ok) {
        try {
          const text = await res.text();
          if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);
            csrfToken = data.csrf_token || getCookie('csrf_token');
            return csrfToken;
          }
        } catch {}
      }
      return null;
    }).catch(() => {
      csrfPromise = null;
      return null;
    });
  }
  return csrfPromise;
};

let refreshPromise: Promise<boolean> | null = null;

const fetchWithAuth = async (path: string, init: RequestInit & { _isCsrfRetry?: boolean }): Promise<Response> => {
  const token = getAuthToken();
  if (token) {
    init.headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  const method = init.method || 'GET';
  if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())) {
    const csrfTok = await fetchCsrfToken();
    if (csrfTok) {
      init.headers = {
        ...init.headers,
        'x-csrf-token': csrfTok,
      };
    }
  }

  let response = await safeFetch(`${BASE_URL}${path}`, init);

  if (response.status === 403 && !init._isCsrfRetry) {
    const clone = response.clone();
    try {
      const data = await clone.json();
      if (data?.detail === 'CSRF token validation failed') {
        csrfToken = null;
        const newToken = await fetchCsrfToken();
        if (newToken) {
          init.headers = {
            ...init.headers,
            'x-csrf-token': newToken,
          };
          init._isCsrfRetry = true;
          response = await safeFetch(`${BASE_URL}${path}`, init);
        }
      }
    } catch {}
  }

  if (
    response.status === 401 && 
    !path.includes('/auth/refresh') && 
    !path.includes('/auth/login') && 
    !path.includes('/auth/register') &&
    Boolean(getAuthToken())
  ) {
    if (!refreshPromise) {
      refreshPromise = safeFetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: buildHeaders(),
        credentials: 'include',
      }).then(res => {
        refreshPromise = null;
        return res.ok;
      }).catch(() => {
        refreshPromise = null;
        return false;
      });
    }

    const refreshSuccess = await refreshPromise;
    if (refreshSuccess) {
      // Retry original request
      response = await safeFetch(`${BASE_URL}${path}`, init);
    } else {
      setAuthToken(null);
    }
  }

  if (response.status === 401) {
    handleUnauthorized(path);
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response;
};

/** Core GET request */
export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  });
  return parseJsonResponse<T>(response);
};

/** GET request that returns text/html */
export const apiGetHtml = async (path: string): Promise<string> => {
  const response = await fetchWithAuth(path, {
    method: 'GET',
    headers: { 'Accept': 'text/html' },
    credentials: 'include',
  });
  return response.text();
};

/** Core POST request (JSON body) */
export const apiPost = async <T>(path: string, body?: unknown): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'POST',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }
  return parseJsonResponse<T>(response);
};

/** Core POST request with FormData (multipart/form-data) */
export const apiPostFormData = async <T>(path: string, formData: FormData): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'POST',
    headers: buildHeaders(true),
    credentials: 'include',
    body: formData,
  });
  return parseJsonResponse<T>(response);
};

/** Core PATCH request (JSON body) */
export const apiPatch = async <T>(path: string, body?: unknown): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'PATCH',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseJsonResponse<T>(response);
};

/** Core PATCH request with FormData (multipart) */
export const apiPatchFormData = async <T>(path: string, formData: FormData): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'PATCH',
    headers: buildHeaders(true),
    credentials: 'include',
    body: formData,
  });
  return parseJsonResponse<T>(response);
};

/** Core PUT request (JSON body) */
export const apiPut = async <T>(path: string, body?: unknown): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'PUT',
    headers: buildHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return parseJsonResponse<T>(response);
};

/** Core DELETE request */
export const apiDelete = async <T>(path: string): Promise<T> => {
  const response = await fetchWithAuth(path, {
    method: 'DELETE',
    headers: buildHeaders(),
    credentials: 'include',
  });

  if (response.status === 204) {
    return undefined as T;
  }
  return parseJsonResponse<T>(response);
};

/** Get response as Blob (for PDF downloads) */
export const apiGetBlob = async (path: string): Promise<Blob> => {
  const response = await fetchWithAuth(path, {
    method: 'GET',
    headers: buildHeaders(),
    credentials: 'include',
  });
  return response.blob();
};

