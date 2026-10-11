import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Product,
  CartItem,
  User,
  UserRole,
  Order,
  Banner,
  OfflineSale,
  SupportTicket,
  CustomerAddress,
  SupportNotification,
  StoreConfig,
} from '../types';
import { authService } from '../services/authService';
import { cartService, BackendCartItem } from '../services/cartService';
import { wishlistService } from '../services/wishlistService';
import { homeService } from '../services/homeService';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import { notificationService } from '../services/notificationService';
import { walletService, UserWallet } from '../services/walletService';
import { ApiError, getAuthToken } from '../lib/api';

// =============================================================================
// THEME INTERFACE & TOKENS
// =============================================================================

export interface AppTheme {
  primary: string;
  darkChocolate: string;
  gold: string;
  roseGold: string;
  black: string;
  surface: string;
  text: string;

  // Granular Component Colors
  buttonColor: string;
  buttonTextColor: string;
  secondaryButtonColor: string;
  cartColor: string;
  cartTextColor: string;
  productCardColor: string;
  productCardBorderColor: string;
  productCardTextColor: string;
  navbarColor: string;
  navbarTextColor: string;
  footerColor: string;
  footerTextColor: string;

  // Typography & Number Fonts
  fontFamily: string;
  headingFontFamily: string;
  numberFontFamily: string;
}

// =============================================================================
// CONTEXT INTERFACE
// =============================================================================

interface AppContextType {
  // Auth
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  role: UserRole;
  isAuthLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  googleLogin: (idToken: string) => Promise<{ success: boolean; error?: string; role?: UserRole; user?: User }>;
  setPassword: (password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, otp: string, fullName: string, password: string) => Promise<{ success: boolean; error?: string; status?: number }>;
  logout: () => Promise<void>;

  // Products
  products: Product[];
  banners: Banner[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  refreshBanners?: () => Promise<void>;
  addBanner?: (banner: Banner) => void;
  deleteBannerState?: (id: string) => void;

  // Orders
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  offlineSales: OfflineSale[];
  setOfflineSales: React.Dispatch<React.SetStateAction<OfflineSale[]>>;

  // Store Configuration
  storeConfig: StoreConfig | null;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, quantity: number) => Promise<void>;
  updateCartQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;

  // Wishlist
  wishlist: Product[];
  toggleWishlist: (product: Product) => Promise<void>;
  moveToCart: (product: Product) => Promise<void>;

  // Orders
  placeOrderLocal: (order: Order) => void;

  // Admin product operations
  addProduct: (product: any) => void;
  updateProductInventory: (productId: string, weight: string, price: number, stock?: number) => void;
  deleteProduct: (productId: string) => void;

  // Admin offline sales
  addOfflineSale: (sale: Omit<OfflineSale, 'id' | 'date'>) => void;
  importOfflineSales: (salesList: Omit<OfflineSale, 'id' | 'date'>[]) => void;

  // Banners
  updateBanner: (id: string, bannerData: Partial<Banner>) => void;

  // Theme
  theme: AppTheme;
  updateThemeColors: (colors: Partial<AppTheme>) => void;

  // Support Tickets
  tickets: SupportTicket[];
  addSupportTicket: (category: SupportTicket['category'], description: string, orderId?: string) => Promise<void>;
  resolveSupportTicket: (ticketId: string, adminNotes?: string) => Promise<void>;
  updateSupportTicketStatus: (ticketId: string, status: string, adminNotes?: string) => Promise<void>;
  submitTicketFeedback: (ticketId: string, feedback: 'Resolved' | 'Not Resolved') => Promise<void>;
  acknowledgeTicketNotification: (ticketId: string) => void;

  // Profile
  updateUserProfilePicture: (avatarUrl: string) => void;
  updateUserProfile: (profile: {
    name?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    preferences?: string;
  }) => Promise<void>;

  // Addresses
  addresses: CustomerAddress[];
  addAddress: (address: Omit<CustomerAddress, 'id'>) => Promise<void>;
  updateAddress: (id: string, address: Partial<Omit<CustomerAddress, 'id'>>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  setDefaultAddress: (id: string) => Promise<void>;

  // Wallet & Rewards
  wallet: UserWallet | null;
  refreshWallet: () => Promise<void>;

  // Notifications
  notifications: SupportNotification[];
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (
    text: string,
    type: SupportNotification['type'],
    referenceId?: string
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const defaultTheme: AppTheme = {
  primary: '#5A3825',
  darkChocolate: '#1A0D00',
  gold: '#D4AF37',
  roseGold: '#B76E79',
  black: '#0D090A',
  surface: '#1A1716',
  text: '#F7F7F7',

  buttonColor: '#5A3825',
  buttonTextColor: '#FFFFFF',
  secondaryButtonColor: '#D4AF37',
  cartColor: '#D4AF37',
  cartTextColor: '#0D090A',
  productCardColor: '#1A1716',
  productCardBorderColor: '#D4AF37',
  productCardTextColor: '#F7F7F7',
  navbarColor: '#0D090A',
  navbarTextColor: '#F7F7F7',
  footerColor: '#0A0A0A',
  footerTextColor: '#F7F7F7',

  fontFamily: 'Outfit',
  headingFontFamily: 'Playfair Display',
  numberFontFamily: 'Outfit',
};

export const normalizeTheme = (data: any): AppTheme => {
  if (!data || typeof data !== 'object') return defaultTheme;
  return {
    primary: data.primary_brand_color || data.primary || defaultTheme.primary,
    darkChocolate: data.background_color || data.darkChocolate || defaultTheme.darkChocolate,
    gold: data.luxury_gold_color || data.gold || defaultTheme.gold,
    roseGold: data.secondary_accent_color || data.roseGold || defaultTheme.roseGold,
    black: data.background_color || data.black || defaultTheme.black,
    surface: data.surface_color || data.surface || defaultTheme.surface,
    text: data.text_color || data.text || defaultTheme.text,

    buttonColor: data.button_color || data.buttonColor || data.primary_brand_color || defaultTheme.buttonColor,
    buttonTextColor: data.button_text_color || data.buttonTextColor || defaultTheme.buttonTextColor,
    secondaryButtonColor: data.secondary_button_color || data.secondaryButtonColor || data.luxury_gold_color || defaultTheme.secondaryButtonColor,
    cartColor: data.cart_color || data.cartColor || data.luxury_gold_color || defaultTheme.cartColor,
    cartTextColor: data.cart_text_color || data.cartTextColor || defaultTheme.cartTextColor,
    productCardColor: data.product_card_color || data.productCardColor || data.surface_color || defaultTheme.productCardColor,
    productCardBorderColor: data.product_card_border_color || data.productCardBorderColor || data.luxury_gold_color || defaultTheme.productCardBorderColor,
    productCardTextColor: data.product_card_text_color || data.productCardTextColor || data.text_color || defaultTheme.productCardTextColor,
    navbarColor: data.navbar_color || data.navbarColor || data.background_color || defaultTheme.navbarColor,
    navbarTextColor: data.navbar_text_color || data.navbarTextColor || data.text_color || defaultTheme.navbarTextColor,
    footerColor: data.footer_color || data.footerColor || defaultTheme.footerColor,
    footerTextColor: data.footer_text_color || data.footerTextColor || data.text_color || defaultTheme.footerTextColor,

    fontFamily: data.font_family || data.fontFamily || defaultTheme.fontFamily,
    headingFontFamily: data.heading_font_family || data.headingFontFamily || defaultTheme.headingFontFamily,
    numberFontFamily: data.number_font_family || data.numberFontFamily || defaultTheme.numberFontFamily,
  };
};

// =============================================================================
// PROVIDER
// =============================================================================

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cartOpIdRef = React.useRef(0);
  const wishlistOpIdRef = React.useRef(0);

  // ---------------------------------------------------------------------------
  // Auth State
  // ---------------------------------------------------------------------------

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('guest');
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  useEffect(() => {
    // Fetch public store configuration once on mount
    homeService.getStoreConfig()
      .then(config => setStoreConfig(config))
      .catch(err => console.error("Failed to fetch store config:", err));
  }, []);

  /**
   * On mount: attempt to rehydrate the session from httpOnly cookies.
   * GET /users/me succeeds if the access cookie is valid.
   * On 401, user stays as guest — the handleUnauthorized in api.ts will NOT
   * redirect on /login pages, so this is safe to call unconditionally.
   */
  useEffect(() => {
    const rehydrate = async () => {
      const token = getAuthToken();
      if (!token) {
        // No saved session token — visitor is a guest, avoid unnecessary 401 network calls
        setUser(null);
        setRole('guest');
        setIsAuthLoading(false);
        return;
      }

      try {
        const freshUser = await authService.getMe();
        setUser(freshUser);
        setRole(freshUser.role as UserRole);
      } catch {
        // 401 or invalid token = no valid session — guest mode
        setUser(null);
        setRole('guest');
      } finally {
        setIsAuthLoading(false);
      }
    };

    rehydrate();
  }, []);

  // ---------------------------------------------------------------------------
  // Theme State & Persistence (Backend PostgreSQL as Source of Truth)
  // ---------------------------------------------------------------------------

  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('chovique_theme');
      return saved ? normalizeTheme(JSON.parse(saved)) : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    // 1. Fetch active theme from backend
    homeService.getTheme()
      .then((data) => {
        if (data && typeof data === 'object') {
          setTheme(normalizeTheme(data));
        }
      })
      .catch((err) => console.error('Failed to load active theme from backend', err));

    // 2. Listen to custom event when theme is updated from Superadmin Theme Management
    const handleThemeUpdate = (e: any) => {
      if (e.detail) {
        setTheme(normalizeTheme(e.detail));
      }
    };
    window.addEventListener('chovique:theme-updated', handleThemeUpdate);

    // 3. Multi-tab synchronization via localStorage storage event
    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'chovique_theme' && e.newValue) {
        try {
          setTheme(normalizeTheme(JSON.parse(e.newValue)));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageUpdate);

    return () => {
      window.removeEventListener('chovique:theme-updated', handleThemeUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Product State — fetched by individual pages via productService.
  // Kept in context so admin dashboard and landing page can share state.
  // ---------------------------------------------------------------------------

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    productService.getProducts({ per_page: 50 })
      .then((result) => setProducts(result.items))
      .catch(() => {
        // Keep empty products — home page sections will render nothing until available
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Banner State — fetched from backend on mount
  // ---------------------------------------------------------------------------

  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    homeService.getBanners()
      .then((result) => setBanners(result))
      .catch(() => {
        // Keep empty banners — Hero will render nothing until available
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Order State — fetched from service after login
  // ---------------------------------------------------------------------------

  const [orders, setOrders] = useState<Order[]>([]);
  const [offlineSales, setOfflineSales] = useState<OfflineSale[]>([]);

  // ---------------------------------------------------------------------------
  // Cart State — backend-persistent
  // ---------------------------------------------------------------------------

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('chovique_guest_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage in sync for guests
  useEffect(() => {
    if (role === 'guest' && cart.length > 0) {
      localStorage.setItem('chovique_guest_cart', JSON.stringify(cart));
    }
  }, [cart, role]);

  /**
   * Sync cart from backend response into local CartItem[] format.
   * BackendCartItem has { product_id, quantity, product: {...} }
   */
  const syncCartFromBackend = useCallback((items: BackendCartItem[]) => {
    const cartItems: CartItem[] = items.map((item) => ({
      product: item.product as unknown as Product,
      quantity: item.quantity,
    }));
    setCart(cartItems);
  }, []);

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('chovique_guest_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep localStorage in sync for guest wishlist
  useEffect(() => {
    if (role === 'guest' && wishlist.length > 0) {
      localStorage.setItem('chovique_guest_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, role]);

  // ---------------------------------------------------------------------------
  // Support Tickets — fetched after login
  // ---------------------------------------------------------------------------

  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // ---------------------------------------------------------------------------
  // Addresses — fetched from service after login
  // ---------------------------------------------------------------------------

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  // ---------------------------------------------------------------------------
  // Wallet & Rewards
  // ---------------------------------------------------------------------------

  const [wallet, setWallet] = useState<UserWallet | null>(null);

  const refreshWallet = useCallback(async () => {
    if (role === 'guest') return;
    try {
      const res = await walletService.getWallet();
      setWallet(res);
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, [role]);

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  const [notifications, setNotifications] = useState<SupportNotification[]>([]);

  // ---------------------------------------------------------------------------
  // Auth Handlers — connected to FastAPI backend via authService
  // ---------------------------------------------------------------------------

  const mergeGuestSession = async () => {
    // Merge guest cart
    try {
      const savedCart = localStorage.getItem('chovique_guest_cart');
      if (savedCart) {
        const guestCart = JSON.parse(savedCart);
        if (guestCart.length > 0) {
          const itemsToSync = guestCart.map((item: any) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          }));
          await cartService.syncCart(itemsToSync);
        }
      }
    } catch (e) {
      console.error('Failed to merge guest cart', e);
    } finally {
      localStorage.removeItem('chovique_guest_cart');
    }

    // Merge guest wishlist
    try {
      const savedWish = localStorage.getItem('chovique_guest_wishlist');
      if (savedWish) {
        const guestWishlist: Product[] = JSON.parse(savedWish);
        if (guestWishlist.length > 0) {
          for (const item of guestWishlist) {
            try {
              await wishlistService.addToWishlist(item.id);
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error('Failed to merge guest wishlist', e);
    } finally {
      localStorage.removeItem('chovique_guest_wishlist');
    }
  };

  const refreshUserCartAndWishlist = async () => {
    const cOpId = ++cartOpIdRef.current;
    try {
      const cartRes = await cartService.getCart();
      if (cOpId === cartOpIdRef.current) syncCartFromBackend(cartRes.items);
    } catch (e) {
      console.error('Failed to fetch cart on login', e);
    }
    const wOpId = ++wishlistOpIdRef.current;
    try {
      const wishRes = await wishlistService.getWishlist();
      if (wOpId === wishlistOpIdRef.current) setWishlist(wishRes.map((i) => i.product));
    } catch (e) {
      console.error('Failed to fetch wishlist on login', e);
    }
  };

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      try {
        const response = await authService.login({ email, password });
        const loggedInUser = response.user as User;
        setUser(loggedInUser);
        setRole(loggedInUser.role);
        
        await mergeGuestSession();
        await refreshUserCartAndWishlist();

        return { success: true, role: loggedInUser.role };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
        return { success: false, error: message };
      }
    },
    [syncCartFromBackend]
  );

  const register = useCallback(
    async (name: string, email: string, password: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> => {
      try {
        await authService.register({ name, email, password, confirmPassword });
        return { success: true };
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Registration failed. Please try again.';
        return { success: false, error: message };
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (email: string, otp: string, fullName: string, password: string): Promise<{ success: boolean; error?: string; status?: number }> => {
      try {
        const response = await authService.verifyOtp({ email, otp, fullName, password });
        const newUser = response.user as User;
        setUser(newUser);
        setRole(newUser.role);
        
        await mergeGuestSession();
        await refreshUserCartAndWishlist();

        return { success: true };
      } catch (err: unknown) {
        let message = 'OTP verification failed. Please try again.';
        let status = 0;
        if (err instanceof ApiError) {
          message = err.detail;
          status = err.status;
        } else if (err instanceof Error) {
          message = err.message;
        }
        return { success: false, error: message, status };
      }
    },
    [syncCartFromBackend]
  );

  const googleLogin = useCallback(
    async (idToken: string): Promise<{ success: boolean; error?: string; role?: UserRole; user?: User }> => {
      try {
        const response = await authService.googleSignIn(idToken);
        if (response.user) {
          const loggedInUser = response.user as User;
          setUser(loggedInUser);
          setRole(loggedInUser.role);
          
          await mergeGuestSession();
          await refreshUserCartAndWishlist();

          return { success: true, role: loggedInUser.role, user: loggedInUser };
        }
        return { success: false, error: response.message || 'Google Sign-In failed.' };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google Sign-In failed.';
        return { success: false, error: message };
      }
    },
    [syncCartFromBackend]
  );

  const setPassword = useCallback(
    async (password: string, confirmPassword: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const response = await authService.setPassword(password, confirmPassword);
        if (response.user) {
          setUser(response.user as User);
        }
        return { success: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to set password.';
        return { success: false, error: message };
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch {
      // Best-effort server-side logout — always clear local state
    } finally {
      localStorage.removeItem('chovique_guest_cart');
      localStorage.removeItem('chovique_guest_wishlist');
      sessionStorage.clear();
      setUser(null);
      setRole('guest');
      setCart([]);
      setWishlist([]);
      setOrders([]);
      setTickets([]);
      setAddresses([]);
      setNotifications([]);
      window.location.href = '/';
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch user-scoped data after auth resolves
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isAuthLoading || role === 'guest') return;

    // Fetch orders from backend
    orderService.getOrders().then((res) => setOrders(res)).catch(() => { });

    // Fetch tickets (admin sees all site-wide tickets, user sees personal tickets)
    if (['admin', 'superadmin'].includes(role)) {
      ticketService.getAllTickets().then((res) => setTickets(res)).catch(() => { });
    } else {
      ticketService.getTickets().then((res) => setTickets(res)).catch(() => { });
    }

    // Fetch addresses
    userService.getAddresses().then((res) => setAddresses(res)).catch(() => { });

    // Fetch notifications
    notificationService.getNotifications().then((res) => setNotifications(res)).catch(() => { });

    // Fetch cart
    const cOpId = ++cartOpIdRef.current;
    cartService.getCart().then((res) => {
      if (cOpId === cartOpIdRef.current) syncCartFromBackend(res.items);
    }).catch(() => { });

    // Fetch wishlist
    const wOpId = ++wishlistOpIdRef.current;
    wishlistService.getWishlist()
      .then((items) => {
        if (wOpId === wishlistOpIdRef.current) setWishlist(items.map((i) => i.product));
      })
      .catch(() => { });

    // Fetch wallet
    refreshWallet();

  }, [isAuthLoading, role, syncCartFromBackend, refreshWallet]);

  // ---------------------------------------------------------------------------
  // Side Effects — persist intentional client-side state to localStorage
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const root = document.documentElement;

    const hexToRgb = (hex: string): string => {
      const clean = (hex || '').replace('#', '').trim();
      if (clean.length === 3) {
        const r = parseInt(clean[0] + clean[0], 16);
        const g = parseInt(clean[1] + clean[1], 16);
        const b = parseInt(clean[2] + clean[2], 16);
        return `${r}, ${g}, ${b}`;
      }
      const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
      return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '201, 168, 76';
    };

    const adjustBrightness = (hex: string, percent: number): string => {
      try {
        const clean = (hex || '').replace('#', '').trim();
        const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
        if (isNaN(num)) return hex;
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, Math.max(0, (num >> 16) + amt));
        const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
        const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
        return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1).toUpperCase()}`;
      } catch {
        return hex;
      }
    };

    const primary = theme.primary || '#5A3825';
    const darkChocolate = theme.darkChocolate || '#1A0D00';
    const black = theme.black || '#0D090A';
    const surface = theme.surface || '#1A1716';
    const gold = theme.gold || '#D4AF37';
    const text = theme.text || '#F7F7F7';
    const roseGold = theme.roseGold || '#B76E79';

    const goldLight = adjustBrightness(gold, 22);
    const goldDark = adjustBrightness(gold, -22);
    const beige = adjustBrightness(text, -18);
    const greyLight = adjustBrightness(text, -35);

    const primaryRgb = hexToRgb(primary);
    const darkChocolateRgb = hexToRgb(black || darkChocolate);
    const goldRgb = hexToRgb(gold);
    const surfaceRgb = hexToRgb(surface);
    const blackRgb = hexToRgb(black);
    const textRgb = hexToRgb(text);

    // Core Colors & RGBs
    root.style.setProperty('--chocolate-brown', primary);
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-rgb', primaryRgb);

    root.style.setProperty('--dark-chocolate', darkChocolate);
    root.style.setProperty('--dark-chocolate-rgb', darkChocolateRgb);

    root.style.setProperty('--black', black);
    root.style.setProperty('--black-rgb', blackRgb);
    root.style.setProperty('--bg-color', black);

    root.style.setProperty('--surface-color', surface);
    root.style.setProperty('--surface-rgb', surfaceRgb);
    root.style.setProperty('--card-bg', surface);
    root.style.setProperty('--panel-bg', surface);

    root.style.setProperty('--gold', gold);
    root.style.setProperty('--gold-rgb', goldRgb);
    root.style.setProperty('--gold-light', goldLight);
    root.style.setProperty('--gold-dark', goldDark);

    root.style.setProperty('--rose-gold', roseGold);
    root.style.setProperty('--cream', text);
    root.style.setProperty('--text-color', text);
    root.style.setProperty('--text-rgb', textRgb);
    root.style.setProperty('--beige', beige);
    root.style.setProperty('--grey-light', greyLight);

    // Granular Component Variables
    root.style.setProperty('--button-bg', theme.buttonColor || primary);
    root.style.setProperty('--button-text', theme.buttonTextColor || '#FFFFFF');
    root.style.setProperty('--button-secondary', theme.secondaryButtonColor || gold);
    root.style.setProperty('--cart-color', theme.cartColor || gold);
    root.style.setProperty('--cart-text', theme.cartTextColor || black);
    root.style.setProperty('--product-card-bg', theme.productCardColor || surface);
    root.style.setProperty('--product-card-border', theme.productCardBorderColor || `rgba(${goldRgb}, 0.3)`);
    root.style.setProperty('--product-card-text', theme.productCardTextColor || text);
    root.style.setProperty('--navbar-bg', theme.navbarColor || black);
    root.style.setProperty('--navbar-text', theme.navbarTextColor || text);
    root.style.setProperty('--footer-bg', theme.footerColor || '#0A0A0A');
    root.style.setProperty('--footer-text', theme.footerTextColor || text);

    // Dynamic Gradients
    root.style.setProperty('--gradient-gold', `linear-gradient(135deg, ${gold}, ${goldLight}, ${gold})`);
    root.style.setProperty('--gradient-gold-text', `linear-gradient(135deg, ${goldLight}, ${gold}, ${goldDark})`);
    root.style.setProperty('--gradient-hero', `linear-gradient(135deg, ${black} 0%, ${darkChocolate} 40%, ${primary} 100%)`);
    root.style.setProperty('--gradient-section-1', `linear-gradient(160deg, ${darkChocolate} 0%, ${primary} 100%)`);
    root.style.setProperty('--gradient-section-2', `linear-gradient(135deg, ${surface} 0%, ${black} 100%)`);
    root.style.setProperty('--gradient-section-3', `linear-gradient(160deg, ${primary} 0%, ${darkChocolate} 50%, ${black} 100%)`);
    root.style.setProperty('--gradient-section-4', `linear-gradient(135deg, ${surface} 0%, ${darkChocolate} 100%)`);
    root.style.setProperty('--gradient-section-5', `linear-gradient(160deg, ${black} 0%, ${darkChocolate} 40%, ${primary} 100%)`);
    root.style.setProperty('--gradient-section-6', `linear-gradient(135deg, ${surface} 0%, ${black} 100%)`);
    root.style.setProperty('--gradient-section-7', `linear-gradient(160deg, ${darkChocolate} 0%, ${black} 60%, ${primary} 100%)`);
    root.style.setProperty('--gradient-footer', `linear-gradient(180deg, ${theme.footerColor || black} 0%, ${darkChocolate} 100%)`);

    // Dynamic Glassmorphism
    root.style.setProperty('--glass-bg', `rgba(${darkChocolateRgb}, 0.75)`);
    root.style.setProperty('--glass-border', `rgba(${goldRgb}, 0.22)`);
    root.style.setProperty('--glass-shadow', `0 8px 32px rgba(0, 0, 0, 0.45)`);

    // Typography & Number Fonts
    const bodyFontVal = `"${theme.fontFamily || 'Outfit'}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const headingFontVal = `"${theme.headingFontFamily || 'Playfair Display'}", Georgia, "Times New Roman", serif`;
    const numberFontVal = `"${theme.numberFontFamily || 'Outfit'}", "${theme.fontFamily || 'Outfit'}", monospace, sans-serif`;

    root.style.setProperty('--font-body', bodyFontVal);
    root.style.setProperty('--font-display', headingFontVal);
    root.style.setProperty('--font-elegant', headingFontVal);
    root.style.setProperty('--font-number', numberFontVal);

    if (document.body) {
      document.body.style.fontFamily = bodyFontVal;
      document.body.style.backgroundColor = black;
      document.body.style.color = text;
    }

    // Dynamic Google Fonts Loader
    const fontsToLoad = [theme.fontFamily, theme.headingFontFamily, theme.numberFontFamily].filter(Boolean);
    const standardFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'sans-serif', 'serif', 'monospace'];

    fontsToLoad.forEach((font) => {
      if (font && !standardFonts.includes(font)) {
        const linkId = `gfont-${font.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        if (!document.getElementById(linkId)) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
          document.head.appendChild(link);
        }
      }
    });

    // Universal Runtime Theme Injection (across Super Admin, Admin, Customer, Delivery & Landing)
    let runtimeStyle = document.getElementById('chovique-theme-runtime') as HTMLStyleElement | null;
    if (!runtimeStyle) {
      runtimeStyle = document.createElement('style');
      runtimeStyle.id = 'chovique-theme-runtime';
      document.head.appendChild(runtimeStyle);
    }

    runtimeStyle.innerHTML = `
      /* Universal Typography & Headings */
      body, input, select, textarea, button, table, th, td {
        font-family: var(--font-body) !important;
      }
      h1, h2, h3, h4, h5, h6,
      .font-display,
      .revenue-title-heading,
      .reports-tabs-title,
      .delivery-brand-text h1,
      .section-title {
        font-family: var(--font-display) !important;
      }

      /* Universal Numerical Typography across all panels */
      .font-number,
      h1.font-number, h2.font-number, h3.font-number, h4.font-number, h5.font-number, h6.font-number,
      h1 [data-number], h2 [data-number], h3 [data-number], h4 [data-number],
      h1.counter, h2.counter, h3.counter, h4.counter,
      span.counter, div.counter,
      .stat-number,
      .stat-val,
      .stat-value,
      .stat-card-value,
      .landing-stat,
      .landing-counter,
      .stats-number,
      .stat-counter,
      .revenue-kpi-val,
      .sales-kpi-val,
      .kpi-value,
      .kpi-number,
      .kpi-card-value,
      .metric-value,
      .metric-number,
      .metric-card-value,
      .analytics-kpi-value,
      .order-stat-value,
      .revenue-number,
      .kpi-stat-number,
      .dashboard-kpi-value,
      .kpi-metric-number,
      .wallet-balance-amount,
      .orders-metric-value,
      .delivery-stat-value,
      .delivery-stat-num,
      .customer-stat-value,
      .currency,
      .price,
      .price-tag,
      .amount,
      .product-price,
      .details-price,
      .details-price-current,
      .cart-item-price,
      .checkout-price,
      .subtotal-val,
      .total-val,
      .nav-badge,
      .cart-badge,
      .badge-count,
      .order-number,
      .order-id,
      .table-number,
      .counter,
      .dashboard-stat-number,
      .superadmin-metric-value,
      .admin-metric-val,
      .delivery-metric-num,
      .dispatch-capsule-value,
      .delivery-stat-val,
      .delivery-tab-badge,
      .distance-badge,
      .cust-mobile-topnav-badge,
      .cust-mobile-coins-pill,
      .wallet-balance,
      .coins-amount,
      .points-balance,
      .order-subtotal,
      .order-total,
      .cart-item-quantity,
      .cart-total-price,
      .order-table-price,
      .order-table-id,
      .kpi-card-metric,
      .reports-kpi-grid > div > div:nth-child(2),
      .reports-tabs-active-badge,
      [data-number],
      [data-number] * {
        font-family: var(--font-number, var(--font-body)) !important;
        font-variant-numeric: tabular-nums;
      }

      /* Workspace Panes & Page Backgrounds with Subtle Branded Watermark */
      .admin-workspace,
      .superadmin-workspace,
      .delivery-panel,
      .delivery-layout-container {
        background-color: var(--black) !important;
        background-image: url('/assets/dashboard-watermark.png') !important;
        background-repeat: no-repeat !important;
        background-position: calc(50% + 130px) 45% !important;
        background-size: 520px auto !important;
        background-attachment: fixed !important;
        color: var(--cream) !important;
      }

      @media (max-width: 1024px) {
        .admin-workspace,
        .superadmin-workspace,
        .delivery-panel,
        .delivery-layout-container {
          background-position: center 45% !important;
          background-size: 360px auto !important;
        }
      }

      .admin-workspace > div,
      .superadmin-workspace > div {
        background-color: transparent !important;
      }

      /* Translucent Glass Panels in Admin & Delivery to reveal Signature Watermark */
      .admin-workspace .glass-panel,
      .superadmin-workspace .glass-panel,
      .delivery-layout-container .glass-panel,
      .admin-workspace .stat-card,
      .superadmin-workspace .stat-card {
        background: rgba(14, 10, 7, 0.32) !important;
        backdrop-filter: blur(2px) !important;
        -webkit-backdrop-filter: blur(2px) !important;
        border-color: rgba(var(--gold-rgb), 0.22) !important;
      }

      .admin-workspace table,
      .superadmin-workspace table {
        background: transparent !important;
      }

      .admin-workspace table tbody tr,
      .superadmin-workspace table tbody tr {
        background: rgba(14, 10, 7, 0.15) !important;
      }

      .admin-workspace table tbody tr:hover,
      .superadmin-workspace table tbody tr:hover {
        background: rgba(201, 168, 76, 0.08) !important;
      }

      /* Dashboard Cards, Toolbars, and Glass Panels in other areas */
      .glass-panel,
      .dashboard-stat-card,
      .stat-card,
      .reports-toolbar-card,
      .reports-tabs-card,
      .reports-chart-card,
      .reports-summary-card,
      .reports-details-card,
      .revenue-filter-bar,
      .sales-kpi-grid > div,
      .revenue-kpi-card,
      .delivery-stat-card {
        background: var(--surface-color);
        border-color: rgba(var(--gold-rgb), 0.25) !important;
        color: var(--cream) !important;
      }

      /* Active Tabs & Navigation Highlights */
      .reports-tab-btn.active,
      .sales-period-pills button.active,
      .sales-sub-tab-strip button.active,
      .delivery-tab-btn.active,
      .sidebar-nav-item.active {
        background: var(--gradient-gold) !important;
        color: var(--dark-chocolate) !important;
        border-color: var(--gold) !important;
      }

      /* Gold Accent Texts & Table Headers */
      .gold-text,
      .reports-tabs-title,
      .reports-tabs-active-badge,
      .section-label,
      .footer-column-heading,
      .sales-kpi-label,
      .revenue-kpi-label,
      .delivery-brand-text span,
      table.reports-data-table th,
      .admin-workspace .reports-table-wrap table.reports-data-table th,
      .sales-ledger-table th {
        color: var(--gold) !important;
      }

      /* Table Cell Colors & Borders */
      table.reports-data-table td,
      .admin-workspace .reports-table-wrap table.reports-data-table td,
      .sales-ledger-table td {
        color: var(--cream) !important;
        border-color: rgba(var(--gold-rgb), 0.15) !important;
      }

      /* Form Inputs and Selects */
      .admin-workspace input,
      .admin-workspace select,
      .delivery-panel input,
      .delivery-panel select,
      .reports-toolbar-card input,
      .reports-toolbar-card select {
        background-color: var(--black) !important;
        color: var(--cream) !important;
        border-color: rgba(var(--gold-rgb), 0.35) !important;
      }

      /* Delivery Boy Sidebar & Header */
      .delivery-header {
        background: var(--navbar-bg) !important;
        border-bottom-color: rgba(var(--gold-rgb), 0.2) !important;
      }
      .delivery-desktop-sidebar {
        background: var(--dark-chocolate) !important;
        border-right-color: rgba(var(--gold-rgb), 0.2) !important;
      }
      .delivery-logo-badge {
        background: var(--gradient-gold) !important;
        color: var(--dark-chocolate) !important;
      }

      /* Storefront Components */
      .navbar.scrolled {
        background: var(--navbar-bg) !important;
      }
      .nav-item {
        color: var(--navbar-text) !important;
      }
      .popular-card,
      .product-card,
      .cart-item-card,
      .cart-summary {
        background: var(--product-card-bg) !important;
        border-color: var(--product-card-border) !important;
      }
      .chovique-footer {
        background: var(--footer-bg) !important;
        color: var(--footer-text) !important;
      }
      .luxury-btn.primary,
      button.btn-primary,
      .btn-primary {
        background: var(--button-bg) !important;
        color: var(--button-text) !important;
        border-color: var(--button-bg) !important;
      }
      .luxury-btn.secondary,
      button.btn-secondary,
      .btn-secondary {
        border-color: var(--button-secondary) !important;
        color: var(--button-secondary) !important;
      }
      .nav-badge,
      .cart-badge,
      .cust-mobile-topnav-badge {
        background: var(--cart-color) !important;
        color: var(--cart-text) !important;
      }
    `;

    try {
      localStorage.setItem('chovique_theme', JSON.stringify(theme));
    } catch {}
  }, [theme]);

  // ---------------------------------------------------------------------------
  // Cart Operations — backend-synced
  // ---------------------------------------------------------------------------

  const addToCart = useCallback(async (product: Product, quantity: number): Promise<void> => {
    const stockQty = product.stock ?? 0;
    if (stockQty <= 0) {
      alert(`"${product.name}" is currently out of stock.`);
      return;
    }
    // Optimistic update
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    if (role === 'guest') return;

    const opId = ++cartOpIdRef.current;
    try {
      const res = await cartService.addToCart(product.id, quantity);
      if (opId === cartOpIdRef.current) syncCartFromBackend(res.items);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      // Revert optimistic update on error
      if (opId === cartOpIdRef.current) {
        setCart((prev) => {
          const existing = prev.find((item) => item.product.id === product.id);
          if (!existing) return prev.filter((item) => item.product.id !== product.id);
          const newQty = existing.quantity - quantity;
          if (newQty <= 0) return prev.filter((item) => item.product.id !== product.id);
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: newQty } : item
          );
        });
      }
    }
  }, [role, syncCartFromBackend]);

  const updateCartQuantity = useCallback(async (productId: string, quantity: number): Promise<void> => {
    // Optimistic update
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );

    if (role === 'guest') return;

    const opId = ++cartOpIdRef.current;
    try {
      const res = await cartService.updateQuantity(productId, Math.max(1, quantity));
      if (opId === cartOpIdRef.current) syncCartFromBackend(res.items);
    } catch (err) {
      console.error('Failed to update cart quantity:', err);
      // Need to refetch to correct state since we don't know the exact previous state here
      if (opId === cartOpIdRef.current) {
         cartService.getCart().then(res => {
           if (cartOpIdRef.current === opId) syncCartFromBackend(res.items);
         });
      }
    }
  }, [role, syncCartFromBackend]);

  const removeFromCart = useCallback(async (productId: string): Promise<void> => {
    // Optimistic update
    setCart((prev) => prev.filter((item) => item.product.id !== productId));

    if (role === 'guest') return;

    const opId = ++cartOpIdRef.current;
    try {
      const res = await cartService.removeFromCart(productId);
      if (opId === cartOpIdRef.current) syncCartFromBackend(res.items);
    } catch (err) {
      console.error('Failed to remove from cart:', err);
      // Need to refetch to correct state
      if (opId === cartOpIdRef.current) {
         cartService.getCart().then(res => {
           if (cartOpIdRef.current === opId) syncCartFromBackend(res.items);
         });
      }
    }
  }, [role, syncCartFromBackend]);

  const clearCart = useCallback(async (): Promise<void> => {
    setCart([]);
    
    if (role === 'guest') return;

    const opId = ++cartOpIdRef.current;
    try {
      await cartService.clearCart();
      if (opId === cartOpIdRef.current) setCart([]);
    } catch (err) {
      console.error('Failed to clear cart:', err);
    }
  }, [role]);

  // ---------------------------------------------------------------------------
  // Wishlist Operations — backend-synced
  // ---------------------------------------------------------------------------

  const toggleWishlist = useCallback(async (product: Product): Promise<void> => {
    const exists = wishlist.find((p) => p.id === product.id);

    // Optimistic update
    if (exists) {
      setWishlist((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      setWishlist((prev) => [...prev, product]);
    }

    if (role === 'guest') return;

    const opId = ++wishlistOpIdRef.current;
    try {
      if (exists) {
        await wishlistService.removeFromWishlist(product.id);
      } else {
        await wishlistService.addToWishlist(product.id);
      }
    } catch (err) {
      console.error('Failed to update wishlist:', err);
      // Revert optimistic update
      if (opId === wishlistOpIdRef.current) {
        if (exists) {
          setWishlist((prev) => [...prev, product]);
        } else {
          setWishlist((prev) => prev.filter((p) => p.id !== product.id));
        }
      }
    }
  }, [wishlist, role]);

  const moveToCart = useCallback(async (product: Product): Promise<void> => {
    await toggleWishlist(product);
    await addToCart(product, 1);
  }, [toggleWishlist, addToCart]);

  // ---------------------------------------------------------------------------
  // Order Operations
  // ---------------------------------------------------------------------------

  const placeOrderLocal = (order: Order) => {
    setOrders((prev) => [order, ...prev]);

    // Remove ordered products from local cart and wishlist state
    const orderedProductIds = new Set(order.items.map((item) => item.product.id));

    setCart((prevCart) => prevCart.filter((item) => !orderedProductIds.has(item.product.id)));
    setWishlist((prevWishlist) => prevWishlist.filter((prod) => !orderedProductIds.has(prod.id)));

    // Re-sync with backend to ensure DB parity
    cartService.getCart().then((res) => syncCartFromBackend(res.items)).catch(() => {});
    wishlistService.getWishlist().then((items) => setWishlist(items.map((i) => i.product))).catch(() => {});

    addNotification(
      `Your order ${order.id} has been placed successfully for ₹${order.total}.`,
      'order',
      order.id
    );
  };

  // ---------------------------------------------------------------------------
  // Admin Product Operations
  // These update local context state; the actual API calls are made in
  // AdminDashboard.tsx via productService directly.
  // ---------------------------------------------------------------------------

  const addProduct = (newProd: any) => {
    const product: Product = {
      rating: 5.0,
      ratingsCount: 0,
      reviews: [],
      ...newProd,
      id: (newProd && newProd.id) ? newProd.id : `p${Date.now()}`,
    };
    setProducts((prev) => [product, ...prev]);
  };

  const updateProductInventory = (productId: string, weight: string, price: number, stock?: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, weight, price, ...(stock !== undefined ? { stock } : {}) } : p))
    );
  };


  const deleteProduct = async (productId: string) => {
    try {
      await productService.deleteProduct(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } catch (err) {
      console.error('Failed to delete product from database:', err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Admin Offline Sales Operations
  // These update local context state; actual API calls are in AdminDashboard.tsx
  // ---------------------------------------------------------------------------

  const addOfflineSale = (sale: Omit<OfflineSale, 'id' | 'date'>) => {
    const newSale: OfflineSale = {
      ...sale,
      id: `OFL-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
    };
    setOfflineSales((prev) => [newSale, ...prev]);
  };

  const importOfflineSales = (salesList: Omit<OfflineSale, 'id' | 'date'>[]) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const newSales: OfflineSale[] = salesList.map((s, idx) => ({
      ...s,
      id: `OFL-IMP-${Math.floor(100 + Math.random() * 900)}-${idx}`,
      date: dateStr,
    }));
    setOfflineSales((prev) => [...newSales, ...prev]);
  };

  // ---------------------------------------------------------------------------
  // Banner Operations
  // ---------------------------------------------------------------------------

  const refreshBanners = useCallback(async () => {
    try {
      const result = await homeService.getBanners();
      setBanners(result);
    } catch {
      // ignore
    }
  }, []);

  const addBanner = (newBanner: Banner) => {
    setBanners((prev) => [...prev, newBanner]);
  };

  const deleteBannerState = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const updateBanner = (id: string, bannerData: Partial<Banner>) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...bannerData } : b))
    );
  };

  // ---------------------------------------------------------------------------
  // Theme Operations
  // ---------------------------------------------------------------------------

  const updateThemeColors = useCallback(async (colors: Partial<AppTheme>) => {
    let updatedTheme = defaultTheme;
    setTheme((prev: AppTheme) => {
      updatedTheme = { ...prev, ...colors };
      try {
        localStorage.setItem('chovique_theme', JSON.stringify(updatedTheme));
      } catch {}
      return updatedTheme;
    });

    window.dispatchEvent(new CustomEvent('chovique:theme-updated', { detail: updatedTheme }));

    if (role === 'admin' || role === 'superadmin') {
      try {
        const { adminService } = await import('../services/adminService');
        await adminService.updateTheme(updatedTheme);
      } catch (err) {
        console.error('Failed to sync theme to backend database', err);
      }
    }
  }, [role]);

  // ---------------------------------------------------------------------------
  // Support Tickets — wired to ticketService
  // ---------------------------------------------------------------------------

  const addSupportTicket = async (category: SupportTicket['category'], description: string, orderId?: string): Promise<void> => {
    try {
      const newTicket = await ticketService.createTicket({ category, description, order_id: orderId, orderId });
      setTickets((prev) => [newTicket, ...prev]);
    } catch (err) {
      console.error('Failed to create support ticket:', err);
      throw err;
    }
  };

  const resolveSupportTicket = async (ticketId: string, adminNotes?: string): Promise<void> => {
    try {
      const updated = await import('../services/adminService').then((m) =>
        m.adminService.resolveTicket(ticketId, { admin_notes: adminNotes })
      );
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
      addNotification(
        `Support Complaint ${ticketId} has been resolved by Admin.`,
        'support',
        ticketId
      );
    } catch (err) {
      console.error('Failed to resolve ticket:', err);
      throw err;
    }
  };

  const updateSupportTicketStatus = async (ticketId: string, status: string, adminNotes?: string): Promise<void> => {
    try {
      const updated = await import('../services/adminService').then((m) =>
        m.adminService.updateTicketStatus(ticketId, { status, admin_notes: adminNotes })
      );
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
    } catch (err) {
      console.error('Failed to update ticket status:', err);
      throw err;
    }
  };

  const submitTicketFeedback = async (ticketId: string, feedback: 'Resolved' | 'Not Resolved'): Promise<void> => {
    try {
      const updated = await ticketService.submitFeedback(ticketId, { feedback });
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? updated : t)));
    } catch (err) {
      console.error('Failed to submit ticket feedback:', err);
      throw err;
    }
  };

  const acknowledgeTicketNotification = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, notified: true } : t))
    );
  };

  // ---------------------------------------------------------------------------
  // Profile & Address Operations — wired to userService
  // ---------------------------------------------------------------------------

  const updateUserProfilePicture = (avatarUrl: string) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, profile: { ...prev.profile, avatarUrl } };
    });
  };

  const updateUserProfile = async (updatedProfile: {
    name?: string;
    phone?: string;
    dob?: string;
    gender?: string;
    preferences?: string;
  }): Promise<void> => {
    try {
      const freshUser = await userService.updateProfile({
        name: updatedProfile.name,
        full_name: updatedProfile.name,
        phone: updatedProfile.phone,
        dob: updatedProfile.dob,
        gender: updatedProfile.gender,
        preferences: updatedProfile.preferences,
      });
      setUser((prev) => {
        if (!prev) return freshUser;
        const newName = freshUser.name || freshUser.profile?.name || prev.name;
        return {
          ...freshUser,
          name: newName,
          profile: {
            ...freshUser.profile,
            name: newName,
            avatarUrl: freshUser.profile?.avatarUrl || prev.profile?.avatarUrl,
            address: (freshUser.profile?.address && freshUser.profile.address.street) ? freshUser.profile.address : prev.profile?.address,
          },
        };
      });
    } catch (err) {
      console.error('Failed to update profile on server:', err);
      throw err;
    }
  };

  const addAddress = async (newAddr: Omit<CustomerAddress, 'id'>): Promise<void> => {
    try {
      const created = await userService.addAddress(newAddr);
      setAddresses((prev) => {
        if (created.isDefault) {
          return prev.map((a) => ({ ...a, isDefault: false })).concat(created);
        }
        return [...prev, created];
      });
    } catch (err) {
      console.error('Failed to add address:', err);
      throw err;
    }
  };

  const updateAddress = async (id: string, updatedFields: Partial<Omit<CustomerAddress, 'id'>>): Promise<void> => {
    try {
      const updated = await userService.updateAddress(id, updatedFields);
      setAddresses((prev) => {
        return prev.map((a) => {
          if (a.id === id) return updated;
          if (updated.isDefault) return { ...a, isDefault: false };
          return a;
        });
      });
    } catch (err) {
      console.error('Failed to update address:', err);
      throw err;
    }
  };

  const deleteAddress = async (id: string): Promise<void> => {
    try {
      await userService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to delete address:', err);
      throw err;
    }
  };

  const setDefaultAddress = async (id: string): Promise<void> => {
    try {
      await userService.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch (err) {
      console.error('Failed to set default address:', err);
      throw err;
    }
  };

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  const addNotification = (
    text: string,
    type: SupportNotification['type'],
    referenceId?: string
  ) => {
    const notif: SupportNotification = {
      id: `notif-${Date.now()}`,
      text,
      date: new Date().toISOString().split('T')[0],
      read: false,
      type,
      referenceId,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const refreshNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res);
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true, is_read: true } : n))
    );
    try {
      await notificationService.markAsRead(id);
      window.dispatchEvent(new CustomEvent('notification_updated'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, is_read: true }))
    );
    try {
      await notificationService.markAllAsRead();
      window.dispatchEvent(new CustomEvent('notification_updated'));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Best-effort server delete (no await — fire and forget)
    notificationService.deleteNotification(id).catch(() => { });
    window.dispatchEvent(new CustomEvent('notification_updated'));
  };

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------

  return (
    <AppContext.Provider
      value={{
        // Auth
        user,
        setUser,
        role,
        isAuthLoading,
        login,
        googleLogin,
        setPassword,
        register,
        verifyOtp,
        logout,

        // Config
        storeConfig,

        // Products
        products,
        banners,
        setProducts,
        orders,
        setOrders,
        offlineSales,
        setOfflineSales,
        wishlist,
        cart,
        theme,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        moveToCart,
        placeOrderLocal,
        addProduct,
        updateProductInventory,
        deleteProduct,
        addOfflineSale,
        importOfflineSales,
        updateBanner,
        refreshBanners,
        addBanner,
        deleteBannerState,
        updateThemeColors,
        tickets,
        addSupportTicket,
        resolveSupportTicket,
        updateSupportTicketStatus,
        submitTicketFeedback,
        acknowledgeTicketNotification,
        updateUserProfilePicture,
        updateUserProfile,
        addresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        wallet,
        refreshWallet,
        notifications,
        removeNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshNotifications,
        addNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};