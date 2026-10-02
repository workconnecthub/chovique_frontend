import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Tag,
  Bell,
  FileText,
  Settings,
  LayoutDashboard,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
  UploadCloud,
  Trash2,
  Plus,
  X,
  Menu,
  Loader2,
  Coins,
  Download,
  Phone,
  Search,
  Printer,
  ArrowLeft,
  Check,
  Copy,
  CheckCheck,
  RefreshCw,
  Filter,
  ExternalLink,
  Truck,
  Package,
  Clock,
  PackageCheck,
  LogOut,
  MessageSquare,
  Calendar,
  CreditCard,
  Ship,
} from 'lucide-react';
import { useApp } from '../../app/providers';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ToastContainer, type ToastMessage } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { pageTransition } from '../../lib/framer';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { getImageUrl } from '../../utils/imageUrl';
import { orderService } from '../../services/orderService';
import { walletService, type CoinTransaction } from '../../services/walletService';
import type { UserCoupon, CustomerAddress, SupportNotification } from '../../types';
import { WishlistPage } from '../wishlist/WishlistPage';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission, sendBrowserNotification } from '../../utils/browserNotifications';

type CustomerTab =
  | 'overview'
  | 'rewards'
  | 'profile'
  | 'orders'
  | 'addresses'
  | 'coupons'
  | 'notifications'
  | 'settings'
  | 'help'
  | 'account'; // mobile-only composite tab (Profile + Addresses + Settings)

export const getAvailableCouponsList = (availData: UserCoupon[] = [], usedData: any[] = []): UserCoupon[] => {
  const usedCodesSet = new Set<string>(
    (usedData || []).map((uc: any) => (uc.code || '').trim().toUpperCase()).filter(Boolean)
  );
  const seenCodes = new Set<string>();
  return (availData || []).filter((c) => {
    const key = (c.code || '').trim().toUpperCase();
    if (!key || seenCodes.has(key) || usedCodesSet.has(key)) return false;
    const isAvailable = (c.status === 'Available' || c.status === 'ACTIVE' || c.status === 'Active') && c.is_active !== false;
    if (!isAvailable) return false;
    seenCodes.add(key);
    return true;
  });
};

export const CustomerDashboard: React.FC = () => {
  const {
    user,
    role,
    wallet,
    orders,
    setOrders,
    cart,
    wishlist,
    logout,
    tickets,
    addSupportTicket,
    submitTicketFeedback,
    acknowledgeTicketNotification,
    updateUserProfilePicture,
    updateUserProfile,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    notifications,
    removeNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshNotifications,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<CustomerTab>(
    // On mobile, default to the composite 'account' tab since Home → landing page
    // and there is no separate 'overview' entry point in the mobile bottom nav
    window.innerWidth <= 768 ? 'account' : 'overview'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileGrid, setIsMobileGrid] = useState(window.innerWidth <= 768);
  // isMobile: true when viewport ≤768px (used to gate mobile-only UI elements)
  const isMobile = isMobileGrid;
  // Mobile Account sub-section: 'profile' | 'addresses' | 'settings'
  const [mobileAccountSection, setMobileAccountSection] = useState<'profile' | 'addresses' | 'settings'>('profile');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifCategory, setNotifCategory] = useState<'all' | 'orders' | 'coupons' | 'rewards' | 'support' | 'system'>('all');
  const [notifReadFilter, setNotifReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifActionSuccess, setNotifActionSuccess] = useState<string | null>(null);
  const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSubmittingSupportTicket, setIsSubmittingSupportTicket] = useState(false);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message, title }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mobileTabs: { id: CustomerTab; label: string; icon: React.FC<{ size?: number }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'rewards', label: 'Rewards', icon: Coins },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help', icon: AlertTriangle },
  ];

  useEffect(() => {
    // 1. Check URL query parameters (e.g. ?section=orders or ?section=support)
    const searchParams = new URLSearchParams(location.search);
    const section = searchParams.get('section') || searchParams.get('tab');
    if (section) {
      const lower = section.toLowerCase();
      if (lower === 'orders' || lower === 'order-history' || lower === 'track') {
        setActiveTab('orders');
        setSelectedOrder(null);
        setOrderSubView('list');
      } else if (lower === 'support' || lower === 'help' || lower === 'help-and-support') {
        setActiveTab('help');
      } else if (lower === 'profile') {
        setActiveTab('profile');
      } else if (lower === 'addresses' || lower === 'address') {
        setActiveTab('addresses');
      } else if (lower === 'coupons' || lower === 'coupon') {
        setActiveTab('coupons');
      } else if (lower === 'rewards' || lower === 'coins') {
        setActiveTab('rewards');
      } else if (lower === 'settings') {
        setActiveTab('settings');
      } else if (lower === 'notifications') {
        setActiveTab('notifications');
      } else if (lower === 'overview') {
        setActiveTab('overview');
      } else if (lower === 'account' || lower === 'my-account') {
        setActiveTab('account');
        setSelectedOrder(null);
      }
    } else {
      // 2. Check location.state if no query param
      const navState = location.state as { tab?: CustomerTab } | null;
      if (navState?.tab) {
        setActiveTab(navState.tab);
        if (navState.tab === 'orders') {
          setSelectedOrder(null);
          setOrderSubView('list');
        }
      } else {
        // Fallback when navigating to bare /dashboard without params
        if (window.innerWidth <= 768) {
          setActiveTab('account');
          setSelectedOrder(null);
        } else {
          setActiveTab('overview');
        }
      }
    }
  }, [location.search, location.state]);

  // Redirect if guest/non-customer accesses directly
  useEffect(() => {
    if (role === 'guest') {
      navigate('/login');
    }
  }, [role, navigate]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleCopyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sidebarGroups = [
    {
      groupTitle: 'ACCOUNT',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'addresses', label: 'Addresses', icon: MapPin },
        { id: 'settings', label: 'Account Settings', icon: Settings },
      ],
    },
    {
      groupTitle: 'ORDERS',
      items: [
        { id: 'orders', label: 'Order History', icon: ShoppingBag },
      ],
    },
    {
      groupTitle: 'SHOPPING',
      items: [
        { id: 'coupons', label: 'My Coupons', icon: Tag },
      ],
    },
    {
      groupTitle: 'REWARDS',
      items: [
        { id: 'rewards', label: 'Rewards & Coins', icon: Coins },
      ],
    },
    {
      groupTitle: 'SUPPORT',
      items: [
        { id: 'help', label: 'Help & Support', icon: AlertTriangle },
      ],
    },
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobileGrid(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Note: Global Navbar hiding and footer management for customer mobile is
  // handled in App.tsx via the CustomerMobileNav component + body class.

  // Profile Form state — seeded from authenticated user, no hardcoded demo fallbacks
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.profile?.phone || '',
    dob: user?.profile?.dob || '',
    gender: user?.profile?.gender || '',
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

  // --- Order Navigation & Selection State ---
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderSubView, setOrderSubView] = useState<'list' | 'details' | 'invoice'>('list');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderSortOrder, setOrderSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [isPdfDownloading, setIsPdfDownloading] = useState<boolean>(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [returningOrderId, setReturningOrderId] = useState<string | null>(null);
  const [returnModalOrderId, setReturnModalOrderId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState<string>('');

  const handleCancelOrder = (orderId: string) => {
    setCancelModalOrderId(orderId);
  };

  const confirmCancelOrder = async () => {
    if (!cancelModalOrderId) return;
    const orderId = cancelModalOrderId;
    setCancellingOrderId(orderId);
    try {
      const updatedOrder = await orderService.cancelOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
      setCancelModalOrderId(null);
    } catch (error: any) {
      console.error('Failed to cancel order:', error);
      alert(error?.response?.data?.detail || error?.message || 'Failed to cancel order. Please try again.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleReturnOrder = (orderId: string) => {
    setReturnModalOrderId(orderId);
    setReturnReason('');
  };

  const confirmReturnOrder = async () => {
    if (!returnModalOrderId) return;
    const orderId = returnModalOrderId;
    setReturningOrderId(orderId);
    try {
      const updatedOrder = await orderService.returnOrder(orderId, returnReason || undefined);
      setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }
      setReturnModalOrderId(null);
      setReturnReason('');
      alert('Return request submitted successfully.');
    } catch (error: any) {
      console.error('Failed to request return:', error);
      alert(error?.response?.data?.detail || error?.message || 'Failed to request order return. Please try again.');
    } finally {
      setReturningOrderId(null);
    }
  };

  const isOrderCancellable = (ord: any): boolean => {
    if (!ord) return false;
    if (ord.is_cancellable !== undefined) return Boolean(ord.is_cancellable);
    if (['Shipped', 'Out for Delivery', 'Out_For_Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(ord.status)) {
      return false;
    }
    if (!['Pending', 'Confirmed', 'Processing'].includes(ord.status)) {
      return false;
    }
    if (ord.created_at) {
      const created = new Date(ord.created_at).getTime();
      if (!isNaN(created)) {
        return (new Date().getTime() - created) < 86400000;
      }
    }
    return true;
  };

  const isOrderReturnable = (ord: any): boolean => {
    if (!ord) return false;
    if (ord.is_returnable !== undefined) return Boolean(ord.is_returnable);
    if (ord.status !== 'Delivered') return false;
    const deliveryDate = ord.delivered_at;
    if (!deliveryDate) return false;
    const delivered = new Date(deliveryDate).getTime();
    if (isNaN(delivered)) return false;
    return (new Date().getTime() - delivered) < 345600000;
  };

  const handleDownloadInvoice = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      setIsPdfDownloading(true);
      await orderService.downloadInvoicePdf(orderId);
    } catch (err) {
      console.error('Failed to download PDF invoice from backend', err);
      try {
        const html = await orderService.getInvoiceHtml(orderId);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => win.print(), 500);
        }
      } catch {
        alert('Could not generate or download invoice PDF. Please try again.');
      }
    } finally {
      setIsPdfDownloading(false);
    }
  };



  // Keep profile form in sync if the user object changes (e.g. after rehydration from /users/me)
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user?.profile?.phone || '',
        dob: user?.profile?.dob || '',
        gender: user?.profile?.gender || '',
      });
    }
  }, [user]);

  // --- Avatar upload state ---
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [imgLoadError, setImgLoadError] = useState(false);

  useEffect(() => {
    setImgLoadError(false);
  }, [avatarPreviewUrl, user?.profile?.avatarUrl, (user?.profile as any)?.avatar_url, (user as any)?.avatar_url]);

  // --- Unsaved Changes Tracking ---
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<CustomerTab | null>(null);

  const isProfileDirty = 
    activeTab === 'profile' && (
      pendingAvatarFile !== null ||
      profileForm.name !== (user?.name || '') ||
      profileForm.phone !== (user?.profile?.phone || '') ||
      profileForm.dob !== (user?.profile?.dob || '') ||
      profileForm.gender !== (user?.profile?.gender || '')
    );

  // Fallback interceptor for React Router links since BrowserRouter doesn't support useBlocker
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!isProfileDirty) return;
      
      let target = e.target as HTMLElement | null;
      while (target && target.tagName !== 'A') {
        target = target.parentElement;
      }

      if (target && target.tagName === 'A') {
        const href = target.getAttribute('href');
        // Check if it's an internal link navigating away from the dashboard
        if (href && href.startsWith('/') && !href.startsWith('/dashboard')) {
          e.preventDefault();
          e.stopPropagation();
          // Store the destination href in pendingTabChange temporarily (hack)
          setPendingTabChange(href as unknown as CustomerTab);
          setShowUnsavedModal(true);
        }
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, [isProfileDirty]);

  const handleTabChange = (newTab: CustomerTab) => {
    if (activeTab === 'profile' && isProfileDirty) {
      setPendingTabChange(newTab);
      setShowUnsavedModal(true);
      return;
    }
    // On mobile, map profile/addresses/settings to the composite 'account' tab
    if (isMobile && (newTab === 'profile' || newTab === 'addresses' || newTab === 'settings')) {
      setActiveTab('account');
      setMobileAccountSection(newTab as 'profile' | 'addresses' | 'settings');
      setIsSidebarOpen(false);
      return;
    }
    setActiveTab(newTab);
    setIsSidebarOpen(false);
    if (newTab === 'orders') {
      setSelectedOrder(null);
      setOrderSubView('list');
    }
  };

  // Listen for custom event dispatched from top Navbar mobile menu
  useEffect(() => {
    const handleCustomTabSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<CustomerTab>;
      if (customEvent.detail) {
        handleTabChange(customEvent.detail);
      }
    };
    window.addEventListener('chovique:switch-dashboard-tab', handleCustomTabSwitch);
    return () => {
      window.removeEventListener('chovique:switch-dashboard-tab', handleCustomTabSwitch);
    };
  }, [activeTab, isProfileDirty]);

  const handleConfirmDiscard = () => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user?.profile?.phone || '',
        dob: user?.profile?.dob || '',
        gender: user?.profile?.gender || '',
      });
      setPendingAvatarFile(null);
      setAvatarPreviewUrl(null);
    }
    
    if (pendingTabChange) {
      const tabStr = pendingTabChange as string;
      if (tabStr.startsWith('/')) {
        navigate(tabStr);
        return;
      }
      setActiveTab(pendingTabChange);
    }
    setShowUnsavedModal(false);
    setPendingTabChange(null);
    setIsSidebarOpen(false);
  };

  const handleCancelDiscard = () => {
    setShowUnsavedModal(false);
    setPendingTabChange(null);
  };

  // Warn on page reload/close if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProfileDirty) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to trigger the native browser prompt
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isProfileDirty]);

  // --- Profile save state ---
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // --- Preferences save state ---
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);
  const [preferencesError, setPreferencesError] = useState('');

  // --- Settings form controlled state (dob + gender) ---
  const [settingsForm, setSettingsForm] = useState({
    dob: '',
    gender: '',
  });

  // Sync settingsForm from user profile whenever user is loaded/changed
  useEffect(() => {
    if (user) {
      setSettingsForm({
        dob: user?.profile?.dob || '',
        gender: user?.profile?.gender || '',
      });
    }
  }, [user]);

  // --- Update password state (OTP flow) ---
  const [showUpdatePasswordForm, setShowUpdatePasswordForm] = useState(false);
  const [updatePasswordStep, setUpdatePasswordStep] = useState<1 | 2 | 3>(1);
  const [updatePasswordEmail, setUpdatePasswordEmail] = useState('');
  const [updatePasswordOTP, setUpdatePasswordOTP] = useState('');
  const [updatePasswordNew, setUpdatePasswordNew] = useState('');
  const [updatePasswordConfirm, setUpdatePasswordConfirm] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [updatePasswordMessage, setUpdatePasswordMessage] = useState('');
  const [updatePasswordError, setUpdatePasswordError] = useState('');
  const [updatePasswordTimer, setUpdatePasswordTimer] = useState(0);

  // Initialize email when form opens
  useEffect(() => {
    if (showUpdatePasswordForm && user?.email) {
      setUpdatePasswordEmail(user.email);
    }
  }, [showUpdatePasswordForm, user?.email]);

  // Timer countdown
  useEffect(() => {
    if (updatePasswordTimer > 0) {
      const interval = setInterval(() => setUpdatePasswordTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [updatePasswordTimer]);

  // --- Coupons: fetched from backend, not hardcoded ---
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [usedCoupons, setUsedCoupons] = useState<any[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState('');

  useEffect(() => {
    if (activeTab !== 'coupons') return;
    let cancelled = false;
    setIsCouponsLoading(true);
    setCouponsError('');
    Promise.all([
      userService.getCoupons(),
      userService.getUsedCoupons(),
    ])
      .then(([availData, usedData]) => {
        if (!cancelled) {
          setCoupons(availData || []);
          setUsedCoupons(usedData || []);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load coupons.';
          setCouponsError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsCouponsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // --- Overview Coupons: separate state for the overview tab's coupon preview ---
  // Fetched on mount (overview tab) so the count and cards are always live from the backend.
  const [overviewCoupons, setOverviewCoupons] = useState<UserCoupon[]>([]);
  const [isOverviewCouponsLoading, setIsOverviewCouponsLoading] = useState(false);
  const [overviewCouponsError, setOverviewCouponsError] = useState('');

  useEffect(() => {
    if (activeTab !== 'overview') return;
    let cancelled = false;
    setIsOverviewCouponsLoading(true);
    setOverviewCouponsError('');
    Promise.all([
      userService.getCoupons(),
      userService.getUsedCoupons(),
    ])
      .then(([availData, usedData]) => {
        if (!cancelled) {
          setOverviewCoupons(getAvailableCouponsList(availData || [], usedData || []));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load coupons.';
          setOverviewCouponsError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsOverviewCouponsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // --- Rewards & Wallet Transactions State ---
  const [rewardsTab, setRewardsTab] = useState<'balance' | 'rules'>('balance');
  const [walletTxs, setWalletTxs] = useState<CoinTransaction[]>([]);
  const [walletTxsTotal, setWalletTxsTotal] = useState(0);
  const [walletTxsPage, setWalletTxsPage] = useState(1);
  const [walletTxsPages, setWalletTxsPages] = useState(1);
  const [walletTxTypeFilter, setWalletTxTypeFilter] = useState<'ALL' | 'EARN' | 'REDEEM' | 'ADJUSTMENT'>('ALL');
  const [walletDateFrom, setWalletDateFrom] = useState('');
  const [walletDateTo, setWalletDateTo] = useState('');
  const [isWalletTxsLoading, setIsWalletTxsLoading] = useState(false);
  const [walletTxsError, setWalletTxsError] = useState('');

  const fetchWalletTransactions = useCallback(async () => {
    setIsWalletTxsLoading(true);
    setWalletTxsError('');
    try {
      const res = await walletService.getPaginatedTransactions(walletTxTypeFilter, walletTxsPage, 10);
      setWalletTxs(res.items || []);
      setWalletTxsTotal(res.total || 0);
      setWalletTxsPages(res.pages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load wallet transactions.';
      setWalletTxsError(msg);
    } finally {
      setIsWalletTxsLoading(false);
    }
  }, [walletTxTypeFilter, walletTxsPage]);

  useEffect(() => {
    if (activeTab === 'rewards') {
      fetchWalletTransactions();
    }
  }, [activeTab, fetchWalletTransactions]);

  // --- Coupon Expiry Date Formatter Helper ---
  const formatCouponExpiry = (rawExp: any): string => {
    if (!rawExp) return 'No expiry';
    const strVal = String(rawExp).trim();
    if (!strVal || strVal.toLowerCase() === 'no expiry' || strVal.toLowerCase() === 'none' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
      return 'No expiry';
    }

    // Match YYYY-MM-DD (e.g. 2026-08-31 or 2026-08-31T23:59:59Z)
    const matchYMD = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchYMD) {
      const [, y, m, d] = matchYMD;
      return `${d}-${m}-${y}`;
    }

    // Match DD-MM-YYYY (e.g. 31-08-2026)
    const matchDMY = strVal.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (matchDMY) {
      return `${matchDMY[1]}-${matchDMY[2]}-${matchDMY[3]}`;
    }

    // Match DD/MM/YYYY (e.g. 31/08/2026)
    const matchSlashDMY = strVal.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchSlashDMY) {
      const [, d, m, y] = matchSlashDMY;
      return `${d}-${m}-${y}`;
    }

    // Match YYYY/MM/DD (e.g. 2026/08/31)
    const matchSlashYMD = strVal.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
    if (matchSlashYMD) {
      const [, y, m, d] = matchSlashYMD;
      return `${d}-${m}-${y}`;
    }

    try {
      const d = new Date(rawExp);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch {
      // fallback
    }

    return strVal;
  };

  const parseCouponDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'no expiry' || str.toLowerCase() === 'none' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
      return null;
    }
    const matchYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}):(\d{2}))?/);
    if (matchYMD) {
      const [, y, m, d, h = '23', min = '59', s = '59'] = matchYMD;
      return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s));
    }
    const matchDMY = str.match(/^(\d{2})-(\d{2})-(\d{4})(?:[T\s](\d{2}):(\d{2}):(\d{2}))?/);
    if (matchDMY) {
      const [, d, m, y, h = '23', min = '59', s = '59'] = matchDMY;
      return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s));
    }
    const matchSlashDMY = str.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[T\s](\d{2}):(\d{2}):(\d{2}))?/);
    if (matchSlashDMY) {
      const [, d, m, y, h = '23', min = '59', s = '59'] = matchSlashDMY;
      return new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s));
    }
    const parsed = new Date(val);
    return !isNaN(parsed.getTime()) ? parsed : null;
  };

  // --- Support Form Toggle State ---
  const [showSupportForm, setShowSupportForm] = useState(false);

  // --- Address Management State & Handlers ---
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormError, setAddressFormError] = useState<string>('');
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [addressForm, setAddressForm] = useState({
    title: 'Home',
    name: '',
    street: '',
    city: '',
    state: 'Telangana',
    zip: '',
    phone: '',
    isDefault: false,
  });

  const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh'
  ];

  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      title: 'Home',
      name: user?.name || '',
      street: '',
      city: '',
      state: 'Telangana',
      zip: '',
      phone: user?.profile?.phone || '',
      isDefault: addresses.length === 0,
    });
    setAddressFormError('');
    setShowAddAddressForm(true);
  };

  const handleEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      title: addr.title,
      name: addr.name,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
      phone: addr.phone,
      isDefault: addr.isDefault,
    });
    setAddressFormError('');
    setShowAddAddressForm(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressFormError('');

    const title = addressForm.title.trim();
    const name = addressForm.name.trim();
    const street = addressForm.street.trim();
    const city = addressForm.city.trim();
    const state = addressForm.state.trim();
    const zip = addressForm.zip.trim();
    const phone = addressForm.phone.trim();

    if (!title) {
      setAddressFormError('Address Label is required.');
      return;
    }
    if (title.length < 2 || title.length > 30) {
      setAddressFormError('Address Label must be between 2 and 30 characters.');
      return;
    }
    if (!/[a-zA-Z0-9]/.test(title)) {
      setAddressFormError('Address Label cannot contain only special characters.');
      return;
    }

    if (!name) {
      setAddressFormError('Recipient Full Name is required.');
      return;
    }
    if (name.length < 2 || name.length > 100) {
      setAddressFormError('Recipient Full Name must be between 2 and 100 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(name)) {
      setAddressFormError('Recipient Full Name must contain valid letters.');
      return;
    }

    if (!street) {
      setAddressFormError('Street Address is required.');
      return;
    }
    if (street.length > 250) {
      setAddressFormError('Street Address cannot exceed 250 characters.');
      return;
    }

    if (!city) {
      setAddressFormError('City is required.');
      return;
    }
    if (city.length < 2 || city.length > 100) {
      setAddressFormError('City must be between 2 and 100 characters.');
      return;
    }
    if (/^\d+$/.test(city)) {
      setAddressFormError('City cannot be numbers-only.');
      return;
    }

    if (!state) {
      setAddressFormError('State is required.');
      return;
    }

    if (!/^\d{6}$/.test(zip)) {
      setAddressFormError('PIN / Postal Code must be exactly 6 digits.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setAddressFormError('Phone number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.');
      return;
    }

    setIsAddressSaving(true);
    try {
      if (editingAddressId) {
        await updateAddress(editingAddressId, {
          title,
          name,
          street,
          city,
          state,
          zip,
          phone,
          isDefault: addressForm.isDefault,
        });
      } else {
        await addAddress({
          title,
          name,
          street,
          city,
          state,
          zip,
          phone,
          isDefault: addressForm.isDefault,
        });
      }
      setShowAddAddressForm(false);
      setEditingAddressId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save address.';
      setAddressFormError(msg);
    } finally {
      setIsAddressSaving(false);
    }
  };

  // --- Orders: fetched from backend when orders or overview tab is active ---
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const handleManualRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      await fetchOrdersData(false);
      await refreshNotifications();
      if (isNotificationSupported() && getNotificationPermission() === 'default') {
        requestNotificationPermission().catch(() => {});
      }
      addToast('success', 'Order history updated with live status.');
    } catch (e) {
      addToast('error', 'Failed to refresh orders.');
    } finally {
      setTimeout(() => setIsRefreshingOrders(false), 500);
    }
  };

  const fetchOrdersData = useCallback(async (silent = false) => {
    if (!silent) {
      setIsOrdersLoading(true);
      setOrdersError('');
    }
    try {
      const data = await orderService.getOrders();
      setOrders(data);
      // Synchronize selectedOrder if detail view is currently open
      setSelectedOrder((prev: any) => {
        if (!prev) return null;
        const found = data.find((o) => o.id === prev.id);
        return found || prev;
      });
    } catch (err: unknown) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : 'Failed to load order history.';
        setOrdersError(msg);
      }
    } finally {
      if (!silent) setIsOrdersLoading(false);
    }
  }, [setOrders]);

  useEffect(() => {
    if (activeTab !== 'orders' && activeTab !== 'overview') return;
    fetchOrdersData(false);
  }, [activeTab, fetchOrdersData]);

  // Live auto-polling: background update orders & notifications every 10s if active orders exist
  useEffect(() => {
    if (activeTab !== 'orders' && activeTab !== 'overview') return;
    const hasActiveOrders = orders.some(
      (o) => !['delivered', 'cancelled', 'returned'].includes((o.status || '').toLowerCase())
    );
    if (!hasActiveOrders) return;

    const timer = setInterval(() => {
      fetchOrdersData(true);
      refreshNotifications();
    }, 10000);

    return () => clearInterval(timer);
  }, [activeTab, orders, fetchOrdersData, refreshNotifications]);

  // Native Push Notifications for in-app alerts (orders, OTP, delivery boy assignment)
  const prevNotificationCountRef = useRef<number>(notifications.length);
  useEffect(() => {
    if (notifications.length > prevNotificationCountRef.current) {
      const latest = notifications[0];
      if (latest && !latest.read) {
        sendBrowserNotification(latest.title || 'Chovique Order Alert', {
          body: latest.message || 'You have a new update regarding your order.',
          tag: `notif-${latest.id || Date.now()}`,
        });
      }
    }
    prevNotificationCountRef.current = notifications.length;
  }, [notifications]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setAvatarError('');

    const trimmedName = profileForm.name.trim();
    const trimmedPhone = profileForm.phone.trim();

    // Frontend Field Validation
    if (!trimmedName) {
      setProfileError('Full Name is required.');
      return;
    }
    if (trimmedName.length < 2) {
      setProfileError('Full Name must be at least 2 characters.');
      return;
    }
    if (trimmedName.length > 100) {
      setProfileError('Full Name cannot exceed 100 characters.');
      return;
    }
    if (!/[a-zA-Z]/.test(trimmedName)) {
      setProfileError('Full Name must contain valid letters.');
      return;
    }

    if (trimmedPhone && !/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setProfileError('Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.');
      return;
    }

    // DOB validation (if provided) — only checks that date is in the past and plausible
    if (profileForm.dob) {
      const dobDate = new Date(profileForm.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(dobDate.getTime())) {
        setProfileError('Please enter a valid Date of Birth.');
        return;
      }
      if (dobDate >= today) {
        setProfileError('Date of Birth must be in the past.');
        return;
      }
      const ageYears = today.getFullYear() - dobDate.getFullYear() -
        (today < new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate()) ? 1 : 0);
      if (ageYears > 120) {
        setProfileError('Please enter a valid Date of Birth.');
        return;
      }
    }

    setIsProfileSaving(true);
    try {
      if (pendingAvatarFile) {
        setIsAvatarUploading(true);
        const formData = new FormData();
        formData.append('avatar', pendingAvatarFile);
        const result = await userService.uploadAvatar(formData);
        updateUserProfilePicture(result.avatar_url);
        setPendingAvatarFile(null);
        setAvatarPreviewUrl(null);
        setIsAvatarUploading(false);
      }

      await updateUserProfile({
        name: trimmedName,
        phone: trimmedPhone,
        dob: profileForm.dob || undefined,
        gender: profileForm.gender || undefined,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(msg);
    } finally {
      setIsProfileSaving(false);
      setIsAvatarUploading(false);
    }
  };

  // handlePreferencesSave — DOB/Gender have been moved to My Profile.
  // This handler now only handles the outer settings form submit.
  // Password changes use their own separate handleChangePasswordSubmit.
  const handlePreferencesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // No-op: the only remaining save in Account Settings is the Change Password
    // sub-form which has its own submit handler. DOB and Gender are now in My Profile.
  };

  const handleSendUpdatePasswordOTP = async () => {
    setUpdatePasswordError('');
    setUpdatePasswordMessage('');
    if (!updatePasswordEmail) {
      setUpdatePasswordError('Email is required.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await authService.sendUpdatePasswordOTP(updatePasswordEmail);
      setUpdatePasswordMessage(res.message || 'OTP sent successfully.');
      setUpdatePasswordStep(2);
      setUpdatePasswordTimer(90);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP.';
      setUpdatePasswordError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleVerifyUpdatePasswordOTP = async () => {
    setUpdatePasswordError('');
    setUpdatePasswordMessage('');
    if (!updatePasswordOTP || updatePasswordOTP.length !== 6) {
      setUpdatePasswordError('Please enter a valid 6-digit OTP.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const res = await authService.verifyUpdatePasswordOTP(updatePasswordEmail, updatePasswordOTP);
      setUpdatePasswordMessage(res.message || 'OTP verified successfully.');
      setUpdatePasswordStep(3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to verify OTP.';
      setUpdatePasswordError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatePasswordError('');
    setUpdatePasswordMessage('');

    if (!updatePasswordNew) {
      setUpdatePasswordError('New password is required.');
      return;
    }
    if (updatePasswordNew.length < 8) {
      setUpdatePasswordError('New password must be at least 8 characters.');
      return;
    }
    if (!updatePasswordConfirm) {
      setUpdatePasswordError('Please confirm your new password.');
      return;
    }
    if (updatePasswordNew !== updatePasswordConfirm) {
      setUpdatePasswordError('New password and confirm password do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authService.updatePasswordWithOTP(
        updatePasswordEmail,
        updatePasswordNew,
        updatePasswordConfirm
      );
      setUpdatePasswordMessage(res.message || 'Password updated successfully.');
      setTimeout(() => {
        setShowUpdatePasswordForm(false);
        setUpdatePasswordStep(1);
        setUpdatePasswordOTP('');
        setUpdatePasswordNew('');
        setUpdatePasswordConfirm('');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password.';
      setUpdatePasswordError(msg);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const totalSpent = orders.reduce((sum, ord) => sum + ord.total, 0);

  if (!user) return null;

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="dashboard-page"
    >
      {/* Workspace 2-Column Grid Layout */}
      <div className="customer-workspace-layout">
        {/* Mobile Overlay Backdrop */}
        <div
          className={`admin-sidebar-backdrop ${isSidebarOpen ? 'open' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
          style={{ zIndex: 119 }}
        />

        {/* Left Sticky Sidebar Menu */}
        <aside className={`customer-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          {/* Mobile Drawer Close Header */}
          <div className="sidebar-close-btn" style={{ textAlign: 'right', marginBottom: '10px' }}>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#c9a84c', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 700 }}
            >
              <X size={18} /> CLOSE
            </button>
          </div>



          {/* Grouped Sidebar Items */}
          {sidebarGroups.map((group) => (
            <div key={group.groupTitle} style={{ marginBottom: '6px' }}>
              <div className="sidebar-group-title">{group.groupTitle}</div>
              {group.items.map((menuItem) => {
                const Icon = menuItem.icon;
                const isActive = activeTab === menuItem.id;
                return (
                  <button
                    key={menuItem.id}
                    onClick={() => handleTabChange(menuItem.id as CustomerTab)}
                    className={`dashboard-menu-btn ${isActive ? 'active' : ''}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} />
                      <span>{menuItem.label}</span>
                    </div>
                    {(menuItem as any).badge !== undefined && (menuItem as any).badge > 0 && (
                      <span
                        style={{
                          background: '#ff3b30',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          minWidth: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0 4px',
                        }}
                      >
                        {(menuItem as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Session & Logout Group */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <div className="sidebar-group-title" style={{ marginTop: 0 }}>SESSION</div>
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                handleLogoutClick();
              }}
              className="dashboard-menu-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                color: '#ff4d4f',
                background: 'rgba(255, 77, 79, 0.08)',
                border: '1px solid rgba(255, 77, 79, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <LogOut size={18} />
              <span style={{ fontWeight: 600 }}>Log Out</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content Workspace Panel */}
        <main className="customer-workspace-main">
          {/* ── Mobile Horizontal Scrollable Tabs Bar (mobile/tablet ≤1024px) ── */}
          {/* REMOVED: Top mobile nav tabs are duplicated and unnecessary on mobile views */}


          {/* OVERVIEW PANEL */}
          {activeTab === 'overview' && (
            <div>
              {/* Welcome Title Banner */}
              <div style={{ marginBottom: '28px', marginTop: isMobileGrid ? '-12px' : '0' }}>
                <h1 style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontSize: isMobileGrid ? '1.8rem' : '2.1rem', 
                  color: '#f5efe6', 
                  margin: '0 0 6px 0', 
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {orders.length === 0
                    ? `Welcome, ${user.name ? user.name.split(' ')[0] : ''}!`
                    : `Welcome back, ${user.name ? user.name.split(' ')[0] : ''}!`
                  }
                </h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.92rem', margin: 0 }}>
                  Here's what's happening with your account today.
                </p>
              </div>

              {/* Support Tickets Notifications Alert */}
              {tickets.filter(t => t.customerId === user.id && t.status === 'Resolved' && !t.notified).map(t => (
                <div
                  key={t.id}
                  style={{
                    padding: '16px 20px',
                    border: '1px solid #c9a84c',
                    background: 'rgba(201, 168, 76, 0.1)',
                    borderRadius: '10px',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1, marginRight: '15px' }}>
                    <span style={{ fontWeight: 700, color: '#c9a84c', display: 'block', fontSize: '0.9rem' }}>
                      Support Complaint Resolved ({t.id})
                    </span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#f5efe6' }}>
                      Category: <strong>{t.category}</strong>. Admin has marked this issue as resolved.
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => {
                      acknowledgeTicketNotification(t.id);
                      setActiveTab('help');
                    }}
                    glow
                  >
                    Give Feedback
                  </Button>
                </div>
              ))}

              {/* 4 Summary Cards Grid */}
              <div className="dashboard-grid-stats">
                {/* Card 1: TOTAL ORDERS */}
                <div className="dashboard-stat-card" onClick={() => setActiveTab('orders')}>
                  <div>
                    <span className="stat-card-title">TOTAL ORDERS</span>
                    <span className="stat-card-value">{orders.length}</span>
                  </div>
                  <div className="stat-card-link">
                    <span>View all orders</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card 2: REWARD COINS */}
                <div className="dashboard-stat-card" onClick={() => setActiveTab('rewards')}>
                  <div>
                    <span className="stat-card-title">REWARD COINS</span>
                    <span className="stat-card-value">{wallet?.coin_balance ?? 219}</span>
                  </div>
                  <div className="stat-card-link">
                    <span>Worth ₹{(wallet?.rupee_value ?? 21.9).toFixed(2)} in rewards</span>
                    <span>→</span>
                  </div>
                </div>

                {/* Card 3: AVAILABLE COUPONS */}
                <div className="dashboard-stat-card" onClick={() => setActiveTab('coupons')}>
                  <div>
                    <span className="stat-card-title">AVAILABLE COUPONS</span>
                    <span className="stat-card-value">{isOverviewCouponsLoading ? '…' : overviewCoupons.length}</span>
                  </div>
                  <div className="stat-card-link">
                    <span>View all coupons</span>
                    <span>→</span>
                  </div>
                </div>
              </div>

              {/* 2-Column Activity Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '28px' }}>
                {/* Left Column: Recent Orders */}
                <div
                  style={{
                    background: 'rgba(18, 14, 11, 0.95)',
                    border: '1px solid rgba(201, 168, 76, 0.25)',
                    borderRadius: '12px',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#f5efe6', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Recent Orders
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => fetchOrdersData(false)}
                        title="Refresh recent orders"
                        style={{
                          background: 'rgba(201, 168, 76, 0.1)',
                          border: '1px solid rgba(201, 168, 76, 0.3)',
                          color: '#c9a84c',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <RefreshCw size={12} style={{ animation: isOrdersLoading ? 'spin 1s linear infinite' : 'none' }} />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('orders')}
                        style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        View All Orders →
                      </button>
                    </div>
                  </div>

                  {orders.length === 0 ? (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', fontSize: '0.9rem' }}>No recent orders placed.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {orders.slice(0, 4).map((ord) => {
                        const statusBg =
                          ord.status === 'Delivered' || (ord.status as string) === 'Confirmed'
                            ? 'rgba(46, 204, 113, 0.15)'
                            : ord.status === 'Cancelled'
                            ? 'rgba(231, 76, 60, 0.15)'
                            : 'rgba(241, 196, 15, 0.15)';
                        const statusColor =
                          ord.status === 'Delivered' || (ord.status as string) === 'Confirmed'
                            ? '#2ecc71'
                            : ord.status === 'Cancelled'
                            ? '#e74c3c'
                            : '#f1c40f';
                        const statusBorder =
                          ord.status === 'Delivered' || (ord.status as string) === 'Confirmed'
                            ? '1px solid rgba(46, 204, 113, 0.3)'
                            : ord.status === 'Cancelled'
                            ? '1px solid rgba(231, 76, 60, 0.3)'
                            : '1px solid rgba(241, 196, 15, 0.3)';

                        const isOutForDelivery = Boolean(ord.delivery_otp || ord.status === 'Out for Delivery' || ord.fulfillment_status === 'OUT_FOR_DELIVERY');
                        const deliveryBoyName = ord.delivery_boy_name || (ord as any).deliveryBoyName;
                        const deliveryBoyPhone = ord.delivery_boy_phone || (ord as any).deliveryBoyPhone;
                        const totalQty = ord.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                        const fallbackImg = 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=120&q=80';

                        return (
                          <div
                            key={ord.id}
                            style={{
                              padding: isMobileGrid ? '12px' : '14px 16px',
                              background: 'rgba(0,0,0,0.35)',
                              border: isOutForDelivery ? '1.5px solid rgba(201, 168, 76, 0.45)' : '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              boxShadow: isOutForDelivery ? '0 4px 20px rgba(201, 168, 76, 0.15)' : 'none',
                            }}
                          >
                            {/* 1. PRODUCT IMAGES ROW (ALL PRODUCTS VISIBLE WITH QUANTITIES) */}
                            {ord.items.length === 1 ? (
                              (() => {
                                const singleItem = ord.items[0];
                                const singleQty = singleItem?.quantity || 1;
                                const singleName = singleItem?.product?.name || 'Artisanal Selection';
                                const rawSingleImg = singleItem?.product?.image || singleItem?.product?.images?.[0] || singleItem?.image;
                                const singleImg = getImageUrl(rawSingleImg);

                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                                    <div style={{ position: 'relative', width: isMobileGrid ? '48px' : '52px', height: isMobileGrid ? '48px' : '52px', flexShrink: 0 }}>
                                      <img
                                        src={singleImg}
                                        alt={singleName}
                                        onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          borderRadius: '8px',
                                          objectFit: 'cover',
                                          border: '1px solid rgba(201,168,76,0.3)',
                                          background: 'rgba(255,255,255,0.02)',
                                        }}
                                      />
                                      {singleQty > 1 && (
                                        <span
                                          style={{
                                            position: 'absolute',
                                            bottom: '-4px',
                                            right: '-4px',
                                            background: '#c9a84c',
                                            color: '#0f0c0a',
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            padding: '1px 6px',
                                            borderRadius: '10px',
                                            border: '1.5px solid #120e0b',
                                            lineHeight: 1.2,
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.7)',
                                          }}
                                        >
                                          ×{singleQty}
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <span style={{ fontWeight: 700, color: '#f5efe6', fontSize: '0.86rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {singleName} {singleQty > 1 ? `(×${singleQty})` : ''}
                                      </span>
                                      <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ color: '#c9a84c', fontWeight: 600 }}>{ord.id}</span>
                                        <span>·</span>
                                        <span>{ord.date}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  {ord.items.map((it, idx) => {
                                    const itName = it.product?.name || `Product ${idx + 1}`;
                                    const itQty = it.quantity || 1;
                                    const itRawImg = it.product?.image || it.product?.images?.[0] || it.image;
                                    const itImg = getImageUrl(itRawImg);
                                    return (
                                      <div
                                        key={it.product?.id || idx}
                                        title={`${itName} (Qty: ${itQty})`}
                                        style={{ position: 'relative', width: isMobileGrid ? '42px' : '46px', height: isMobileGrid ? '42px' : '46px', flexShrink: 0 }}
                                      >
                                        <img
                                          src={itImg}
                                          alt={itName}
                                          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: '7px',
                                            objectFit: 'cover',
                                            border: '1px solid rgba(201,168,76,0.3)',
                                            background: 'rgba(255,255,255,0.02)',
                                          }}
                                        />
                                        {itQty > 1 && (
                                          <span
                                            style={{
                                              position: 'absolute',
                                              bottom: '-4px',
                                              right: '-4px',
                                              background: '#c9a84c',
                                              color: '#0f0c0a',
                                              fontSize: '0.64rem',
                                              fontWeight: 800,
                                              padding: '1px 5px',
                                              borderRadius: '10px',
                                              border: '1px solid #120e0b',
                                              lineHeight: 1.1,
                                              boxShadow: '0 2px 4px rgba(0,0,0,0.7)',
                                            }}
                                          >
                                            ×{itQty}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 700, color: '#c9a84c', fontSize: '0.8rem' }}>{ord.id}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                                    {ord.date} · {ord.items.length} Products ({totalQty} Total Items)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* 2. LIVE OUT FOR DELIVERY & OTP BANNER */}
                            {isOutForDelivery && (
                              <div
                                style={{
                                  background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.15) 0%, rgba(30, 20, 14, 0.7) 100%)',
                                  border: '1px solid rgba(201, 168, 76, 0.45)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Truck size={16} style={{ color: '#c9a84c', flexShrink: 0 }} />
                                  <div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                                      Out for Delivery
                                    </span>
                                    {deliveryBoyName && (
                                      <span style={{ fontSize: '0.75rem', color: '#f5efe6' }}>
                                        Partner: <strong>{deliveryBoyName}</strong>{deliveryBoyPhone ? ` (${deliveryBoyPhone})` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {ord.delivery_otp && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>OTP:</span>
                                    <span
                                      style={{
                                        fontFamily: 'monospace',
                                        fontWeight: 900,
                                        fontSize: '0.98rem',
                                        letterSpacing: '2px',
                                        color: '#0f0c0a',
                                        background: '#c9a84c',
                                        padding: '2px 8px',
                                        borderRadius: '5px',
                                        boxShadow: '0 2px 6px rgba(201, 168, 76, 0.3)',
                                      }}
                                    >
                                      {ord.delivery_otp}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); copyToClipboard(String(ord.delivery_otp)); }}
                                      title="Copy OTP"
                                      style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    >
                                      {copiedCode === String(ord.delivery_otp) ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 3. DELIVERY PARTNER ASSIGNED (BEFORE OUT FOR DELIVERY) */}
                            {!isOutForDelivery && deliveryBoyName && (
                              <div
                                style={{
                                  background: 'rgba(46, 204, 113, 0.08)',
                                  border: '1px solid rgba(46, 204, 113, 0.25)',
                                  borderRadius: '6px',
                                  padding: '6px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px',
                                  fontSize: '0.74rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2ecc71' }}>
                                  <Truck size={14} />
                                  <span>Partner: <strong style={{ color: '#fff' }}>{deliveryBoyName}</strong>{deliveryBoyPhone ? ` (${deliveryBoyPhone})` : ''}</span>
                                </div>
                                <span style={{ color: '#2ecc71', fontSize: '0.7rem', fontWeight: 600 }}>Accepted</span>
                              </div>
                            )}

                            {/* 4. BOTTOM ROW: amount, status, button */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: '#f5efe6', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                  ₹{ord.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    whiteSpace: 'nowrap',
                                    background: statusBg,
                                    color: statusColor,
                                    border: statusBorder,
                                  }}
                                >
                                  {ord.status}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedOrder(ord);
                                  setOrderSubView('details');
                                  setActiveTab('orders');
                                }}
                                style={{
                                  padding: '7px 12px',
                                  background: 'transparent',
                                  border: '1px solid rgba(201, 168, 76, 0.4)',
                                  color: '#c9a84c',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  transition: 'border-color 0.2s, background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.1)';
                                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.7)';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.4)';
                                }}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Available Coupons */}
                <div
                  style={{
                    background: 'rgba(18, 14, 11, 0.95)',
                    border: '1px solid rgba(201, 168, 76, 0.25)',
                    borderRadius: '12px',
                    padding: '24px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#f5efe6', margin: 0 }}>
                      Available Coupons
                    </h3>
                    <button
                      onClick={() => setActiveTab('coupons')}
                      style={{ background: 'none', border: 'none', color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      View All Coupons →
                    </button>
                  </div>

                  {/* Loading state */}
                  {isOverviewCouponsLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          style={{
                            height: '72px',
                            borderRadius: '8px',
                            background: 'rgba(201,168,76,0.06)',
                            border: '1px solid rgba(201,168,76,0.12)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* API error state */}
                  {!isOverviewCouponsLoading && overviewCouponsError && (
                    <p style={{ color: 'rgba(231,76,60,0.85)', fontSize: '0.85rem', margin: 0 }}>
                      {overviewCouponsError}
                    </p>
                  )}

                  {/* Empty state */}
                  {!isOverviewCouponsLoading && !overviewCouponsError && overviewCoupons.length === 0 && (
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', fontSize: '0.88rem', margin: 0 }}>
                      No offers available for your account right now.
                    </p>
                  )}

                  {/* Dynamic coupon cards from backend */}
                  {!isOverviewCouponsLoading && !overviewCouponsError && overviewCoupons.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {overviewCoupons.slice(0, 3).map((coupon) => {
                        // Build a human-readable description from real backend fields
                        let couponDesc = '';
                        if (coupon.discount_type === 'PERCENTAGE' && (coupon.discount_percent ?? 0) > 0) {
                          couponDesc = `${coupon.discount_percent}% OFF on your order.`;
                        } else if (coupon.discount_type === 'FIXED_AMOUNT' && (coupon.discount_amount ?? 0) > 0) {
                          couponDesc = `₹${coupon.discount_amount} OFF on your order.`;
                        } else if (coupon.discount_type === 'FREE_SHIPPING') {
                          couponDesc = 'Free Shipping on your order.';
                        } else {
                          couponDesc = coupon.description || coupon.desc || 'Special discount on your order.';
                        }

                        // Build terms line from real backend fields
                        const termsParts: string[] = [];
                        if ((coupon.minimum_order_amount ?? 0) > 0) {
                          termsParts.push(`Min. order: ₹${coupon.minimum_order_amount}`);
                        }
                        const rawExp = coupon.expires_at || coupon.expiryDate || coupon.expiry_date || coupon.expiresAt || coupon.end_date || coupon.endDate || coupon.exp || (coupon as any).expiry;
                        const expFormatted = formatCouponExpiry(rawExp);
                        if (expFormatted && expFormatted.toLowerCase() !== 'no expiry') {
                          termsParts.push(`Expires: ${expFormatted}`);
                        } else {
                          termsParts.push('No Expiry');
                        }
                        const couponTerms = termsParts.join(' · ');

                        return (
                          <div key={coupon.code} className="coupon-ticket-card">
                            <div className="coupon-ticket-left">
                              <span className="coupon-ticket-code">{coupon.code}</span>
                            </div>
                            <div className="coupon-ticket-right">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 style={{ color: '#f5efe6', margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 700 }}>
                                    {coupon.name || coupon.code}
                                  </h4>
                                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.78rem' }}>
                                    {couponDesc}
                                  </p>
                                </div>
                                <button
                                  className="coupon-copy-btn"
                                  onClick={() => handleCopyCouponCode(coupon.code)}
                                >
                                  {copiedCode === coupon.code ? 'Copied!' : 'Copy Code'}
                                </button>
                              </div>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', display: 'block' }}>
                                {couponTerms}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


            {/* PROFILE PANEL */}
            {activeTab === 'profile' && (
              <div>
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                    My Profile Details
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                    Manage your personal information and profile details.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '220px 1fr', gap: '40px', alignItems: 'flex-start' }}>
                  {/* Left Column: Profile Picture Uploader */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                    <span style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>
                      Profile Image
                    </span>

                    {(() => {
                      const profileAvatarRaw = avatarPreviewUrl || user?.profile?.avatarUrl || (user?.profile as any)?.avatar_url || (user as any)?.avatar_url;
                      const formattedAvatarUrl = profileAvatarRaw && (profileAvatarRaw.startsWith('data:') || profileAvatarRaw.startsWith('blob:'))
                        ? profileAvatarRaw
                        : profileAvatarRaw ? getImageUrl(profileAvatarRaw) : '';

                      return formattedAvatarUrl && !imgLoadError ? (
                        <img
                          src={formattedAvatarUrl}
                          alt="Profile Preview"
                          referrerPolicy="no-referrer"
                          onError={() => setImgLoadError(true)}
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #c9a84c',
                            boxShadow: '0 0 20px rgba(201, 168, 76, 0.3)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                            color: '#0f0c0a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            boxShadow: '0 0 20px rgba(201, 168, 76, 0.35)',
                          }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      );
                    })()}

                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      id="profile-img-upload"
                      style={{ display: 'none' }}
                      disabled={isAvatarUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setAvatarError('');
                        
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                        const ext = file.name.split('.').pop()?.toLowerCase();
                        const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
                        
                        if (!allowedTypes.includes(file.type) && (!ext || !allowedExts.includes(ext))) {
                          setAvatarError('Only JPG, JPEG, PNG, and WebP files are allowed.');
                          return;
                        }
                        if (file.size > 5 * 1024 * 1024) {
                          setAvatarError('Maximum allowed image size is 5MB.');
                          return;
                        }
                        setPendingAvatarFile(file);
                        setAvatarPreviewUrl(URL.createObjectURL(file));
                      }}
                    />

                    <label
                      htmlFor="profile-img-upload"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'transparent',
                        color: '#c9a84c',
                        border: '1px solid rgba(201, 168, 76, 0.4)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: isAvatarUploading ? 'not-allowed' : 'pointer',
                        opacity: isAvatarUploading ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {isAvatarUploading ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} /> Upload Image
                        </>
                      )}
                    </label>

                    {avatarError && (
                      <p style={{ color: '#e74c3c', fontSize: '0.78rem', margin: 0, fontWeight: 600 }}>{avatarError}</p>
                    )}
                  </div>

                  {/* Right Column: Profile Form Fields */}
                  <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '580px' }}>
                    {/* Full Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                        Full Name <span style={{ color: '#c9a84c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => {
                          setProfileForm({ ...profileForm, name: e.target.value });
                          if (profileError) setProfileError('');
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(201, 168, 76, 0.3)',
                          color: '#f5efe6',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        placeholder="Enter your full name"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                        Email Address <span style={{ color: '#c9a84c' }}>*</span>
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="email"
                          value={profileForm.email}
                          disabled
                          style={{
                            width: '100%',
                            padding: '12px 110px 12px 14px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontSize: '0.9rem',
                            cursor: 'not-allowed',
                            boxSizing: 'border-box',
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            right: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(46, 204, 113, 0.15)',
                            color: '#2ecc71',
                            border: '1px solid rgba(46, 204, 113, 0.3)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle size={13} /> Verified
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic', display: 'block', marginTop: '6px' }}>
                        Email cannot be changed
                      </span>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => {
                          setProfileForm({ ...profileForm, phone: e.target.value });
                          if (profileError) setProfileError('');
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '6px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(201, 168, 76, 0.3)',
                          color: '#f5efe6',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                        placeholder="e.g. 9876543210"
                      />
                    </div>

                    {/* ── Personal Information ── */}
                    <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(201,168,76,0.15)', marginTop: '4px' }}>
                      <h4 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1rem',
                        color: '#c9a84c',
                        fontWeight: 700,
                        margin: '0 0 18px 0',
                        letterSpacing: '0.3px',
                      }}>
                        Personal Information
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '20px' }}>
                        {/* Date of Birth */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={profileForm.dob}
                            max={new Date().toISOString().split('T')[0]}
                            min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, dob: e.target.value });
                              if (profileError) setProfileError('');
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '6px',
                              background: 'rgba(0, 0, 0, 0.4)',
                              border: `1px solid ${profileForm.dob ? 'rgba(46,204,113,0.5)' : 'rgba(201,168,76,0.3)'}`,
                              color: '#f5efe6',
                              fontSize: '0.9rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              colorScheme: 'dark',
                              transition: 'border-color 0.2s ease',
                            }}
                          />
                        </div>

                        {/* Gender */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                            Gender
                          </label>
                          <select
                            value={profileForm.gender}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, gender: e.target.value });
                              if (profileError) setProfileError('');
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              borderRadius: '6px',
                              background: '#120e0b',
                              border: `1px solid ${profileForm.gender ? 'rgba(46,204,113,0.5)' : 'rgba(201,168,76,0.3)'}`,
                              color: profileForm.gender ? '#f5efe6' : 'rgba(255,255,255,0.45)',
                              fontSize: '0.9rem',
                              outline: 'none',
                              boxSizing: 'border-box',
                              cursor: 'pointer',
                              transition: 'border-color 0.2s ease',
                            }}
                          >
                            <option value="" style={{ background: '#120e0b', color: 'rgba(255,255,255,0.45)' }}>Select Gender</option>
                            <option value="Male" style={{ background: '#120e0b', color: '#f5efe6' }}>Male</option>
                            <option value="Female" style={{ background: '#120e0b', color: '#f5efe6' }}>Female</option>
                            <option value="Non-binary" style={{ background: '#120e0b', color: '#f5efe6' }}>Non-binary</option>
                            <option value="Prefer not to say" style={{ background: '#120e0b', color: '#f5efe6' }}>Prefer not to say</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {profileError && (
                      <div
                        style={{
                          padding: '12px 16px',
                          background: 'rgba(231, 76, 60, 0.12)',
                          border: '1px solid #e74c3c',
                          color: '#e74c3c',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {profileError}
                      </div>
                    )}

                    {/* Success Banner */}
                    {profileSaved && (
                      <div
                        style={{
                          padding: '12px 16px',
                          background: 'rgba(46, 204, 113, 0.12)',
                          border: '1px solid #2ecc71',
                          color: '#2ecc71',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <CheckCircle size={16} /> Profile credentials updated successfully.
                      </div>
                    )}

                    {/* Submit Button */}
                    <div style={{ marginTop: '8px' }}>
                      <button
                        type="submit"
                        disabled={isProfileSaving || isAvatarUploading}
                        style={{
                          padding: '12px 28px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                          color: '#0f0c0a',
                          border: 'none',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          cursor: isProfileSaving || isAvatarUploading ? 'not-allowed' : 'pointer',
                          opacity: isProfileSaving || isAvatarUploading ? 0.7 : 1,
                          boxShadow: '0 4px 14px rgba(201, 168, 76, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {isProfileSaving ? (
                          <>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ORDERS PANEL */}
            {activeTab === 'orders' && (
              <div>
                {/* 1. ORDER DETAILS SUB-VIEW */}
                {selectedOrder && orderSubView === 'details' && (
                  <div>
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={() => { setSelectedOrder(null); setOrderSubView('list'); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#c9a84c',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '20px',
                        padding: 0,
                      }}
                    >
                      <ArrowLeft size={16} /> Back to Orders
                    </button>

                    {/* Order Title Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 'clamp(1.4rem, 4vw, 2.1rem)', color: '#f5efe6', margin: '0 0 8px 0', fontWeight: 700, wordBreak: 'break-word', letterSpacing: '0.5px' }}>
                          Order #{selectedOrder.id}
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                          {/* Order Status Badge */}
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              padding: '5px 14px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background:
                                selectedOrder.status === 'Delivered'
                                  ? 'rgba(46, 204, 113, 0.18)'
                                  : selectedOrder.status === 'Confirmed'
                                  ? 'rgba(52, 152, 219, 0.18)'
                                  : selectedOrder.status === 'Cancelled'
                                  ? 'rgba(231, 76, 60, 0.18)'
                                  : selectedOrder.status === 'Returned'
                                  ? 'rgba(155, 89, 182, 0.18)'
                                  : 'rgba(241, 196, 15, 0.18)',
                              color:
                                selectedOrder.status === 'Delivered'
                                  ? '#2ecc71'
                                  : selectedOrder.status === 'Confirmed'
                                  ? '#3498db'
                                  : selectedOrder.status === 'Cancelled'
                                  ? '#e74c3c'
                                  : selectedOrder.status === 'Returned'
                                  ? '#9b59b6'
                                  : '#f1c40f',
                              border:
                                selectedOrder.status === 'Delivered'
                                  ? '1px solid rgba(46, 204, 113, 0.4)'
                                  : selectedOrder.status === 'Confirmed'
                                  ? '1px solid rgba(52, 152, 219, 0.4)'
                                  : selectedOrder.status === 'Cancelled'
                                  ? '1px solid rgba(231, 76, 60, 0.4)'
                                  : selectedOrder.status === 'Returned'
                                  ? '1px solid rgba(155, 89, 182, 0.4)'
                                  : '1px solid rgba(241, 196, 15, 0.4)',
                            }}
                          >
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'currentColor' }} />
                            Order: {selectedOrder.status}
                          </span>

                          {/* Payment Status Badge */}
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              padding: '5px 14px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background:
                                (selectedOrder.payment_status || 'Paid').toUpperCase() === 'PAID'
                                  ? 'rgba(46, 204, 113, 0.18)'
                                  : (selectedOrder.payment_status || '').toUpperCase() === 'FAILED'
                                  ? 'rgba(231, 76, 60, 0.18)'
                                  : (selectedOrder.payment_status || '').toUpperCase().includes('REFUND')
                                  ? 'rgba(155, 89, 182, 0.18)'
                                  : 'rgba(241, 196, 15, 0.18)',
                              color:
                                (selectedOrder.payment_status || 'Paid').toUpperCase() === 'PAID'
                                  ? '#2ecc71'
                                  : (selectedOrder.payment_status || '').toUpperCase() === 'FAILED'
                                  ? '#e74c3c'
                                  : (selectedOrder.payment_status || '').toUpperCase().includes('REFUND')
                                  ? '#9b59b6'
                                  : '#f1c40f',
                              border:
                                (selectedOrder.payment_status || 'Paid').toUpperCase() === 'PAID'
                                  ? '1px solid rgba(46, 204, 113, 0.4)'
                                  : (selectedOrder.payment_status || '').toUpperCase() === 'FAILED'
                                  ? '1px solid rgba(231, 76, 60, 0.4)'
                                  : (selectedOrder.payment_status || '').toUpperCase().includes('REFUND')
                                  ? '1px solid rgba(155, 89, 182, 0.4)'
                                  : '1px solid rgba(241, 196, 15, 0.4)',
                            }}
                          >
                            Payment: {selectedOrder.payment_status || 'Paid'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.86rem', margin: '0 0 24px 0' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#c9a84c" /> Placed on {selectedOrder.date}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={14} color="#c9a84c" /> Payment Method: <strong style={{ color: '#f5efe6' }}>{selectedOrder.paymentMethod || 'Cash on Delivery'}</strong>
                      </span>
                    </div>

                    {/* Order Status Lifecycle Tracker Card (Interactive & Responsive) */}
                    <div className="customer-order-card">
                      {(() => {
                        const currentSt = selectedOrder.status || 'Processing';

                        const statusDescriptions: Record<string, string> = {
                          'Pending': 'Your artisanal chocolate order has been placed and is awaiting store confirmation.',
                          'Confirmed': 'Your order has been confirmed! Our master kitchen is preparing the ingredients.',
                          'Processing': 'Our master chocolatiers are handcrafting and packaging your chocolates in temperature-controlled luxury boxes.',
                          'Shipped': 'Your package has been dispatched with our express cold-chain courier partner.',
                          'Out for Delivery': 'Out with our courier partner today! Keep your phone handy for delivery.',
                          'Out_For_Delivery': 'Out with our courier partner today! Keep your phone handy for delivery.',
                          'Delivered': 'Your chocolates have been safely delivered. We hope you enjoy every bite!',
                          'Cancelled': 'This order was cancelled as requested.',
                          'Returned': 'A return process has been recorded for this order.',
                        };

                        if (currentSt === 'Cancelled') {
                          const cancelledSteps = [
                            { key: 'Placed', label: 'Order Placed', icon: Clock, isDone: true, isError: false },
                            { key: 'Confirmed', label: 'Confirmed', icon: Check, isDone: true, isError: false },
                            { key: 'Cancelled', label: 'Cancelled', icon: X, isDone: true, isError: true },
                          ];
                          return (
                            <div>
                              <div className="customer-order-status-banner" style={{ borderColor: 'rgba(231, 76, 60, 0.4)' }}>
                                <div className="customer-order-status-info">
                                  <div className="customer-order-status-icon-box" style={{ background: 'rgba(231, 76, 60, 0.15)', borderColor: 'rgba(231, 76, 60, 0.4)', color: '#e74c3c' }}>
                                    <X size={22} />
                                  </div>
                                  <div>
                                    <div style={{ color: '#e74c3c', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                      Order Cancelled
                                    </div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.84rem', marginTop: '2px' }}>
                                      {statusDescriptions['Cancelled']}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="customer-stepper-scroll-wrap">
                                <div className="customer-stepper-inner" style={{ minWidth: '380px' }}>
                                  <div style={{ position: 'absolute', top: '32px', left: 'calc(100% / 6)', right: 'calc(100% / 6)', height: '3px', background: 'rgba(231, 76, 60, 0.3)', zIndex: 1 }} />
                                  {cancelledSteps.map((step) => {
                                    const StepIcon = step.icon;
                                    return (
                                      <div key={step.key} className="customer-step-node">
                                        <div
                                          className="customer-step-circle"
                                          style={{
                                            background: step.isError ? '#e74c3c' : '#2ecc71',
                                            border: `2px solid ${step.isError ? '#e74c3c' : '#2ecc71'}`,
                                            color: '#0f0c0a',
                                            boxShadow: step.isError ? '0 0 16px rgba(231, 76, 60, 0.5)' : '0 0 12px rgba(46, 204, 113, 0.4)',
                                          }}
                                        >
                                          <StepIcon size={18} strokeWidth={2.5} />
                                        </div>
                                        <span className="customer-step-label" style={{ fontWeight: 700, color: step.isError ? '#e74c3c' : '#f5efe6' }}>
                                          {step.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (currentSt === 'Returned') {
                          const returnedSteps = [
                            { key: 'Placed', label: 'Order Placed', icon: Clock },
                            { key: 'Confirmed', label: 'Confirmed', icon: Check },
                            { key: 'Processing', label: 'Processing', icon: Package },
                            { key: 'Shipped', label: 'Shipped', icon: Ship },
                            { key: 'Delivered', label: 'Delivered', icon: PackageCheck },
                            { key: 'Returned', label: 'Returned', icon: RefreshCw },
                          ];
                          return (
                            <div>
                              <div className="customer-order-status-banner" style={{ borderColor: 'rgba(155, 89, 182, 0.4)' }}>
                                <div className="customer-order-status-info">
                                  <div className="customer-order-status-icon-box" style={{ background: 'rgba(155, 89, 182, 0.15)', borderColor: 'rgba(155, 89, 182, 0.4)', color: '#9b59b6' }}>
                                    <RefreshCw size={22} />
                                  </div>
                                  <div>
                                    <div style={{ color: '#9b59b6', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                      Order Returned
                                    </div>
                                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.84rem', marginTop: '2px' }}>
                                      {statusDescriptions['Returned']}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="customer-stepper-scroll-wrap">
                                <div className="customer-stepper-inner">
                                  <div style={{ position: 'absolute', top: '32px', left: 'calc(100% / 12)', right: 'calc(100% / 12)', height: '3px', background: 'rgba(155, 89, 182, 0.4)', zIndex: 1 }} />
                                  {returnedSteps.map((step) => {
                                    const StepIcon = step.icon;
                                    const isReturn = step.key === 'Returned';
                                    return (
                                      <div key={step.key} className="customer-step-node">
                                        <div
                                          className="customer-step-circle"
                                          style={{
                                            background: isReturn ? '#9b59b6' : '#2ecc71',
                                            border: `2px solid ${isReturn ? '#9b59b6' : '#2ecc71'}`,
                                            color: '#0f0c0a',
                                            boxShadow: `0 0 14px ${isReturn ? 'rgba(155, 89, 182, 0.4)' : 'rgba(46, 204, 113, 0.4)'}`,
                                          }}
                                        >
                                          <StepIcon size={18} strokeWidth={2.5} />
                                        </div>
                                        <span className="customer-step-label" style={{ fontWeight: 700, color: isReturn ? '#9b59b6' : '#f5efe6' }}>
                                          {step.label}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Normal flow: Placed → Confirmed → Processing → Shipped → Out for Delivery → Delivered
                        const normalSteps = [
                          { key: 'Pending', label: 'Order Placed', icon: Clock },
                          { key: 'Confirmed', label: 'Confirmed', icon: Check },
                          { key: 'Processing', label: 'Processing', icon: Package },
                          { key: 'Shipped', label: 'Shipped', icon: Ship },
                          { key: 'Out for Delivery', label: 'Out for Delivery', icon: Truck },
                          { key: 'Delivered', label: 'Delivered', icon: PackageCheck },
                        ];

                        const statusHierarchy: Record<string, number> = {
                          'Pending': 0,
                          'Confirmed': 1,
                          'Processing': 2,
                          'Shipped': 3,
                          'Out for Delivery': 4,
                          'Out_For_Delivery': 4,
                          'Delivered': 5,
                        };

                        const currentLevel = statusHierarchy[currentSt] !== undefined ? statusHierarchy[currentSt] : 2;
                        const currentStepObj = normalSteps[currentLevel] || normalSteps[2];
                        const CurrentStepIcon = currentStepObj.icon;
                        const progressPct = Math.min(100, Math.round((currentLevel / (normalSteps.length - 1)) * 100));

                        return (
                          <div>
                            {/* Interactive Active Status Highlight Banner */}
                            <div className="customer-order-status-banner">
                              <div className="customer-order-status-info">
                                <div className="customer-order-status-icon-box">
                                  <CurrentStepIcon size={22} strokeWidth={2.2} />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ color: '#2ecc71', fontWeight: 800, fontSize: '0.96rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                      {currentStepObj.label}
                                    </span>
                                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', fontWeight: 700 }}>
                                      {currentLevel === 5 ? 'Completed' : `Step ${currentLevel + 1} of 6`}
                                    </span>
                                  </div>
                                  <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.84rem', marginTop: '3px', lineHeight: 1.4 }}>
                                    {statusDescriptions[currentSt] || statusDescriptions['Processing']}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                <span style={{ fontSize: '0.76rem', color: '#c9a84c', fontWeight: 700 }}>
                                  {progressPct}% Completed
                                </span>
                              </div>
                            </div>

                            {/* Stepper Track with Smooth Touch Scroll on Mobile & Active Progress Bar */}
                            <div className="customer-stepper-scroll-wrap">
                              <div className="customer-stepper-inner">
                                {/* Base Track Line */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '32px',
                                    left: 'calc(100% / 12)',
                                    right: 'calc(100% / 12)',
                                    height: '4px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '2px',
                                    zIndex: 1,
                                  }}
                                />
                                {/* Active Progress Fill Line */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: '32px',
                                    left: 'calc(100% / 12)',
                                    width: `calc((100% - (100% / 6)) * (${currentLevel} / 5))`,
                                    height: '4px',
                                    background: 'linear-gradient(90deg, #2ecc71 0%, #27ae60 100%)',
                                    boxShadow: '0 0 12px rgba(46, 204, 113, 0.6)',
                                    borderRadius: '2px',
                                    zIndex: 1,
                                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                  }}
                                />

                                {normalSteps.map((step, idx) => {
                                  const isDone = idx < currentLevel;
                                  const isCurrent = idx === currentLevel;
                                  const StepIcon = step.icon;

                                  return (
                                    <div key={step.key} className="customer-step-node">
                                      <div
                                        className={`customer-step-circle ${isCurrent ? 'active' : ''}`}
                                        style={{
                                          background: isDone
                                            ? '#2ecc71'
                                            : isCurrent
                                            ? '#14100c'
                                            : 'rgba(18, 14, 11, 0.95)',
                                          border: isDone
                                            ? '2px solid #2ecc71'
                                            : isCurrent
                                            ? '2.5px solid #2ecc71'
                                            : '2px solid rgba(255, 255, 255, 0.18)',
                                          color: isDone
                                            ? '#0f0c0a'
                                            : isCurrent
                                            ? '#2ecc71'
                                            : 'rgba(255, 255, 255, 0.4)',
                                          boxShadow: isDone
                                            ? '0 0 14px rgba(46, 204, 113, 0.4)'
                                            : isCurrent
                                            ? '0 0 16px rgba(46, 204, 113, 0.6)'
                                            : 'none',
                                        }}
                                      >
                                        {isDone ? <Check size={18} strokeWidth={3} /> : <StepIcon size={18} strokeWidth={2.2} />}
                                      </div>

                                      <span
                                        className="customer-step-label"
                                        style={{
                                          fontWeight: isCurrent || isDone ? 700 : 500,
                                          color: isCurrent ? '#2ecc71' : isDone ? '#f5efe6' : 'rgba(255, 255, 255, 0.4)',
                                        }}
                                      >
                                        {step.label}
                                      </span>

                                      {isCurrent && (
                                        <span
                                          style={{
                                            fontSize: '0.66rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.5px',
                                            textTransform: 'uppercase',
                                            color: '#2ecc71',
                                            background: 'rgba(46, 204, 113, 0.15)',
                                            padding: '1px 6px',
                                            borderRadius: '4px',
                                            marginTop: '4px',
                                            whiteSpace: 'nowrap',
                                          }}
                                        >
                                          Current
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Mobile Scroll Indicator */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(201, 168, 76, 0.65)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                ⇄ Scroll track to view timeline
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Customer Delivery OTP Card when Out for Delivery */}
                    {Boolean(selectedOrder.delivery_otp || selectedOrder.status === 'Out for Delivery' || selectedOrder.fulfillment_status === 'OUT_FOR_DELIVERY') && (
                      <div
                        className="customer-order-card"
                        style={{
                          background: 'linear-gradient(135deg, rgba(35, 27, 18, 0.95) 0%, rgba(20, 15, 11, 0.98) 100%)',
                          border: '2px solid rgba(201, 168, 76, 0.5)',
                          borderRadius: '16px',
                          padding: '24px',
                          marginBottom: '20px',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            borderBottom: '1px solid rgba(201, 168, 76, 0.2)',
                            paddingBottom: '16px',
                            marginBottom: '18px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'rgba(201, 168, 76, 0.15)',
                                border: '1px solid #c9a84c',
                                color: '#c9a84c',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Truck size={24} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.75rem', color: '#c9a84c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                LIVE ORDER DELIVERY VERIFICATION
                              </div>
                              <h4 style={{ margin: '2px 0 0', color: '#f5efe6', fontSize: '1.15rem', fontWeight: 700 }}>
                                Your Chocolates Are Out For Delivery!
                              </h4>
                            </div>
                          </div>

                          {selectedOrder.delivery_boy_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <div
                                style={{
                                  background: 'rgba(46, 204, 113, 0.12)',
                                  border: '1px solid rgba(46, 204, 113, 0.35)',
                                  padding: '6px 14px',
                                  borderRadius: '20px',
                                  color: '#2ecc71',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span>Executive:</span>
                                <strong style={{ color: '#fff' }}>{selectedOrder.delivery_boy_name}</strong>
                              </div>
                              {(selectedOrder.delivery_boy_phone || (selectedOrder as any).deliveryBoyPhone) && (
                                <a
                                  href={`tel:${selectedOrder.delivery_boy_phone || (selectedOrder as any).deliveryBoyPhone}`}
                                  style={{
                                    background: 'rgba(201, 168, 76, 0.15)',
                                    border: '1px solid rgba(201, 168, 76, 0.4)',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    color: '#c9a84c',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <Phone size={13} />
                                  <span>Call: {selectedOrder.delivery_boy_phone || (selectedOrder as any).deliveryBoyPhone}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {selectedOrder.delivery_otp ? (
                          <div style={{ textAlign: 'center', padding: '10px 0' }}>
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.75)', marginBottom: '12px' }}>
                              Share this confidential 6-digit code with your delivery executive upon package handover:
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <div
                                style={{
                                  display: 'inline-flex',
                                  gap: '8px',
                                  padding: '12px 20px',
                                  background: 'rgba(12, 9, 7, 0.85)',
                                  borderRadius: '14px',
                                  border: '2px dashed #c9a84c',
                                  boxShadow: '0 4px 20px rgba(201, 168, 76, 0.25)',
                                }}
                              >
                                {String(selectedOrder.delivery_otp).split('').map((char: string, i: number) => (
                                  <span
                                    key={i}
                                    style={{
                                      width: '42px',
                                      height: '50px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: 'rgba(201, 168, 76, 0.15)',
                                      color: '#f5efe6',
                                      fontSize: '1.6rem',
                                      fontWeight: 900,
                                      borderRadius: '8px',
                                      border: '1px solid rgba(201, 168, 76, 0.3)',
                                      letterSpacing: '1px',
                                    }}
                                  >
                                    {char}
                                  </span>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(String(selectedOrder.delivery_otp))}
                                style={{
                                  padding: '10px 18px',
                                  borderRadius: '8px',
                                  background: copiedCode === String(selectedOrder.delivery_otp) ? '#2ecc71' : '#c9a84c',
                                  color: '#0f0c0a',
                                  fontWeight: 800,
                                  fontSize: '0.85rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {copiedCode === String(selectedOrder.delivery_otp) ? (
                                  <>
                                    <Check size={16} /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy size={16} /> Copy OTP
                                  </>
                                )}
                              </button>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(201, 168, 76, 0.8)', marginTop: '14px' }}>
                              🔒 For security, only share this code when you receive your chilled Chovique packaging.
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '14px 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.88rem' }}>
                            Your delivery partner is en route to your doorstep. The 6-digit delivery OTP will generate automatically upon arrival.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delivery Partner Assigned Card (When assigned and accepted, before Out for Delivery) */}
                    {!Boolean(selectedOrder.delivery_otp || selectedOrder.status === 'Out for Delivery' || selectedOrder.fulfillment_status === 'OUT_FOR_DELIVERY') && selectedOrder.delivery_boy_name && (
                      <div
                        className="customer-order-card"
                        style={{
                          background: 'linear-gradient(135deg, rgba(20, 35, 25, 0.9) 0%, rgba(14, 22, 16, 0.95) 100%)',
                          border: '1.5px solid rgba(46, 204, 113, 0.4)',
                          borderRadius: '14px',
                          padding: '18px 22px',
                          marginBottom: '20px',
                          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '10px',
                              background: 'rgba(46, 204, 113, 0.15)',
                              border: '1px solid rgba(46, 204, 113, 0.4)',
                              color: '#2ecc71',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Truck size={22} />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                              DELIVERY PARTNER ASSIGNED & ACCEPTED
                            </div>
                            <div style={{ color: '#f5efe6', fontSize: '0.95rem', fontWeight: 700, marginTop: '2px' }}>
                              Executive: {selectedOrder.delivery_boy_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                              Your package is being prepared for handover. Delivery OTP will generate when out for delivery.
                            </div>
                          </div>
                        </div>
                        {(selectedOrder.delivery_boy_phone || (selectedOrder as any).deliveryBoyPhone) && (
                          <a
                            href={`tel:${selectedOrder.delivery_boy_phone || (selectedOrder as any).deliveryBoyPhone}`}
                            style={{
                              background: 'rgba(46, 204, 113, 0.15)',
                              border: '1px solid rgba(46, 204, 113, 0.4)',
                              padding: '8px 16px',
                              borderRadius: '8px',
                              color: '#2ecc71',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              textDecoration: 'none',
                            }}
                          >
                            <Phone size={14} />
                            <span>Contact: {selectedOrder.delivery_boy_phone || (selectedOrder as any).deliveryBoyPhone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Order Items Card (Responsive Table on Desktop, Clean Cards on Mobile) */}
                    <div className="customer-order-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.25rem', color: '#f5efe6', margin: 0, fontWeight: 700 }}>
                            Order Items
                          </h3>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: 'rgba(201, 168, 76, 0.15)', color: '#c9a84c', border: '1px solid rgba(201, 168, 76, 0.3)' }}>
                            {selectedOrder.items?.length || 0} {selectedOrder.items?.length === 1 ? 'Item' : 'Items'}
                          </span>
                        </div>
                      </div>

                      {/* 1. Desktop & Laptop View Data Table */}
                      <table className="customer-order-items-desktop">
                        <colgroup>
                          <col style={{ width: '48%' }} />
                          <col style={{ width: '18%' }} />
                          <col style={{ width: '14%' }} />
                          <col style={{ width: '20%' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.12)', color: 'rgba(201, 168, 76, 0.9)', textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.8px', fontWeight: 700 }}>
                            <th style={{ padding: '12px 14px 14px 0', textAlign: 'left' }}>PRODUCT</th>
                            <th style={{ padding: '12px 14px 14px 14px', textAlign: 'right' }}>PRICE</th>
                            <th style={{ padding: '12px 14px 14px 14px', textAlign: 'center' }}>QTY</th>
                            <th style={{ padding: '12px 0 14px 14px', textAlign: 'right' }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items.map((item: any, idx: number) => {
                            const prodName = item.product?.name || item.name || 'Artisanal Chocolate Box';
                            const rawImage = item.product?.image || item.product?.images?.[0] || item.image;
                            const prodImage = getImageUrl(rawImage);
                            const sku = item.product?.sku || item.sku || `SKU-CH-${idx + 1}`;
                            const price = Number(item.product?.price || item.price || 0);
                            const qty = Number(item.quantity || 1);
                            const lineTotal = price * qty;

                            return (
                              <tr key={item.product?.id || idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                <td style={{ padding: '16px 14px 16px 0', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <img
                                      src={prodImage}
                                      alt={prodName}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=120&q=80';
                                      }}
                                      style={{ width: '54px', height: '54px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(201, 168, 76, 0.3)', flexShrink: 0 }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                      <h4 style={{ color: '#f5efe6', margin: '0 0 4px 0', fontSize: '0.92rem', fontWeight: 700, wordBreak: 'break-word' }}>
                                        {prodName}
                                      </h4>
                                      <span style={{ display: 'inline-block', color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.76rem', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                                        SKU: {sku}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '16px 14px', textAlign: 'right', color: '#f5efe6', fontWeight: 600, fontSize: '0.9rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                  ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '16px 14px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '14px', background: 'rgba(201, 168, 76, 0.12)', border: '1px solid rgba(201, 168, 76, 0.3)', color: '#c9a84c', fontWeight: 700, fontSize: '0.85rem' }}>
                                    {qty}
                                  </span>
                                </td>
                                <td style={{ padding: '16px 0 16px 14px', textAlign: 'right', color: '#c9a84c', fontWeight: 800, fontSize: '0.98rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                                  ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* 2. Mobile View Clean Cards (Solves clumsy colliding table on narrow screens) */}
                      <div className="customer-order-items-mobile">
                        {selectedOrder.items.map((item: any, idx: number) => {
                          const prodName = item.product?.name || item.name || 'Artisanal Chocolate Box';
                          const rawImage = item.product?.image || item.product?.images?.[0] || item.image;
                          const prodImage = getImageUrl(rawImage);
                          const sku = item.product?.sku || item.sku || `SKU-CH-${idx + 1}`;
                          const price = Number(item.product?.price || item.price || 0);
                          const qty = Number(item.quantity || 1);
                          const lineTotal = price * qty;

                          return (
                            <div
                              key={item.product?.id || idx}
                              style={{
                                background: 'rgba(26, 20, 15, 0.7)',
                                border: '1px solid rgba(201, 168, 76, 0.2)',
                                borderRadius: '12px',
                                padding: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                              }}
                            >
                              <img
                                src={prodImage}
                                alt={prodName}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=120&q=80';
                                }}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '10px',
                                  objectFit: 'cover',
                                  border: '1px solid rgba(201, 168, 76, 0.3)',
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                                  <h4 style={{ color: '#f5efe6', margin: 0, fontSize: '0.9rem', fontWeight: 700, wordBreak: 'break-word', lineHeight: 1.3 }}>
                                    {prodName}
                                  </h4>
                                  <span style={{ color: '#c9a84c', fontWeight: 800, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                                    ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '6px' }}>
                                  <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.74rem' }}>
                                    SKU: {sku}
                                  </span>
                                  <span style={{ fontSize: '0.76rem', color: '#f5efe6', background: 'rgba(201, 168, 76, 0.12)', border: '1px solid rgba(201, 168, 76, 0.25)', padding: '2px 8px', borderRadius: '6px' }}>
                                    ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 0 })} × {qty} qty
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2 Cards Grid Bottom Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1.3fr 1fr', gap: '20px', marginBottom: '28px' }}>
                      {/* Card 1: Shipping & Billing Address */}
                      <div className="customer-order-card" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                          <MapPin size={18} color="#c9a84c" />
                          <h4 style={{ color: '#f5efe6', margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                            Shipping & Billing Address
                          </h4>
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                          <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#f5efe6' }}>
                            {selectedOrder.shippingAddress?.name || user.name}
                          </p>
                          <div>{selectedOrder.shippingAddress?.street || '12-34, MG Road, Block A'}</div>
                          <div>
                            {selectedOrder.shippingAddress?.city || 'Hyderabad'}, {selectedOrder.shippingAddress?.state || 'Telangana'} - {selectedOrder.shippingAddress?.zip || '500001'}
                          </div>
                          <div>India</div>
                          <div style={{ marginTop: '8px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={13} color="#c9a84c" /> {selectedOrder.shippingAddress?.phone || '+91 83098 54870'}
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Order Summary */}
                      <div className="customer-order-card" style={{ marginBottom: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                          <FileText size={18} color="#c9a84c" />
                          <h4 style={{ color: '#f5efe6', margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                            Order Summary
                          </h4>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.7)' }}>
                            <span>Subtotal</span>
                            <span style={{ color: '#f5efe6', fontWeight: 600 }}>
                              ₹{(selectedOrder.subtotal || selectedOrder.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.7)' }}>
                            <span>Coupon Discount</span>
                            <span style={{ color: '#2ecc71', fontWeight: 600 }}>
                              - ₹{(selectedOrder.coupon_discount || selectedOrder.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.7)' }}>
                            <span>Shipping</span>
                            <span style={{ color: '#f5efe6', fontWeight: 600 }}>
                              ₹{(selectedOrder.shipping || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          {(selectedOrder.tax || 0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255, 255, 255, 0.7)' }}>
                              <span>Tax (GST)</span>
                              <span style={{ color: '#f5efe6', fontWeight: 600 }}>
                                ₹{(selectedOrder.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f5efe6' }}>Total</span>
                              <span style={{ display: 'block', fontSize: '0.74rem', color: '#2ecc71', fontWeight: 700, marginTop: '2px' }}>
                                Payment: {selectedOrder.payment_status || 'Paid'}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '1.28rem', fontWeight: 800, color: '#c9a84c' }}>
                                ₹{selectedOrder.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
                      {isOrderCancellable(selectedOrder) && (
                        <button
                          type="button"
                          disabled={cancellingOrderId === selectedOrder.id}
                          onClick={() => handleCancelOrder(selectedOrder.id)}
                          style={{
                            padding: '11px 22px',
                            borderRadius: '8px',
                            background: 'rgba(231, 76, 60, 0.1)',
                            border: '1px solid rgba(231, 76, 60, 0.5)',
                            color: '#e74c3c',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: cancellingOrderId === selectedOrder.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <X size={16} /> {cancellingOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      )}
                      {isOrderReturnable(selectedOrder) && (
                        <button
                          type="button"
                          disabled={returningOrderId === selectedOrder.id}
                          onClick={() => handleReturnOrder(selectedOrder.id)}
                          style={{
                            padding: '11px 22px',
                            borderRadius: '8px',
                            background: 'rgba(155, 89, 182, 0.1)',
                            border: '1px solid rgba(155, 89, 182, 0.5)',
                            color: '#9b59b6',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: returningOrderId === selectedOrder.id ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <RefreshCw size={16} /> {returningOrderId === selectedOrder.id ? 'Submitting...' : 'Return Order'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const custPhone = selectedOrder.shippingAddress?.phone || '';
                          const cleanCust = custPhone.replace(/\D/g, '');
                          const normPhone = cleanCust.length === 10 ? `91${cleanCust}` : cleanCust;
                          const itemsText = (selectedOrder.items || []).map((it: any) => `• ${it.product?.name || 'Artisanal Chocolate'} × ${it.quantity} (₹${((it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')})`).join('\n');
                          const msg = `🍫 *CHOVIQUE — Order Confirmation*\n\nOrder ID: ${selectedOrder.id}\nDate: ${selectedOrder.date}\nTotal: ₹${(selectedOrder.total || 0).toLocaleString('en-IN')}\nStatus: ${selectedOrder.status}\n\nShipping To: ${selectedOrder.shippingAddress?.name || user.name}\n${selectedOrder.shippingAddress?.street || ''}, ${selectedOrder.shippingAddress?.city || ''}\nPhone: ${custPhone}\n\nItems:\n${itemsText}\n\nHelpline: +91 83098 54870`;
                          const targetUrl = selectedOrder.customer_whatsapp_url || (normPhone ? `https://wa.me/${normPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/918309854870?text=${encodeURIComponent(msg)}`);
                          window.open(targetUrl, '_blank');
                        }}
                        style={{
                          padding: '11px 20px',
                          borderRadius: '8px',
                          background: 'rgba(37, 211, 102, 0.12)',
                          border: '1px solid rgba(37, 211, 102, 0.45)',
                          color: '#25D366',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <MessageSquare size={16} /> WhatsApp Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderSubView('invoice')}
                        style={{
                          padding: '11px 22px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: '1px solid rgba(201, 168, 76, 0.5)',
                          color: '#f5efe6',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <FileText size={16} /> View Invoice
                      </button>
                      <button
                        type="button"
                        disabled={isPdfDownloading}
                        onClick={(e) => handleDownloadInvoice(selectedOrder.id, e)}
                        style={{
                          padding: '11px 24px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                          color: '#0f0c0a',
                          border: 'none',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          cursor: isPdfDownloading ? 'not-allowed' : 'pointer',
                          opacity: isPdfDownloading ? 0.7 : 1,
                          boxShadow: '0 4px 14px rgba(201, 168, 76, 0.35)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {isPdfDownloading ? (
                          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF...</>
                        ) : (
                          <><Download size={16} /> Download PDF</>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. INVOICE PREVIEW SUB-VIEW */}
                {selectedOrder && orderSubView === 'invoice' && (
                  <div>
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={() => setOrderSubView('details')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#c9a84c',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '20px',
                        padding: 0,
                      }}
                    >
                      <ArrowLeft size={16} /> Back to Orders
                    </button>

                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 24px 0', fontWeight: 700 }}>
                      Invoice Preview
                    </h2>

                    {/* 2-Column Invoice Workspace */}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 300px', gap: '28px', alignItems: 'flex-start' }}>
                      {/* Left: Parchment Invoice Document */}
                      <div
                        style={{
                          background: '#f8f4ec',
                          color: '#1a0d00',
                          borderRadius: '12px',
                          padding: '36px',
                          border: '1px solid #e5dccb',
                          boxShadow: '0 10px 35px rgba(0,0,0,0.85)',
                          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
                        }}
                      >
                        {/* Brand & Invoice Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #c9a84c', paddingBottom: '20px', marginBottom: '24px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '2px', color: '#1a0d00' }}>CHOVIQUE</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#c9a84c', letterSpacing: '2px', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                              PREMIUM HANDMADE CHOCOLATES
                            </span>
                            <div style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.5 }}>
                              <div>Chovique Chocolates Pvt. Ltd.</div>
                              <div>123, Chocolate Lane, Hitec City</div>
                              <div>Hyderabad, Telangana - 500081, India</div>
                              <div>Email: hello@chovique.com | Phone: +91 83098 54870</div>
                              <div>GSTIN: 36ABCDE1234F1ZS</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1a0d00', margin: '0 0 10px 0' }}>INVOICE</h2>
                            <div style={{ fontSize: '0.84rem', color: '#444', lineHeight: 1.6 }}>
                              <div><strong>Invoice No:</strong> INV-{selectedOrder.id}</div>
                              <div><strong>Order No:</strong> {selectedOrder.id}</div>
                              <div><strong>Invoice Date:</strong> {selectedOrder.date}</div>
                              <div><strong>Payment Method:</strong> {selectedOrder.paymentMethod || 'Cash on Delivery'}</div>
                              <div><strong>Payment Status:</strong> <span style={{ color: '#2ecc71', fontWeight: 700 }}>{selectedOrder.payment_status || 'Paid'}</span></div>
                              <div><strong>Order Status:</strong> {selectedOrder.status}</div>
                            </div>
                          </div>
                        </div>

                        {/* Bill To & Ship To Box */}
                        <div style={{ marginBottom: '28px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #e5dccb' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>BILL & SHIP TO</span>
                          <div style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.5 }}>
                            <strong>{selectedOrder.shippingAddress?.name || user.name}</strong>
                            <div>{user.email}</div>
                            <div>{selectedOrder.shippingAddress?.street || '12-34, MG Road, Block A'}</div>
                            <div>{selectedOrder.shippingAddress?.city || 'Hyderabad'}, {selectedOrder.shippingAddress?.state || 'Telangana'} - {selectedOrder.shippingAddress?.zip || '500001'}</div>
                            <div>India</div>
                            <div>{selectedOrder.shippingAddress?.phone || '+91 83098 54870'}</div>
                          </div>
                        </div>

                        {/* Invoice Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.85rem' }}>
                          <thead>
                            <tr style={{ background: '#120e0b', color: '#f5efe6', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                              <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>PRODUCT</th>
                              <th style={{ padding: '10px', textAlign: 'left' }}>SKU</th>
                              <th style={{ padding: '10px', textAlign: 'center' }}>QTY</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>UNIT PRICE</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>DISCOUNT</th>
                              <th style={{ padding: '10px', textAlign: 'right' }}>TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrder.items.map((item: any, idx: number) => {
                              const prodName = item.product?.name || 'Artisanal Chocolate Box';
                              const sku = item.product?.sku || 'SCB-250G';
                              const price = item.product?.price || item.price || 0;
                              const qty = item.quantity || 1;
                              const total = price * qty;

                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #e5dccb' }}>
                                  <td style={{ padding: '10px' }}>{idx + 1}</td>
                                  <td style={{ padding: '10px', fontWeight: 600 }}>{prodName}</td>
                                  <td style={{ padding: '10px', color: '#666' }}>{sku}</td>
                                  <td style={{ padding: '10px', textAlign: 'center' }}>{qty}</td>
                                  <td style={{ padding: '10px', textAlign: 'right' }}>₹{price.toFixed(2)}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', color: '#e74c3c' }}>-₹{(selectedOrder.coupon_discount || 0).toFixed(2)}</td>
                                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700 }}>₹{total.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Price Summary */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
                          <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                              <span>Subtotal</span>
                              <span>₹{(selectedOrder.subtotal || selectedOrder.total).toFixed(2)}</span>
                            </div>
                            {(selectedOrder.coupon_discount || 0) > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                                <span>Coupon Discount</span>
                                <span>-₹{(selectedOrder.coupon_discount || 0).toFixed(2)}</span>
                              </div>
                            )}
                            {(selectedOrder.coin_discount || 0) > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                                <span>Coin Discount</span>
                                <span>-₹{(selectedOrder.coin_discount || 0).toFixed(2)}</span>
                              </div>
                            )}
                            {((selectedOrder.discount || 0) > 0 && !(selectedOrder.coupon_discount || 0) && !(selectedOrder.coin_discount || 0)) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e74c3c' }}>
                                <span>Promo Discount</span>
                                <span>-₹{(selectedOrder.discount || 0).toFixed(2)}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                              <span>Shipping</span>
                              <span>₹{(selectedOrder.shipping || 0).toFixed(2)}</span>
                            </div>
                            {(selectedOrder.tax || 0) > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                                <span>Tax (GST)</span>
                                <span>₹{(selectedOrder.tax || 0).toFixed(2)}</span>
                              </div>
                            )}
                            <div style={{ borderTop: '2px solid #1a0d00', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800 }}>
                              <span>Grand Total</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ color: '#1a0d00' }}>₹{selectedOrder.total.toFixed(2)}</span>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: '#2ecc71', fontWeight: 700 }}>
                                  Payment: {selectedOrder.payment_status || 'Paid'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Invoice Footer */}
                        <div style={{ borderTop: '1px solid #e5dccb', paddingTop: '16px', textAlign: 'center', fontSize: '0.8rem', color: '#666', lineHeight: 1.5 }}>
                          Thank you for choosing CHOVIQUE. We appreciate your trust and support.
                        </div>
                      </div>

                      {/* Right: Invoice Actions Card */}
                      <div
                        style={{
                          background: 'rgba(18, 14, 11, 0.95)',
                          border: '1px solid rgba(201, 168, 76, 0.25)',
                          borderRadius: '14px',
                          padding: '24px',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                        }}
                      >
                        <h4 style={{ color: '#f5efe6', margin: '0 0 18px 0', fontSize: '1.1rem', fontWeight: 700 }}>
                          Invoice Actions
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <button
                            type="button"
                            disabled={isPdfDownloading}
                            onClick={(e) => handleDownloadInvoice(selectedOrder.id, e)}
                            style={{
                              width: '100%',
                              padding: '12px 18px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                              color: '#0f0c0a',
                              border: 'none',
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              cursor: isPdfDownloading ? 'not-allowed' : 'pointer',
                              boxShadow: '0 4px 14px rgba(201, 168, 76, 0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            {isPdfDownloading ? (
                              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Downloading...</>
                            ) : (
                              <><Download size={16} /> Download PDF</>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => window.print()}
                            style={{
                              width: '100%',
                              padding: '12px 18px',
                              borderRadius: '8px',
                              background: 'transparent',
                              border: '1px solid rgba(201, 168, 76, 0.5)',
                              color: '#c9a84c',
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                            }}
                          >
                            <Printer size={16} /> Print Invoice
                          </button>

                          {isOrderCancellable(selectedOrder) && (
                            <button
                              type="button"
                              disabled={cancellingOrderId === selectedOrder.id}
                              onClick={() => handleCancelOrder(selectedOrder.id)}
                              style={{
                                width: '100%',
                                padding: '12px 18px',
                                borderRadius: '8px',
                                background: 'rgba(231, 76, 60, 0.1)',
                                border: '1px solid rgba(231, 76, 60, 0.5)',
                                color: '#e74c3c',
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                cursor: cancellingOrderId === selectedOrder.id ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                marginTop: '4px',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {cancellingOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                          )}

                          <div
                            style={{
                              marginTop: '12px',
                              padding: '16px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              color: 'rgba(255, 255, 255, 0.55)',
                              lineHeight: 1.5,
                              textAlign: 'center',
                            }}
                          >
                            This is a computer generated invoice and does not require a signature.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ORDER HISTORY LIST VIEW (MAIN ORDERS VIEW) */}
                {(!selectedOrder || orderSubView === 'list') && (
                  <div>
                    {/* Header */}
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                          Order History
                        </h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                          Track and manage all your orders in one place with real-time updates.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleManualRefreshOrders}
                        disabled={isRefreshingOrders || isOrdersLoading}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          background: isRefreshingOrders ? 'rgba(201, 168, 76, 0.25)' : 'rgba(201, 168, 76, 0.12)',
                          border: '1px solid rgba(201, 168, 76, 0.4)',
                          color: '#c9a84c',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          cursor: isRefreshingOrders || isOrdersLoading ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                          boxShadow: isRefreshingOrders ? '0 0 12px rgba(201, 168, 76, 0.3)' : 'none',
                        }}
                      >
                        <RefreshCw size={15} style={{ animation: (isRefreshingOrders || isOrdersLoading) ? 'spin 1s linear infinite' : 'none' }} />
                        <span>{(isRefreshingOrders || isOrdersLoading) ? 'Refreshing...' : 'Refresh Orders'}</span>
                      </button>
                    </div>

                    {/* Filter Tabs & Search Row */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                      {!isMobileGrid ? (
                        <>
                          {/* Desktop: Status Filters Buttons */}
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['All Orders', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'].map((statusOption) => {
                              const filterVal = statusOption === 'All Orders' ? 'All' : statusOption;
                              const isActive = orderStatusFilter === filterVal;
                              return (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => setOrderStatusFilter(filterVal)}
                                  style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    border: isActive ? '1px solid #c9a84c' : '1px solid rgba(201, 168, 76, 0.2)',
                                    background: isActive ? '#c9a84c' : 'rgba(18, 14, 11, 0.95)',
                                    color: isActive ? '#0f0c0a' : 'rgba(255, 255, 255, 0.8)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {statusOption}
                                </button>
                              );
                            })}
                          </div>

                          {/* Desktop: Search Input & Sort Dropdown */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                            <div style={{ position: 'relative', width: '320px' }}>
                              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
                              <input
                                type="text"
                                placeholder="Search by Order ID"
                                value={orderSearchQuery}
                                onChange={(e) => setOrderSearchQuery(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px 14px 10px 38px',
                                  borderRadius: '8px',
                                  background: 'rgba(18, 14, 11, 0.95)',
                                  border: '1px solid rgba(201, 168, 76, 0.3)',
                                  color: '#f5efe6',
                                  fontSize: '0.88rem',
                                  outline: 'none',
                                  boxSizing: 'border-box',
                                }}
                              />
                            </div>
                            <select
                              value={orderSortOrder}
                              onChange={(e) => setOrderSortOrder(e.target.value as 'newest' | 'oldest')}
                              style={{
                                padding: '10px 16px',
                                borderRadius: '8px',
                                background: '#120e0b',
                                border: '1px solid rgba(201, 168, 76, 0.3)',
                                color: '#f5efe6',
                                fontSize: '0.88rem',
                                outline: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="newest" style={{ background: '#120e0b' }}>Newest First</option>
                              <option value="oldest" style={{ background: '#120e0b' }}>Oldest First</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Mobile: Search Input Top */}
                          <div style={{ position: 'relative', width: '100%' }}>
                            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.4)' }} />
                            <input
                              type="text"
                              placeholder="Search by Order ID"
                              value={orderSearchQuery}
                              onChange={(e) => setOrderSearchQuery(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 14px 10px 38px',
                                borderRadius: '8px',
                                background: 'rgba(18, 14, 11, 0.95)',
                                border: '1px solid rgba(201, 168, 76, 0.3)',
                                color: '#f5efe6',
                                fontSize: '0.88rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>

                          {/* Mobile: Status Dropdown & Sort Dropdown side by side */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <select
                              value={orderStatusFilter === 'All' ? 'All Orders' : orderStatusFilter}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOrderStatusFilter(val === 'All Orders' ? 'All' : val);
                              }}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: '#120e0b',
                                border: '1px solid rgba(201, 168, 76, 0.3)',
                                color: '#f5efe6',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer',
                                width: '100%',
                              }}
                            >
                              {['All Orders', 'Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned'].map((statusOption) => (
                                <option key={statusOption} value={statusOption} style={{ background: '#120e0b' }}>
                                  {statusOption}
                                </option>
                              ))}
                            </select>

                            <select
                              value={orderSortOrder}
                              onChange={(e) => setOrderSortOrder(e.target.value as 'newest' | 'oldest')}
                              style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: '#120e0b',
                                border: '1px solid rgba(201, 168, 76, 0.3)',
                                color: '#f5efe6',
                                fontSize: '0.85rem',
                                outline: 'none',
                                cursor: 'pointer',
                                width: '100%',
                              }}
                            >
                              <option value="newest" style={{ background: '#120e0b' }}>Newest First</option>
                              <option value="oldest" style={{ background: '#120e0b' }}>Oldest First</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Order Cards List */}
                    {isOrdersLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c9a84c', padding: '30px 0', justifyContent: 'center' }}>
                        <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Loading order history...</span>
                      </div>
                    ) : ordersError ? (
                      <div style={{ padding: '16px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px' }}>
                        {ordersError}
                      </div>
                    ) : (
                      (() => {
                        const filteredList = orders
                          .filter((ord) => {
                            // Hide incomplete/failed online payment orders
                            const paymentMethodStr = (ord.payment_method || ord.paymentMethod || '').toLowerCase();
                            const isOnline = !['cash on delivery', 'cod'].includes(paymentMethodStr);
                            
                            const ordStatus = ord.status || '';
                            const payStatus = ord.payment_status || '';
                            
                            if (isOnline && (ordStatus.toUpperCase() === 'PENDING') && (payStatus.toUpperCase() === 'PENDING' || payStatus.toUpperCase() === 'FAILED')) {
                              return false;
                            }

                            if (orderStatusFilter !== 'All') {
                              const filterNorm = orderStatusFilter.toLowerCase().replace(/[-_ ]/g, '');
                              const statusNorm = (ord.status || '').toLowerCase().replace(/[-_ ]/g, '');
                              const fulfillmentNorm = (ord.fulfillment_status || (ord as any).fulfillmentStatus || '').toLowerCase().replace(/[-_ ]/g, '');
                              if (statusNorm !== filterNorm && fulfillmentNorm !== filterNorm) return false;
                            }
                            if (orderSearchQuery.trim() !== '') {
                              const q = orderSearchQuery.trim().toLowerCase();
                              const idMatch = (ord.id || '').toLowerCase().includes(q);
                              const itemMatch = ord.items?.some((it: any) =>
                                (it.product?.name || it.name || '').toLowerCase().includes(q)
                              );
                              if (!idMatch && !itemMatch) return false;
                            }
                            return true;
                          })
                          .sort((a, b) => {
                            const parseTime = (o: any) => {
                              const raw = o.created_at || (o as any).createdAt || o.date;
                              const t = new Date(raw).getTime();
                              return isNaN(t) ? 0 : t;
                            };
                            const tA = parseTime(a);
                            const tB = parseTime(b);
                            const idA = String(a.id || '');
                            const idB = String(b.id || '');

                            if (orderSortOrder === 'newest') {
                              if (tB !== tA) return tB - tA;
                              return idB.localeCompare(idA, undefined, { numeric: true });
                            } else {
                              if (tA !== tB) return tA - tB;
                              return idA.localeCompare(idB, undefined, { numeric: true });
                            }
                          });

                        if (filteredList.length === 0) {
                          return (
                            <div style={{ padding: '48px 24px', background: 'rgba(18, 14, 11, 0.95)', border: '1px dashed rgba(201, 168, 76, 0.3)', borderRadius: '14px', textAlign: 'center' }}>
                              <ShoppingBag size={42} style={{ color: '#c9a84c', marginBottom: '12px', opacity: 0.8 }} />
                              <h3 style={{ color: '#f5efe6', margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>No Orders Found</h3>
                              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 20px 0', fontSize: '0.9rem' }}>
                                {orderSearchQuery || orderStatusFilter !== 'All' ? 'No orders match your filter criteria.' : "You haven't placed any orders yet."}
                              </p>
                              {(orderSearchQuery || orderStatusFilter !== 'All') ? (
                                <button
                                  type="button"
                                  onClick={() => { setOrderStatusFilter('All'); setOrderSearchQuery(''); }}
                                  style={{ padding: '10px 22px', borderRadius: '6px', background: 'transparent', border: '1px solid #c9a84c', color: '#c9a84c', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Clear Filters
                                </button>
                              ) : (
                                <Button variant="gold" onClick={() => navigate('/shop')} glow size="sm">
                                  Explore Shop
                                </Button>
                              )}
                            </div>
                          );
                        }

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {filteredList.map((ord) => {
                              const statusBg =
                                ord.status === 'Delivered'
                                  ? 'rgba(46, 204, 113, 0.18)'
                                  : ord.status === 'Confirmed'
                                  ? 'rgba(52, 152, 219, 0.18)'
                                  : ord.status === 'Cancelled'
                                  ? 'rgba(231, 76, 60, 0.18)'
                                  : ord.status === 'Returned'
                                  ? 'rgba(155, 89, 182, 0.18)'
                                  : 'rgba(241, 196, 15, 0.18)';
                              const statusColor =
                                ord.status === 'Delivered'
                                  ? '#2ecc71'
                                  : ord.status === 'Confirmed'
                                  ? '#3498db'
                                  : ord.status === 'Cancelled'
                                  ? '#e74c3c'
                                  : ord.status === 'Returned'
                                  ? '#9b59b6'
                                  : '#f1c40f';
                              const statusBorder =
                                ord.status === 'Delivered'
                                  ? '1px solid rgba(46, 204, 113, 0.4)'
                                  : ord.status === 'Confirmed'
                                  ? '1px solid rgba(52, 152, 219, 0.4)'
                                  : ord.status === 'Cancelled'
                                  ? '1px solid rgba(231, 76, 60, 0.4)'
                                  : ord.status === 'Returned'
                                  ? '1px solid rgba(155, 89, 182, 0.4)'
                                  : '1px solid rgba(241, 196, 15, 0.4)';

                              const isOutForDelivery = Boolean(
                                ord.delivery_otp ||
                                ord.status === 'Out for Delivery' ||
                                ord.fulfillment_status === 'OUT_FOR_DELIVERY'
                              );
                              const deliveryBoyName = ord.delivery_boy_name || (ord as any).deliveryBoyName;
                              const deliveryBoyPhone = ord.delivery_boy_phone || (ord as any).deliveryBoyPhone;
                              const totalQty = ord.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                              const fallbackImg = 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=120&q=80';

                              return (
                                <div
                                  key={ord.id}
                                  style={{
                                    background: 'rgba(18, 14, 11, 0.95)',
                                    border: isOutForDelivery ? '1.5px solid rgba(201, 168, 76, 0.5)' : '1px solid rgba(201, 168, 76, 0.25)',
                                    borderRadius: '14px',
                                    padding: isMobileGrid ? '16px' : '22px',
                                    boxShadow: isOutForDelivery ? '0 8px 30px rgba(201, 168, 76, 0.18)' : '0 8px 30px rgba(0, 0, 0, 0.7)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {/* 1. TOP HEADER ROW: Order ID, Date, Payment method, Status Badges */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                      <h3 style={{ color: '#f5efe6', margin: 0, fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                                        {ord.id}
                                      </h3>
                                      <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.55)' }}>
                                        Placed on {ord.date} &nbsp;•&nbsp; {ord.paymentMethod || 'Cash on Delivery'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <span
                                        style={{
                                          fontSize: '0.74rem',
                                          fontWeight: 800,
                                          padding: '4px 10px',
                                          borderRadius: '5px',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px',
                                          background: statusBg,
                                          color: statusColor,
                                          border: statusBorder,
                                        }}
                                      >
                                        {ord.status}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          padding: '4px 10px',
                                          borderRadius: '5px',
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.5px',
                                          background:
                                            (ord.payment_status || 'Paid').toUpperCase() === 'PAID'
                                              ? 'rgba(46, 204, 113, 0.18)'
                                              : (ord.payment_status || '').toUpperCase() === 'FAILED'
                                              ? 'rgba(231, 76, 60, 0.18)'
                                              : 'rgba(241, 196, 15, 0.18)',
                                          color:
                                            (ord.payment_status || 'Paid').toUpperCase() === 'PAID'
                                              ? '#2ecc71'
                                              : (ord.payment_status || '').toUpperCase() === 'FAILED'
                                              ? '#e74c3c'
                                              : '#f1c40f',
                                          border:
                                            (ord.payment_status || 'Paid').toUpperCase() === 'PAID'
                                              ? '1px solid rgba(46, 204, 113, 0.4)'
                                              : (ord.payment_status || '').toUpperCase() === 'FAILED'
                                              ? '1px solid rgba(231, 76, 60, 0.4)'
                                              : '1px solid rgba(241, 196, 15, 0.4)',
                                        }}
                                      >
                                        Payment: {ord.payment_status || 'Paid'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* 2. LIVE OUT FOR DELIVERY & 6-DIGIT OTP BANNER */}
                                  {isOutForDelivery && (
                                    <div
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.18) 0%, rgba(30, 20, 14, 0.85) 100%)',
                                        border: '1.5px solid rgba(201, 168, 76, 0.55)',
                                        borderRadius: '10px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                        boxShadow: '0 4px 18px rgba(201, 168, 76, 0.15)',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div
                                          style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '8px',
                                            background: 'rgba(201, 168, 76, 0.2)',
                                            border: '1px solid #c9a84c',
                                            color: '#c9a84c',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <Truck size={20} />
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.72rem', color: '#c9a84c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                            OUT FOR DELIVERY — ARRIVING TODAY
                                          </div>
                                          <div style={{ color: '#f5efe6', fontSize: '0.86rem', fontWeight: 700, marginTop: '2px' }}>
                                            {deliveryBoyName ? (
                                              <span>
                                                Partner: <strong style={{ color: '#fff' }}>{deliveryBoyName}</strong>
                                              </span>
                                            ) : (
                                              <span>Executive is en route with your package</span>
                                            )}
                                            {deliveryBoyPhone && (
                                              <a
                                                href={`tel:${deliveryBoyPhone}`}
                                                style={{
                                                  marginLeft: '10px',
                                                  color: '#c9a84c',
                                                  fontSize: '0.78rem',
                                                  textDecoration: 'none',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  background: 'rgba(201, 168, 76, 0.12)',
                                                  padding: '2px 8px',
                                                  borderRadius: '12px',
                                                  border: '1px solid rgba(201, 168, 76, 0.3)',
                                                }}
                                              >
                                                <Phone size={11} /> Call {deliveryBoyPhone}
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {ord.delivery_otp ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                          <div style={{ textAlign: isMobileGrid ? 'left' : 'right' }}>
                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>
                                              Delivery OTP
                                            </span>
                                            <span style={{ fontSize: '0.65rem', color: '#c9a84c' }}>Share with partner</span>
                                          </div>
                                          <div
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              background: '#c9a84c',
                                              borderRadius: '8px',
                                              padding: '3px 8px 3px 12px',
                                              gap: '8px',
                                              boxShadow: '0 2px 10px rgba(201, 168, 76, 0.35)',
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontFamily: 'monospace',
                                                fontSize: '1.18rem',
                                                fontWeight: 900,
                                                color: '#0f0c0a',
                                                letterSpacing: '3px',
                                              }}
                                            >
                                              {ord.delivery_otp}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); copyToClipboard(String(ord.delivery_otp)); }}
                                              title="Copy OTP"
                                              style={{
                                                background: 'rgba(15, 12, 10, 0.2)',
                                                border: 'none',
                                                borderRadius: '5px',
                                                color: '#0f0c0a',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background 0.2s',
                                              }}
                                            >
                                              {copiedCode === String(ord.delivery_otp) ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                                          OTP will generate upon partner arrival
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* 3. DELIVERY PARTNER ASSIGNED BANNER (BEFORE OUT FOR DELIVERY) */}
                                  {!isOutForDelivery && deliveryBoyName && (
                                    <div
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, rgba(20, 30, 22, 0.7) 100%)',
                                        border: '1px solid rgba(46, 204, 113, 0.35)',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '10px',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Truck size={17} style={{ color: '#2ecc71', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.82rem', color: '#f5efe6' }}>
                                          Delivery Partner Assigned: <strong style={{ color: '#fff' }}>{deliveryBoyName}</strong> has accepted your order.
                                        </span>
                                      </div>
                                      {deliveryBoyPhone && (
                                        <a
                                          href={`tel:${deliveryBoyPhone}`}
                                          style={{
                                            color: '#2ecc71',
                                            fontSize: '0.76rem',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            background: 'rgba(46, 204, 113, 0.12)',
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(46, 204, 113, 0.3)',
                                          }}
                                        >
                                          <Phone size={12} /> Contact: {deliveryBoyPhone}
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {/* 4. MAIN BODY (PRODUCTS SHOWCASE ON LEFT, CALCULATION & ACTIONS ON RIGHT) */}
                                  <div
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: isMobileGrid ? '1fr' : '1.5fr 1fr',
                                      gap: '20px',
                                      alignItems: 'start',
                                    }}
                                  >
                                    {/* LEFT: PRODUCTS LIST & IMAGES (EVERY PRODUCT VISIBLE WITH QUANTITY BADGE) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                                        Ordered Items ({ord.items.length} {ord.items.length === 1 ? 'Product' : 'Products'} · {totalQty} Units)
                                      </div>

                                      {/* Product Thumbnails Gallery */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        {ord.items.map((it, idx) => {
                                          const itName = it.product?.name || it.name || `Artisanal Chocolate ${idx + 1}`;
                                          const itQty = it.quantity || 1;
                                          const itRawImg = it.product?.image || it.product?.images?.[0] || it.image;
                                          const itImg = getImageUrl(itRawImg);

                                          return (
                                            <div
                                              key={it.product?.id || idx}
                                              title={`${itName} (Qty: ${itQty})`}
                                              style={{
                                                position: 'relative',
                                                width: isMobileGrid ? '52px' : '60px',
                                                height: isMobileGrid ? '52px' : '60px',
                                                flexShrink: 0,
                                              }}
                                            >
                                              <img
                                                src={itImg}
                                                alt={itName}
                                                onError={(e) => { (e.target as HTMLImageElement).src = fallbackImg; }}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  borderRadius: '10px',
                                                  objectFit: 'cover',
                                                  border: '1.5px solid rgba(201, 168, 76, 0.35)',
                                                  background: 'rgba(255, 255, 255, 0.02)',
                                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                                                }}
                                              />
                                              {itQty > 1 && (
                                                <span
                                                  style={{
                                                    position: 'absolute',
                                                    bottom: '-4px',
                                                    right: '-4px',
                                                    background: '#c9a84c',
                                                    color: '#0f0c0a',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 800,
                                                    padding: '1px 6px',
                                                    borderRadius: '10px',
                                                    border: '1.5px solid #120e0b',
                                                    lineHeight: 1.2,
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.8)',
                                                  }}
                                                >
                                                  ×{itQty}
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Item Names & Quantities List */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                                        {ord.items.map((it, idx) => {
                                          const itName = it.product?.name || it.name || `Artisanal Chocolate ${idx + 1}`;
                                          const itQty = it.quantity || 1;
                                          const itPrice = Number(it.price || it.product?.price || 0);

                                          return (
                                            <div
                                              key={idx}
                                              style={{
                                                fontSize: '0.84rem',
                                                color: '#f5efe6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                              }}
                                            >
                                              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {itName}
                                                {itQty > 1 && (
                                                  <span style={{ color: '#c9a84c', fontWeight: 800, marginLeft: '6px' }}>
                                                    ×{itQty}
                                                  </span>
                                                )}
                                              </span>
                                              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                ₹{(itPrice * itQty).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* RIGHT: BREAKDOWN, TOTAL, & ACTIONS */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                      {/* Price Breakdown */}
                                      <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.6, width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Subtotal</span>
                                          <span style={{ color: '#f5efe6' }}>₹{(ord.subtotal || ord.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {(ord.coupon_discount || 0) > 0 && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Coupon Discount</span>
                                            <span style={{ color: '#2ecc71' }}>- ₹{(ord.coupon_discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        )}
                                        {(ord.coin_discount || 0) > 0 && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Coin Discount</span>
                                            <span style={{ color: '#2ecc71' }}>- ₹{(ord.coin_discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        )}
                                        {((ord.discount || 0) > 0 && !(ord.coupon_discount || 0) && !(ord.coin_discount || 0)) && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Promo Discount</span>
                                            <span style={{ color: '#2ecc71' }}>- ₹{(ord.discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Shipping</span>
                                          <span style={{ color: '#f5efe6' }}>₹{(ord.shipping || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {(ord.tax || 0) > 0 && (
                                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                            <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>Tax (GST)</span>
                                            <span style={{ color: '#f5efe6' }}>₹{(ord.tax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        )}
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span style={{ color: '#f5efe6', fontWeight: 700, fontSize: '0.88rem' }}>Order Total</span>
                                          <span style={{ color: '#c9a84c', fontWeight: 900, fontSize: '1.25rem' }}>
                                            ₹{ord.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                        {isOrderCancellable(ord) && (
                                          <button
                                            type="button"
                                            disabled={cancellingOrderId === ord.id}
                                            onClick={() => handleCancelOrder(ord.id)}
                                            style={{
                                              padding: '7px 12px',
                                              borderRadius: '6px',
                                              background: 'rgba(231, 76, 60, 0.1)',
                                              border: '1px solid rgba(231, 76, 60, 0.5)',
                                              color: '#e74c3c',
                                              fontSize: '0.78rem',
                                              fontWeight: 700,
                                              cursor: cancellingOrderId === ord.id ? 'not-allowed' : 'pointer',
                                              transition: 'all 0.2s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                            }}
                                          >
                                            {cancellingOrderId === ord.id ? 'Cancelling...' : 'Cancel Order'}
                                          </button>
                                        )}
                                        {isOrderReturnable(ord) && (
                                          <button
                                            type="button"
                                            disabled={returningOrderId === ord.id}
                                            onClick={() => handleReturnOrder(ord.id)}
                                            style={{
                                              padding: '7px 12px',
                                              borderRadius: '6px',
                                              background: 'rgba(155, 89, 182, 0.1)',
                                              border: '1px solid rgba(155, 89, 182, 0.5)',
                                              color: '#9b59b6',
                                              fontSize: '0.78rem',
                                              fontWeight: 700,
                                              cursor: returningOrderId === ord.id ? 'not-allowed' : 'pointer',
                                              transition: 'all 0.2s ease',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '6px',
                                            }}
                                          >
                                            {returningOrderId === ord.id ? 'Submitting...' : 'Return Order'}
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => { setSelectedOrder(ord); setOrderSubView('details'); }}
                                          style={{
                                            padding: '7px 14px',
                                            borderRadius: '6px',
                                            background: 'transparent',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: '#f5efe6',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                          }}
                                        >
                                          View Details
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { setSelectedOrder(ord); setOrderSubView('invoice'); }}
                                          style={{
                                            padding: '7px 14px',
                                            borderRadius: '6px',
                                            background: 'transparent',
                                            border: '1px solid rgba(201, 168, 76, 0.5)',
                                            color: '#c9a84c',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                          }}
                                        >
                                          View Invoice
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isPdfDownloading}
                                          onClick={(e) => handleDownloadInvoice(ord.id, e)}
                                          style={{
                                            padding: '7px 14px',
                                            borderRadius: '6px',
                                            background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                                            color: '#0f0c0a',
                                            border: 'none',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: isPdfDownloading ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 2px 10px rgba(201, 168, 76, 0.3)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                          }}
                                        >
                                          <Download size={14} /> Download PDF
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES PANEL */}
            {activeTab === 'addresses' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                      Shipping Address Book
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                      Manage your shipping addresses for a faster checkout.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (showAddAddressForm) {
                        setShowAddAddressForm(false);
                        setEditingAddressId(null);
                      } else {
                        handleOpenAddAddress();
                      }
                    }}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                      color: '#0f0c0a',
                      border: 'none',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(201, 168, 76, 0.35)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    {showAddAddressForm ? <X size={16} /> : <Plus size={16} />}
                    {showAddAddressForm ? 'Cancel' : 'Add New Address'}
                  </button>
                </div>

                {/* Add / Edit Address Form */}
                {showAddAddressForm && (
                  <div
                    style={{
                      background: 'rgba(18, 14, 11, 0.96)',
                      border: '1px solid rgba(201, 168, 76, 0.35)',
                      borderRadius: '12px',
                      padding: '28px',
                      marginBottom: '32px',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                    }}
                  >
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#f5efe6', margin: '0 0 20px 0', fontWeight: 700 }}>
                      {editingAddressId ? 'Edit Shipping Address' : 'Add New Shipping Address'}
                    </h3>

                    <form onSubmit={handleAddressSubmit} style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '20px' }}>
                      {/* Address Label */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          Address Label <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.title}
                          onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                          placeholder="e.g. Home, Work, Office"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Recipient Full Name */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          Recipient Full Name <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          placeholder="Enter recipient full name"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Street Address */}
                      <div style={{ gridColumn: isMobileGrid ? 'span 1' : 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          Street Address <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.street}
                          onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                          placeholder="Flat, House no., Building, Street, Area"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* City */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          City <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="e.g. Hyderabad"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* State Select */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          State <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <select
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: '#120e0b',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                            cursor: 'pointer',
                          }}
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st} style={{ background: '#120e0b', color: '#f5efe6' }}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* PIN Code */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          PIN / Postal Code <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={addressForm.zip}
                          onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value.replace(/\D/g, '') })}
                          placeholder="e.g. 500001"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '6px' }}>
                          Phone Number <span style={{ color: '#c9a84c' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          maxLength={10}
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                          placeholder="e.g. 9876543210"
                          style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '6px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            color: '#f5efe6',
                            fontSize: '0.9rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      {/* Make default checkbox */}
                      <div style={{ gridColumn: isMobileGrid ? 'span 1' : 'span 2', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <input
                          type="checkbox"
                          id="is-default-address-cb"
                          checked={addressForm.isDefault}
                          onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                          style={{ accentColor: '#c9a84c', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <label htmlFor="is-default-address-cb" style={{ color: '#f5efe6', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 500 }}>
                          Make this my default shipping address
                        </label>
                      </div>

                      {/* Form Error Banner */}
                      {addressFormError && (
                        <div
                          style={{
                            gridColumn: isMobileGrid ? 'span 1' : 'span 2',
                            padding: '12px 16px',
                            background: 'rgba(231, 76, 60, 0.12)',
                            border: '1px solid #e74c3c',
                            color: '#e74c3c',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}
                        >
                          {addressFormError}
                        </div>
                      )}

                      {/* Buttons */}
                      <div style={{ gridColumn: isMobileGrid ? 'span 1' : 'span 2', display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                          type="submit"
                          disabled={isAddressSaving}
                          style={{
                            padding: '10px 24px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                            color: '#0f0c0a',
                            border: 'none',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: isAddressSaving ? 'not-allowed' : 'pointer',
                            opacity: isAddressSaving ? 0.7 : 1,
                            boxShadow: '0 4px 14px rgba(201, 168, 76, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          {isAddressSaving ? (
                            <>
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...
                            </>
                          ) : (
                            'Save Address'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddAddressForm(false);
                            setEditingAddressId(null);
                          }}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: 'rgba(255, 255, 255, 0.7)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Address Cards List */}
                {addresses.length === 0 ? (
                  <div
                    style={{
                      padding: '48px 24px',
                      background: 'rgba(18, 14, 11, 0.95)',
                      border: '1px dashed rgba(201, 168, 76, 0.3)',
                      borderRadius: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <MapPin size={42} style={{ color: '#c9a84c', marginBottom: '12px', opacity: 0.8 }} />
                    <h3 style={{ color: '#f5efe6', margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: 700 }}>
                      No Saved Addresses Found
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 20px 0', fontSize: '0.9rem' }}>
                      Add your shipping address now to enable one-click checkout.
                    </p>
                    <button
                      onClick={handleOpenAddAddress}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                        color: '#0f0c0a',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Add Address
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        style={{
                          background: 'rgba(18, 14, 11, 0.95)',
                          border: '1px solid rgba(201, 168, 76, 0.25)',
                          borderRadius: '14px',
                          padding: '24px',
                          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        {/* Top Header Row of Card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              background: 'rgba(201, 168, 76, 0.2)',
                              color: '#c9a84c',
                              border: '1px solid rgba(201, 168, 76, 0.4)',
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                            }}
                          >
                            {addr.title}
                          </span>

                          {addr.isDefault ? (
                            <span style={{ color: '#c9a84c', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              ☆ Default
                            </span>
                          ) : (
                            <button
                              onClick={() => setDefaultAddress(addr.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.5)',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'color 0.2s ease',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#c9a84c')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)')}
                            >
                              Set as Default
                            </button>
                          )}
                        </div>

                        {/* Recipient Name */}
                        <h3 style={{ color: '#f5efe6', fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                          {addr.name}
                        </h3>

                        {/* Address Details */}
                        <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                          <div>{addr.street}</div>
                          <div>
                            {addr.city}, {addr.state} - {addr.zip}
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.55)', marginTop: '2px' }}>India</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            <Phone size={14} style={{ color: '#c9a84c' }} />
                            <span>{addr.phone}</span>
                          </div>
                        </div>

                        {/* Action Buttons Row */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '6px' }}>
                          <button
                            onClick={() => handleEditAddress(addr)}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(201, 168, 76, 0.4)',
                              color: '#c9a84c',
                              padding: '6px 20px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${addr.title}" address?`)) {
                                deleteAddress(addr.id);
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: '1px solid rgba(231, 76, 60, 0.5)',
                              color: '#e74c3c',
                              padding: '6px 20px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REWARDS & COINS / WALLET PANEL */}
            {activeTab === 'rewards' && (
              <div>
                {/* Page Title & Subtitle + Tab Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                      Chovique Reward Coins &amp; Wallet
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                      Track your coin balance, redemption history, and reward rules.
                    </p>
                  </div>

                  {/* Two Buttons / Tabs */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                      variant="gold"
                      glow={rewardsTab === 'balance'}
                      onClick={() => setRewardsTab('balance')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        fontWeight: 600,
                        ...(rewardsTab === 'balance' ? {} : {
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'var(--cream)',
                        }),
                      }}
                    >
                      <Coins size={18} />
                      Reward Balance
                    </Button>
                    <Button
                      variant="gold"
                      glow={rewardsTab === 'rules'}
                      onClick={() => setRewardsTab('rules')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        fontWeight: 600,
                        ...(rewardsTab === 'rules' ? {} : {
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          color: 'var(--cream)',
                        }),
                      }}
                    >
                      <FileText size={18} />
                      Reward Rules
                    </Button>
                  </div>
                </div>

                {/* 1. REWARD BALANCE TAB (Default) */}
                {rewardsTab === 'balance' && (
                  <div>
                    {/* AVAILABLE REWARD BALANCE CARD */}
                    <div
                      style={{
                        background: 'rgba(18, 14, 11, 0.96)',
                        border: '1px solid rgba(201, 168, 76, 0.35)',
                        borderRadius: '14px',
                        padding: '28px',
                        marginBottom: '32px',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'rgba(201, 168, 76, 0.85)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        AVAILABLE REWARD BALANCE
                      </div>
                      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f5efe6', fontFamily: 'var(--font-display)', margin: '8px 0 4px 0' }}>
                        {wallet?.available_coins !== undefined ? wallet.available_coins : (wallet?.coin_balance ?? 0)} Coins
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#c9a84c' }}>
                        Equivalent value: ₹{(wallet?.rupee_value !== undefined ? wallet.rupee_value : (((wallet?.available_coins ?? wallet?.coin_balance ?? 0)) / (wallet?.settings?.coins_per_rupee || 10))).toFixed(2)}
                      </div>
                      {Boolean(wallet?.pending_coins && wallet.pending_coins > 0) && (
                        <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', background: 'rgba(241, 196, 15, 0.12)', border: '1px solid rgba(241, 196, 15, 0.35)', color: '#f1c40f', fontSize: '0.85rem' }}>
                          <span>⏳ <strong>{wallet?.pending_coins} Coins</strong> pending clearance</span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.78rem' }}>• Will be credited automatically within {wallet?.settings?.credit_delay_hours || 24} hours of order delivery</span>
                        </div>
                      )}
                    </div>

                    {/* TRANSACTION LEDGER & AUDIT HISTORY */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#f5efe6', margin: 0, fontWeight: 700 }}>
                          Transaction Ledger &amp; Audit History
                        </h3>

                        {/* Filter Tabs Row */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {[
                            { key: 'ALL', label: 'All' },
                            { key: 'EARN', label: 'Earned' },
                            { key: 'REDEEM', label: 'Redeemed' },
                            { key: 'ADJUSTMENT', label: 'Adjustments' },
                          ].map((t) => {
                            const isActive = walletTxTypeFilter === t.key;
                            return (
                              <button
                                key={t.key}
                                type="button"
                                onClick={() => {
                                  setWalletTxTypeFilter(t.key as any);
                                  setWalletTxsPage(1);
                                }}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: '6px',
                                  border: isActive ? '1px solid #c9a84c' : '1px solid rgba(255, 255, 255, 0.12)',
                                  background: isActive ? '#c9a84c' : 'rgba(255, 255, 255, 0.05)',
                                  color: isActive ? '#0f0c0a' : '#f5efe6',
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date Filters Row */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>From:</span>
                          <input
                            type="date"
                            value={walletDateFrom}
                            onChange={(e) => setWalletDateFrom(e.target.value)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: '6px 6px',
                              borderRadius: '6px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(201,168,76,0.3)',
                              color: '#f5efe6',
                              fontSize: '0.78rem',
                              colorScheme: 'dark',
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>To:</span>
                          <input
                            type="date"
                            value={walletDateTo}
                            onChange={(e) => setWalletDateTo(e.target.value)}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              padding: '6px 6px',
                              borderRadius: '6px',
                              background: 'rgba(0,0,0,0.3)',
                              border: '1px solid rgba(201,168,76,0.3)',
                              color: '#f5efe6',
                              fontSize: '0.78rem',
                              colorScheme: 'dark',
                            }}
                          />
                        </div>

                        {(walletDateFrom || walletDateTo) && (
                          <button
                            type="button"
                            onClick={() => {
                              setWalletDateFrom('');
                              setWalletDateTo('');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#c9a84c',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {/* Loading State */}
                      {isWalletTxsLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.7)', padding: '48px 0', justifyContent: 'center' }}>
                          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#c9a84c' }} />
                          <span style={{ fontSize: '0.95rem' }}>Loading reward transactions...</span>
                        </div>
                      ) : walletTxsError ? (
                        <div
                          style={{
                            padding: '20px',
                            background: 'rgba(231, 76, 60, 0.12)',
                            border: '1px solid #e74c3c',
                            borderRadius: '10px',
                            color: '#e74c3c',
                            textAlign: 'center',
                          }}
                        >
                          <p style={{ margin: '0 0 12px 0', fontWeight: 600 }}>{walletTxsError}</p>
                          <Button variant="gold" size="sm" onClick={() => fetchWalletTransactions()}>
                            Retry
                          </Button>
                        </div>
                      ) : (() => {
                        const filteredTxs = walletTxs.filter((tx) => {
                          if (!tx.created_at) return true;
                          const txTime = new Date(tx.created_at).getTime();
                          if (walletDateFrom) {
                            const fromTime = new Date(walletDateFrom).getTime();
                            if (txTime < fromTime) return false;
                          }
                          if (walletDateTo) {
                            const toTime = new Date(walletDateTo).setHours(23, 59, 59, 999);
                            if (txTime > toTime) return false;
                          }
                          return true;
                        });

                        if (filteredTxs.length === 0) {
                          return (
                            <div
                              style={{
                                padding: '56px 24px',
                                background: 'rgba(18, 14, 11, 0.95)',
                                border: '1px dashed rgba(201, 168, 76, 0.3)',
                                borderRadius: '14px',
                                textAlign: 'center',
                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6)',
                              }}
                            >
                              <div
                                style={{
                                  width: '72px',
                                  height: '72px',
                                  borderRadius: '50%',
                                  background: 'rgba(201, 168, 76, 0.1)',
                                  border: '1px solid rgba(201, 168, 76, 0.3)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginBottom: '20px',
                                }}
                              >
                                <Coins size={36} style={{ color: '#c9a84c' }} />
                              </div>
                              <h3 style={{ color: '#f5efe6', margin: '0 0 8px 0', fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                                No Reward Transactions Yet
                              </h3>
                              <p style={{ color: 'rgba(255, 255, 255, 0.65)', margin: '0 0 28px 0', fontSize: '0.92rem' }}>
                                Earn Chovique Coins by shopping and redeem them on future orders.
                              </p>
                              <Button variant="gold" size="md" glow onClick={() => navigate('/shop')}>
                                SHOP NOW
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <div
                            style={{
                              background: 'rgba(18, 14, 11, 0.95)',
                              border: '1px solid rgba(201, 168, 76, 0.25)',
                              borderRadius: '14px',
                              overflow: 'hidden',
                              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                            }}
                          >
                            {isMobileGrid ? (
                              /* MOBILE: Card layout */
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(255,255,255,0.04)' }}>
                                {filteredTxs.map((tx) => {
                                  const tType = (tx.type || '').toUpperCase();
                                  const desc = (tx.description || '').toLowerCase();
                                  const isWelcome = tType.includes('WELCOME') || tType.includes('ACCOUNT') || desc.includes('welcome') || desc.includes('registration');
                                  const isOrderReward = (tType.includes('ORDER') || (tType === 'EARN' && tx.order_id)) && !isWelcome;
                                  const isRedeem = tType.includes('REDEEM');
                                  const isEarn = !isRedeem && !isWelcome && !isOrderReward && (tType === 'EARN' || tx.coins > 0);

                                  let typeLabel = 'ADJUSTMENT';
                                  let typeBadgeColor = '#f1c40f';
                                  let typeBadgeBg = 'rgba(241,196,15,0.15)';

                                  if (isWelcome) {
                                    typeLabel = 'WELCOME BONUS';
                                    typeBadgeColor = '#c9a84c';
                                    typeBadgeBg = 'rgba(201,168,76,0.18)';
                                  } else if (isOrderReward) {
                                    typeLabel = 'ORDER REWARD';
                                    typeBadgeColor = '#3498db';
                                    typeBadgeBg = 'rgba(52,152,219,0.15)';
                                  } else if (isRedeem) {
                                    typeLabel = 'REDEEM';
                                    typeBadgeColor = '#e74c3c';
                                    typeBadgeBg = 'rgba(231,76,60,0.15)';
                                  } else if (isEarn) {
                                    typeLabel = 'EARN';
                                    typeBadgeColor = '#2ecc71';
                                    typeBadgeBg = 'rgba(46,204,113,0.15)';
                                  }

                                  const isPending = (tx as any).is_pending || (tx as any).status === 'PENDING';
                                  const delayHours = (tx as any).delay_hours || wallet?.settings?.credit_delay_hours || 24;
                                  const statusBadge = isPending ? (
                                    <span style={{ fontSize: '0.72rem', color: '#f1c40f', background: 'rgba(241,196,15,0.12)', border: '1px solid rgba(241,196,15,0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>⏳ Within {delayHours}h</span>
                                  ) : isWelcome ? (
                                    <span style={{ fontSize: '0.72rem', color: '#2ecc71', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>✓ Added to Wallet</span>
                                  ) : isOrderReward ? (
                                    <span style={{ fontSize: '0.72rem', color: '#2ecc71', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>✓ Available</span>
                                  ) : null;

                                  const absCoins = Math.abs(tx.coins);
                                  const isPositive = tx.coins > 0 || isEarn || isWelcome || isOrderReward;
                                  const formattedCoins = isPositive ? `+${absCoins} Coins` : `−${absCoins} Coins`;
                                  const coinsColor = isWelcome ? '#c9a84c' : isEarn || isOrderReward ? '#2ecc71' : isRedeem ? '#e74c3c' : '#c9a84c';
                                  let dateStr = 'Recently';
                                  if (tx.created_at) {
                                    try { dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { dateStr = tx.created_at; }
                                  }
                                  return (
                                    <div key={tx.id} style={{ background: 'rgba(18,14,11,0.98)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                          <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.5px', padding: '3px 10px', borderRadius: '6px', background: typeBadgeBg, color: typeBadgeColor, border: `1px solid ${typeBadgeColor}`, textTransform: 'uppercase' }}>● {typeLabel}</span>
                                          {statusBadge}
                                        </div>
                                        <span style={{ fontWeight: 800, color: coinsColor, fontSize: '0.95rem' }}>{formattedCoins}</span>
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>{tx.description || (isWelcome ? 'Registration welcome gift' : isOrderReward ? 'Coins earned for purchase' : isRedeem ? 'Coins redeemed on order' : 'Reward adjustment')}</div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.45)' }}>{dateStr}</span>
                                        {tx.order_id ? (
                                          <span onClick={() => setActiveTab('orders')} style={{ fontSize: '0.76rem', fontWeight: 700, color: '#c9a84c', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}>Order #{tx.order_id.slice(-8)}</span>
                                        ) : <span style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.3)' }}>—</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* DESKTOP: Table layout */
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', tableLayout: 'fixed' }}>
                                  <colgroup>
                                    <col style={{ width: '110px' }} />
                                    <col style={{ width: '145px' }} />
                                    <col style={{ width: '110px' }} />
                                    <col />
                                    <col style={{ width: '140px' }} />
                                  </colgroup>
                                  <thead>
                                    <tr style={{ background: 'rgba(0, 0, 0, 0.4)', borderBottom: '1px solid rgba(201, 168, 76, 0.2)' }}>
                                      <th style={{ padding: '12px 14px', color: '#c9a84c', fontWeight: 700, whiteSpace: 'nowrap' }}>Date</th>
                                      <th style={{ padding: '12px 14px', color: '#c9a84c', fontWeight: 700, whiteSpace: 'nowrap' }}>Type</th>
                                      <th style={{ padding: '12px 14px', color: '#c9a84c', fontWeight: 700, whiteSpace: 'nowrap' }}>Amount</th>
                                      <th style={{ padding: '12px 14px', color: '#c9a84c', fontWeight: 700 }}>Description</th>
                                      <th style={{ padding: '12px 14px', color: '#c9a84c', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>Order Ref</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {filteredTxs.map((tx) => {
                                      const tType = (tx.type || '').toUpperCase();
                                      const desc = (tx.description || '').toLowerCase();
                                      const isWelcome = tType.includes('WELCOME') || tType.includes('ACCOUNT') || desc.includes('welcome') || desc.includes('registration');
                                      const isOrderReward = (tType.includes('ORDER') || (tType === 'EARN' && tx.order_id)) && !isWelcome;
                                      const isRedeem = tType.includes('REDEEM');
                                      const isEarn = !isRedeem && !isWelcome && !isOrderReward && (tType === 'EARN' || tx.coins > 0);

                                      let typeLabel = 'ADJUSTMENT';
                                      let typeBadgeColor = '#f1c40f';
                                      let typeBadgeBg = 'rgba(241, 196, 15, 0.15)';

                                      if (isWelcome) {
                                        typeLabel = 'WELCOME BONUS';
                                        typeBadgeColor = '#c9a84c';
                                        typeBadgeBg = 'rgba(201, 168, 76, 0.18)';
                                      } else if (isOrderReward) {
                                        typeLabel = 'ORDER REWARD';
                                        typeBadgeColor = '#3498db';
                                        typeBadgeBg = 'rgba(52, 152, 219, 0.15)';
                                      } else if (isRedeem) {
                                        typeLabel = 'REDEEM';
                                        typeBadgeColor = '#e74c3c';
                                        typeBadgeBg = 'rgba(231, 76, 60, 0.15)';
                                      } else if (isEarn) {
                                        typeLabel = 'EARN';
                                        typeBadgeColor = '#2ecc71';
                                        typeBadgeBg = 'rgba(46, 204, 113, 0.15)';
                                      }

                                      const isPending = (tx as any).is_pending || (tx as any).status === 'PENDING';
                                      const delayHours = (tx as any).delay_hours || wallet?.settings?.credit_delay_hours || 24;

                                      const absCoins = Math.abs(tx.coins);
                                      const isPositive = tx.coins > 0 || isEarn || isWelcome || isOrderReward;
                                      const formattedCoins = isPositive ? `+${absCoins} Coins` : `−${absCoins} Coins`;
                                      const coinsColor = isWelcome ? '#c9a84c' : isEarn || isOrderReward ? '#2ecc71' : isRedeem ? '#e74c3c' : '#c9a84c';
                                      let dateStr = 'Recently';
                                      if (tx.created_at) {
                                        try {
                                          dateStr = new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                        } catch { dateStr = tx.created_at; }
                                      }
                                      return (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', transition: 'background 0.2s ease' }}>
                                          <td style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.8)', whiteSpace: 'nowrap' }}>{dateStr}</td>
                                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.5px', padding: '3px 8px', borderRadius: '6px', background: typeBadgeBg, color: typeBadgeColor, border: `1px solid ${typeBadgeColor}`, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>● {typeLabel}</span>
                                          </td>
                                          <td style={{ padding: '12px 14px', fontWeight: 800, color: coinsColor, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{formattedCoins}</td>
                                          <td style={{ padding: '12px 14px', color: 'rgba(255, 255, 255, 0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={tx.description || ''}>
                                            <span>{tx.description || (isWelcome ? 'Registration welcome bonus' : isOrderReward ? 'Coins earned for purchase' : isRedeem ? 'Coins redeemed on order' : 'Reward adjustment')}</span>
                                            {isPending && (
                                              <span style={{ marginLeft: '8px', fontSize: '0.72rem', color: '#f1c40f', background: 'rgba(241,196,15,0.12)', border: '1px solid rgba(241,196,15,0.3)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                ⏳ Added within {delayHours}h
                                              </span>
                                            )}
                                          </td>
                                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            {tx.order_id ? (
                                              <span onClick={() => setActiveTab('orders')} style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c9a84c', background: 'rgba(201, 168, 76, 0.1)', border: '1px solid rgba(201, 168, 76, 0.3)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>#{tx.order_id.slice(-8)}</span>
                                            ) : (
                                              <span style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: '0.8rem' }}>—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Pagination Footer */}
                            <div
                              style={{
                                padding: '16px 20px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderTop: '1px solid rgba(201, 168, 76, 0.15)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                                fontSize: '0.84rem',
                                color: 'rgba(255, 255, 255, 0.65)',
                              }}
                            >
                              <div>
                                Showing <strong style={{ color: '#f5efe6' }}>{walletTxsTotal > 0 ? (walletTxsPage - 1) * 10 + 1 : 0}</strong>–<strong style={{ color: '#f5efe6' }}>{Math.min(walletTxsPage * 10, walletTxsTotal)}</strong> of <strong style={{ color: '#f5efe6' }}>{walletTxsTotal}</strong> transactions
                              </div>

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  disabled={walletTxsPage <= 1}
                                  onClick={() => setWalletTxsPage((p) => Math.max(1, p - 1))}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    background: walletTxsPage > 1 ? 'rgba(201, 168, 76, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    color: walletTxsPage > 1 ? '#c9a84c' : 'rgba(255, 255, 255, 0.3)',
                                    border: walletTxsPage > 1 ? '1px solid rgba(201, 168, 76, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: walletTxsPage > 1 ? 'pointer' : 'not-allowed',
                                  }}
                                >
                                  ← Previous
                                </button>

                                {Array.from({ length: walletTxsPages }, (_, i) => i + 1).map((pg) => (
                                  <button
                                    key={pg}
                                    type="button"
                                    onClick={() => setWalletTxsPage(pg)}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      background: pg === walletTxsPage ? '#c9a84c' : 'rgba(255, 255, 255, 0.05)',
                                      color: pg === walletTxsPage ? '#0f0c0a' : '#f5efe6',
                                      border: pg === walletTxsPage ? '1px solid #c9a84c' : '1px solid rgba(255, 255, 255, 0.1)',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {pg}
                                  </button>
                                ))}

                                <button
                                  type="button"
                                  disabled={walletTxsPage >= walletTxsPages}
                                  onClick={() => setWalletTxsPage((p) => Math.min(walletTxsPages, p + 1))}
                                  style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    background: walletTxsPage < walletTxsPages ? 'rgba(201, 168, 76, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    color: walletTxsPage < walletTxsPages ? '#c9a84c' : 'rgba(255, 255, 255, 0.3)',
                                    border: walletTxsPage < walletTxsPages ? '1px solid rgba(201, 168, 76, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: walletTxsPage < walletTxsPages ? 'pointer' : 'not-allowed',
                                  }}
                                >
                                  Next →
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* 2. REWARD RULES TAB */}
                {rewardsTab === 'rules' && (
                  <div
                    style={{
                      background: 'rgba(18, 14, 11, 0.96)',
                      border: '1px solid rgba(201, 168, 76, 0.35)',
                      borderRadius: '14px',
                      padding: '28px',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                    }}
                  >
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#c9a84c', margin: '0 0 16px 0', fontWeight: 700 }}>
                      Chovique Reward Rules
                    </h3>
                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 }}>
                      Every purchase at Chovique earns you reward coins that can be redeemed for direct discounts on your future orders.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr 1fr', gap: '20px' }}>
                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(201, 168, 76, 0.25)',
                          borderRadius: '10px',
                          padding: '20px',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>
                          Earn Rule
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f5efe6', marginBottom: '6px' }}>
                          ₹{wallet?.settings?.spend_per_coin ?? 10} spent = 1 Coin
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
                          Earn coins automatically whenever an order is successfully completed.
                        </p>
                      </div>

                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(201, 168, 76, 0.25)',
                          borderRadius: '10px',
                          padding: '20px',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>
                          Redeem Rule
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f5efe6', marginBottom: '6px' }}>
                          {wallet?.settings?.coins_per_rupee ?? 10} Coins = ₹1 Discount
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
                          Redeem your collected coins directly at checkout for instant savings.
                        </p>
                      </div>

                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(201, 168, 76, 0.25)',
                          borderRadius: '10px',
                          padding: '20px',
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: '#c9a84c', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>
                          Max Usage
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f5efe6', marginBottom: '6px' }}>
                          Up to {wallet?.settings?.max_redemption_percentage ?? 20}% per order
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
                          Apply coin discounts up to 20% of your total order amount.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COUPONS PANEL */}
            {activeTab === 'coupons' && (
              <div>
                {/* SECTION 1: AVAILABLE COUPONS */}
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                      My Available Coupons
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
                      Exclusive promotional discounts and rewards available for your next order.
                    </p>
                  </div>

                  {isCouponsLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255, 255, 255, 0.7)', padding: '36px 0', justifyContent: 'center' }}>
                      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#c9a84c' }} />
                      <span style={{ fontSize: '0.95rem' }}>Loading your coupons...</span>
                    </div>
                  ) : couponsError ? (
                    <div style={{ padding: '16px 20px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center' }}>
                      {couponsError}
                    </div>
                  ) : (() => {
                      const uniqueCoupons = getAvailableCouponsList(coupons, usedCoupons);

                      if (uniqueCoupons.length === 0) {
                        return (
                          <div style={{ padding: '36px 24px', background: 'rgba(18, 14, 11, 0.6)', border: '1px dashed rgba(201, 168, 76, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                            <Tag size={32} style={{ color: '#c9a84c', marginBottom: '10px' }} />
                            <h3 style={{ color: '#f5efe6', margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 700 }}>
                              No Available Coupons
                            </h3>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '0.88rem' }}>
                              Check back later for exclusive Chovique offers.
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '24px' }}>
                          {uniqueCoupons.map((c) => {
                            const couponItem = c as any;
                            const discountStr =
                              c.discount_type === 'PERCENTAGE' || (c.discount_percent && c.discount_percent > 0)
                                ? `${c.discount_percent || couponItem.discountPercent}% OFF`
                                : c.discount_type === 'FIXED_AMOUNT' || (c.discount_amount && c.discount_amount > 0)
                                ? `₹${c.discount_amount} OFF`
                                : c.discount_type === 'FREE_SHIPPING'
                                ? 'FREE SHIPPING'
                                : 'SPECIAL OFFER';

                            const rawExpiry = c.expires_at || c.expiryDate || c.expiry_date || c.expiresAt || c.end_date || c.endDate;
                            const expiryStr = formatCouponExpiry(rawExpiry) || 'No Expiry';
                            const titleText = (c.name || couponItem.title || c.code || 'SPECIAL DISCOUNT').toUpperCase();
                            const minOrderStr = c.minimum_order_amount && c.minimum_order_amount > 0
                              ? `₹${c.minimum_order_amount.toLocaleString('en-IN')}`
                              : 'None';
                            const descText = c.description || couponItem.desc || `Get ${discountStr.toLowerCase()} on your chocolate order.`;
                            const isCopied = copiedCode === c.code;

                            return (
                              <div
                                key={c.code}
                                style={{
                                  background: 'rgba(18, 14, 11, 0.96)',
                                  border: '1px solid rgba(201, 168, 76, 0.4)',
                                  borderRadius: '14px',
                                  padding: '24px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: '#f5efe6', margin: 0 }}>
                                    {titleText}
                                  </h3>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: '1px solid #2ecc71' }}>
                                    ● Available
                                  </span>
                                </div>

                                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c9a84c', margin: '4px 0 14px 0', fontFamily: 'var(--font-display)' }}>
                                  {discountStr}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', border: '1px dashed rgba(201, 168, 76, 0.35)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px' }}>
                                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f5efe6' }}>
                                    Code: <span style={{ color: '#c9a84c' }}>{c.code}</span>
                                  </span>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCouponCode(c.code)}
                                      style={{
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        background: isCopied ? 'rgba(46, 204, 113, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                                        color: isCopied ? '#2ecc71' : '#f5efe6',
                                        border: isCopied ? '1px solid #2ecc71' : '1px solid rgba(255, 255, 255, 0.2)',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {isCopied ? '✓ COPIED' : 'COPY'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const formatted = c.code.trim().toUpperCase();
                                        sessionStorage.setItem(
                                          'chovique_checkout_coupon',
                                          JSON.stringify({
                                            code: formatted,
                                            discount_amount: 0,
                                            auto_apply: true,
                                          })
                                        );
                                        navigate('/cart');
                                      }}
                                      style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                                        color: '#0f0c0a',
                                        border: 'none',
                                        fontSize: '0.8rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 10px rgba(201, 168, 76, 0.3)',
                                      }}
                                    >
                                      USE COUPON
                                    </button>
                                  </div>
                                </div>

                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.86rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                                  {descText}
                                </p>

                                <div style={{ borderTop: '1px solid rgba(201, 168, 76, 0.15)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.55)' }}>
                                  <span>Minimum order: <strong style={{ color: '#f5efe6' }}>{minOrderStr}</strong></span>
                                  <span>Expires: <strong style={{ color: '#f5efe6' }}>{expiryStr}</strong></span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                  })()}
                </div>

                {/* SECTION 2: USED COUPONS HISTORY */}
                <div style={{ marginTop: '40px', paddingTop: '32px', borderTop: '1px solid rgba(201, 168, 76, 0.2)' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                      Used Coupons
                    </h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.88rem', margin: 0 }}>
                      History of redeemed coupons and savings on your past orders.
                    </p>
                  </div>

                  {usedCoupons.length === 0 ? (
                    <div style={{ padding: '30px 20px', background: 'rgba(18, 14, 11, 0.4)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '10px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.88rem' }}>
                      No coupon history recorded yet. Apply an available coupon on your next order to receive instant savings!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {usedCoupons.map((uc: any) => (
                        <div
                          key={uc.id || uc.code + uc.order_id}
                          style={{
                            background: 'rgba(18, 14, 11, 0.85)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '10px',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(201, 168, 76, 0.12)', border: '1px solid rgba(201, 168, 76, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Tag size={20} style={{ color: '#c9a84c' }} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#c9a84c', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.5px' }}>
                                  {uc.code}
                                </span>
                                <span style={{ color: '#2ecc71', fontWeight: 700, fontSize: '0.88rem' }}>
                                  — {uc.discount_str || `₹${uc.discount_received} OFF`}
                                </span>
                              </div>
                              <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '0.84rem', marginTop: '3px' }}>
                                Used on Order <strong style={{ color: '#f5efe6' }}>#{uc.order_id}</strong> • Date: <strong style={{ color: '#f5efe6' }}>{uc.used_at}</strong>
                              </div>
                            </div>
                          </div>

                          <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.7)', border: '1px solid rgba(255, 255, 255, 0.2)', textTransform: 'uppercase' }}>
                            ● Used
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS PANEL */}
            {activeTab === 'notifications' && (() => {
              const unreadTotal = notifications.filter((n) => !n.read && !n.is_read).length;

              const filteredNotifications = notifications.filter((notif) => {
                // Category tab filter
                if (notifCategory !== 'all') {
                  if (notifCategory === 'orders' && notif.type !== 'order') return false;
                  if (notifCategory === 'coupons' && notif.type !== 'coupon') return false;
                  if (notifCategory === 'rewards' && notif.type !== 'reward') return false;
                  if (notifCategory === 'support' && notif.type !== 'support') return false;
                  if (notifCategory === 'system' && notif.type !== 'system' && notif.type !== 'general') return false;
                }

                // Read / Unread status filter
                const isUnread = notif.is_read === false || notif.read === false;
                if (notifReadFilter === 'unread' && !isUnread) return false;
                if (notifReadFilter === 'read' && isUnread) return false;

                return true;
              });

              const handleRefreshNotifs = async () => {
                setIsNotifLoading(true);
                try {
                  await refreshNotifications();
                  setNotifActionSuccess('Notifications refreshed');
                  setTimeout(() => setNotifActionSuccess(null), 2500);
                } catch (err) {
                  console.error('Failed to refresh notifications:', err);
                } finally {
                  setIsNotifLoading(false);
                }
              };

              const handleMarkAll = async () => {
                try {
                  await markAllNotificationsAsRead();
                  setNotifActionSuccess('All notifications marked as read');
                  setTimeout(() => setNotifActionSuccess(null), 2500);
                } catch (err) {
                  console.error('Failed to mark all as read:', err);
                }
              };

              const handleMarkSingleRead = async (id: string) => {
                try {
                  await markNotificationAsRead(id);
                  setNotifActionSuccess('Notification marked as read');
                  setTimeout(() => setNotifActionSuccess(null), 2500);
                } catch (err) {
                  console.error('Failed to mark notification read:', err);
                }
              };
              
              const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
                if (e.target.checked) {
                  setSelectedNotifIds(filteredNotifications.map((n) => n.id));
                } else {
                  setSelectedNotifIds([]);
                }
              };
            
              const handleToggleSelectOne = (id: string) => {
                setSelectedNotifIds((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                );
              };
            
              const handleDeleteSelected = async () => {
                if (selectedNotifIds.length === 0) return;
                setIsBatchDeleting(true);
                try {
                  await Promise.all(selectedNotifIds.map((id) => removeNotification(id)));
                  setNotifActionSuccess(`Deleted ${selectedNotifIds.length} notification(s)`);
                  setSelectedNotifIds([]);
                  setTimeout(() => setNotifActionSuccess(null), 2500);
                } catch (err) {
                  console.error('Failed batch delete:', err);
                } finally {
                  setIsBatchDeleting(false);
                }
              };

              const handleViewRelatedEntity = (notif: SupportNotification) => {
                if (!notif.is_read && !notif.read) {
                  markNotificationAsRead(notif.id);
                }
                const targetType = notif.type;
                if (targetType === 'order') {
                  setActiveTab('orders');
                } else if (targetType === 'coupon') {
                  setActiveTab('coupons');
                } else if (targetType === 'reward') {
                  setActiveTab('rewards');
                } else if (targetType === 'support') {
                  setActiveTab('help');
                }
              };

              const getCustomerTypeBadge = (type: string) => {
                const labels: Record<string, { label: string; bg: string; color: string }> = {
                  order: { label: 'Order', bg: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71' },
                  coupon: { label: 'Coupon', bg: 'rgba(155, 89, 182, 0.15)', color: '#9b59b6' },
                  reward: { label: 'Rewards', bg: 'rgba(201, 168, 76, 0.15)', color: '#c9a84c' },
                  support: { label: 'Support', bg: 'rgba(230, 126, 34, 0.15)', color: '#e67e22' },
                  system: { label: 'System', bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db' },
                  general: { label: 'System', bg: 'rgba(52, 152, 219, 0.15)', color: '#3498db' },
                };

                const style = labels[type] || { label: type ? type.replace('_', ' ').toUpperCase() : 'General', bg: 'rgba(201, 168, 76, 0.12)', color: '#c9a84c' };
                return (
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: style.bg,
                      color: style.color,
                      border: `1px solid ${style.color}40`,
                    }}
                  >
                    {style.label}
                  </span>
                );
              };

              const categoryTabs: { id: 'all' | 'orders' | 'coupons' | 'rewards' | 'support' | 'system'; label: string }[] = [
                { id: 'all', label: 'All Notifications' },
                { id: 'orders', label: 'Orders' },
                { id: 'coupons', label: 'Coupons' },
                { id: 'rewards', label: 'Rewards' },
                { id: 'support', label: 'Support' },
                { id: 'system', label: 'System' },
              ];

              return (
                <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px', color: '#f5efe6' }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                    <div>
                      <span style={{ color: 'rgba(201, 168, 76, 0.85)', fontSize: '0.78rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                        — CUSTOMER CENTER
                      </span>
                      <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '2.4rem', color: '#f5efe6', fontWeight: 700, margin: 0 }}>
                        Notifications
                      </h1>
                    </div>

                    {/* Global Action Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={handleRefreshNotifs}
                        disabled={isNotifLoading}
                        style={{
                          padding: '10px 18px',
                          background: 'rgba(201, 168, 76, 0.1)',
                          border: '1px solid rgba(201, 168, 76, 0.3)',
                          borderRadius: '8px',
                          color: '#c9a84c',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: isNotifLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <RefreshCw size={15} className={isNotifLoading ? 'animate-spin' : ''} /> Refresh
                      </button>
                      
                      {selectedNotifIds.length > 0 && (
                        <button
                          onClick={handleDeleteSelected}
                          disabled={isBatchDeleting}
                          style={{
                            padding: '10px 18px',
                            background: 'rgba(231, 76, 60, 0.15)',
                            border: '1px solid #e74c3c',
                            borderRadius: '8px',
                            color: '#e74c3c',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Trash2 size={16} /> {isBatchDeleting ? 'Deleting...' : `Delete (${selectedNotifIds.length})`}
                        </button>
                      )}

                      {unreadTotal > 0 && (
                        <button
                          onClick={handleMarkAll}
                          style={{
                            padding: '10px 18px',
                            background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 50%, #c9a84c 100%)',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#0f0c0a',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 4px 14px rgba(201, 168, 76, 0.25)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <CheckCheck size={16} /> Mark all as read ({unreadTotal})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Action Success Toast Banner */}
                  {notifActionSuccess && (
                    <div
                      style={{
                        marginBottom: '20px',
                        padding: '12px 18px',
                        background: 'rgba(46, 204, 113, 0.12)',
                        border: '1px solid rgba(46, 204, 113, 0.3)',
                        borderRadius: '8px',
                        color: '#2ecc71',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Check size={16} /> {notifActionSuccess}
                    </div>
                  )}

                  {/* Category Tabs & Filter Toolbar */}
                  <div
                    style={{
                      background: 'rgba(20, 16, 13, 0.85)',
                      border: '1px solid rgba(201, 168, 76, 0.2)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      marginBottom: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    {/* Categories Dropdown or Tabs */}
                    {isMobile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select
                          value={notifCategory}
                          onChange={(e) => setNotifCategory(e.target.value as any)}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(10, 8, 6, 0.8)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px',
                            color: '#f5efe6',
                            fontSize: '0.82rem',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {categoryTabs.map((tab) => (
                            <option key={tab.id} value={tab.id} style={{ background: '#14100d', color: '#f5efe6' }}>
                              {tab.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {categoryTabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setNotifCategory(tab.id as any)}
                            style={{
                              padding: '8px 16px',
                              background: notifCategory === tab.id ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
                              border: `1px solid ${notifCategory === tab.id ? '#c9a84c' : 'rgba(255,255,255,0.1)'}`,
                              borderRadius: '8px',
                              color: notifCategory === tab.id ? '#c9a84c' : '#f5efe6',
                              fontSize: '0.85rem',
                              fontWeight: notifCategory === tab.id ? 700 : 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Read / Unread Status Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {!isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: 600 }}>
                          <Filter size={14} /> Status Filter
                        </div>
                      )}
                      <select
                        value={notifReadFilter}
                        onChange={(e) => setNotifReadFilter(e.target.value as any)}
                        style={{
                          padding: '6px 12px',
                          background: 'rgba(10, 8, 6, 0.8)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.82rem',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="all" style={{ background: '#14100d', color: '#f5efe6' }}>All Status</option>
                        <option value="unread" style={{ background: '#14100d', color: '#f5efe6' }}>Unread Only</option>
                        <option value="read" style={{ background: '#14100d', color: '#f5efe6' }}>Read Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Main List / Table Container */}
                  <div
                    style={{
                      background: 'rgba(20, 16, 13, 0.85)',
                      border: '1px solid rgba(201, 168, 76, 0.2)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    {isNotifLoading ? (
                      <div style={{ padding: '60px', textAlign: 'center', color: '#c9a84c' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Loading notifications...</p>
                      </div>
                    ) : filteredNotifications.length === 0 ? (
                      <div style={{ padding: '60px 20px' }}>
                        <EmptyState
                          title="No Notifications Found"
                          description="You have no notifications matching the selected filter."
                          icon={<Bell size={48} color="#c9a84c" />}
                        />
                      </div>
                    ) : (
                      <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table className="notifications-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(10, 8, 6, 0.9)', borderBottom: '1px solid rgba(201, 168, 76, 0.2)', color: '#c9a84c' }}>
                              <th style={{ padding: '16px 14px', width: '40px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={filteredNotifications.length > 0 && selectedNotifIds.length === filteredNotifications.length}
                                  onChange={handleSelectAll}
                                  style={{ cursor: 'pointer', accentColor: '#c9a84c', width: '15px', height: '15px' }}
                                />
                              </th>
                              <th style={{ padding: '16px 20px', fontWeight: 700 }}>NOTIFICATION</th>
                              <th style={{ padding: '16px 20px', fontWeight: 700 }}>TYPE</th>
                              <th style={{ padding: '16px 20px', fontWeight: 700 }}>DATE &amp; TIME</th>
                              <th style={{ padding: '16px 20px', fontWeight: 700 }}>STATUS</th>
                              <th style={{ padding: '16px 20px', fontWeight: 700, textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredNotifications.map((notif) => {
                              const isUnread = notif.is_read === false || notif.read === false;
                              const notifTitle = notif.title || (notif.type ? notif.type.replace('_', ' ').toUpperCase() : 'Notification');
                              const notifMsg = notif.message || notif.text || '';

                              let dateDisplay = '';
                              if (notif.created_at) {
                                const dt = new Date(notif.created_at);
                                if (!isNaN(dt.getTime())) {
                                  dateDisplay = dt.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  });
                                }
                              }
                              if (!dateDisplay && notif.date) {
                                dateDisplay = notif.date;
                              }

                              return (
                                <tr
                                  key={notif.id}
                                  style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    background: selectedNotifIds.includes(notif.id) ? 'rgba(201, 168, 76, 0.1)' : isUnread ? 'rgba(201, 168, 76, 0.04)' : 'transparent',
                                    transition: 'background 0.2s ease',
                                  }}
                                >
                                  {/* Checkbox */}
                                  <td style={{ padding: '16px 14px', width: '40px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedNotifIds.includes(notif.id)}
                                      onChange={() => handleToggleSelectOne(notif.id)}
                                      style={{ cursor: 'pointer', accentColor: '#c9a84c', width: '15px', height: '15px' }}
                                    />
                                  </td>

                                  {/* Title & Message */}
                                  <td style={{ padding: '16px 20px', maxWidth: '400px' }}>
                                    <div style={{ fontWeight: isUnread ? 700 : 600, color: '#f5efe6', marginBottom: '4px' }}>
                                      {notifTitle}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                                      {notifMsg}
                                    </div>
                                  </td>

                                  {/* Type Badge */}
                                  <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                                    {getCustomerTypeBadge(notif.type)}
                                  </td>

                                  {/* Date & Time */}
                                  <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                                    {dateDisplay}
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                                    {!isUnread ? (
                                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Check size={14} color="rgba(255,255,255,0.3)" /> Read
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#c9a84c' }} /> Unread
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                      {isUnread && (
                                        <button
                                          onClick={() => handleMarkSingleRead(notif.id)}
                                          style={{
                                            padding: '6px 12px',
                                            background: 'rgba(201, 168, 76, 0.12)',
                                            border: '1px solid rgba(201, 168, 76, 0.3)',
                                            borderRadius: '6px',
                                            color: '#c9a84c',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                          }}
                                        >
                                          Mark as read
                                        </button>
                                      )}

                                      <button
                                        onClick={() => handleViewRelatedEntity(notif)}
                                        style={{
                                          padding: '6px 12px',
                                          background: 'transparent',
                                          border: '1px solid rgba(255,255,255,0.2)',
                                          borderRadius: '6px',
                                          color: '#f5efe6',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                      >
                                        View
                                      </button>
                                      
                                      <button
                                        onClick={() => {
                                          removeNotification(notif.id);
                                          setNotifActionSuccess('Notification deleted');
                                          setTimeout(() => setNotifActionSuccess(null), 2500);
                                        }}
                                        title="Delete Notification"
                                        style={{
                                          padding: '6px',
                                          background: 'transparent',
                                          border: 'none',
                                          color: 'rgba(255, 255, 255, 0.45)',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.color = '#e74c3c'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SETTINGS PANEL */}
            {activeTab === 'settings' && (
              <div>
                {/* Page Header */}
                <div style={{ marginBottom: '28px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                    Account Preferences &amp; Settings
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: '0 0 6px 0' }}>
                    Manage your account preferences and security.
                  </p>
                  <p style={{ color: 'rgba(201, 168, 76, 0.7)', fontSize: '0.8rem', margin: 0 }}>
                    Fields marked with <span style={{ color: '#e74c3c', fontWeight: 700 }}>*</span> are required.
                  </p>
                </div>

                <form onSubmit={handlePreferencesSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Personal Demographics removed — Date of Birth and Gender are now in My Profile */}

                  {/* Security Credentials Card */}
                  <div
                    style={{
                      background: 'rgba(18, 14, 11, 0.95)',
                      border: '1px solid rgba(201, 168, 76, 0.25)',
                      borderRadius: '14px',
                      padding: '28px',
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                          Security Credentials
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                          Update your password regularly to keep your account secure.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUpdatePasswordForm(!showUpdatePasswordForm);
                          setUpdatePasswordStep(1);
                          setUpdatePasswordError('');
                          setUpdatePasswordMessage('');
                          setUpdatePasswordOTP('');
                          setUpdatePasswordNew('');
                          setUpdatePasswordConfirm('');
                        }}
                        style={{
                          padding: '9px 22px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: '1px solid rgba(201, 168, 76, 0.5)',
                          color: '#c9a84c',
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {showUpdatePasswordForm ? 'Cancel' : 'Change Password'}
                      </button>
                    </div>

                    {/* Change Password Form */}
                    {showUpdatePasswordForm && (
                      <div
                        style={{
                          marginTop: '24px',
                          paddingTop: '22px',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        {/* Step 1: Send OTP */}
                        {updatePasswordStep === 1 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <p style={{ margin: 0, fontSize: '0.88rem', color: '#f5efe6' }}>
                              To change your password, we need to verify your identity.
                            </p>
                            <div>
                              <button
                                type="button"
                                onClick={handleSendUpdatePasswordOTP}
                                disabled={isUpdatingPassword}
                                style={{
                                  padding: '10px 24px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                                  color: '#0f0c0a',
                                  border: 'none',
                                  fontSize: '0.9rem',
                                  fontWeight: 700,
                                  cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                                  opacity: isUpdatingPassword ? 0.7 : 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                {isUpdatingPassword ? (
                                  <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending OTP...</>
                                ) : (
                                  'Send OTP to Email'
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Step 2: Verify OTP */}
                        {updatePasswordStep === 2 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                                Enter 6-Digit OTP <span style={{ color: '#e74c3c' }}>*</span>
                              </label>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                <input
                                  type="text"
                                  maxLength={6}
                                  placeholder="000000"
                                  value={updatePasswordOTP}
                                  onChange={(e) => setUpdatePasswordOTP(e.target.value.replace(/\D/g, ''))}
                                  style={{
                                    flex: 1,
                                    padding: '11px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: `1px solid ${updatePasswordOTP.length === 6 ? 'rgba(46, 204, 113, 0.5)' : 'rgba(201, 168, 76, 0.3)'}`,
                                    color: '#f5efe6',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    letterSpacing: '2px',
                                    transition: 'border-color 0.2s ease',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleVerifyUpdatePasswordOTP}
                                  disabled={isUpdatingPassword || updatePasswordOTP.length !== 6}
                                  style={{
                                    padding: '0 24px',
                                    borderRadius: '8px',
                                    background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                                    color: '#0f0c0a',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    cursor: isUpdatingPassword || updatePasswordOTP.length !== 6 ? 'not-allowed' : 'pointer',
                                    opacity: isUpdatingPassword || updatePasswordOTP.length !== 6 ? 0.7 : 1,
                                  }}
                                >
                                  {isUpdatingPassword ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Verify'}
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                              {updatePasswordTimer > 0 ? (
                                `Resend OTP in ${updatePasswordTimer}s`
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSendUpdatePasswordOTP}
                                  style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                                >
                                  Resend OTP
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Step 3: New Password */}
                        {updatePasswordStep === 3 && (
                          <form onSubmit={handleUpdatePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                                New Password <span style={{ color: '#e74c3c' }}>*</span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Enter new password (min 8 characters)"
                                  value={updatePasswordNew}
                                  onChange={(e) => setUpdatePasswordNew(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '11px 40px 11px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: `1px solid ${
                                      updatePasswordNew.length === 0
                                        ? 'rgba(201, 168, 76, 0.3)'
                                        : updatePasswordNew.length >= 8
                                        ? 'rgba(46, 204, 113, 0.5)'
                                        : 'rgba(231, 76, 60, 0.5)'
                                    }`,
                                    color: '#f5efe6',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s ease',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                              {updatePasswordNew.length > 0 && updatePasswordNew.length < 8 && (
                                <p style={{ margin: '5px 0 0 2px', fontSize: '0.75rem', color: '#e74c3c', fontWeight: 600 }}>
                                  Password must be at least 8 characters ({updatePasswordNew.length}/8)
                                </p>
                              )}
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '0.88rem', color: '#f5efe6', fontWeight: 600, marginBottom: '8px' }}>
                                Confirm New Password <span style={{ color: '#e74c3c' }}>*</span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  value={updatePasswordConfirm}
                                  onChange={(e) => setUpdatePasswordConfirm(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '11px 40px 11px 14px',
                                    borderRadius: '8px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: `1px solid ${
                                      updatePasswordConfirm.length === 0
                                        ? 'rgba(201, 168, 76, 0.3)'
                                        : updatePasswordNew === updatePasswordConfirm
                                        ? 'rgba(46, 204, 113, 0.5)'
                                        : 'rgba(231, 76, 60, 0.5)'
                                    }`,
                                    color: '#f5efe6',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s ease',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                              </div>
                              {updatePasswordConfirm.length > 0 && (
                                <p style={{
                                  margin: '5px 0 0 2px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: updatePasswordNew === updatePasswordConfirm ? '#2ecc71' : '#e74c3c',
                                }}>
                                  {updatePasswordNew === updatePasswordConfirm
                                    ? '✓ Passwords match'
                                    : '✗ Passwords do not match'}
                                </p>
                              )}
                            </div>

                            <div>
                              <button
                                type="submit"
                                disabled={isUpdatingPassword}
                                style={{
                                  padding: '10px 24px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                                  color: '#0f0c0a',
                                  border: 'none',
                                  fontSize: '0.9rem',
                                  fontWeight: 700,
                                  cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                                  opacity: isUpdatingPassword ? 0.7 : 1,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                }}
                              >
                                {isUpdatingPassword ? (
                                  <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
                                ) : (
                                  'Update Password'
                                )}
                              </button>
                            </div>
                          </form>
                        )}

                        {updatePasswordError && (
                          <div style={{ padding: '12px 14px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                            {updatePasswordError}
                          </div>
                        )}

                        {updatePasswordMessage && (
                          <div style={{ padding: '12px 14px', background: 'rgba(46, 204, 113, 0.1)', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <CheckCircle size={15} /> {updatePasswordMessage}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Feedback messages for main form */}
                  {preferencesError && (
                    <div style={{ padding: '12px 14px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={15} /> {preferencesError}
                    </div>
                  )}
                  {preferencesSaved && (
                    <div style={{ padding: '12px 14px', background: 'rgba(46, 204, 113, 0.1)', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                      <CheckCircle size={15} /> Account preferences saved successfully.
                    </div>
                  )}

                 </form>
              </div>
            )}


            {/* HELP & COMPLAINTS PANEL */}
            {activeTab === 'help' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--cream)', margin: '0 0 6px 0' }}>
                      Help & Support Center
                    </h2>
                    <p style={{ color: 'var(--beige)', fontSize: '0.85rem', margin: 0 }}>
                      Our customer support team will inspect and resolve your issue within 24-48 business hours.
                    </p>
                  </div>
                  {!showSupportForm && (
                    <Button
                      variant="gold"
                      glow
                      onClick={() => setShowSupportForm(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                    >
                      <Plus size={18} />
                      Help & Support
                    </Button>
                  )}
                </div>

                {/* Raise Complaint Form */}
                {showSupportForm && (
                  <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--gold)', margin: 0 }}>
                        Submit a New Support Complaint
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowSupportForm(false)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--beige)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.7,
                        }}
                        title="Close form"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <p style={{ color: 'var(--beige)', fontSize: '0.85rem', marginBottom: '20px' }}>
                      Our customer support team will inspect and resolve your issue within 24-48 business hours.
                    </p>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const cat = (form.elements.namedItem('category') as HTMLSelectElement).value as any;
                      const desc = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
                      const orderIdVal = (form.elements.namedItem('order_id') as HTMLSelectElement)?.value || undefined;
                      if (!desc.trim() || isSubmittingSupportTicket) return;
                      setIsSubmittingSupportTicket(true);
                      try {
                        await addSupportTicket(cat, desc, orderIdVal);
                        form.reset();
                        setShowSupportForm(false);
                        addToast(
                          'success',
                          'Your ticket has been created and our support team will review it within 24–48 business hours.',
                          'Support request submitted successfully.'
                        );
                      } catch (err: any) {
                        console.error('Failed to submit support complaint:', err);
                        addToast(
                          'error',
                          err?.detail || err?.message || 'Failed to submit support request. Please try again.',
                          'Submission Failed'
                        );
                      } finally {
                        setIsSubmittingSupportTicket(false);
                      }
                    }}>
                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--grey-light)', marginBottom: '6px', fontWeight: 600 }}>
                          Select Complaint Category
                        </label>
                        <select
                          name="category"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'var(--cream)',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        >
                          <option value="Chocolate melted">Chocolate melted</option>
                          <option value="Slow delivery">Slow delivery</option>
                          <option value="Return order was not accepting">Return order was not accepting</option>
                          <option value="Refund amount are not debited in mentioned days">Refund amount are not debited in mentioned days</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--grey-light)', marginBottom: '6px', fontWeight: 600 }}>
                          Select Related Order (Optional)
                        </label>
                        <select
                          name="order_id"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'var(--cream)',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        >
                          <option value="">-- General / No Specific Order --</option>
                          {orders.map((ord: any) => (
                            <option key={ord.id} value={ord.id}>
                              Order #{ord.id} ({ord.date || (ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '')}) — ₹{ord.total?.toLocaleString('en-IN') || 0}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--grey-light)', marginBottom: '6px', fontWeight: 600 }}>
                          Describe the Problem
                        </label>
                        <textarea
                          name="description"
                          required
                          placeholder="Please provide details about the issue..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'var(--cream)',
                            fontSize: '0.9rem',
                            outline: 'none',
                            resize: 'none',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Button variant="gold" type="submit" glow disabled={isSubmittingSupportTicket}>
                          {isSubmittingSupportTicket ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                              Submitting...
                            </span>
                          ) : (
                            'Submit Ticket'
                          )}
                        </Button>
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={() => setShowSupportForm(false)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: 'var(--cream)',
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Complaint Logs History - directly displayed on the page */}
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '15px' }}>
                    Your Support History
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {tickets.filter(t => t.customerId === user.id).length === 0 ? (
                      <p style={{ color: 'var(--grey-light)', fontStyle: 'italic', fontSize: '0.85rem', margin: 0 }}>
                        You have no support complaints raised.
                      </p>
                    ) : (
                      tickets.filter(t => t.customerId === user.id).map(ticket => {
                        const isResolved = ticket.status === 'Resolved';
                        const relatedOrderId = ticket.orderId || ticket.order_id;
                        return (
                          <div
                            key={ticket.id}
                            style={{
                              padding: '16px',
                              background: 'rgba(0,0,0,0.2)',
                              borderRadius: '6px',
                              borderLeft: isResolved ? '3px solid #2ecc71' : '3px solid var(--gold)',
                              borderTop: '1px solid var(--glass-border)',
                              borderRight: '1px solid var(--glass-border)',
                              borderBottom: '1px solid var(--glass-border)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.85rem' }}>
                                {ticket.id}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: isResolved ? 'rgba(46, 204, 113, 0.15)' : 'rgba(201, 168, 76, 0.15)',
                                  color: isResolved ? '#2ecc71' : 'var(--gold)',
                                  fontWeight: 600,
                                }}
                              >
                                {ticket.status}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--grey-light)' }}>
                                Category: <strong style={{ color: 'var(--cream)' }}>{ticket.category}</strong> · Opened: {ticket.date}
                              </span>
                              {relatedOrderId ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const relOrd = await orderService.getOrder(relatedOrderId);
                                      setSelectedOrder(relOrd);
                                      setOrderSubView('details');
                                      setActiveTab('orders');
                                    } catch (err: any) {
                                      console.error('Failed to load related order:', err);
                                      addToast(
                                        'error',
                                        err?.detail || err?.message || 'Failed to load related order details.',
                                        'Error'
                                      );
                                    }
                                  }}
                                  style={{
                                    padding: '3px 10px',
                                    fontSize: '0.75rem',
                                    background: 'rgba(201, 168, 76, 0.15)',
                                    color: 'var(--gold)',
                                    border: '1px solid rgba(201, 168, 76, 0.35)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  View Order (#{relatedOrderId})
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--grey-light)', fontStyle: 'italic' }}>
                                  No related order
                                </span>
                              )}
                            </div>
                            
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--cream)', lineHeight: '1.4' }}>
                              {ticket.description}
                            </p>

                            {ticket.adminNotes && (
                              <div
                                style={{
                                  padding: '10px 12px',
                                  background: 'rgba(201, 168, 76, 0.08)',
                                  border: '1px dashed rgba(201, 168, 76, 0.3)',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  color: 'var(--beige)',
                                  marginBottom: '12px',
                                }}
                              >
                                <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: '4px' }}>Support Resolution Notes:</strong>
                                {ticket.adminNotes}
                              </div>
                            )}

                            {isResolved && (
                              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', marginTop: '10px' }}>
                                <span style={{ fontSize: '0.78rem', color: 'var(--cream)', display: 'block', marginBottom: '6px' }}>
                                  Was this issue resolved to your satisfaction?
                                </span>
                                
                                {ticket.customerResolutionFeedback ? (
                                  <span style={{ fontSize: '0.8rem', color: ticket.customerResolutionFeedback === 'Resolved' ? '#2ecc71' : 'var(--rose-gold)', fontWeight: 600 }}>
                                    Feedback submitted: {ticket.customerResolutionFeedback === 'Resolved' ? 'Resolved ✓' : 'Not Resolved ✗'}
                                  </span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                      onClick={() => {
                                        submitTicketFeedback(ticket.id, 'Resolved');
                                        acknowledgeTicketNotification(ticket.id);
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(46, 204, 113, 0.15)',
                                        color: '#2ecc71',
                                        border: '1px solid rgba(46, 204, 113, 0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Resolved
                                    </button>
                                    <button
                                      onClick={() => {
                                        submitTicketFeedback(ticket.id, 'Not Resolved');
                                        acknowledgeTicketNotification(ticket.id);
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        background: 'rgba(183, 110, 121, 0.15)',
                                        color: 'var(--rose-gold)',
                                        border: '1px solid rgba(183, 110, 121, 0.3)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                      }}
                                    >
                                      Still an Issue
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          {/* MOBILE ACCOUNT COMPOSITE PANEL (≤768px only)
               Renders Profile, Addresses, and Settings as sub-sections
               The individual desktop panels (activeTab==='profile', etc.) are
               still rendered below via their own conditionals — they remain
               hidden on mobile because on mobile activeTab==='account', not
               'profile'/'addresses'/'settings'. Desktop continues unchanged. */}
          {activeTab === 'account' && isMobile && (
            <div className="cust-mobile-account-page">
              {/* Sub-section Tabs */}
              <div className="cust-mobile-account-tabs">
                {(['profile', 'addresses', 'settings'] as const).map((sec) => (
                  <button
                    key={sec}
                    className={`cust-mobile-account-tab-btn ${mobileAccountSection === sec ? 'active' : ''}`}
                    onClick={() => setMobileAccountSection(sec)}
                  >
                    {sec === 'profile' ? 'My Profile' : sec === 'addresses' ? 'Addresses' : 'Settings'}
                  </button>
                ))}
              </div>

              {/* Profile sub-section */}
              {mobileAccountSection === 'profile' && (
                <div className="cust-mobile-account-section">
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>
                      My Profile Details
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', margin: 0 }}>
                      Manage your personal information and profile details.
                    </p>
                  </div>
                  {/* Reuse the existing profile content by temporarily setting activeTab internally.
                      We directly render the profile form inline using the same state that the
                      desktop profile panel uses — no duplication of business logic. */}
                  <div
                    ref={(el) => {
                      if (el && mobileAccountSection === 'profile') {
                        // Sync: nothing extra needed — the profile form state is shared
                      }
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                      {(() => {
                        const raw = avatarPreviewUrl || user?.profile?.avatarUrl || (user?.profile as any)?.avatar_url || (user as any)?.avatar_url;
                        const url = raw && (raw.startsWith('data:') || raw.startsWith('blob:')) ? raw : raw ? getImageUrl(raw) : '';
                        return url && !imgLoadError ? (
                          <img src={url} alt="Profile" referrerPolicy="no-referrer" onError={() => setImgLoadError(true)}
                            style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c9a84c', boxShadow: '0 0 16px rgba(201,168,76,0.3)' }} />
                        ) : (
                          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(201,168,76,0.25),rgba(18,14,11,0.95))', border: '2px solid #c9a84c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#c9a84c', fontWeight: 700 }}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                        );
                      })()}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <label htmlFor="mob-avatar-upload" style={{ padding: '8px 16px', borderRadius: '6px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <UploadCloud size={14} /> Change Photo
                          <input
                            id="mob-avatar-upload"
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5MB.'); return; }
                              setPendingAvatarFile(file);
                              setAvatarPreviewUrl(URL.createObjectURL(file));
                              setAvatarError('');
                              setImgLoadError(false);
                            }}
                          />
                        </label>
                        {(pendingAvatarFile || avatarPreviewUrl) && (
                          <button onClick={() => { setPendingAvatarFile(null); setAvatarPreviewUrl(null); setAvatarError(''); setImgLoadError(false); }}
                            style={{ padding: '8px 16px', borderRadius: '6px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.4)', color: '#e74c3c', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                      </div>
                      {avatarError && <span style={{ color: '#e74c3c', fontSize: '0.78rem' }}>{avatarError}</span>}
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>Full Name <span style={{ color: '#e74c3c' }}>*</span></label>
                        <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.25)', color: '#f5efe6', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>Email Address</label>
                        <input value={profileForm.email} disabled
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(201,168,76,0.15)', color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', outline: 'none', cursor: 'not-allowed', boxSizing: 'border-box' }} />
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>Email cannot be changed.</span>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>Phone Number</label>
                        <input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile number"
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.25)', color: '#f5efe6', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>Date of Birth</label>
                        <input type="date" value={profileForm.dob} onChange={e => setProfileForm(p => ({ ...p, dob: e.target.value }))}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.25)', color: '#f5efe6', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', fontWeight: 600 }}>Gender</label>
                        <select value={profileForm.gender} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))}
                          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.25)', color: profileForm.gender ? '#f5efe6' : 'rgba(255,255,255,0.4)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                      </div>
                      {profileError && (
                        <div style={{ padding: '10px 14px', background: 'rgba(231,76,60,0.12)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={14} /> {profileError}
                        </div>
                      )}
                      {profileSaved && (
                        <div style={{ padding: '10px 14px', background: 'rgba(46,204,113,0.1)', border: '1px solid #2ecc71', color: '#2ecc71', borderRadius: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle size={14} /> Profile saved successfully!
                        </div>
                      )}
                      <button type="submit" disabled={isProfileSaving}
                        style={{ padding: '12px 24px', borderRadius: '8px', background: 'linear-gradient(135deg,#c9a84c,#e5c875)', color: '#0f0c0a', border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: isProfileSaving ? 'not-allowed' : 'pointer', opacity: isProfileSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {isProfileSaving ? <><Loader2 size={16} className="spin" /> Saving...</> : <><CheckCircle size={16} /> Save Profile</>}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Addresses sub-section */}
              {mobileAccountSection === 'addresses' && (
                <div className="cust-mobile-account-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#f5efe6', margin: '0 0 4px 0', fontWeight: 700 }}>Address Book</h2>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>Manage your shipping addresses.</p>
                    </div>
                    <button
                      onClick={() => { if (showAddAddressForm) { setShowAddAddressForm(false); setEditingAddressId(null); } else { handleOpenAddAddress(); } }}
                      style={{ padding: '9px 18px', borderRadius: '6px', background: 'linear-gradient(135deg,#c9a84c,#e5c875)', color: '#0f0c0a', border: 'none', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {showAddAddressForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Address</>}
                    </button>
                  </div>

                  {/* Address form (shared state with desktop) */}
                  {showAddAddressForm && (
                    <div style={{ background: 'rgba(18,14,11,0.95)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                      <h3 style={{ color: '#c9a84c', fontSize: '1rem', fontWeight: 700, margin: '0 0 16px 0' }}>{editingAddressId ? 'Edit Address' : 'New Address'}</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[{key:'title',label:'Label',ph:'Home / Work / Other'},{key:'name',label:'Full Name',ph:'Recipient name'},{key:'street',label:'Street Address',ph:'House, street, area'},{key:'city',label:'City',ph:'City'},{key:'zip',label:'Pincode',ph:'6-digit pincode'},{key:'phone',label:'Phone',ph:'10-digit mobile'}].map(({key,label,ph}) => (
                          <div key={key}>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 600 }}>{label}</label>
                            <input value={(addressForm as any)[key]} onChange={e => setAddressForm(f => ({...f, [key]: e.target.value}))} placeholder={ph}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5efe6', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                          </div>
                        ))}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 600 }}>State</label>
                          <select value={addressForm.state} onChange={e => setAddressForm(f => ({...f, state: e.target.value}))}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5efe6', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm(f => ({...f, isDefault: e.target.checked}))} />
                          Set as default address
                        </label>
                        {addressFormError && <span style={{ color: '#e74c3c', fontSize: '0.78rem' }}>{addressFormError}</span>}
                        <button
                          onClick={async () => {
                            setAddressFormError('');
                            if (!addressForm.name.trim()) { setAddressFormError('Name is required.'); return; }
                            if (!addressForm.street.trim()) { setAddressFormError('Street is required.'); return; }
                            if (!addressForm.city.trim()) { setAddressFormError('City is required.'); return; }
                            if (!/^\d{6}$/.test(addressForm.zip.trim())) { setAddressFormError('Enter a valid 6-digit pincode.'); return; }
                            if (!/^[6-9]\d{9}$/.test(addressForm.phone.trim())) { setAddressFormError('Enter a valid 10-digit phone.'); return; }
                            setIsAddressSaving(true);
                            try {
                              if (editingAddressId) {
                                await updateAddress(editingAddressId, { title: addressForm.title, name: addressForm.name, street: addressForm.street, city: addressForm.city, state: addressForm.state, zip: addressForm.zip, phone: addressForm.phone, isDefault: addressForm.isDefault });
                              } else {
                                await addAddress({ title: addressForm.title, name: addressForm.name, street: addressForm.street, city: addressForm.city, state: addressForm.state, zip: addressForm.zip, phone: addressForm.phone, isDefault: addressForm.isDefault });
                              }
                              setShowAddAddressForm(false); setEditingAddressId(null);
                            } catch (err: any) { setAddressFormError(err?.message || 'Failed to save address.'); }
                            finally { setIsAddressSaving(false); }
                          }}
                          disabled={isAddressSaving}
                          style={{ padding: '10px 20px', borderRadius: '7px', background: 'linear-gradient(135deg,#c9a84c,#e5c875)', color: '#0f0c0a', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: isAddressSaving ? 'not-allowed' : 'pointer', opacity: isAddressSaving ? 0.7 : 1 }}>
                          {isAddressSaving ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Address list */}
                  {addresses.length === 0 && !showAddAddressForm ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                      <MapPin size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p>No saved addresses yet.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {addresses.map((addr: CustomerAddress) => (
                        <div key={addr.id} style={{ padding: '16px', background: 'rgba(18,14,11,0.9)', border: `1px solid ${addr.isDefault ? '#c9a84c' : 'rgba(201,168,76,0.2)'}`, borderRadius: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, color: '#f5efe6', fontSize: '0.9rem' }}>{addr.title || 'Address'}</span>
                              {addr.isDefault && <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '10px', fontWeight: 700 }}>DEFAULT</span>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => { setEditingAddressId(addr.id); setAddressForm({ title: addr.title||'Home', name: addr.name, street: addr.street, city: addr.city, state: addr.state||'Telangana', zip: addr.zip, phone: addr.phone||'', isDefault: addr.isDefault||false }); setShowAddAddressForm(true); setAddressFormError(''); }}
                                style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: '#c9a84c', fontSize: '0.75rem', cursor: 'pointer' }}>Edit</button>
                              <button onClick={async () => { if (window.confirm('Delete this address?')) { try { await deleteAddress(addr.id); } catch {} } }}
                                style={{ padding: '4px 10px', borderRadius: '5px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', fontSize: '0.75rem', cursor: 'pointer' }}>Delete</button>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.83rem', color: 'rgba(255,255,255,0.65)', lineHeight: '1.5' }}>
                            {addr.name} · {addr.street}, {addr.city}, {addr.state} – {addr.zip}
                            {addr.phone ? ` · ${addr.phone}` : ''}
                          </p>
                          {!addr.isDefault && (
                            <button onClick={async () => { try { await setDefaultAddress(addr.id); } catch {} }}
                              style={{ marginTop: '8px', padding: '4px 10px', borderRadius: '5px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', color: 'rgba(201,168,76,0.7)', fontSize: '0.73rem', cursor: 'pointer' }}>Set as Default</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Settings sub-section */}
              {mobileAccountSection === 'settings' && (
                <div className="cust-mobile-account-section">
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#f5efe6', margin: '0 0 6px 0', fontWeight: 700 }}>Account Settings</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: 0 }}>Manage your account security and preferences.</p>
                  </div>

                  {/* Change Password card */}
                  <div style={{ background: 'rgba(18,14,11,0.95)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#f5efe6', margin: '0 0 4px 0', fontWeight: 700 }}>Security Credentials</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', margin: 0 }}>Update your account password securely.</p>
                      </div>
                      {!showUpdatePasswordForm && (
                        <button onClick={() => { setShowUpdatePasswordForm(true); setUpdatePasswordStep(1); setUpdatePasswordError(''); setUpdatePasswordMessage(''); }}
                          style={{ padding: '9px 18px', borderRadius: '6px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                          Change Password
                        </button>
                      )}
                    </div>

                    {showUpdatePasswordForm && (
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {updatePasswordStep === 1 && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 600 }}>Email Address</label>
                              <input type="email" value={updatePasswordEmail} onChange={e => setUpdatePasswordEmail(e.target.value)} disabled={isUpdatingPassword}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5efe6', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <button onClick={handleSendUpdatePasswordOTP} disabled={isUpdatingPassword}
                              style={{ padding: '10px', borderRadius: '7px', background: 'linear-gradient(135deg,#c9a84c,#e5c875)', color: '#0f0c0a', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: isUpdatingPassword ? 'not-allowed' : 'pointer', opacity: isUpdatingPassword ? 0.7 : 1 }}>
                              {isUpdatingPassword ? 'Sending...' : 'Send OTP'}
                            </button>
                          </>
                        )}
                        {updatePasswordStep === 2 && (
                          <>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 600 }}>Enter 6-digit OTP</label>
                              <input value={updatePasswordOTP} onChange={e => setUpdatePasswordOTP(e.target.value)} maxLength={6} placeholder="OTP"
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5efe6', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            {updatePasswordTimer > 0 && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Resend in {updatePasswordTimer}s</span>}
                            <button onClick={handleVerifyUpdatePasswordOTP} disabled={isUpdatingPassword}
                              style={{ padding: '10px', borderRadius: '7px', background: 'linear-gradient(135deg,#c9a84c,#e5c875)', color: '#0f0c0a', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: isUpdatingPassword ? 'not-allowed' : 'pointer', opacity: isUpdatingPassword ? 0.7 : 1 }}>
                              {isUpdatingPassword ? 'Verifying...' : 'Verify OTP'}
                            </button>
                          </>
                        )}
                        {updatePasswordStep === 3 && (
                          <form onSubmit={handleUpdatePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 600 }}>New Password</label>
                              <input type={showNewPassword ? 'text' : 'password'} value={updatePasswordNew} onChange={e => setUpdatePasswordNew(e.target.value)}
                                style={{ width: '100%', padding: '9px 40px 9px 12px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5efe6', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                              <button type="button" onClick={() => setShowNewPassword(p => !p)} style={{ position: 'absolute', right: '10px', bottom: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', fontWeight: 600 }}>Confirm Password</label>
                              <input type={showConfirmPassword ? 'text' : 'password'} value={updatePasswordConfirm} onChange={e => setUpdatePasswordConfirm(e.target.value)}
                                style={{ width: '100%', padding: '9px 40px 9px 12px', borderRadius: '7px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.2)', color: '#f5efe6', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
                              <button type="button" onClick={() => setShowConfirmPassword(p => !p)} style={{ position: 'absolute', right: '10px', bottom: '10px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                            </div>
                            <button type="submit" disabled={isUpdatingPassword}
                              style={{ padding: '10px', borderRadius: '7px', background: 'linear-gradient(135deg,#c9a84c,#e5c875)', color: '#0f0c0a', border: 'none', fontWeight: 700, fontSize: '0.88rem', cursor: isUpdatingPassword ? 'not-allowed' : 'pointer', opacity: isUpdatingPassword ? 0.7 : 1 }}>
                              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                            </button>
                          </form>
                        )}
                        {updatePasswordError && <span style={{ color: '#e74c3c', fontSize: '0.78rem' }}>{updatePasswordError}</span>}
                        {updatePasswordMessage && <span style={{ color: '#2ecc71', fontSize: '0.78rem' }}>{updatePasswordMessage}</span>}
                        <button onClick={() => { setShowUpdatePasswordForm(false); setUpdatePasswordStep(1); setUpdatePasswordOTP(''); setUpdatePasswordNew(''); setUpdatePasswordConfirm(''); setUpdatePasswordError(''); setUpdatePasswordMessage(''); }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Cancel</button>
                      </div>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div style={{ background: 'rgba(18,14,11,0.95)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '12px', padding: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: '#f5efe6', margin: '0 0 4px 0', fontWeight: 700 }}>Session</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', margin: '0 0 14px 0' }}>Sign out of your Chovique account.</p>
                    <button onClick={handleLogoutClick}
                      style={{ padding: '10px 20px', borderRadius: '7px', background: 'rgba(255,77,79,0.08)', border: '1px solid rgba(255,77,79,0.3)', color: '#ff4d4f', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <LogOut size={15} /> Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          </main>
        </div>

        {/* Unsaved Changes Confirmation Modal */}
        <ConfirmationModal
          isOpen={showUnsavedModal}
          title="Unsaved Changes"
          message="You have unsaved changes in your profile. Are you sure you want to discard them and leave?"
          confirmText="Discard & Leave"
          cancelText="Cancel"
          variant="warning"
          onConfirm={handleConfirmDiscard}
          onCancel={handleCancelDiscard}
        />

        {/* Logout Confirmation Modal */}
        <ConfirmationModal
          isOpen={showLogoutModal}
          title="Confirm Logout"
          message="Are you sure you want to log out of your account?"
          confirmText={isLoggingOut ? 'Logging out...' : 'Log Out'}
          cancelText="Cancel"
          isConfirming={isLoggingOut}
          variant="danger"
          onConfirm={handleConfirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />

        {/* Cancel Order Confirmation Modal */}
        <ConfirmationModal
          isOpen={cancelModalOrderId !== null}
          title="Cancel Order?"
          message="Are you sure you want to cancel this order? This action cannot be undone."
          confirmText={cancellingOrderId ? 'Cancelling...' : 'Confirm Cancellation'}
          cancelText="Keep Order"
          isConfirming={cancellingOrderId !== null}
          variant="danger"
          onConfirm={confirmCancelOrder}
          onCancel={() => {
            if (!cancellingOrderId) {
              setCancelModalOrderId(null);
            }
          }}
        />

        {/* Return Order Confirmation Modal */}
        <ConfirmationModal
          isOpen={returnModalOrderId !== null}
          title="Return Order?"
          message="Are you sure you want to request a return for this order?"
          confirmText={returningOrderId ? 'Submitting...' : 'Confirm Return'}
          cancelText="Keep Order"
          isConfirming={returningOrderId !== null}
          variant="warning"
          onConfirm={confirmReturnOrder}
          onCancel={() => {
            if (!returningOrderId) {
              setReturnModalOrderId(null);
              setReturnReason('');
            }
          }}
        >
          <div style={{ marginTop: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--beige)', marginBottom: '6px' }}>
              Reason for Return (optional):
            </label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Enter a reason for your return request..."
              rows={3}
              disabled={returningOrderId !== null}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--glass-border)',
                color: 'var(--cream)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        </ConfirmationModal>

        {/* Toast Notification Container */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </motion.div>
  );
};
export default CustomerDashboard;
