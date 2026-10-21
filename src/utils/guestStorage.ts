/**
 * Guest Storage & Session Identity Utility
 *
 * Implements a persistent, cryptographically secure guest shopping session
 * with a configurable 30-day sliding retention policy.
 *
 * Requirements:
 * - Cryptographically random UUID identifier (via crypto.randomUUID or getRandomValues fallback)
 * - Versioned localStorage structure (key: chovique_guest_session_v1)
 * - Sliding 30-day retention extended on meaningful activity (cart/wishlist changes)
 * - Transparent migration from legacy unversioned storage
 * - Resilient against corrupted/tampered storage (graceful fallback)
 * - Separation from authentication credentials (no secrets in URLs/analytics/logs)
 */

export const GUEST_STORAGE_KEY = 'chovique_guest_session_v1';
export const LEGACY_CART_KEY = 'chovique_guest_cart';
export const LEGACY_WISHLIST_KEY = 'chovique_guest_wishlist';
export const DEFAULT_RETENTION_DAYS = 30;
export const RETENTION_MS = DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export interface StoredGuestCartItem {
  productId: string;
  quantity: number;
  addedAt: string;
  selectedOptions?: Record<string, any>;
}

export interface StoredGuestWishlistItem {
  productId: string;
  addedAt: string;
}

export interface GuestSessionData {
  version: number;
  guestId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  cart: StoredGuestCartItem[];
  wishlist: StoredGuestWishlistItem[];
}

/**
 * Generate a cryptographically secure random UUID v4 string.
 */
export function generateGuestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to getRandomValues
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Pure fallback if crypto is unavailable
  return 'g-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11);
}

/**
 * Create a fresh, empty guest session structure.
 */
function createNewGuestSession(): GuestSessionData {
  const now = new Date();
  const expires = new Date(now.getTime() + RETENTION_MS);
  return {
    version: 1,
    guestId: generateGuestId(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    cart: [],
    wishlist: [],
  };
}

/**
 * Migrate legacy unversioned localStorage items if present.
 */
function migrateLegacyStorage(session: GuestSessionData): boolean {
  let changed = false;

  try {
    const legacyCart = localStorage.getItem(LEGACY_CART_KEY);
    if (legacyCart) {
      const parsed = JSON.parse(legacyCart);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const prodId = item?.product?.id || item?.productId || item?.id;
          const qty = Number(item?.quantity) || 1;
          if (prodId && qty > 0) {
            const existing = session.cart.find((c) => c.productId === prodId);
            if (existing) {
              existing.quantity = Math.max(existing.quantity, qty);
            } else {
              session.cart.push({
                productId: String(prodId),
                quantity: qty,
                addedAt: new Date().toISOString(),
              });
            }
            changed = true;
          }
        }
      }
      localStorage.removeItem(LEGACY_CART_KEY);
    }
  } catch {
    // Ignore legacy parsing errors
  }

  try {
    const legacyWish = localStorage.getItem(LEGACY_WISHLIST_KEY);
    if (legacyWish) {
      const parsed = JSON.parse(legacyWish);
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const item of parsed) {
          const prodId = item?.id || item?.productId;
          if (prodId && !session.wishlist.some((w) => w.productId === prodId)) {
            session.wishlist.push({
              productId: String(prodId),
              addedAt: new Date().toISOString(),
            });
            changed = true;
          }
        }
      }
      localStorage.removeItem(LEGACY_WISHLIST_KEY);
    }
  } catch {
    // Ignore legacy parsing errors
  }

  return changed;
}

/**
 * Read the current guest session from localStorage.
 * Automatically validates expiration (30-day retention), schema version, and migrates legacy data.
 */
export function getGuestSession(): GuestSessionData {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.version === 1 && parsed.guestId) {
        // Check retention expiry
        const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : 0;
        if (expiresAt > Date.now()) {
          // Valid active session
          if (!Array.isArray(parsed.cart)) parsed.cart = [];
          if (!Array.isArray(parsed.wishlist)) parsed.wishlist = [];

          if (migrateLegacyStorage(parsed)) {
            saveGuestSessionRaw(parsed);
          }
          return parsed;
        }
      }
    }
  } catch {
    // Malformed storage: reset safely
  }

  // Create new session if none exists or expired
  const newSession = createNewGuestSession();
  migrateLegacyStorage(newSession);
  saveGuestSessionRaw(newSession);
  return newSession;
}

/**
 * Raw write helper that handles quota or private browsing exceptions safely.
 */
function saveGuestSessionRaw(session: GuestSessionData): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('[Chovique] Failed to persist guest session to localStorage:', err);
  }
}

/**
 * Save guest cart items to storage and extend the 30-day retention period.
 */
export function persistGuestCart(
  cartItems: { product: { id: string }; quantity: number; selectedOptions?: Record<string, any> }[]
): void {
  const session = getGuestSession();
  const now = new Date();
  const expires = new Date(now.getTime() + RETENTION_MS);

  session.updatedAt = now.toISOString();
  session.expiresAt = expires.toISOString();
  session.cart = cartItems
    .filter((item) => item.product?.id && item.quantity > 0)
    .map((item) => ({
      productId: item.product.id,
      quantity: Math.max(1, Math.floor(item.quantity)),
      addedAt: now.toISOString(),
      selectedOptions: item.selectedOptions,
    }));

  saveGuestSessionRaw(session);
}

/**
 * Save guest wishlist items to storage and extend the 30-day retention period.
 */
export function persistGuestWishlist(wishlistProducts: { id: string }[]): void {
  const session = getGuestSession();
  const now = new Date();
  const expires = new Date(now.getTime() + RETENTION_MS);

  session.updatedAt = now.toISOString();
  session.expiresAt = expires.toISOString();

  // Deduplicate product IDs
  const seen = new Set<string>();
  session.wishlist = [];
  for (const p of wishlistProducts) {
    if (p?.id && !seen.has(p.id)) {
      seen.add(p.id);
      session.wishlist.push({
        productId: p.id,
        addedAt: now.toISOString(),
      });
    }
  }

  saveGuestSessionRaw(session);
}

/**
 * Clear guest cart and wishlist upon confirmed successful account synchronization.
 * Preserves the guestId identifier for consistent logging/tracking if needed.
 */
export function clearGuestShoppingData(): void {
  try {
    const session = getGuestSession();
    session.cart = [];
    session.wishlist = [];
    session.updatedAt = new Date().toISOString();
    saveGuestSessionRaw(session);

    localStorage.removeItem(LEGACY_CART_KEY);
    localStorage.removeItem(LEGACY_WISHLIST_KEY);
  } catch {
    // Non-fatal
  }
}

/**
 * Helper to get list of cart items formatted for synchronization with the backend.
 */
export function getGuestCartForSync(): { product_id: string; quantity: number }[] {
  const session = getGuestSession();
  return session.cart.map((c) => ({
    product_id: c.productId,
    quantity: c.quantity,
  }));
}

/**
 * Helper to get list of wishlist IDs formatted for synchronization with the backend.
 */
export function getGuestWishlistForSync(): string[] {
  const session = getGuestSession();
  return session.wishlist.map((w) => w.productId);
}
