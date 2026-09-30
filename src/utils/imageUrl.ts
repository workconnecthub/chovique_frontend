/**
 * Resolves image URLs for any storage backend.
 *
 * Handles all URL forms that can be stored in the DB:
 *  1. Absolute URLs (https://neat-crate.t3.storageapi.dev/..., https://res.cloudinary.com/...) → pass through unchanged
 *  2. Relative media-proxy paths (/api/v1/media/...) → prepend the backend base from VITE_API_URL
 *  3. Bare S3 keys (chocolate-world/banners/xxx.png) → prepend the backend base + /api/v1/media/
 *  4. null / empty → return default placeholder
 */
export const getImageUrl = (url?: string | null): string => {
  if (!url || !url.trim()) {
    return 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=600&q=80';
  }

  // Derive backend base URL from VITE_API_URL (strips the trailing /api/v1)
  const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  let backendBase = rawApiUrl
    ? rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
    : 'http://127.0.0.1:8000';
  if (backendBase.includes('localhost:8000')) {
    backendBase = backendBase.replace('localhost:8000', '127.0.0.1:8000');
  }

  // If URL points to private Tigris endpoint (which returns 403 on direct browser access),
  // route it through the backend media proxy presigned URL redirect
  if (url.includes('storageapi.dev/')) {
    const keyMatch = url.match(/storageapi\.dev\/(.+)$/);
    if (keyMatch && keyMatch[1]) {
      return `${backendBase}/api/v1/media/${keyMatch[1].replace(/^\/+/, '')}`;
    }
  }

  // Already an absolute URL (Cloudinary, Unsplash, Google user content, data URI, blob, etc.)
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Relative path starting with / (e.g. /api/v1/media/..., /static/...)
  if (url.startsWith('/')) {
    return `${backendBase}${url}`;
  }

  // Bare S3 key without leading slash (e.g. chocolate-world/banners/xxx.png)
  return `${backendBase}/api/v1/media/${url}`;
};

