import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Check,
  Edit2,
  UploadCloud,
  X,
  Warehouse,
  ShoppingBag,
  Coins,
  Users,
  CheckCircle,
  Loader2,
  Star,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  FolderTree,
  ToggleLeft,
  ToggleRight,
  ImagePlus,
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Save,
  Zap,
  AlertTriangle as AlertIcon,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Home,
  ExternalLink,
  Eye,
  Video,
  Headphones,
  MapPin,
  Edit3,
  FileSpreadsheet,
  Play,
  Film,
  Camera,
  ArrowLeft,
  ArrowRight,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportCsv';
import { useApp } from '../../app/providers';
import { Sidebar } from '../../components/Sidebar';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { NotificationHeaderDropdown } from '../../components/NotificationHeaderDropdown';
import { AdminUserDropdown } from '../../components/AdminUserDropdown';
import { NotificationsView } from './NotificationsView';
import { AdminProfileView } from './AdminProfileView';
import { ChangePasswordView } from './ChangePasswordView';
import { ActivityLogsView } from './ActivityLogsView';
import { DashboardKpiSkeleton, DashboardCardSkeleton } from '../../components/ui/DashboardSkeleton';
import { walletService, RewardSettings } from '../../services/walletService';
import { adminService } from '../../services/adminService';
import { productService } from '../../services/productService';
import { categoryService, AdminCategory } from '../../services/categoryService';
import { orderService } from '../../services/orderService';
import { OrderManagement, OrderDetailModal } from './OrderManagement';
import { CustomerDirectory } from './CustomerDirectory';
import { OfflineSalesView } from './OfflineSalesView';
import { DeliveryBoysView } from './DeliveryBoysView';
import { CreateCouponView } from './CreateCouponView';
import { Product, OfflineSale, SystemUser, Banner } from '../../types';
import { getImageUrl } from '../../utils/imageUrl';
import { BASE_URL, apiGet } from '../../lib/api';
import {
  trimValue,
  isValidEmail,
  isValidPhone,
  isNonEmpty,
  isValidNumber,
  isValidFutureDate,
  isDuplicate
} from '../../utils/adminFormValidation';

import { RewardCoinsView } from './RewardCoinsView';
import { ReportsAnalyticsView } from './ReportsAnalyticsView';

export const AdminDashboard: React.FC = () => {
  const {
    products,
    setProducts,
    addProduct,
    updateProductInventory,
    deleteProduct,
    offlineSales,
    setOfflineSales,
    orders,
    addOfflineSale,
    importOfflineSales,
    tickets,
    resolveSupportTicket,
    updateSupportTicketStatus,
    banners,
    updateBanner,
    addBanner,
    deleteBannerState,
    refreshBanners,
    user,
    role,
    logout
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileGrid, setIsMobileGrid] = useState(window.innerWidth <= 768);

  // Sync activeTab with URL query parameter (e.g. /admin?section=products or /admin?tab=orders)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = (params.get('tab') || params.get('section') || '').toLowerCase().trim();
    if (tabParam) {
      const mapping: Record<string, string> = {
        'inventory': 'products',
        'products': 'products',
        'orders': 'orders',
        'delivery-boys': 'delivery-boys',
        'delivery': 'delivery-boys',
        'fleet': 'delivery-boys',
        'customers': 'customers',
        'offline-sales': 'offline-sales',
        'offline': 'offline-sales',
        'coupons': 'coupons',
        'reward-settings': 'reward-settings',
        'rewards': 'reward-settings',
        'coins': 'reward-settings',
        'tickets': 'complaints',
        'complaints': 'complaints',
        'support': 'complaints',
        'contact-messages': 'contact-messages',
        'dashboard': 'dashboard',
        'reports': 'reports',
        'analytics': 'reports',
      };
      if (mapping[tabParam]) {
        setActiveTab(mapping[tabParam]);
      }
    }
  }, [location.search]);

  // --- Logout Modal State ---
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminService.adminLogout();
    } catch (err) {
      console.error('Failed to log out from server:', err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirmModal(false);
      logout();
    }
  };

  const handleTabNavigation = (tab: string) => {
    if (tab === 'logout') {
      setShowLogoutConfirmModal(true);
    } else {
      setShowCreateCouponForm(false);
      setActiveTab(tab);
    }
  };

  // --- Date Range Selector State ---
  const [dateRangePreset, setDateRangePreset] = useState<'today' | '7days' | '30days' | 'thisMonth' | 'custom'>('7days');
  const [dateRangeLabel, setDateRangeLabel] = useState('05 Aug 2026 - 11 Aug 2026');
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customDateError, setCustomDateError] = useState('');
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // --- Dashboard Data & Loading States ---
  const [ticketStatusMap, setTicketStatusMap] = useState<Record<string, string>>({});
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [pendingBatchProducts, setPendingBatchProducts] = useState<any[]>([]);
  const [showOfflineSalesModal, setShowOfflineSalesModal] = useState(false);

  // --- Pagination States for Admin Views ---
  const [recentOrdersPage, setRecentOrdersPage] = useState<number>(1);
  const [lowStockPage, setLowStockPage] = useState<number>(1);
  const [couponsPage, setCouponsPage] = useState<number>(1);
  const [testimonialsPage, setTestimonialsPage] = useState<number>(1);
  const [complaintsPage, setComplaintsPage] = useState<number>(1);
  const [contactMessagesPage, setContactMessagesPage] = useState<number>(1);

  // --- Toast Notifications State ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
  };
  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Confirmation Modal State ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
    isConfirming?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    onConfirm: () => {},
    isConfirming: false,
  });

  const openConfirmation = (title: string, message: string, onConfirm: () => void | Promise<void>, confirmText = 'Delete') => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isConfirming: true }));
        try {
          await onConfirm();
        } finally {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {}, isConfirming: false });
        }
      },
      isConfirming: false,
    });
  };

  const [viewingComplaintOrder, setViewingComplaintOrder] = useState<any | null>(null);

  // --- Form Inline Validation Error States ---
  const [productFormErrors, setProductFormErrors] = useState<Record<string, string>>({});
  const [categoryFormErrors, setCategoryFormErrors] = useState<Record<string, string>>({});
  const [couponFormErrors, setCouponFormErrors] = useState<Record<string, string>>({});
  const [offlineSaleErrors, setOfflineSaleErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleResize = () => {
      setIsMobileGrid(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const params = {
        preset: dateRangePreset,
        start_date: customStartDate || undefined,
        end_date: customEndDate || undefined,
      };
      const [statsRes, topRes, recentRes, lowStockRes] = await Promise.all([
        adminService.getStats(params),
        adminService.getTopProducts(5),
        adminService.getRecentOrders(5),
        adminService.getLowStockProducts(10, 10),
      ]);
      setDashboardStats(statsRes);
      setTopProducts(topRes?.products || []);
      setRecentOrders(recentRes?.orders || []);
      setLowStockProducts(lowStockRes?.products || []);
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setDashboardError(err?.detail || err?.message || 'Failed to load dashboard analytics. Please verify backend connection and try again.');
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleApplyPresetRange = (preset: 'today' | '7days' | '30days' | 'thisMonth' | 'custom') => {
    setDateRangePreset(preset);
    setShowDateDropdown(false);
    const now = new Date();
    if (preset === 'today') {
      const label = `${formatDisplayDate(now)} - ${formatDisplayDate(now)}`;
      setDateRangeLabel(label);
      fetchDashboardData();
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 6);
      setDateRangeLabel(`${formatDisplayDate(past)} - ${formatDisplayDate(now)}`);
      fetchDashboardData();
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 29);
      setDateRangeLabel(`${formatDisplayDate(past)} - ${formatDisplayDate(now)}`);
      fetchDashboardData();
    } else if (preset === 'thisMonth') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDateRangeLabel(`${formatDisplayDate(startOfMonth)} - ${formatDisplayDate(now)}`);
      fetchDashboardData();
    } else if (preset === 'custom') {
      setShowCustomDateModal(true);
    }
  };

  const handleApplyCustomDateRange = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomDateError('');
    if (!isNonEmpty(customStartDate)) {
      setCustomDateError('Start Date is required.');
      return;
    }
    if (!isNonEmpty(customEndDate)) {
      setCustomDateError('End Date is required.');
      return;
    }
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    if (start > end) {
      setCustomDateError('Start Date cannot be after End Date.');
      return;
    }

    const label = `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    setDateRangeLabel(label);
    setShowCustomDateModal(false);
    fetchDashboardData();
    addToast('info', `Filtered dashboard stats for ${label}`, 'Date Filter Applied');
  };

  // Fetch initial extra admin data on mount (users, contact messages, coupons, stats, orders)
  useEffect(() => {
    fetchExtraAdminData();
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomersList = async () => {
    try {
      const data: any = await adminService.getUsers();
      const list = Array.isArray(data) ? data : (data?.items || []);
      setSystemUsers(list);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  // Fetch data when tabs become active
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
    if ((activeTab === 'categories' || activeTab === 'products') && categoriesList.length === 0) {
      fetchCategories();
    }
    if (activeTab === 'products') {
      productService.getProducts({ per_page: 100 }).then((res) => {
        if (res && Array.isArray(res.items)) {
          setProducts(res.items);
        }
      }).catch(() => {});
    }
    if (activeTab === 'orders') {
      fetchAdminOrders(orderFulfillmentFilter, orderPaymentFilter);
    }
    if (activeTab === 'customers') {
      fetchCustomersList();
    }
    if (activeTab === 'coupons') {
      adminService.getCoupons().then((coupons) => setCouponsList(coupons)).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // --- Add Product Form Toggling ---
  const [showAddProductForm, setShowAddProductForm] = useState(false);

  // --- Products Catalog Filter & Pagination States ---
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productAvailabilityFilter, setProductAvailabilityFilter] = useState('all');
  const [productRowsPerPage, setProductRowsPerPage] = useState(10);
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // --- Categories Filter & Action Menu States ---
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState('all');
  const [categoryRowsPerPage, setCategoryRowsPerPage] = useState(10);
  const [categoryCurrentPage, setCategoryCurrentPage] = useState(1);
  const [openCategoryMenuId, setOpenCategoryMenuId] = useState<string | null>(null);

  // Close category 3-dots dropdown menu on clicking anywhere outside
  useEffect(() => {
    if (!openCategoryMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.category-menu-container')) {
        setOpenCategoryMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openCategoryMenuId]);

  // --- Add Product Form State ---
  const [newProd, setNewProd] = useState({
    name: '',
    category: 'dark' as Product['category'],
    price: 0,
    weight: '100g',
    description: '',
    ingredients: '',
    badge: '' as Product['badge'] | '',
    imageFiles: [] as File[],
    imagePreviewUrls: [] as string[],
    stock: 10,
    rating: 4.0,
    servingSize: '100g',
    calories: '550 kcal',
    totalFat: '35g',
    saturatedFat: '20g',
    transFat: '0g',
    cholesterol: '0mg',
    sodium: '15mg',
    totalCarb: '50g',
    dietaryFiber: '8g',
    totalSugars: '40g',
    addedSugars: '35g',
    protein: '7g',
  });
  const [productAddedSuccess, setProductAddedSuccess] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [updatingStockProductId, setUpdatingStockProductId] = useState<string | null>(null);

  // --- Dynamic local state for stock/units sold to keep them interactive ---
  // Stock is now stored in the Product object from backend (product.stock)
  const [productMetrics, setProductMetrics] = useState<{ [productId: string]: { stock: number; sold: number } }>({});

  // --- Edit Product State ---
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingProductImageFiles, setEditingProductImageFiles] = useState<File[]>([]);
  const [editingProductImagePreviews, setEditingProductImagePreviews] = useState<string[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [editingBannerImageFile, setEditingBannerImageFile] = useState<File | null>(null);
  const editingBannerFileRef = useRef<HTMLInputElement>(null);

  // --- Edit Reel State ---
  const [editingReel, setEditingReel] = useState<any | null>(null);
  const [editingReelVideoFile, setEditingReelVideoFile] = useState<File | null>(null);
  const [isUpdatingReel, setIsUpdatingReel] = useState(false);
  const [isFetchingEditReelMeta, setIsFetchingEditReelMeta] = useState(false);
  const [editReelSuccessMsg, setEditReelSuccessMsg] = useState('');
  const [editReelErrorMsg, setEditReelErrorMsg] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle image file selection — stores the File object for FormData upload.
   * Generates a local object URL for preview only (not sent to backend).
   * The actual file will be sent as multipart/form-data via productService.createProduct().
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validFiles = files.filter(file => allowed.includes(file.type.toLowerCase()));
    
    if (validFiles.length !== files.length) {
      alert('Some files were invalid format. Please select only JPG, JPEG, PNG, or WebP images.');
    }
    
    const validSizeFiles = validFiles.filter(file => file.size <= 10 * 1024 * 1024);
    if (validSizeFiles.length !== validFiles.length) {
      alert('Some files were too large. Maximum size is 10 MB per image.');
    }

    if (!validSizeFiles.length) {
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    const previewUrls = validSizeFiles.map(file => URL.createObjectURL(file));
    setNewProd(prev => ({ 
      ...prev, 
      imageFiles: [...prev.imageFiles, ...validSizeFiles], 
      imagePreviewUrls: [...prev.imagePreviewUrls, ...previewUrls] 
    }));
  };

  const handleSetMainCover = (index: number) => {
    if (index === 0) return;
    setNewProd(prev => {
      const newFiles = [...prev.imageFiles];
      const newPreviews = [...prev.imagePreviewUrls];
      const [movedFile] = newFiles.splice(index, 1);
      const [movedPreview] = newPreviews.splice(index, 1);
      newFiles.unshift(movedFile);
      newPreviews.unshift(movedPreview);
      return { ...prev, imageFiles: newFiles, imagePreviewUrls: newPreviews };
    });
  };

  const handleReorderImage = (index: number, direction: 'prev' | 'next') => {
    const targetIdx = direction === 'prev' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newProd.imageFiles.length) return;
    setNewProd(prev => {
      const newFiles = [...prev.imageFiles];
      const newPreviews = [...prev.imagePreviewUrls];
      const tmpF = newFiles[index];
      newFiles[index] = newFiles[targetIdx];
      newFiles[targetIdx] = tmpF;
      const tmpP = newPreviews[index];
      newPreviews[index] = newPreviews[targetIdx];
      newPreviews[targetIdx] = tmpP;
      return { ...prev, imageFiles: newFiles, imagePreviewUrls: newPreviews };
    });
  };

  const resetProductForm = () => {
    setProductFormErrors({});
    setNewProd({
      name: '',
      category: (dynamicCategoryOptions[0]?.value as Product['category']) || 'dark',
      price: 0,
      weight: '100g',
      description: '',
      ingredients: '',
      badge: '',
      imageFiles: [],
      imagePreviewUrls: [],
      stock: 10,
      rating: 4.0,
      servingSize: '100g',
      calories: '550 kcal',
      totalFat: '35g',
      saturatedFat: '20g',
      transFat: '0g',
      cholesterol: '0mg',
      sodium: '15mg',
      totalCarb: '50g',
      dietaryFiber: '8g',
      totalSugars: '40g',
      addedSugars: '35g',
      protein: '7g',
    });
  };

  const validateCurrentProductForm = () => {
    const errors: Record<string, string> = {};
    const nameTrimmed = trimValue(newProd.name);
    if (!isNonEmpty(nameTrimmed)) {
      errors.name = 'Product name is required and cannot be empty.';
    } else if (
      isDuplicate(products, 'name', nameTrimmed) ||
      pendingBatchProducts.some((p) => p.name.toLowerCase() === nameTrimmed.toLowerCase())
    ) {
      errors.name = 'A product with this name already exists in catalog or queue.';
    }

    const priceCheck = isValidNumber(newProd.price, 0.01);
    if (!priceCheck.isValid) {
      errors.price = priceCheck.error || 'Valid positive price is required.';
    }

    const stockCheck = isValidNumber(newProd.stock, 0);
    if (!stockCheck.isValid) {
      errors.stock = stockCheck.error || 'Stock must be 0 or greater.';
    }

    if (!isNonEmpty(newProd.weight)) {
      errors.weight = 'Weight unit is required (e.g. 100g).';
    }

    if (!isNonEmpty(newProd.category as string) || !(newProd.category as string).trim()) {
      errors.category = 'Category is required. Please select a valid category.';
    }

    if (!isNonEmpty(newProd.description)) {
      errors.description = 'Product description is required.';
    }

    setProductFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors, nameTrimmed };
  };

  const handleAddToBatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const { isValid, nameTrimmed } = validateCurrentProductForm();
    if (!isValid) {
      addToast('error', 'Please fix validation errors before adding to batch queue.', 'Validation Error');
      return;
    }

    const batchItem = {
      tempId: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: nameTrimmed,
      category: newProd.category,
      price: newProd.price,
      weight: trimValue(newProd.weight),
      description: trimValue(newProd.description),
      ingredients: trimValue(newProd.ingredients),
      badge: newProd.badge,
      stock: newProd.stock,
      rating: newProd.rating,
      imageFiles: [...newProd.imageFiles],
      imagePreviewUrls: [...newProd.imagePreviewUrls],
      servingSize: trimValue(newProd.servingSize),
      calories: trimValue(newProd.calories),
      totalFat: trimValue(newProd.totalFat),
      saturatedFat: trimValue(newProd.saturatedFat),
      transFat: trimValue(newProd.transFat),
      cholesterol: trimValue(newProd.cholesterol),
      sodium: trimValue(newProd.sodium),
      totalCarb: trimValue(newProd.totalCarb),
      dietaryFiber: trimValue(newProd.dietaryFiber),
      totalSugars: trimValue(newProd.totalSugars),
      addedSugars: trimValue(newProd.addedSugars),
      protein: trimValue(newProd.protein),
    };

    setPendingBatchProducts((prev) => [...prev, batchItem]);
    addToast('info', `Added "${nameTrimmed}" to pending batch list (${pendingBatchProducts.length + 1} queued).`, 'Product Queued');
    resetProductForm();
  };

  const handleRemoveFromBatch = (tempId: string) => {
    setPendingBatchProducts((prev) => prev.filter((p) => p.tempId !== tempId));
    addToast('info', 'Product removed from pending batch list.', 'Removed');
  };

  const handleEditBatchItem = (item: any) => {
    setNewProd({
      name: item.name,
      category: item.category,
      price: item.price,
      weight: item.weight,
      description: item.description,
      ingredients: item.ingredients,
      badge: item.badge || '',
      imageFiles: [...item.imageFiles],
      imagePreviewUrls: [...item.imagePreviewUrls],
      stock: item.stock,
      rating: item.rating,
      servingSize: item.servingSize,
      calories: item.calories,
      totalFat: item.totalFat,
      saturatedFat: item.saturatedFat,
      transFat: item.transFat,
      cholesterol: item.cholesterol,
      sodium: item.sodium,
      totalCarb: item.totalCarb,
      dietaryFiber: item.dietaryFiber,
      totalSugars: item.totalSugars,
      addedSugars: item.addedSugars,
      protein: item.protein,
    });
    setPendingBatchProducts((prev) => prev.filter((p) => p.tempId !== item.tempId));
    addToast('info', `Loaded "${item.name}" into form for editing.`, 'Editing Queued Item');
  };

  // Handle adding product(s) — creates single or batch products sequentially via productService.createProduct
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentBatch = [...pendingBatchProducts];
    const nameTrimmed = trimValue(newProd.name);

    if (nameTrimmed) {
      const { isValid } = validateCurrentProductForm();
      if (!isValid) {
        addToast('error', 'Please fix validation errors in the form before submitting.', 'Validation Error');
        return;
      }
      currentBatch.push({
        tempId: `batch-curr-${Date.now()}`,
        name: nameTrimmed,
        category: newProd.category,
        price: newProd.price,
        weight: trimValue(newProd.weight),
        description: trimValue(newProd.description),
        ingredients: trimValue(newProd.ingredients),
        badge: newProd.badge,
        stock: newProd.stock,
        rating: newProd.rating,
        imageFiles: [...newProd.imageFiles],
        imagePreviewUrls: [...newProd.imagePreviewUrls],
        servingSize: trimValue(newProd.servingSize),
        calories: trimValue(newProd.calories),
        totalFat: trimValue(newProd.totalFat),
        saturatedFat: trimValue(newProd.saturatedFat),
        transFat: trimValue(newProd.transFat),
        cholesterol: trimValue(newProd.cholesterol),
        sodium: trimValue(newProd.sodium),
        totalCarb: trimValue(newProd.totalCarb),
        dietaryFiber: trimValue(newProd.dietaryFiber),
        totalSugars: trimValue(newProd.totalSugars),
        addedSugars: trimValue(newProd.addedSugars),
        protein: trimValue(newProd.protein),
      });
    }

    if (currentBatch.length === 0) {
      addToast('error', 'Please fill out product details or add products to batch before submitting.', 'Validation Error');
      return;
    }

    if (isCreatingProduct) return;
    setIsCreatingProduct(true);

    let successCount = 0;

    for (let i = 0; i < currentBatch.length; i++) {
      const item = currentBatch[i];
      try {
        const formData = new FormData();
        formData.append('name', item.name);
        formData.append('category_id', item.category);
        formData.append('category', item.category);
        formData.append('price', String(item.price));
        formData.append('weight', item.weight);
        formData.append('description', item.description);
        formData.append('ingredients', item.ingredients);
        formData.append('stock', String(item.stock));
        if (item.badge) formData.append('badge', item.badge);
        formData.append('rating', String(item.rating !== undefined && item.rating !== null ? item.rating : 4.8));
        if (item.imageFiles.length > 0) {
          formData.append('image', item.imageFiles[0]);
          item.imageFiles.slice(1).forEach((file: File) => formData.append('gallery_images', file));
        }
        formData.append('nutrition_serving_size', item.servingSize);
        formData.append('nutrition_calories', item.calories);
        formData.append('nutrition_total_fat', item.totalFat);
        formData.append('nutrition_saturated_fat', item.saturatedFat);
        formData.append('nutrition_trans_fat', item.transFat);
        formData.append('nutrition_cholesterol', item.cholesterol);
        formData.append('nutrition_sodium', item.sodium);
        formData.append('nutrition_total_carb', item.totalCarb);
        formData.append('nutrition_dietary_fiber', item.dietaryFiber);
        formData.append('nutrition_total_sugars', item.totalSugars);
        formData.append('nutrition_added_sugars', item.addedSugars);
        formData.append('nutrition_protein', item.protein);

        const created = await productService.createProduct(formData);
        addProduct(created);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to create product "${item.name}":`, err);
        const detail = err?.detail || err?.message || 'Failed to create product.';
        addToast('error', `Product #${i + 1} ("${item.name}") failed: ${detail}`, 'Validation / Server Error');
        setIsCreatingProduct(false);
        return;
      }
    }

    setIsCreatingProduct(false);

    if (successCount > 0) {
      addToast('success', `${successCount} chocolate product${successCount > 1 ? 's' : ''} created and saved successfully!`, 'Products Added');
      setProductAddedSuccess(true);
      setPendingBatchProducts([]);
      resetProductForm();
      setTimeout(() => {
        setProductAddedSuccess(false);
        setShowAddProductForm(false);
      }, 1200);
    }
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (isUpdatingProduct) return;

    setIsUpdatingProduct(true);
    try {
      const updated = await productService.updateProduct(editingProduct.id, {
        name: editingProduct.name,
        price: editingProduct.price,
        weight: editingProduct.weight,
        stock: editingProduct.stock,
        category_id: editingProduct.category_id || editingProduct.category,
        category: editingProduct.category,
        badge: editingProduct.badge,
        description: editingProduct.description,
        ingredients: editingProduct.ingredients,
        nutrition: editingProduct.nutrition,
      });
      if (editingProductImageFiles.length > 0) {
        const formData = new FormData();
        editingProductImageFiles.forEach(file => formData.append('images', file));
        await productService.updateProductImage(editingProduct.id, formData);
        window.location.reload();
        return;
      }
      if (updated && typeof updated === 'object' && updated.id) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? { ...p, ...updated } : p))
        );
      } else {
        const allProds: any = await productService.getProducts();
        const list = Array.isArray(allProds) ? allProds : (allProds?.items || []);
        setProducts(list);
      }
      setEditingProduct(null);
      setEditingProductImageFiles([]);
      setEditingProductImagePreviews([]);
      addToast('success', `Product "${editingProduct.name}" updated successfully.`, 'Product Updated');
    } catch (err: any) {
      console.error('Failed to update product:', err);
      addToast('error', err?.detail || err?.message || 'Failed to update product.', 'Update Error');
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  // --- Offline Sales State ---
  const [saleBasket, setSaleBasket] = useState<{ productName: string; quantity: number; totalPrice: number }[]>([]);
  const [manualSale, setManualSale] = useState({
    productName: 'Belgian Dark Truffle Bar',
    quantity: 1,
    totalPrice: 849,
    paymentMethod: 'Cash',
  });
  const [saleAddedSuccess, setSaleAddedSuccess] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Customers Inspector & Admin Orders State ---
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [inspectedCustomer, setInspectedCustomer] = useState<SystemUser | null>(null);
  const [inspectedCustomerDetails, setInspectedCustomerDetails] = useState<any | null>(null);
  const [inspectedCustomerLoading, setInspectedCustomerLoading] = useState(false);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  // --- Admin Site-Wide Orders State ---
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [orderFulfillmentFilter, setOrderFulfillmentFilter] = useState('ALL');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('ALL');

  // --- Testimonials & Contact Messages & Story Video States ---
  const [testimonialsList, setTestimonialsList] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [selectedContactMessage, setSelectedContactMessage] = useState<any | null>(null);
  const [newTestimonial, setNewTestimonial] = useState({
    author: '',
    title: '',
    text: '',
    rating: 5,
    initials: '',
  });
  const [testimonialAvatarFile, setTestimonialAvatarFile] = useState<File | null>(null);
  const [uploadingTestimonial, setUploadingTestimonial] = useState(false);
  const [storyVideoFile, setStoryVideoFile] = useState<File | null>(null);
  const [uploadingStoryVideo, setUploadingStoryVideo] = useState(false);
  const [storyVideoUrl, setStoryVideoUrl] = useState('');
  const [showAddTestimonialModal, setShowAddTestimonialModal] = useState(false);
  const [showUploadVideoModal, setShowUploadVideoModal] = useState(false);
  const [showAboutVideoCard, setShowAboutVideoCard] = useState(false);

  // --- Coupons State ---
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const initialCouponState = {
    code: '',
    name: '',
    description: '',
    discount_type: 'PERCENTAGE',
    discount_percent: 0,
    discount_amount: 0,
    maximum_discount_amount: 0,
    minimum_order_amount: 0,
    start_at: '',
    expires_at: '',
    usage_limit: 0,
    per_user_usage_limit: 1,
    eligibility_rule: 'ALL_USERS',
    eligibility_value: '',
    applicability: 'ENTIRE_STORE',
    applicable_ids: '',
    is_active: true,
  };
  const [newCoupon, setNewCoupon] = useState(initialCouponState);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [showCreateCouponForm, setShowCreateCouponForm] = useState(false);

  // --- Analytics State ---
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // =============================================================
  // CATEGORIES STATE
  // =============================================================
  const [categoriesList, setCategoriesList] = useState<AdminCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [categoryImageFile, setCategoryImageFile] = useState<File | null>(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState<string>('');
  const [editCategoryImageFile, setEditCategoryImageFile] = useState<File | null>(null);
  const [editCategoryImagePreview, setEditCategoryImagePreview] = useState<string>('');
  const [categorySuccess, setCategorySuccess] = useState(false);
  const [pendingBatchCategories, setPendingBatchCategories] = useState<any[]>([]);
  const categoryImageRef = useRef<HTMLInputElement>(null);
  const editCategoryImageRef = useRef<HTMLInputElement>(null);

  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: '',
    sort_order: 0,
    is_active: true,
  });

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const data = await categoryService.adminGetAllCategories();
      setCategoriesList(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateCategoryForm = (categoryData: { name: string; slug?: string }) => {
    const errors: Record<string, string> = {};
    const nameTrimmed = trimValue(categoryData.name);

    if (!isNonEmpty(nameTrimmed)) {
      errors.name = 'Category name is required and cannot be empty.';
    } else if (
      isDuplicate(categoriesList, 'name', nameTrimmed) ||
      pendingBatchCategories.some((c) => c.name.toLowerCase() === nameTrimmed.toLowerCase())
    ) {
      errors.name = 'A category with this name already exists in database or queue.';
    }

    setCategoryFormErrors(errors);
    return { isValid: Object.keys(errors).length === 0, errors, nameTrimmed };
  };

  const handleAddCategoryToBatch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const { isValid, nameTrimmed } = validateCategoryForm(newCategory);
    if (!isValid) {
      addToast('error', 'Please fix validation errors before adding category to batch list.', 'Validation Error');
      return;
    }

    const generatedSlug = newCategory.slug || nameTrimmed.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

    const item = {
      tempId: `cat-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: nameTrimmed,
      slug: generatedSlug,
      description: trimValue(newCategory.description || ''),
      sort_order: newCategory.sort_order || 0,
      is_active: newCategory.is_active,
    };

    setPendingBatchCategories((prev) => [...prev, item]);
    addToast('info', `Added "${nameTrimmed}" to pending category list (${pendingBatchCategories.length + 1} queued).`, 'Category Queued');
    setNewCategory({ name: '', slug: '', description: '', sort_order: 0, is_active: true });
    setCategoryImageFile(null);
    setCategoryImagePreview('');
  };

  const handleRemoveCategoryFromBatch = (tempId: string) => {
    setPendingBatchCategories((prev) => prev.filter((c) => c.tempId !== tempId));
    addToast('info', 'Category removed from batch list.', 'Removed');
  };

  const handleEditCategoryBatchItem = (item: any) => {
    setNewCategory({
      name: item.name,
      slug: item.slug,
      description: item.description,
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setPendingBatchCategories((prev) => prev.filter((c) => c.tempId !== item.tempId));
    addToast('info', `Loaded "${item.name}" into form for editing.`, 'Editing Queued Item');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentBatch = [...pendingBatchCategories];
    const nameTrimmed = trimValue(newCategory.name);

    if (nameTrimmed) {
      const { isValid } = validateCategoryForm(newCategory);
      if (!isValid) {
        addToast('error', 'Please fix category validation errors before submitting.', 'Validation Error');
        return;
      }
      const generatedSlug = newCategory.slug || nameTrimmed.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
      currentBatch.push({
        tempId: `cat-curr-${Date.now()}`,
        name: nameTrimmed,
        slug: generatedSlug,
        description: trimValue(newCategory.description || ''),
        sort_order: newCategory.sort_order || 0,
        is_active: newCategory.is_active,
      });
    }

    if (currentBatch.length === 0) {
      addToast('error', 'Please fill in category details or add categories to batch list before submitting.', 'Validation Error');
      return;
    }

    let successCount = 0;

    for (let i = 0; i < currentBatch.length; i++) {
      const item = currentBatch[i];
      try {
        const formData = new FormData();
        formData.append('name', item.name);
        if (item.slug) formData.append('slug', item.slug);
        if (item.description) formData.append('description', item.description);
        formData.append('sort_order', String(item.sort_order));
        formData.append('is_active', String(item.is_active));
        if (categoryImageFile && i === currentBatch.length - 1) {
          formData.append('image', categoryImageFile);
        }

        await categoryService.adminCreateCategory(formData);
        successCount++;
      } catch (err: any) {
        console.error(`Failed to create category "${item.name}":`, err);
        const detail = err?.detail || err?.message || 'Failed to create category.';
        addToast('error', `Category #${i + 1} ("${item.name}") failed: ${detail}`, 'Validation / Server Error');
        return;
      }
    }

    if (successCount > 0) {
      await fetchCategories();
      setNewCategory({ name: '', slug: '', description: '', sort_order: 0, is_active: true });
      setCategoryImageFile(null);
      setCategoryImagePreview('');
      setPendingBatchCategories([]);
      setCategorySuccess(true);
      setCategoryFormErrors({});
      addToast('success', `${successCount} categor${successCount > 1 ? 'ies' : 'y'} created and saved successfully!`, 'Categories Added');
      setTimeout(() => {
        setCategorySuccess(false);
        setShowAddCategoryForm(false);
      }, 1200);
    }
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      if (editCategoryImageFile) {
        const fd = new FormData();
        fd.append('image', editCategoryImageFile);
        const res = await categoryService.adminUploadCategoryImage(editingCategory.id, fd);
        editingCategory.image_url = res.image_url;
      }
      await categoryService.adminUpdateCategory(editingCategory.id, {
        name: trimValue(editingCategory.name),
        slug: trimValue(editingCategory.slug || ''),
        description: trimValue(editingCategory.description || ''),
        sort_order: editingCategory.sort_order,
        is_active: editingCategory.is_active,
      });
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === editingCategory.id ? { ...editingCategory } : c))
      );
      addToast('success', `Category "${editingCategory.name}" updated successfully.`, 'Category Updated');
      setEditingCategory(null);
      setEditCategoryImageFile(null);
      setEditCategoryImagePreview('');
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to update category.', 'Error');
    }
  };

  const handleDeleteCategory = (id: string, name: string) => {
    openConfirmation(
      'Delete Category',
      `Are you sure you want to delete category "${name}"? This action cannot be undone.`,
      async () => {
        try {
          await categoryService.adminDeleteCategory(id);
          setCategoriesList((prev) => prev.filter((c) => c.id !== id));
          addToast('success', `Category "${name}" deleted successfully.`, 'Category Deleted');
        } catch (err: any) {
          addToast('error', err?.detail || err?.message || 'Failed to delete category.', 'Error');
        }
      }
    );
  };

  const handleToggleCategoryStatus = async (cat: AdminCategory) => {
    try {
      const updated = await categoryService.adminUpdateCategory(cat.id, { is_active: !cat.is_active });
      setCategoriesList((prev) => prev.map((c) => (c.id === cat.id ? updated : c)));
    } catch (err: any) {
      alert('Failed to toggle category status.');
    }
  };

  const handleEditBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    try {
      // 1. Update text fields via PATCH
      await updateBanner(editingBanner.id, editingBanner);
      // 2. If a new image was selected, upload it to Cloudinary via the image endpoint
      if (editingBannerImageFile) {
        const fd = new FormData();
        fd.append('image', editingBannerImageFile);
        await adminService.uploadBannerImage(editingBanner.id, fd);
        if (refreshBanners) await refreshBanners();
      }
      setEditingBanner(null);
      setEditingBannerImageFile(null);
    } catch (error) {
      console.error('Failed to update banner:', error);
      alert('Failed to update banner.');
    }
  };

  const handleAutoFetchEditReelMeta = async (url: string) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    if (!trimmed.includes('instagram.com')) {
      setEditReelErrorMsg('Please enter a valid Instagram URL (e.g. https://www.instagram.com/reel/...)');
      return;
    }
    setIsFetchingEditReelMeta(true);
    setEditReelSuccessMsg('');
    setEditReelErrorMsg('');
    try {
      const meta = await adminService.fetchReelMeta(trimmed);
      setEditingReel((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          instagram_url: meta.instagram_url || trimmed,
          account_name: meta.account_name || prev.account_name || prev.accountName || '@choviqueofficial',
          video_url: meta.video_url || prev.video_url || prev.videoUrl,
        };
      });
      setEditReelSuccessMsg(`✓ Successfully fetched reel video for ${meta.account_name || 'creator'}!`);
      addToast('success', `Found reel video for ${meta.account_name}`, 'Reel Video Updated');
    } catch (err: any) {
      console.warn('Auto fetch edit reel meta error:', err);
      const msg = err?.detail || err?.message || 'Could not auto-fetch from Instagram. You can upload custom video below.';
      setEditReelErrorMsg(msg);
      addToast('info', msg, 'Auto-Fetch Notice');
    } finally {
      setIsFetchingEditReelMeta(false);
    }
  };

  const handleEditReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReel) return;
    setEditReelErrorMsg('');
    setIsUpdatingReel(true);
    try {
      const fd = new FormData();
      const igUrl = editingReel.instagram_url || editingReel.instagramUrl || '';
      const accName = editingReel.account_name || editingReel.accountName || '@choviqueofficial';
      const vidUrl = editingReel.video_url || editingReel.videoUrl || '';

      fd.append('instagram_url', igUrl);
      fd.append('account_name', accName);
      if (vidUrl) {
        fd.append('video_url', vidUrl);
      }
      fd.append('title', accName || 'Instagram Reel');
      fd.append('likes', '0');
      fd.append('comments', '0');
      fd.append('views', '0 views');
      if (editingReelVideoFile) fd.append('video', editingReelVideoFile);

      const updated = await adminService.updateReel(editingReel.id, fd);
      setCmsReels((prev: any[]) => prev.map((r) => (
        r.id === editingReel.id ? {
          ...r,
          ...updated,
          videoUrl: updated.videoUrl || updated.video_url || vidUrl,
          instagramUrl: updated.instagramUrl || updated.instagram_url || igUrl,
          accountName: updated.accountName || updated.account_name || accName,
        } : r
      )));
      setEditingReel(null);
      setEditingReelVideoFile(null);
      setEditReelSuccessMsg('');
      setEditReelErrorMsg('');
      addToast('success', 'Instagram reel updated successfully!', 'Reel Saved');
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to update reel. Please check your network and try again.';
      setEditReelErrorMsg(msg);
      addToast('error', msg, 'Update Failed');
    } finally {
      setIsUpdatingReel(false);
    }
  };

  const fetchAdminOrders = async (fulfillment = orderFulfillmentFilter, payment = orderPaymentFilter) => {
    setAdminOrdersLoading(true);
    try {
      const data: any = await adminService.getAllOrders({
        status: fulfillment,
        payment_status: payment,
      });
      const ordersList = Array.isArray(data) ? data : (data?.items || []);
      setAdminOrders(ordersList);
    } catch (err) {
      console.error('Failed to fetch site-wide admin orders:', err);
      setAdminOrders([]);
    } finally {
      setAdminOrdersLoading(false);
    }
  };

  const handleSelectCustomer = async (cust: SystemUser) => {
    setInspectedCustomer(cust);
    setInspectedCustomerDetails(null);
    setInspectedCustomerLoading(true);
    try {
      const details = await adminService.getCustomerDetails(cust.id);
      setInspectedCustomerDetails(details);
    } catch (err) {
      console.error('Failed to fetch customer details:', err);
    } finally {
      setInspectedCustomerLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, payload: { status?: string; payment_status?: string }) => {
    try {
      const updated = await adminService.updateOrderStatus(orderId, payload);
      setAdminOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (inspectedCustomerDetails) {
        setInspectedCustomerDetails((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            recent_orders: prev.recent_orders.map((o: any) => (o.id === orderId ? updated : o)),
          };
        });
      }
    } catch (err: any) {
      alert(err?.detail || err?.message || 'Failed to update order status');
    }
  };

  const fetchExtraAdminData = () => {
    adminService.getUsers().then((users) => setSystemUsers(users)).catch((err) => console.error(err));
    adminService.getContactMessages().then((msgs) => setContactMessages(msgs)).catch(() => { });
    adminService.getStoryVideo().then((res) => { if (res?.video_url) setStoryVideoUrl(res.video_url); }).catch(() => { });
    adminService.getCoupons().then((coupons) => setCouponsList(coupons)).catch(() => { });
    adminService.getStats().then(stats => setDashboardStats(stats)).catch(() => {});
    fetchAdminOrders();
  };
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const codeTrimmed = trimValue(newCoupon.code).toUpperCase();
    const descTrimmed = trimValue(newCoupon.description);

    if (!isNonEmpty(codeTrimmed)) {
      errors.code = 'Coupon code is required and cannot be empty.';
    } else if (isDuplicate(couponsList, 'code', codeTrimmed)) {
      errors.code = 'A coupon with this code already exists.';
    }

    if (!isNonEmpty(descTrimmed)) {
      errors.description = 'Coupon description is required.';
    }

    const discountCheck = isValidNumber(newCoupon.discount_percent, 1, 100);
    if (!discountCheck.isValid) {
      errors.discount_percent = discountCheck.error || 'Discount percentage must be between 1% and 100%.';
    }

    const minSpendCheck = isValidNumber(newCoupon.minimum_order_amount, 0);
    if (!minSpendCheck.isValid) {
      errors.minimum_order_amount = minSpendCheck.error || 'Minimum spend cannot be negative.';
    }

    const expiryCheck = isValidFutureDate(newCoupon.expires_at);
    if (!expiryCheck.isValid) {
      errors.expires_at = expiryCheck.error || 'Valid future expiry date is required.';
    }

    setCouponFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      addToast('error', 'Please fix coupon validation errors before submitting.', 'Validation Error');
      return;
    }

    try {
      const payload = {
        ...newCoupon,
        code: codeTrimmed,
        description: descTrimmed,
        applicable_ids: typeof newCoupon.applicable_ids === 'string'
          ? newCoupon.applicable_ids.split(',').map(s=>s.trim()).filter(Boolean)
          : newCoupon.applicable_ids
      };
      const created = await adminService.createCoupon(payload);
      setCouponsList([created, ...couponsList]);
      setNewCoupon(initialCouponState);
      setCouponFormErrors({});
      addToast('success', `Coupon "${codeTrimmed}" created successfully!`, 'Coupon Created');
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to create coupon', 'Error');
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    try {
      const payload = {
        ...editingCoupon,
        applicable_ids: typeof editingCoupon.applicable_ids === 'string'
          ? editingCoupon.applicable_ids.split(',').map((s: string) => s.trim()).filter(Boolean)
          : editingCoupon.applicable_ids
      };
      const updated = await adminService.updateCoupon(editingCoupon.code, payload);
      setCouponsList((prev) => prev.map((c) => (c.code === editingCoupon.code ? updated : c)));
      addToast('success', `Coupon "${editingCoupon.code}" updated successfully.`, 'Coupon Updated');
      setEditingCoupon(null);
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to update coupon', 'Error');
    }
  };

  const handleDeleteCoupon = (code: string) => {
    openConfirmation(
      'Delete Coupon',
      `Are you sure you want to delete coupon code "${code}"? Users will no longer be able to use it.`,
      async () => {
        try {
          await adminService.deleteCoupon(code);
          setCouponsList((prev) => prev.filter((c) => c.code !== code));
          addToast('success', `Coupon "${code}" deleted successfully.`, 'Coupon Deleted');
        } catch (err: any) {
          addToast('error', err?.detail || err?.message || 'Failed to delete coupon.', 'Error');
        }
      }
    );
  };



  const [siteStats, setSiteStats] = useState({
    happy_customers: 50000,
    products_available: 120,
    orders_delivered: 1500,
    customer_rating_percent: 98,
  });
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [statsSavedSuccess, setStatsSavedSuccess] = useState(false);
  const [isReplacingBannerImage, setIsReplacingBannerImage] = useState(false);

  const fetchSiteStats = () => {
    apiGet<any>('/home/stats')
      .then((data) => {
        if (data && typeof data === 'object') {
          setSiteStats({
            happy_customers: data.happy_customers ?? 50000,
            products_available: data.products_available ?? data.unique_flavors ?? 120,
            orders_delivered: data.orders_delivered ?? data.countries_shipped ?? 1500,
            customer_rating_percent: data.customer_rating_percent ?? data.five_star_reviews_percent ?? 98,
          });
        }
      })
      .catch(() => {});
  };

  const handleSaveSiteStatsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingStats(true);
    try {
      const payload = {
        happy_customers: siteStats.happy_customers,
        products_available: siteStats.products_available,
        orders_delivered: siteStats.orders_delivered,
        customer_rating_percent: siteStats.customer_rating_percent,
        unique_flavors: siteStats.products_available,
        countries_shipped: siteStats.orders_delivered,
        five_star_reviews_percent: siteStats.customer_rating_percent,
      };
      await adminService.updateSiteStats(payload);
      setStatsSavedSuccess(true);
      addToast('success', 'Platform Counter Stats updated and saved to database!', 'Stats Updated');
      setTimeout(() => setStatsSavedSuccess(false), 3000);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to save counter stats', 'Error');
    } finally {
      setIsSavingStats(false);
    }
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      addToast('error', 'Please select a valid image file (JPEG, PNG, WEBP, GIF).', 'Invalid Format');
      if (bannerFileRef.current) bannerFileRef.current.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'Image size must be under 10MB.', 'File Too Large');
      if (bannerFileRef.current) bannerFileRef.current.value = '';
      return;
    }

    const currentBanner = banners[selectedSlideIdx];
    if (!currentBanner || !currentBanner.id) {
      addToast('error', 'Please select a valid hero slide to replace image.', 'Error');
      if (bannerFileRef.current) bannerFileRef.current.value = '';
      return;
    }

    const targetBannerId = currentBanner.id;

    setIsReplacingBannerImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await adminService.uploadBannerImage(targetBannerId, formData);

      // Immediately update local banner image state without reordering
      if (updateBanner) {
        updateBanner(targetBannerId, { image: res.image_url });
      }

      addToast('success', 'Hero slide image replaced and saved to database successfully!', 'Image Replaced');

      // Refresh banners list from backend DB
      if (refreshBanners) {
        await refreshBanners();
      }

      // Ensure selected slide index stays matched to the target banner ID
      if (banners && banners.length > 0) {
        const foundIdx = banners.findIndex((b: any) => b.id === targetBannerId);
        if (foundIdx !== -1) {
          setSelectedSlideIdx(foundIdx);
        }
      }
    } catch (err: any) {
      console.error('Failed to replace banner image:', err);
      addToast('error', err?.detail || err?.message || 'Failed to replace banner slide image.', 'Upload Error');
    } finally {
      setIsReplacingBannerImage(false);
      if (bannerFileRef.current) bannerFileRef.current.value = '';
    }
  };

  // --- Instagram Reels State & Handlers ---
  const [cmsReels, setCmsReels] = useState<any[]>([]);
  const [showAddReelModal, setShowAddReelModal] = useState(false);
  const [newReelData, setNewReelData] = useState({ instagram_url: '', account_name: '@choviqueofficial', video_url: '' });
  const [newReelVideoFile, setNewReelVideoFile] = useState<File | null>(null);
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const [isFetchingReelMeta, setIsFetchingReelMeta] = useState(false);
  const [fetchReelSuccessMsg, setFetchReelSuccessMsg] = useState('');
  const [fetchReelErrorMsg, setFetchReelErrorMsg] = useState('');
  const [createReelErrorMsg, setCreateReelErrorMsg] = useState('');

  const fetchCmsReels = () => {
    apiGet<any[]>('/home/reels')
      .then((data) => { if (Array.isArray(data)) setCmsReels(data); })
      .catch(() => {});
  };

  const handleAutoFetchReelMeta = async (url: string) => {
    const trimmed = (url || '').trim();
    if (!trimmed) return;
    if (!trimmed.includes('instagram.com')) {
      setFetchReelErrorMsg('Please enter a valid Instagram URL (e.g. https://www.instagram.com/reel/...)');
      return;
    }
    setIsFetchingReelMeta(true);
    setFetchReelSuccessMsg('');
    setFetchReelErrorMsg('');
    try {
      const meta = await adminService.fetchReelMeta(trimmed);
      setNewReelData((prev) => ({
        ...prev,
        instagram_url: meta.instagram_url || trimmed,
        account_name: meta.account_name || prev.account_name,
        video_url: meta.video_url || prev.video_url,
      }));
      setFetchReelSuccessMsg(`✓ Successfully fetched details for ${meta.account_name || 'creator'}!`);
      addToast('success', `Found reel video for ${meta.account_name}`, 'Instagram Details Fetched');
    } catch (err: any) {
      console.warn('Auto fetch reel meta warning:', err);
      const msg = err?.detail || err?.message || 'Could not auto-fetch from Instagram. You can still publish or upload video manually.';
      setFetchReelErrorMsg(msg);
      addToast('info', msg, 'Auto-Fetch Notice');
    } finally {
      setIsFetchingReelMeta(false);
    }
  };

  const handleCreateReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateReelErrorMsg('');
    if (!newReelData.instagram_url && !newReelData.video_url && !newReelVideoFile) {
      setCreateReelErrorMsg('Please enter an Instagram Reel URL or select a video file.');
      return;
    }
    setIsCreatingReel(true);
    const formData = new FormData();
    formData.append('instagram_url', newReelData.instagram_url || '');
    formData.append('account_name', newReelData.account_name || '@choviqueofficial');
    if (newReelData.video_url) {
      formData.append('video_url', newReelData.video_url);
    }
    formData.append('title', newReelData.account_name || 'Instagram Reel');
    formData.append('likes', '0');
    formData.append('comments', '0');
    formData.append('views', '0 views');
    if (newReelVideoFile) formData.append('video', newReelVideoFile);

    try {
      await adminService.createReel(formData);
      fetchCmsReels();
      setShowAddReelModal(false);
      setNewReelData({ instagram_url: '', account_name: '@choviqueofficial', video_url: '' });
      setNewReelVideoFile(null);
      setFetchReelSuccessMsg('');
      setFetchReelErrorMsg('');
      setCreateReelErrorMsg('');
      addToast('success', 'Instagram Reel published successfully!', 'Reel Added');
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Failed to publish reel video. Please try again.';
      setCreateReelErrorMsg(msg);
      addToast('error', msg, 'Publishing Failed');
    } finally {
      setIsCreatingReel(false);
    }
  };

  const handleDeleteReelSubmit = async (reelId: string, title: string) => {
    if (!window.confirm(`Delete reel video "${title}"?`)) return;
    try {
      await adminService.deleteReel(reelId);
      setCmsReels((prev) => prev.filter((r) => r.id !== reelId));
    } catch (err: any) {
      alert('Failed to delete reel');
    }
  };

  // --- Banner/Carousel State & Handlers ---
  const [selectedSlideIdx, setSelectedSlideIdx] = useState(0);
  const selectedBanner = banners && banners.length > 0 ? (banners[selectedSlideIdx] || banners[0]) : null;
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [newBannerData, setNewBannerData] = useState({
    title: '',
    subtitle: '',
    tag: '',
    buttonText: 'Explore Collection',
    link: '/products',
    image_url: '',
  });
  const [newBannerImageFile, setNewBannerImageFile] = useState<File | null>(null);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);
  const [bannerCreateError, setBannerCreateError] = useState('');
  const newBannerFileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateNewBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerData.title.trim()) {
      setBannerCreateError('Please enter a heading/title for the banner slide.');
      return;
    }
    setIsCreatingBanner(true);
    setBannerCreateError('');
    try {
      const formData = new FormData();
      formData.append('title', newBannerData.title);
      if (newBannerData.subtitle) formData.append('subtitle', newBannerData.subtitle);
      if (newBannerData.tag) formData.append('tag', newBannerData.tag);
      if (newBannerData.buttonText) formData.append('button_text', newBannerData.buttonText);
      if (newBannerData.link) formData.append('link', newBannerData.link);
      if (newBannerImageFile) {
        formData.append('image', newBannerImageFile);
      } else if (newBannerData.image_url) {
        formData.append('image_url', newBannerData.image_url);
      }

      const created = await adminService.createBanner(formData);
      if (addBanner) addBanner(created);
      if (refreshBanners) await refreshBanners();

      setNewBannerData({
        title: '',
        subtitle: '',
        tag: '',
        buttonText: 'Explore Collection',
        link: '/products',
        image_url: '',
      });
      setNewBannerImageFile(null);
      setShowAddBannerModal(false);
    } catch (err: any) {
      setBannerCreateError(err?.message || 'Failed to create banner slide.');
    } finally {
      setIsCreatingBanner(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this hero banner slide?')) return;
    try {
      await adminService.deleteBanner(bannerId);
      if (deleteBannerState) deleteBannerState(bannerId);
      if (refreshBanners) await refreshBanners();
      setSelectedSlideIdx(0);
    } catch (err: any) {
      alert('Failed to delete banner.');
    }
  };

  // Testimonial Moderation & Review State
  const [reviewSubTab, setReviewSubTab] = useState<'product_reviews' | 'site_testimonials'>('product_reviews');
  const [testimonialStatusFilter, setTestimonialStatusFilter] = useState<string>('all');
  const [productReviewStatusFilter, setProductReviewStatusFilter] = useState<string>('all');
  const [productReviewsPage, setProductReviewsPage] = useState<number>(1);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [selectedReviewMediaModal, setSelectedReviewMediaModal] = useState<{ type: 'image' | 'video'; url: string; title?: string } | null>(null);
  const [reviewActionInProgress, setReviewActionInProgress] = useState<string | null>(null);

  const fetchAdminTestimonials = (status?: string) => {
    adminService.adminGetTestimonials(status)
      .then(data => { if (Array.isArray(data)) setTestimonialsList(data); })
      .catch((err) => { console.error('Failed to load admin testimonials:', err); });
  };

  const fetchAdminReviews = () => {
    setReviewsLoading(true);
    adminService.adminGetReviews()
      .then(data => { if (Array.isArray(data)) setReviewsList(data); })
      .catch((err) => { console.error('Failed to load admin reviews:', err); })
      .finally(() => { setReviewsLoading(false); });
  };

  const handleApproveProductReview = async (id: string, featureOnHome: boolean = false) => {
    setReviewActionInProgress(id);
    try {
      await adminService.adminUpdateReviewStatus(id, 'approved', featureOnHome);
      addToast(
        'success',
        featureOnHome
          ? 'Review approved & featured on Landing Page (+ Product Page)!'
          : 'Review approved and published to Product Page only.',
        'Review Approved'
      );
      fetchAdminReviews();
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to approve review.', 'Error');
    } finally {
      setReviewActionInProgress(null);
    }
  };

  const handleToggleFeaturedOnHome = async (id: string, currentFeatured: boolean) => {
    setReviewActionInProgress(id);
    const newFeatured = !currentFeatured;
    try {
      await adminService.adminUpdateReviewStatus(id, 'approved', newFeatured);
      addToast(
        'info',
        newFeatured
          ? 'Review is now featured on the Landing Page reviews section!'
          : 'Review removed from Landing Page (remains visible on Product Page).',
        newFeatured ? 'Featured on Landing Page' : 'Landing Page Updated'
      );
      fetchAdminReviews();
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to update review destination.', 'Error');
    } finally {
      setReviewActionInProgress(null);
    }
  };

  const handleRejectProductReview = async (id: string) => {
    setReviewActionInProgress(id);
    try {
      await adminService.adminUpdateReviewStatus(id, 'rejected');
      addToast('info', 'Customer review marked as rejected.', 'Review Rejected');
      fetchAdminReviews();
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to reject review.', 'Error');
    } finally {
      setReviewActionInProgress(null);
    }
  };

  const handleDeleteProductReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this product review?')) return;
    setReviewActionInProgress(id);
    try {
      await adminService.adminDeleteReview(id);
      addToast('success', 'Customer review permanently deleted.', 'Review Deleted');
      fetchAdminReviews();
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to delete review.', 'Error');
    } finally {
      setReviewActionInProgress(null);
    }
  };

  useEffect(() => {
    fetchExtraAdminData();
    fetchSiteStats();
    fetchCmsReels();
    fetchCategories();
    fetchAdminTestimonials(testimonialStatusFilter);
    fetchAdminReviews();
  }, []);

  // Compute dynamic category options from database categories (single source of truth)
  const dynamicCategoryOptions = React.useMemo(() => {
    const activeCategories = (categoriesList || []).filter((cat) => cat.is_active !== false);
    if (activeCategories.length > 0) {
      return activeCategories.map((cat) => ({
        value: cat.id,
        label: cat.name,
      }));
    }
    return [
      { value: '', label: 'No categories available' }
    ];
  }, [categoriesList]);

  useEffect(() => {
    if (dynamicCategoryOptions.length > 0 && dynamicCategoryOptions[0].value) {
      if (!newProd.category || !dynamicCategoryOptions.some(o => o.value === newProd.category)) {
        setNewProd(prev => ({ ...prev, category: dynamicCategoryOptions[0].value as any }));
      }
    } else if (dynamicCategoryOptions.length > 0 && !dynamicCategoryOptions[0].value) {
      setNewProd(prev => ({ ...prev, category: '' as any }));
    }
  }, [dynamicCategoryOptions]);

  const handleStatusFilterChange = (status: string) => {
    setTestimonialStatusFilter(status);
    fetchAdminTestimonials(status);
  };

  const handleApproveTestimonial = async (id: string) => {
    try {
      await adminService.updateTestimonialStatus(id, 'approved');
      fetchAdminTestimonials(testimonialStatusFilter);
    } catch (err: any) {
      alert(err?.message || 'Failed to approve testimonial');
    }
  };

  const handleRejectTestimonial = async (id: string) => {
    try {
      await adminService.updateTestimonialStatus(id, 'rejected');
      fetchAdminTestimonials(testimonialStatusFilter);
    } catch (err: any) {
      alert(err?.message || 'Failed to reject testimonial');
    }
  };

  const handleAddTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.author || !newTestimonial.text) {
      addToast('error', 'Please fill in Author Name and Testimonial Quote Text.', 'Validation Error');
      return;
    }
    setUploadingTestimonial(true);

    const formData = new FormData();
    formData.append('author', newTestimonial.author.trim());
    formData.append('title', newTestimonial.title?.trim() || 'Chocolate Enthusiast');
    formData.append('text', newTestimonial.text.trim());
    formData.append('rating', String(newTestimonial.rating || 5));
    formData.append('initials', newTestimonial.initials || newTestimonial.author.trim().slice(0, 2).toUpperCase());
    if (testimonialAvatarFile) {
      formData.append('avatar', testimonialAvatarFile);
    }

    try {
      await adminService.createTestimonial(formData);
      addToast('success', `Testimonial by "${newTestimonial.author}" created successfully!`, 'Testimonial Created');
      setNewTestimonial({ author: '', title: '', text: '', rating: 5, initials: '' });
      setTestimonialAvatarFile(null);
      setShowAddTestimonialModal(false);
      fetchAdminTestimonials(testimonialStatusFilter);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to create testimonial', 'Creation Error');
    } finally {
      setUploadingTestimonial(false);
    }
  };

  const handleDeleteTestimonial = async (id: string) => {
    if (!window.confirm('Delete this testimonial permanently?')) return;
    try {
      await adminService.deleteTestimonial(id);
      addToast('success', 'Testimonial deleted successfully.', 'Deleted');
      fetchAdminTestimonials(testimonialStatusFilter);
    } catch (err: any) {
      addToast('error', 'Failed to delete testimonial', 'Error');
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Delete this product review? The product average rating will be recalculated.')) return;
    try {
      await adminService.adminDeleteReview(id);
      fetchAdminReviews();
    } catch (err: any) {
      alert('Failed to delete product review');
    }
  };

  const handleDeleteContactMessage = async (id: string) => {
    if (!window.confirm('Delete this customer inquiry permanently?')) return;
    try {
      await adminService.deleteContactMessage(id);
      setContactMessages(prev => prev.filter(m => m.id !== id));
      if (selectedContactMessage?.id === id) {
        setSelectedContactMessage(null);
      }
      addToast('success', 'Customer contact message deleted successfully.', 'Message Deleted');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to delete contact message', 'Error');
    }
  };

  const handleUploadStoryVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyVideoFile) {
      addToast('error', 'Please select a video file first.', 'File Required');
      return;
    }

    // Video format validation
    const validExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
    const fileName = storyVideoFile.name.toLowerCase();
    const isValidFormat = validExtensions.some((ext) => fileName.endsWith(ext)) || storyVideoFile.type.startsWith('video/');

    if (!isValidFormat) {
      addToast('error', 'Unsupported video format. Please upload an MP4, WEBM, OGG, or MOV video file.', 'Invalid Format');
      return;
    }

    // Video size validation (Max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (storyVideoFile.size > MAX_SIZE) {
      addToast('error', 'File size exceeds 100MB limit. Please upload a smaller video file.', 'File Too Large');
      return;
    }

    setUploadingStoryVideo(true);
    const formData = new FormData();
    formData.append('video', storyVideoFile);

    try {
      const result = await adminService.uploadStoryVideo(formData);
      setStoryVideoUrl(result.video_url);
      addToast('success', 'Our Story process video updated successfully!', 'Video Updated');
      setStoryVideoFile(null);
      setShowUploadVideoModal(false);
      setShowAboutVideoCard(false);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to upload video.', 'Upload Error');
    } finally {
      setUploadingStoryVideo(false);
    }
  };

  const handleDeleteStoryVideo = async () => {
    if (!window.confirm('Reset Our Story crafting video to default?')) return;
    try {
      const res = await adminService.deleteStoryVideo();
      setStoryVideoUrl(res.video_url);
      addToast('success', 'Crafting video reset to default.', 'Video Reset');
    } catch (err: any) {
      addToast('error', 'Failed to reset video.', 'Error');
    }
  };

  // Customer Support contact details state
  const [supportContactData, setSupportContactData] = useState({
    phone: '+91 83098 54870',
    whatsapp: '+91 83098 54870',
    email: 'support@chovique.com',
    support_hours: 'Mon - Sat: 10:00 AM - 8:00 PM | Sunday: 11:00 AM - 6:00 PM',
    address: '42, MG Road, Indiranagar, Bangalore, Karnataka 560038',
  });
  const [supportFormData, setSupportFormData] = useState({
    phone: '+91 83098 54870',
    whatsapp: '+91 83098 54870',
    email: 'support@chovique.com',
    support_hours: 'Mon - Sat: 10:00 AM - 8:00 PM | Sunday: 11:00 AM - 6:00 PM',
    address: '42, MG Road, Indiranagar, Bangalore, Karnataka 560038',
  });
  const [showEditSupportModal, setShowEditSupportModal] = useState(false);
  const [updatingContact, setUpdatingContact] = useState(false);

  const openEditSupportModal = () => {
    setSupportFormData({ ...supportContactData });
    setShowEditSupportModal(true);
  };

  useEffect(() => {
    adminService.getContactInfo().then((res) => {
      if (res) {
        const initial = {
          phone: res.phone || '+91 83098 54870',
          whatsapp: res.whatsapp || res.phone || '+91 83098 54870',
          email: res.email || 'support@chovique.com',
          support_hours: res.support_hours || 'Mon - Sat: 10:00 AM - 8:00 PM | Sunday: 11:00 AM - 6:00 PM',
          address: res.address || '42, MG Road, Indiranagar, Bangalore, Karnataka 560038',
        };
        setSupportContactData(initial);
        setSupportFormData(initial);
      }
    }).catch(() => { });
  }, []);

  const handleUpdateSupportContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneTrim = (supportFormData.phone || '').trim();
    const whatsappTrim = (supportFormData.whatsapp || '').trim();
    const emailTrim = (supportFormData.email || '').trim();
    const hoursTrim = (supportFormData.support_hours || '').trim();
    const addressTrim = (supportFormData.address || '').trim();

    if (!phoneTrim) {
      addToast('error', 'Customer Support Phone is required.', 'Validation Error');
      return;
    }
    if (!whatsappTrim) {
      addToast('error', 'WhatsApp Support Number is required.', 'Validation Error');
      return;
    }
    if (!emailTrim) {
      addToast('error', 'Customer Support Email is required.', 'Validation Error');
      return;
    }
    if (!hoursTrim) {
      addToast('error', 'Support Hours are required.', 'Validation Error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      addToast('error', 'Please enter a valid email address.', 'Validation Error');
      return;
    }

    const phoneRegex = /^(\+91[\-\s]?)?[0]?[6-9]\d{9}$|^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(phoneTrim)) {
      addToast('error', 'Please enter a valid phone number (e.g. +91 9876543210).', 'Validation Error');
      return;
    }
    if (!phoneRegex.test(whatsappTrim)) {
      addToast('error', 'Please enter a valid WhatsApp number (e.g. +91 9876543210).', 'Validation Error');
      return;
    }

    setUpdatingContact(true);
    try {
      await adminService.updateContactInfo({
        phone: phoneTrim,
        whatsapp: whatsappTrim,
        email: emailTrim,
        support_hours: hoursTrim,
        address: addressTrim,
      });
      const updated = {
        phone: phoneTrim,
        whatsapp: whatsappTrim,
        email: emailTrim,
        support_hours: hoursTrim,
        address: addressTrim,
      };
      setSupportContactData(updated);
      setSupportFormData(updated);
      setShowEditSupportModal(false);
      addToast('success', 'Customer Support details updated successfully! Updated live on customer contact page.', 'Details Saved');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update Customer Support details.', 'Update Error');
    } finally {
      setUpdatingContact(false);
    }
  };


  // Trigger file select dialog
  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  /**
   * Handle CSV file upload for bulk offline sales import.
   * Sends the raw CSV file to the backend as multipart/form-data.
   * All CSV parsing is handled server-side.
   */
  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setImporting(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const result = await adminService.importOfflineSales(formData);
      setImportSuccess(true);
      console.log(`Imported ${result.imported} sales records, skipped ${result.skipped}.`);
      // Refresh offline sales list from backend
      adminService.getOfflineSales()
        .then((sales) => setOfflineSales(sales))
        .catch(() => { });
      setTimeout(() => setImportSuccess(false), 4000);
    } catch (err) {
      console.error('CSV upload error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload CSV file.';
      alert(msg);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle manual sales entry - Add to local basket
  const handleAddToBasket = (e: React.FormEvent) => {
    e.preventDefault();
    setSaleBasket(prev => [
      ...prev,
      {
        productName: manualSale.productName,
        quantity: manualSale.quantity,
        totalPrice: manualSale.totalPrice,
      }
    ]);
    // Reset selection quantity
    const selectedProd = products.find(p => p.name === manualSale.productName);
    const price = selectedProd ? selectedProd.price : 0;
    setManualSale(prev => ({
      ...prev,
      quantity: 1,
      totalPrice: price,
    }));
  };

  // Remove item from local basket
  const handleRemoveFromBasket = (index: number) => {
    setSaleBasket(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle manual batch sales logging — calls adminService.addOfflineSale for each basket item
  const handleLogTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleBasket.length === 0) {
      alert('Please add at least one product to the basket first.');
      return;
    }

    try {
      for (const item of saleBasket) {
        const created = await adminService.addOfflineSale({
          product_name: item.productName,
          quantity: item.quantity,
          total_price: item.totalPrice,
          payment_method: manualSale.paymentMethod,
        });
        addOfflineSale({
          productName: created.productName,
          quantity: created.quantity,
          totalPrice: created.totalPrice,
          paymentMethod: created.paymentMethod,
        });
      }
      setSaleBasket([]);
      setSaleAddedSuccess(true);
      setTimeout(() => setSaleAddedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to log transaction:', err);
      const msg = err instanceof Error ? err.message : 'Failed to log sales.';
      alert(msg);
    }
  };

  // Specific Customer Inspection Details
  const getCustomerOrders = (customerEmail: string) => {
    const nameToMatch = inspectedCustomer ? inspectedCustomer.name.toLowerCase() : '';
    return orders.filter((o: any) =>
      o.shippingAddress.name.toLowerCase() === nameToMatch ||
      o.shippingAddress.phone.includes('83098') // Fallback matching
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)' }}>
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={handleTabNavigation} onRequestLogout={() => setShowLogoutConfirmModal(true)} />

      {/* Main Admin Content box */}
      <div className="admin-workspace">
        {/* Top-Right Admin Header Bar */}
        <div className="admin-header-actions">
          {/* Notification Bell Dropdown - Desktop only; on mobile it sits inside the top navbar beside Admin */}
          <div className="desktop-only-header-notification">
            <NotificationHeaderDropdown onNavigateTab={handleTabNavigation} isSuperadmin={false} />
          </div>

          {/* View Home Button */}
          <button
            className="view-home-btn"
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '42px',
              padding: '0 14px',
              borderRadius: '10px',
              background: 'rgba(20, 16, 13, 0.9)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              cursor: 'pointer',
              color: '#f5efe6',
              fontSize: '0.84rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.6)';
              e.currentTarget.style.background = 'rgba(30, 24, 19, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.3)';
              e.currentTarget.style.background = 'rgba(20, 16, 13, 0.9)';
            }}
            title="View Public Site Homepage"
            aria-label="View Home"
          >
            <Home size={16} color="#c9a84c" />
            <span>View Home</span>
          </button>

          {/* Admin User Profile Dropdown Menu */}
          <div style={{ flexShrink: 0 }}>
            <AdminUserDropdown onNavigateTab={handleTabNavigation} />
          </div>
        </div>

        {/* MY ACCOUNT (PROFILE & SECURITY) TAB */}
        {(activeTab === 'profile' || activeTab === 'change-password') && (
          <AdminProfileView initialSection={activeTab === 'change-password' ? 'security' : 'profile'} />
        )}

        {/* AUDIT / ACTIVITY LOGS TAB */}
        {(activeTab === 'audit-logs' || activeTab === 'activity-logs') && (
          <ActivityLogsView />
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <NotificationsView onNavigateTab={(tab) => setActiveTab(tab)} />
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Header Title & Date Range Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>
                  Dashboard
                </h1>
                <p style={{ color: 'var(--beige)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                  Atelier boutique performance &amp; revenue metrics overview
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    background: 'rgba(26, 13, 0, 0.6)',
                    border: '1px solid var(--gold)',
                    color: 'var(--cream)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <Calendar size={16} style={{ color: 'var(--gold)' }} />
                  <span>{dateRangeLabel}</span>
                  <ChevronDown size={16} style={{ color: 'var(--gold)' }} />
                </button>

                {showDateDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '210px',
                      background: 'rgba(15, 7, 1, 0.96)',
                      border: '1px solid var(--gold)',
                      borderRadius: '8px',
                      padding: '8px 0',
                      zIndex: 100,
                      boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    {[
                      { id: 'today', label: 'Today' },
                      { id: '7days', label: 'Last 7 Days' },
                      { id: '30days', label: 'Last 30 Days' },
                      { id: 'thisMonth', label: 'This Month' },
                      { id: 'custom', label: 'Custom Range...' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleApplyPresetRange(opt.id as any)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 16px',
                          fontSize: '0.85rem',
                          background: dateRangePreset === opt.id ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
                          color: dateRangePreset === opt.id ? 'var(--gold)' : 'var(--cream)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: dateRangePreset === opt.id ? 600 : 400,
                          transition: 'background 0.2s',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error state alert if API fails */}
            {dashboardError && (
              <div
                className="glass-panel"
                style={{
                  padding: '20px',
                  border: '1px solid var(--rose-gold)',
                  marginBottom: '25px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(40, 15, 20, 0.6)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--rose-gold)' }}>
                  <AlertIcon size={24} />
                  <span>{dashboardError}</span>
                </div>
                <Button variant="gold" size="sm" onClick={fetchDashboardData}>
                  <RefreshCw size={14} /> Retry
                </Button>
              </div>
            )}

            {/* KPI Cards Section */}
            {dashboardLoading ? (
              <DashboardKpiSkeleton />
            ) : (
              <div className="admin-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '30px' }}>
                {/* Total Orders Card */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '16px 14px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    background: 'rgba(26, 13, 0, 0.4)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Total Orders
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobileGrid ? '1.4rem' : '2.1rem', color: 'var(--cream)', fontWeight: 700, margin: '6px 0 4px 0' }}>
                    {dashboardStats?.total_orders ?? (orders.length > 0 ? orders.length : 0)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#4CC978', flexWrap: 'wrap' }}>
                    <TrendingUp size={14} />
                    <span>+8.2%</span>
                    <span style={{ color: 'var(--grey-mid)', fontSize: '0.7rem' }}>vs 7d</span>
                  </div>
                </div>

                {/* Total Customers Card */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '16px 14px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    background: 'rgba(26, 13, 0, 0.4)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Total Customers
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobileGrid ? '1.4rem' : '2.1rem', color: 'var(--cream)', fontWeight: 700, margin: '6px 0 4px 0' }}>
                    {dashboardStats?.total_customers ?? (systemUsers.length > 0 ? systemUsers.length : 0)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#4CC978', flexWrap: 'wrap' }}>
                    <TrendingUp size={14} />
                    <span>+6.7%</span>
                    <span style={{ color: 'var(--grey-mid)', fontSize: '0.7rem' }}>vs 7d</span>
                  </div>
                </div>

                {/* Reward Coins Issued Card */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '16px 14px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                    background: 'rgba(26, 13, 0, 0.4)',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Reward Coins
                  </span>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: isMobileGrid ? '1.4rem' : '2.1rem', color: 'var(--gold)', fontWeight: 700, margin: '6px 0 4px 0' }}>
                    {(dashboardStats?.reward_coins_issued ?? 0).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#4CC978', flexWrap: 'wrap' }}>
                    <TrendingUp size={14} />
                    <span>+13.3%</span>
                    <span style={{ color: 'var(--grey-mid)', fontSize: '0.7rem' }}>vs 7d</span>
                  </div>
                </div>
              </div>
            )}

            {/* Grid 1: Top Selling Products */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '25px', marginBottom: '30px' }}>
              {/* Top Selling Products */}
              {dashboardLoading ? (
                <DashboardCardSkeleton height="360px" />
              ) : (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', margin: 0 }}>
                        Top Selling Products
                      </h3>
                    </div>

                    {topProducts.length === 0 ? (
                      <EmptyState title="No Products" description="No top selling products available yet." />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {topProducts.slice(0, 5).map((prod, idx) => (
                          <div
                            key={prod.id || idx}
                            onClick={() => {
                              const matched = products.find((p) => p.id === prod.id);
                              if (matched) setEditingProduct(matched);
                              setActiveTab('products');
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              cursor: 'pointer',
                              transition: 'background 0.2s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img
                                src={getImageUrl(prod.image)}
                                alt={prod.name}
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold)' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=100&q=80';
                                }}
                              />
                              <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--cream)', fontWeight: 600 }}>{prod.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)' }}>{prod.weight || ''}</div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 600 }}>
                                ₹{Number(prod.total_revenue || (prod.price * (prod.units_sold || 0))).toLocaleString()}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--beige)' }}>
                                {prod.units_sold || 0} {prod.units_sold === 1 ? 'unit sold' : 'units sold'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', marginTop: '16px' }}>
                    <Button variant="gold" size="sm" onClick={() => setActiveTab('products')}>
                      View All
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Grid 2: Recent Orders Table & Low Stock Alert */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1.4fr 1fr', gap: '25px', marginBottom: '35px' }}>
              {/* Recent Orders Table */}
              {dashboardLoading ? (
                <DashboardCardSkeleton height="360px" />
              ) : (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', margin: 0 }}>
                        Recent Orders
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button variant="secondary" size="sm" onClick={() => setShowOfflineSalesModal(true)} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
                          All Offline Sales
                        </Button>
                        <Button variant="text" size="sm" onClick={() => setActiveTab('orders')} style={{ color: 'var(--gold)' }}>
                          View Management &rarr;
                        </Button>
                      </div>
                    </div>

                    {recentOrders.length === 0 ? (
                      <EmptyState title="No Recent Orders" description="No orders available yet." />
                    ) : isMobileGrid ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        {recentOrders.slice((recentOrdersPage - 1) * 5, recentOrdersPage * 5).map((ord: any) => {
                          const orderId = ord.id || ord.order_id || 'ORD-00000';
                          const custName = ord.customer_name || ord.name || ord.shippingAddress?.name || ord.shipping_address?.name || 'Customer';
                          const totalAmt = ord.amount ?? ord.total ?? 0;
                          const ordStatus = ord.status || 'Processing';
                          const ordDate = ord.created_at || (ord.date || 'Today');

                          let badgeBg = '#f39c12';
                          if (ordStatus === 'Delivered') badgeBg = '#2ecc71';
                          if (ordStatus === 'Shipped') badgeBg = '#3498db';
                          if (ordStatus === 'Out for Delivery' || ordStatus === 'Out_For_Delivery') badgeBg = '#16a085';
                          if (ordStatus === 'Cancelled') badgeBg = '#e74c3c';

                          return (
                            <div 
                              key={orderId} 
                              style={{ 
                                padding: '16px', 
                                borderRadius: '8px', 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.06)' 
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span onClick={() => setActiveTab('orders')} style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={orderId}>{orderId}</span>
                                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 600, background: `${badgeBg}22`, border: `1px solid ${badgeBg}`, color: badgeBg }}>{ordStatus}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                  <div 
                                    style={{ color: 'var(--cream)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: '4px' }} 
                                    onClick={() => {
                                      setActiveTab('customers');
                                      const matchingUser = systemUsers.find(u => u.name.toLowerCase() === custName.toLowerCase());
                                      if (matchingUser) handleSelectCustomer(matchingUser);
                                    }}
                                  >
                                    {custName}
                                  </div>
                                  <div style={{ color: 'var(--beige)', fontSize: '0.75rem' }}>{ordDate}</div>
                                </div>
                                <div style={{ color: 'var(--cream)', fontWeight: 700, fontSize: '1rem' }}>
                                  ₹{Number(totalAmt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Order ID</th>
                              <th>Customer</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentOrders.slice((recentOrdersPage - 1) * 5, recentOrdersPage * 5).map((ord: any) => {
                              const orderId = ord.id || ord.order_id || 'ORD-00000';
                              const custName = ord.customer_name || ord.name || ord.shippingAddress?.name || ord.shipping_address?.name || 'Customer';
                              const totalAmt = ord.amount ?? ord.total ?? 0;
                              const ordStatus = ord.status || 'Processing';
                              const ordDate = ord.created_at || (ord.date || 'Today');

                              let badgeBg = '#f39c12';
                              if (ordStatus === 'Delivered') badgeBg = '#2ecc71';
                              if (ordStatus === 'Shipped') badgeBg = '#3498db';
                              if (ordStatus === 'Out for Delivery' || ordStatus === 'Out_For_Delivery') badgeBg = '#16a085';
                              if (ordStatus === 'Cancelled') badgeBg = '#e74c3c';

                              return (
                                <tr key={orderId} style={{ cursor: 'pointer' }}>
                                  <td
                                    onClick={() => setActiveTab('orders')}
                                    style={{ color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}
                                    title={orderId}
                                  >
                                    {orderId}
                                  </td>
                                  <td
                                    onClick={() => {
                                      setActiveTab('customers');
                                      const matchingUser = systemUsers.find(u => u.name.toLowerCase() === custName.toLowerCase());
                                      if (matchingUser) handleSelectCustomer(matchingUser);
                                    }}
                                    style={{ color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}
                                  >
                                    {custName}
                                  </td>
                                  <td style={{ color: 'var(--cream)', fontWeight: 600, whiteSpace: 'nowrap' }}>₹{Number(totalAmt).toLocaleString()}</td>
                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    <span
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        background: `${badgeBg}22`,
                                        border: `1px solid ${badgeBg}`,
                                        color: badgeBg,
                                      }}
                                    >
                                      {ordStatus}
                                    </span>
                                  </td>
                                  <td style={{ color: 'var(--beige)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{ordDate}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {recentOrders.length > 5 && (
                    <div style={{ marginTop: '16px' }}>
                      <Pagination
                        currentPage={recentOrdersPage}
                        totalPages={Math.ceil(recentOrders.length / 5)}
                        totalItems={recentOrders.length}
                        itemsPerPage={5}
                        onPageChange={(p) => setRecentOrdersPage(p)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Low Stock Alert */}
              {dashboardLoading ? (
                <DashboardCardSkeleton height="360px" />
              ) : (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertIcon size={20} style={{ color: 'var(--gold)' }} />
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', margin: 0 }}>
                          Low Stock Alert
                        </h3>
                      </div>
                    </div>

                    {lowStockProducts.length === 0 ? (
                      <EmptyState title="Stock Healthy" description="All products currently have sufficient inventory stock." />
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {lowStockProducts.slice((lowStockPage - 1) * 4, lowStockPage * 4).map((prod: any) => (
                          <div
                            key={prod.id}
                            onClick={() => {
                              const matched = products.find((p) => p.id === prod.id);
                              if (matched) {
                                setEditingProduct(matched);
                                setEditingProductImageFiles([]);
                                setEditingProductImagePreviews([]);
                              }
                              setActiveTab('products');
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              background: 'rgba(183, 110, 121, 0.1)',
                              border: '1px solid rgba(183, 110, 121, 0.3)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img
                                src={getImageUrl(prod.image)}
                                alt={prod.name}
                                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--rose-gold)' }}
                              />
                              <div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--cream)', fontWeight: 600 }}>{prod.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--rose-gold)', fontWeight: 600 }}>
                                  {prod.stock !== undefined ? prod.stock : 0} units left
                                </div>
                              </div>
                            </div>

                            <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600 }}>Manage &rarr;</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {lowStockProducts.length > 4 && (
                      <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                        <Pagination
                          currentPage={lowStockPage}
                          totalPages={Math.ceil(lowStockProducts.length / 4)}
                          totalItems={lowStockProducts.length}
                          itemsPerPage={4}
                          onPageChange={(p) => setLowStockPage(p)}
                        />
                      </div>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <Button variant="gold" size="sm" onClick={() => setActiveTab('products')}>
                        View Products
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div>
            {/* Header & Breadcrumb section */}
            {showAddProductForm ? (
              <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--beige)', marginBottom: '10px' }}>
                  <span style={{ cursor: 'pointer', color: 'var(--gold)' }} onClick={() => setShowAddProductForm(false)}>
                    Products
                  </span>
                  <span>&gt;</span>
                  <span style={{ color: 'var(--cream)' }}>Create New Chocolate</span>
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: 0, fontWeight: 700 }}>
                  Create New Chocolate
                </h1>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: 0, fontWeight: 700 }}>
                    Products Catalog
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: 'var(--beige)', marginTop: '4px', margin: 0 }}>
                    Manage your products, stock and availability
                  </p>
                </div>
                <Button
                  variant="gold"
                  glow
                  onClick={() => setShowAddProductForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                >
                  <Plus size={18} />
                  Add Product
                </Button>
              </div>
            )}

            {!showAddProductForm ? (
              /* PRODUCTS CATALOG VIEW (Screenshot 1) */
              <div>
                {/* Search & Filters Bar */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '16px 20px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '15px',
                    flexWrap: 'wrap',
                    background: 'rgba(15, 10, 5, 0.6)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
                    {/* Search by name/SKU input */}
                    <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Search by product name or SKU..."
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setProductCurrentPage(1);
                        }}
                        style={{
                          width: '100%',
                          padding: '9px 14px 9px 38px',
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid var(--glass-border)',
                          borderRadius: '6px',
                          color: 'var(--cream)',
                          fontSize: '0.88rem',
                          outline: 'none',
                        }}
                      />
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--beige)' }} />
                    </div>

                    {/* Category Filter */}
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => {
                        setProductCategoryFilter(e.target.value);
                        setProductCurrentPage(1);
                      }}
                      style={{
                        padding: '9px 14px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.88rem',
                        outline: 'none',
                        cursor: 'pointer',
                        minWidth: '160px',
                      }}
                    >
                      <option value="all" style={{ background: '#120a05' }}>All Categories</option>
                      {dynamicCategoryOptions.map((opt) => (
                        <option key={opt.value} value={opt.value} style={{ background: '#120a05' }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Availability Filter */}
                    <select
                      value={productAvailabilityFilter}
                      onChange={(e) => {
                        setProductAvailabilityFilter(e.target.value);
                        setProductCurrentPage(1);
                      }}
                      style={{
                        padding: '9px 14px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.88rem',
                        outline: 'none',
                        cursor: 'pointer',
                        minWidth: '150px',
                      }}
                    >
                      <option value="all" style={{ background: '#120a05' }}>All Availability</option>
                      <option value="in_stock" style={{ background: '#120a05' }}>In Stock</option>
                      <option value="out_of_stock" style={{ background: '#120a05' }}>Out of Stock</option>
                    </select>

                    {/* Reset Button */}
                    {(productSearch || productCategoryFilter !== 'all' || productAvailabilityFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setProductCategoryFilter('all');
                          setProductAvailabilityFilter('all');
                          setProductCurrentPage(1);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          background: 'none',
                          border: '1px solid var(--gold)',
                          borderRadius: '6px',
                          color: 'var(--gold)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        <RefreshCw size={13} />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Export Button */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => {
                        // Export CSV
                        const headers = ['SKU', 'Name', 'Category', 'Weight', 'Price', 'Stock', 'Availability', 'Rating'];
                        const csvRows = [
                          headers.join(','),
                          ...products.map((p) => {
                            const sku = p.sku || `CHO${p.id.slice(0, 4).toUpperCase()}`;
                            const avail = (p.stock ?? 0) > 0 ? 'In Stock' : 'Out of Stock';
                            return `"${sku}","${p.name}","${p.category}","${p.weight}",${p.price},${p.stock ?? 0},"${avail}",${p.rating ?? 4.0}`;
                          }),
                        ];
                        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `chovique_products_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        addToast('success', 'Products exported to CSV successfully!', 'Export Complete');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 16px',
                        background: 'rgba(255, 215, 0, 0.05)',
                        border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '6px',
                        color: 'var(--gold)',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      <UploadCloud size={15} style={{ transform: 'rotate(180deg)' }} />
                      Export ∨
                    </button>
                  </div>
                </div>

                {/* Filtered Count */}
                {(() => {
                  const filtered = products.filter((prod) => {
                    const searchTrim = productSearch.trim().toLowerCase();
                    const skuStr = (prod.sku || `CHO${prod.id.slice(0, 4).toUpperCase()}`).toLowerCase();
                    const nameStr = (prod.name || '').toLowerCase();
                    const descStr = (prod.description || '').toLowerCase();
                    const nameMatch = !searchTrim || nameStr.includes(searchTrim) || skuStr.includes(searchTrim) || descStr.includes(searchTrim);

                    const catMatch = (() => {
                      if (productCategoryFilter === 'all' || !productCategoryFilter) return true;
                      
                      const selectedCat = (categoriesList || []).find(
                        (c) => c.id === productCategoryFilter || c.slug === productCategoryFilter || c.name.toLowerCase() === productCategoryFilter.toLowerCase()
                      );

                      const filterId = selectedCat ? selectedCat.id : productCategoryFilter;
                      const filterName = selectedCat ? selectedCat.name.toLowerCase().trim() : productCategoryFilter.toLowerCase().trim();
                      const filterSlug = selectedCat && selectedCat.slug ? selectedCat.slug.toLowerCase().trim() : '';

                      const prodCatId = prod.category_id || '';
                      const prodCatName = (prod.category || '').toLowerCase().trim();

                      if (prodCatId && prodCatId === filterId) return true;
                      if (prodCatName && (prodCatName === filterName || (filterSlug && prodCatName === filterSlug))) return true;
                      if (filterName && prodCatName && (prodCatName.includes(filterName) || filterName.includes(prodCatName))) return true;

                      return false;
                    })();

                    const displayStock = prod.stock !== undefined ? prod.stock : (productMetrics[prod.id]?.stock ?? 0);
                    const isAdminAvailable = (prod.isAvailable ?? prod.is_available ?? true);
                    const isAvailable = isAdminAvailable && displayStock > 0;

                    const availMatch = (() => {
                      if (productAvailabilityFilter === 'all' || !productAvailabilityFilter) return true;
                      if (productAvailabilityFilter === 'in_stock') return isAvailable;
                      if (productAvailabilityFilter === 'out_of_stock' || productAvailabilityFilter === 'stock_out') return !isAvailable;
                      return true;
                    })();

                    return nameMatch && catMatch && availMatch;
                  });

                  const totalFiltered = filtered.length;
                  const totalPages = Math.ceil(totalFiltered / productRowsPerPage) || 1;
                  const validPage = Math.min(productCurrentPage, totalPages);
                  const startIndex = (validPage - 1) * productRowsPerPage;
                  const paginated = filtered.slice(startIndex, startIndex + productRowsPerPage);

                  return (
                    <div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--beige)', marginBottom: '14px' }}>
                        Showing {totalFiltered > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + productRowsPerPage, totalFiltered)} of {totalFiltered} products
                      </div>

                      {/* Products Table */}
                      {isMobileGrid ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                          {paginated.length === 0 ? (
                            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--beige)', borderRadius: '8px' }}>
                              No products found matching your search and filter criteria.
                            </div>
                          ) : (
                            paginated.map((prod) => {
                              const displayStock = prod.stock !== undefined ? prod.stock : (productMetrics[prod.id]?.stock ?? 0);
                              const isAdminAvailable = (prod.isAvailable ?? prod.is_available ?? true);
                              const isAvailable = isAdminAvailable && displayStock > 0;
                              const skuText = prod.sku || `CHO${prod.id.slice(0, 4).toUpperCase()}`;

                              return (
                                <div key={prod.id} className="glass-panel" style={{ padding: '16px', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', border: '1px solid var(--glass-border)' }}>
                                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                    <img
                                      src={getImageUrl(prod.image)}
                                      alt={prod.name}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=600&q=80';
                                      }}
                                      style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--glass-border)' }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
                                        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1rem', marginLeft: '8px' }}>₹{prod.price}</div>
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: 'var(--beige)', marginBottom: '8px' }}>
                                        SKU: {skuText} | {prod.weight}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ color: 'var(--cream)', fontSize: '0.85rem', fontWeight: 600 }}>{displayStock} units</div>
                                        {isAvailable ? (
                                          <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(46, 204, 113, 0.12)', border: '1px solid rgba(46, 204, 113, 0.3)', color: '#2ecc71', fontSize: '0.75rem', fontWeight: 600 }}>
                                            In Stock
                                          </span>
                                        ) : (
                                          <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid rgba(231, 76, 60, 0.3)', color: '#e74c3c', fontSize: '0.75rem', fontWeight: 600 }}>
                                            Stock Out
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                    {isAdminAvailable ? (
                                      <button
                                        type="button"
                                        disabled={updatingStockProductId === prod.id}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (updatingStockProductId === prod.id) return;
                                          setUpdatingStockProductId(prod.id);
                                          try {
                                            const updated = await productService.updateProduct(prod.id, { is_available: false, isAvailable: false });
                                            setProducts((prev) =>
                                              prev.map((p) => (p.id === prod.id ? { ...p, ...(updated || {}), is_available: false, isAvailable: false } : p))
                                            );
                                            addToast('info', `Marked "${prod.name}" as Stock Out.`, 'Availability Updated');
                                          } catch (err: any) {
                                            addToast('error', err?.detail || err?.message || 'Failed to update stock.', 'Error');
                                          } finally {
                                            setUpdatingStockProductId(null);
                                          }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.4)', color: '#e74c3c', fontSize: '0.8rem', fontWeight: 600, cursor: updatingStockProductId === prod.id ? 'not-allowed' : 'pointer', opacity: updatingStockProductId === prod.id ? 0.6 : 1 }}
                                      >
                                        {updatingStockProductId === prod.id ? '...' : 'Stock Out'}
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={updatingStockProductId === prod.id}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (updatingStockProductId === prod.id) return;
                                          setUpdatingStockProductId(prod.id);
                                          try {
                                            const updated = await productService.updateProduct(prod.id, { is_available: true, isAvailable: true });
                                            setProducts((prev) =>
                                              prev.map((p) => (p.id === prod.id ? { ...p, ...(updated || {}), is_available: true, isAvailable: true } : p))
                                            );
                                            addToast('success', `Marked "${prod.name}" as Available.`, 'Updated');
                                          } catch (err: any) {
                                            addToast('error', err?.detail || err?.message || 'Failed to update stock.', 'Error');
                                          } finally {
                                            setUpdatingStockProductId(null);
                                          }
                                        }}
                                        style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(46, 204, 113, 0.15)', border: '1px solid rgba(46, 204, 113, 0.4)', color: '#2ecc71', fontSize: '0.8rem', fontWeight: 600, cursor: updatingStockProductId === prod.id ? 'not-allowed' : 'pointer', opacity: updatingStockProductId === prod.id ? 0.6 : 1 }}
                                      >
                                        {updatingStockProductId === prod.id ? '...' : 'Enable'}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProduct(prod);
                                        setEditingProductImageFiles([]);
                                        setEditingProductImagePreviews([]);
                                      }}
                                      style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.3)', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                      <Edit2 size={13} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        openConfirmation('Delete Product', `Are you sure you want to delete "${prod.name}"?`, () => deleteProduct(prod.id), 'Delete Product');
                                      }}
                                      style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(183, 110, 121, 0.12)', border: '1px solid rgba(183, 110, 121, 0.35)', color: 'var(--rose-gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    >
                                      <Trash2 size={13} /> Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="glass-panel" style={{ padding: '0', border: '1px solid var(--glass-border)', overflowX: 'auto', background: 'rgba(10,5,0,0.4)', borderRadius: '8px', marginBottom: '20px' }}>
                          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>IMAGE</th>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>PRODUCT NAME</th>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>CATEGORY</th>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>WEIGHT</th>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>PRICE</th>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>STOCK (QTY)<br/><span style={{ fontSize: '0.65rem', textTransform: 'none', color: 'var(--beige)', fontWeight: 400 }}>Actual Stock</span></th>
                                <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>AVAILABILITY<br/><span style={{ fontSize: '0.65rem', textTransform: 'none', color: 'var(--beige)', fontWeight: 400 }}>Visible to customers</span></th>
                                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginated.length === 0 ? (
                                <tr>
                                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--beige)' }}>
                                    No products found matching your search and filter criteria.
                                  </td>
                                </tr>
                              ) : (
                                paginated.map((prod) => {
                                  const displayStock = prod.stock !== undefined ? prod.stock : (productMetrics[prod.id]?.stock ?? 0);
                                  const isAdminAvailable = (prod.isAvailable ?? prod.is_available ?? true);
                                  const isAvailable = isAdminAvailable && displayStock > 0;
                                  const skuText = prod.sku || `CHO${prod.id.slice(0, 4).toUpperCase()}`;

                                  return (
                                    <tr key={prod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                      <td style={{ padding: '14px 18px' }}>
                                        <img
                                          src={getImageUrl(prod.image)}
                                          alt={prod.name}
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=600&q=80';
                                          }}
                                          style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--glass-border)' }}
                                        />
                                      </td>
                                      <td style={{ padding: '14px 18px' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.92rem' }}>{prod.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--beige)', marginTop: '2px' }}>SKU: {skuText}</div>
                                      </td>
                                      <td style={{ padding: '14px 18px', color: 'var(--beige)', fontSize: '0.88rem' }}>
                                        {categoriesList.find(c => c.slug === prod.category || c.id === prod.category || c.name.toLowerCase() === (prod.category || '').toLowerCase())?.name ||
                                         (prod.category === 'dark' ? 'Dark Chocolate' :
                                          prod.category === 'milk' ? 'Milk Chocolate' :
                                          prod.category === 'white' ? 'White Chocolate' :
                                          prod.category === 'gift' ? 'Gift Hamper' :
                                          prod.category === 'beverage' ? 'Beverage' : prod.category)}
                                      </td>
                                      <td style={{ padding: '14px 18px', color: 'var(--cream)', fontSize: '0.88rem' }}>{prod.weight}</td>
                                      <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--cream)', fontSize: '0.92rem' }}>₹{prod.price}</td>
                                      <td style={{ padding: '14px 18px', color: 'var(--cream)', fontSize: '0.88rem', fontWeight: 600 }}>
                                        {displayStock} units
                                      </td>
                                      <td style={{ padding: '14px 18px' }}>
                                        {isAvailable ? (
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background: 'rgba(46, 204, 113, 0.12)',
                                            border: '1px solid rgba(46, 204, 113, 0.3)',
                                            color: '#2ecc71',
                                            fontSize: '0.78rem',
                                            fontWeight: 600
                                          }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ecc71' }}></span>
                                            In Stock
                                          </span>
                                        ) : (
                                          <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            background: 'rgba(231, 76, 60, 0.12)',
                                            border: '1px solid rgba(231, 76, 60, 0.3)',
                                            color: '#e74c3c',
                                            fontSize: '0.78rem',
                                            fontWeight: 600
                                          }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e74c3c' }}></span>
                                            Stock Out
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                          {/* Stock Out / Stock In Quick Toggle */}
                                          {isAdminAvailable ? (
                                            <button
                                              type="button"
                                              disabled={updatingStockProductId === prod.id}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (updatingStockProductId === prod.id) return;
                                                setUpdatingStockProductId(prod.id);
                                                try {
                                                  const updated = await productService.updateProduct(prod.id, { is_available: false, isAvailable: false });
                                                  setProducts((prev) =>
                                                    prev.map((p) => (p.id === prod.id ? { ...p, ...(updated || {}), is_available: false, isAvailable: false } : p))
                                                  );
                                                  addToast('info', `Marked "${prod.name}" as Stock Out (unavailable to customers). Physical stock remains ${displayStock} units.`, 'Availability Updated');
                                                } catch (err: any) {
                                                  console.error('Stock Out failed:', err);
                                                  addToast('error', err?.detail || err?.message || 'Failed to update stock availability.', 'Update Error');
                                                } finally {
                                                  setUpdatingStockProductId(null);
                                                }
                                              }}
                                              style={{
                                                padding: '5px 10px',
                                                borderRadius: '4px',
                                                background: 'rgba(231, 76, 60, 0.15)',
                                                border: '1px solid rgba(231, 76, 60, 0.4)',
                                                color: '#e74c3c',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: updatingStockProductId === prod.id ? 'not-allowed' : 'pointer',
                                                opacity: updatingStockProductId === prod.id ? 0.6 : 1,
                                              }}
                                            >
                                              {updatingStockProductId === prod.id ? 'Updating...' : 'Stock Out'}
                                            </button>
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={updatingStockProductId === prod.id}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (updatingStockProductId === prod.id) return;
                                                setUpdatingStockProductId(prod.id);
                                                try {
                                                  const updated = await productService.updateProduct(prod.id, { is_available: true, isAvailable: true });
                                                  setProducts((prev) =>
                                                    prev.map((p) => (p.id === prod.id ? { ...p, ...(updated || {}), is_available: true, isAvailable: true } : p))
                                                  );
                                                  addToast('success', `Marked "${prod.name}" as Enabled / Available. Physical stock: ${displayStock} units.`, 'Availability Updated');
                                                } catch (err: any) {
                                                  console.error('Stock In failed:', err);
                                                  addToast('error', err?.detail || err?.message || 'Failed to update stock availability.', 'Update Error');
                                                } finally {
                                                  setUpdatingStockProductId(null);
                                                }
                                              }}
                                              style={{
                                                padding: '5px 10px',
                                                borderRadius: '4px',
                                                background: 'rgba(46, 204, 113, 0.15)',
                                                border: '1px solid rgba(46, 204, 113, 0.4)',
                                                color: '#2ecc71',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                cursor: updatingStockProductId === prod.id ? 'not-allowed' : 'pointer',
                                                opacity: updatingStockProductId === prod.id ? 0.6 : 1,
                                              }}
                                            >
                                              {updatingStockProductId === prod.id ? 'Updating...' : 'Enable'}
                                            </button>
                                          )}
  
                                          {/* Edit Button */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingProduct(prod);
                                              setEditingProductImageFiles([]);
                                              setEditingProductImagePreviews([]);
                                            }}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '5px 10px',
                                              borderRadius: '4px',
                                              background: 'rgba(255, 215, 0, 0.08)',
                                              border: '1px solid rgba(255, 215, 0, 0.3)',
                                              color: 'var(--gold)',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <Edit2 size={13} />
                                            Edit
                                          </button>
  
                                          {/* Delete Button */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              openConfirmation(
                                                `Delete Product`,
                                                `Are you sure you want to delete "${prod.name}"? This action cannot be undone.`,
                                                () => deleteProduct(prod.id),
                                                'Delete Product'
                                              );
                                            }}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: '5px 10px',
                                              borderRadius: '4px',
                                              background: 'rgba(183, 110, 121, 0.12)',
                                              border: '1px solid rgba(183, 110, 121, 0.35)',
                                              color: 'var(--rose-gold)',
                                              fontSize: '0.75rem',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <Trash2 size={13} />
                                            Delete
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Component */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--beige)' }}>
                          Showing {totalFiltered > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + productRowsPerPage, totalFiltered)} of {totalFiltered} products
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <Pagination
                            currentPage={validPage}
                            totalPages={totalPages}
                            totalItems={totalFiltered}
                            itemsPerPage={productRowsPerPage}
                            onPageChange={(p) => setProductCurrentPage(p)}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--beige)' }}>
                            <span>Rows per page:</span>
                            <select
                              value={productRowsPerPage}
                              onChange={(e) => {
                                setProductRowsPerPage(Number(e.target.value));
                                setProductCurrentPage(1);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: 'rgba(0,0,0,0.4)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '4px',
                                color: 'var(--cream)',
                                fontSize: '0.8rem',
                              }}
                            >
                              <option value={10} style={{ background: '#120a05' }}>10</option>
                              <option value={25} style={{ background: '#120a05' }}>25</option>
                              <option value={50} style={{ background: '#120a05' }}>50</option>
                              <option value={100} style={{ background: '#120a05' }}>100</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* CREATE NEW CHOCOLATE FORM VIEW (Screenshot 2) */
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileGrid ? '1fr' : (pendingBatchProducts.length > 0 ? '1.5fr 1fr' : '1fr'),
                  gap: '30px',
                  alignItems: 'flex-start',
                }}
              >
                {/* Left 5-Section Form Card */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '30px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(15, 10, 5, 0.6)',
                    borderRadius: '12px',
                  }}
                >
                  <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* 1. Basic Information */}
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', marginBottom: '16px', fontWeight: 600 }}>
                        1. Basic Information
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <Input
                            label="Chocolate Name"
                            placeholder="Enter chocolate name"
                            required
                            value={newProd.name}
                            onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                          />
                          {productFormErrors.name && (
                            <div style={{ color: 'var(--rose-gold)', fontSize: '0.78rem', marginTop: '4px' }}>
                              {productFormErrors.name}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          <Select
                            label="Category"
                            required
                            options={dynamicCategoryOptions}
                            value={newProd.category}
                            onChange={(e) => setNewProd({ ...newProd, category: e.target.value as any })}
                          />

                          <Select
                            label="Badge / Section Tag"
                            options={[
                              { value: '', label: 'Select badge / section tag' },
                              { value: 'New', label: 'New (Shows in New Arrivals section)' },
                              { value: 'Bestseller', label: 'Bestseller (Shows in Bestsellers section)' },
                              { value: 'Premium', label: 'Premium (Shows in Popular / Premium section)' },
                              { value: 'Gift Hamper', label: 'Gift Hamper (Shows in Gift Hampers section)' },
                              { value: 'Signature', label: 'Signature (Shows in Signature Collection)' },
                              { value: 'Limited', label: 'Limited Edition' },
                            ]}
                            value={newProd.badge || ''}
                            onChange={(e) => setNewProd({ ...newProd, badge: e.target.value as any })}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          <div>
                            <Input
                              label="Price (₹)"
                              type="number"
                              placeholder="Enter price"
                              required
                              value={newProd.price || ''}
                              onChange={(e) => setNewProd({ ...newProd, price: parseFloat(e.target.value) || 0 })}
                            />
                            {productFormErrors.price && (
                              <div style={{ color: 'var(--rose-gold)', fontSize: '0.78rem', marginTop: '4px' }}>
                                {productFormErrors.price}
                              </div>
                            )}
                          </div>

                          <div>
                            <Input
                              label="Weight"
                              placeholder="Enter weight (e.g. 100g, 250g)"
                              required
                              value={newProd.weight}
                              onChange={(e) => setNewProd({ ...newProd, weight: e.target.value })}
                            />
                            {productFormErrors.weight && (
                              <div style={{ color: 'var(--rose-gold)', fontSize: '0.78rem', marginTop: '4px' }}>
                                {productFormErrors.weight}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. Product Images */}
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', marginBottom: '16px', fontWeight: 600 }}>
                        2. Product Images
                      </h3>
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--glass-border)',
                          borderRadius: '8px',
                          padding: '30px 20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'rgba(0,0,0,0.2)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          multiple
                          ref={imageInputRef}
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                        <div style={{ color: 'var(--gold)', marginBottom: '10px' }}>
                          <UploadCloud size={36} />
                        </div>
                        <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                          Choose Images
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--beige)' }}>
                          Maximum 10MB per image • Maximum 10 images
                        </div>
                      </div>

                      {/* Multi-Image Gallery Organizer */}
                      {newProd.imagePreviewUrls.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                          <div
                            style={{
                              padding: '10px 14px',
                              background: 'rgba(212, 175, 55, 0.08)',
                              border: '1px solid rgba(212, 175, 55, 0.25)',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              color: 'var(--cream)',
                              marginBottom: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <div>
                              <strong style={{ color: 'var(--gold)' }}>Product Gallery:</strong> The <span style={{ color: 'var(--gold)', fontWeight: 700 }}>1st image</span> is the Main Cover photo displayed on boutique cards and search. Additional images appear sequentially in the product page's gallery.
                            </div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--beige)', fontWeight: 600 }}>
                              {newProd.imagePreviewUrls.length} / 10 images
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '14px' }}>
                            {newProd.imagePreviewUrls.map((url, idx) => {
                              const isPrimary = idx === 0;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    position: 'relative',
                                    background: 'rgba(16, 12, 10, 0.95)',
                                    border: isPrimary ? '2px solid var(--gold)' : '1px solid rgba(212, 175, 55, 0.25)',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    boxShadow: isPrimary ? '0 0 14px rgba(212, 175, 55, 0.25)' : 'none',
                                    transition: 'all 0.2s ease',
                                  }}
                                >
                                  {/* Header Badge & Remove Button */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                    {isPrimary ? (
                                      <span
                                        style={{
                                          background: 'linear-gradient(135deg, #d4af37 0%, #aa8010 100%)',
                                          color: '#0a0806',
                                          fontWeight: 800,
                                          fontSize: '0.66rem',
                                          letterSpacing: '0.04em',
                                          padding: '3px 8px',
                                          borderRadius: '4px',
                                          textTransform: 'uppercase',
                                        }}
                                      >
                                        ★ Main Cover
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          color: 'var(--beige)',
                                          fontWeight: 600,
                                          fontSize: '0.66rem',
                                          padding: '2px 7px',
                                          borderRadius: '4px',
                                        }}
                                      >
                                        Side View #{idx + 1}
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      title="Remove Image"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewProd((prev) => ({
                                          ...prev,
                                          imageFiles: prev.imageFiles.filter((_, i) => i !== idx),
                                          imagePreviewUrls: prev.imagePreviewUrls.filter((_, i) => i !== idx),
                                        }));
                                      }}
                                      style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '50%',
                                        background: 'rgba(231, 76, 60, 0.2)',
                                        color: '#ff6b6b',
                                        border: '1px solid rgba(231, 76, 60, 0.4)',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Uncropped Contain Preview Container */}
                                  <div
                                    style={{
                                      width: '100%',
                                      height: '130px',
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      background: 'radial-gradient(circle, rgba(38, 24, 16, 0.9) 0%, rgba(12, 9, 7, 0.98) 100%)',
                                      border: '1px solid rgba(255, 255, 255, 0.06)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '6px',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    <img
                                      src={url}
                                      alt={`Product View ${idx + 1}`}
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
                                      }}
                                    />
                                  </div>

                                  {/* Make Primary Cover Action */}
                                  {!isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetMainCover(idx)}
                                      style={{
                                        width: '100%',
                                        padding: '5px 8px',
                                        background: 'rgba(212, 175, 55, 0.12)',
                                        border: '1px solid rgba(212, 175, 55, 0.4)',
                                        borderRadius: '4px',
                                        color: 'var(--gold)',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      Set as Main Cover
                                    </button>
                                  )}

                                  {/* Reorder Buttons (Move Left / Move Right) */}
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleReorderImage(idx, 'prev')}
                                      style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        background: idx === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.07)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '4px',
                                        color: idx === 0 ? 'rgba(255, 255, 255, 0.2)' : 'var(--cream)',
                                        fontSize: '0.7rem',
                                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                      }}
                                    >
                                      <ChevronLeft size={12} /> Left
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === newProd.imagePreviewUrls.length - 1}
                                      onClick={() => handleReorderImage(idx, 'next')}
                                      style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        background: idx === newProd.imagePreviewUrls.length - 1 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.07)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '4px',
                                        color: idx === newProd.imagePreviewUrls.length - 1 ? 'rgba(255, 255, 255, 0.2)' : 'var(--cream)',
                                        fontSize: '0.7rem',
                                        cursor: idx === newProd.imagePreviewUrls.length - 1 ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '2px',
                                      }}
                                    >
                                      Right <ChevronRight size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3. Inventory */}
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', marginBottom: '16px', fontWeight: 600 }}>
                        3. Inventory
                      </h3>
                      <div>
                        <Input
                          label="Initial Stock Units"
                          type="number"
                          placeholder="Enter stock quantity"
                          required
                          min={0}
                          value={newProd.stock}
                          onChange={(e) => setNewProd({ ...newProd, stock: parseInt(e.target.value) || 0 })}
                        />
                        {productFormErrors.stock && (
                          <div style={{ color: 'var(--rose-gold)', fontSize: '0.78rem', marginTop: '4px' }}>
                            {productFormErrors.stock}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 4. Product Details */}
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', marginBottom: '16px', fontWeight: 600 }}>
                        4. Product Details
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                            Ingredients <span style={{ color: '#e74c3c' }}>*</span>
                          </label>
                          <textarea
                            rows={4}
                            placeholder="Enter ingredients"
                            value={newProd.ingredients}
                            onChange={(e) => setNewProd({ ...newProd, ingredients: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--cream)',
                              borderRadius: '6px',
                              resize: 'none',
                              outline: 'none',
                              fontSize: '0.88rem',
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                            Product Description <span style={{ color: '#e74c3c' }}>*</span>
                          </label>
                          <textarea
                            rows={4}
                            placeholder="Enter product description"
                            value={newProd.description}
                            onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '12px',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid var(--glass-border)',
                              color: 'var(--cream)',
                              borderRadius: '6px',
                              resize: 'none',
                              outline: 'none',
                              fontSize: '0.88rem',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 5. Initial Rating */}
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: 'var(--gold)', fontFamily: 'var(--font-display)', marginBottom: '6px', fontWeight: 600 }}>
                        5. Initial Rating
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--beige)', margin: '0 0 12px 0' }}>
                        Set the initial rating for this product.
                      </p>

                      {/* Interactive Star Picker */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <button
                              key={starIdx}
                              type="button"
                              onClick={() => setNewProd({ ...newProd, rating: starIdx })}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px',
                                color: starIdx <= Math.round(newProd.rating) ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                                transition: 'transform 0.15s ease',
                              }}
                            >
                              <Star size={24} fill={starIdx <= Math.round(newProd.rating) ? 'var(--gold)' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--cream)' }}>
                          {newProd.rating.toFixed(1)} / 5
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--beige)', marginTop: '4px' }}>
                        Select rating between 0 to 5 stars (0.5 step)
                      </div>
                    </div>

                    {productAddedSuccess && (
                      <div style={{ padding: '12px 16px', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', color: '#2ecc71', borderRadius: '6px', fontSize: '0.88rem' }}>
                        ✓ Chocolate catalog item created successfully!
                      </div>
                    )}

                    {/* Bottom Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <Button
                        type="button"
                        variant="glass"
                        onClick={() => {
                          setShowAddProductForm(false);
                          setPendingBatchProducts([]);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                      >
                        <X size={16} />
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddToBatch}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}
                      >
                        <Plus size={16} />
                        Add Another Product
                      </Button>

                      <Button
                        type="submit"
                        variant="gold"
                        disabled={isCreatingProduct}
                        glow
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontWeight: 600 }}
                      >
                        {isCreatingProduct ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Saving Products...
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={16} />
                            {pendingBatchProducts.length > 0
                              ? `Save All Products (${pendingBatchProducts.length + (trimValue(newProd.name) ? 1 : 0)})`
                              : 'Create Product'}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Right Sidebar Batch Queue Card (if pending items exist) */}
                {pendingBatchProducts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        border: '1px solid var(--gold)',
                        background: 'rgba(201, 168, 76, 0.08)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--gold)', margin: 0, fontWeight: 700 }}>
                          Pending Batch Queue ({pendingBatchProducts.length})
                        </h4>
                        <Button variant="text" size="sm" onClick={() => setPendingBatchProducts([])} style={{ color: '#e74c3c', fontSize: '0.75rem', padding: '2px 6px' }}>
                          Clear Queue
                        </Button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                        {pendingBatchProducts.map((p, idx) => (
                          <div
                            key={p.tempId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {p.imagePreviewUrls.length > 0 ? (
                                <img src={p.imagePreviewUrls[0]} alt={p.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: 'rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c', fontSize: '0.8rem', fontWeight: 700 }}>
                                  #{idx + 1}
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: '0.88rem', color: 'var(--cream)', fontWeight: 600 }}>{p.name}</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--grey-light)' }}>
                                  ₹{p.price} • {p.weight} • {p.stock} units
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleEditBatchItem(p)}
                                style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', padding: '4px' }}
                                title="Edit Item"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFromBatch(p.tempId)}
                                style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: '4px' }}
                                title="Remove Item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.95)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--cream)', margin: 0 }}>
                      Edit Product: {editingProduct.name}
                    </h3>
                    <button type="button" onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: 'var(--grey-light)', cursor: 'pointer' }}>
                      <X size={20} />
                    </button>
                  </div>

                  <form onSubmit={handleEditProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Input label="Product Name" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <Input label="Price (₹)" type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })} required />
                      <Input label="Weight" value={editingProduct.weight || ''} onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <Input label="Stock Units" type="number" value={editingProduct.stock ?? 10} onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })} required />
                      <Select label="Category" options={dynamicCategoryOptions} value={editingProduct.category_id || editingProduct.category} onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value, category: e.target.value as any })} />
                    </div>
                    <Input label="Ingredients" value={editingProduct.ingredients || ''} onChange={(e) => setEditingProduct({ ...editingProduct, ingredients: e.target.value })} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>Description</label>
                      <textarea rows={3} value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'var(--cream)', borderRadius: '4px', resize: 'none' }} />
                    </div>

                    {/* Structured Nutrition Form inside Edit Modal */}
                    <div style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '6px', background: 'rgba(0,0,0,0.2)' }}>
                      <h4 style={{ color: 'var(--gold)', fontSize: '0.95rem', fontFamily: 'var(--font-display)', marginBottom: '14px' }}>
                        Nutrition Information
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <Input label="Serving Size" value={editingProduct.nutrition?.servingSize || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, servingSize: e.target.value } })} />
                        <Input label="Calories" value={editingProduct.nutrition?.calories || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, calories: e.target.value } })} />
                        <Input label="Total Fat" value={editingProduct.nutrition?.totalFat || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, totalFat: e.target.value } })} />
                        <Input label="Saturated Fat" value={editingProduct.nutrition?.saturatedFat || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, saturatedFat: e.target.value } })} />
                        <Input label="Trans Fat" value={editingProduct.nutrition?.transFat || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, transFat: e.target.value } })} />
                        <Input label="Cholesterol" value={editingProduct.nutrition?.cholesterol || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, cholesterol: e.target.value } })} />
                        <Input label="Sodium" value={editingProduct.nutrition?.sodium || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, sodium: e.target.value } })} />
                        <Input label="Total Carbohydrates" value={editingProduct.nutrition?.totalCarb || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, totalCarb: e.target.value } })} />
                        <Input label="Dietary Fiber" value={editingProduct.nutrition?.dietaryFiber || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, dietaryFiber: e.target.value } })} />
                        <Input label="Total Sugars" value={editingProduct.nutrition?.totalSugars || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, totalSugars: e.target.value } })} />
                        <Input label="Added Sugars" value={editingProduct.nutrition?.addedSugars || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, addedSugars: e.target.value } })} />
                        <Input label="Protein" value={editingProduct.nutrition?.protein || ''} onChange={(e) => setEditingProduct({ ...editingProduct, nutrition: { ...editingProduct.nutrition, protein: e.target.value } })} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                      <Button variant="gold" type="submit" disabled={isUpdatingProduct} glow style={{ flex: 1 }}>
                        {isUpdatingProduct ? 'Saving Changes...' : 'Save Product Details'}
                      </Button>
                      <button type="button" onClick={() => setEditingProduct(null)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--grey-mid)', color: 'var(--cream)', borderRadius: '4px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: 0, fontWeight: 700 }}>
                  Categories
                </h1>
                <p style={{ fontSize: '0.9rem', color: 'var(--beige)', marginTop: '4px', margin: 0 }}>
                  Manage product categories and their visibility
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Button
                  variant="gold"
                  glow
                  onClick={() => setShowAddCategoryForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                >
                  <Plus size={18} />
                  Add Category
                </Button>
              </div>
            </div>

            {/* Filter & Search Bar (Matching Reference Screenshot) */}
            <div
              className="glass-panel"
              style={{
                padding: '16px 20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '15px',
                flexWrap: 'wrap',
                background: 'rgba(15, 10, 5, 0.6)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1 }}>
                {/* Search category input */}
                <div style={{ position: 'relative', minWidth: '280px', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search category name..."
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setCategoryCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 14px 9px 38px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--cream)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--beige)' }} />
                </div>

                {/* Status Filter */}
                <select
                  value={categoryStatusFilter}
                  onChange={(e) => {
                    setCategoryStatusFilter(e.target.value);
                    setCategoryCurrentPage(1);
                  }}
                  style={{
                    padding: '9px 14px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    color: 'var(--cream)',
                    fontSize: '0.88rem',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '150px',
                  }}
                >
                  <option value="all" style={{ background: '#120a05' }}>All Status</option>
                  <option value="active" style={{ background: '#120a05' }}>Active</option>
                  <option value="inactive" style={{ background: '#120a05' }}>Inactive</option>
                </select>

                {/* Reset Button */}
                {(categorySearch || categoryStatusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategorySearch('');
                      setCategoryStatusFilter('all');
                      setCategoryCurrentPage(1);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: 'none',
                      border: '1px solid var(--gold)',
                      borderRadius: '6px',
                      color: 'var(--gold)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <RefreshCw size={13} />
                    Reset
                  </button>
                )}
              </div>

              {/* Export Button */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    const headers = ['ID', 'Name', 'Slug', 'Sort Order', 'Status', 'Products Count'];
                    const csvRows = [
                      headers.join(','),
                      ...categoriesList.map((c) => {
                        const statusStr = c.is_active ? 'Active' : 'Inactive';
                        const count = c.product_count ?? products.filter((p) => p.category.toLowerCase().includes(c.slug.toLowerCase())).length;
                        return `"${c.id}","${c.name}","${c.slug}",${c.sort_order},"${statusStr}",${count}`;
                      }),
                    ];
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `chovique_categories_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    addToast('success', 'Categories exported to CSV successfully!', 'Export Complete');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 16px',
                    background: 'rgba(255, 215, 0, 0.05)',
                    border: '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '6px',
                    color: 'var(--gold)',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <UploadCloud size={15} style={{ transform: 'rotate(180deg)' }} />
                  Export ∨
                </button>
              </div>
            </div>

            {/* Filtered Count */}
            {(() => {
              const filtered = categoriesList.filter((cat) => {
                const nameMatch = cat.name.toLowerCase().includes(categorySearch.toLowerCase()) || cat.slug.toLowerCase().includes(categorySearch.toLowerCase());
                const statusMatch = categoryStatusFilter === 'all' || (categoryStatusFilter === 'active' ? cat.is_active : !cat.is_active);
                return nameMatch && statusMatch;
              });

              const totalFiltered = filtered.length;
              const totalPages = Math.ceil(totalFiltered / categoryRowsPerPage) || 1;
              const validPage = Math.min(categoryCurrentPage, totalPages);
              const startIndex = (validPage - 1) * categoryRowsPerPage;
              const paginated = filtered.slice(startIndex, startIndex + categoryRowsPerPage);

              return (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--beige)', marginBottom: '14px' }}>
                    Showing {totalFiltered > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + categoryRowsPerPage, totalFiltered)} of {totalFiltered} categories
                  </div>

                  {/* Categories Table */}
                  {isMobileGrid ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                      {paginated.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--beige)', borderRadius: '8px' }}>
                          No categories found matching your search and filter criteria.
                        </div>
                      ) : (
                        paginated.map((cat) => {
                          const liveMatchingProducts = products.filter((p) => {
                            if (!p.category) return false;
                            const pCat = p.category.toLowerCase().trim();
                            const cSlug = (cat.slug || '').toLowerCase().trim();
                            const cName = cat.name.toLowerCase().trim();
                            return (
                              pCat === cSlug || pCat === cName || pCat.includes(cSlug) ||
                              (cSlug.length > 2 && cSlug.includes(pCat)) || pCat.includes(cName) ||
                              (cName.length > 2 && cName.includes(pCat))
                            );
                          });
                          const prodCount = liveMatchingProducts.length > 0 ? liveMatchingProducts.length : (cat.product_count ?? 0);

                          return (
                            <div key={cat.id} className="glass-panel" style={{ padding: '16px', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', border: '1px solid var(--glass-border)' }}>
                              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255, 215, 0, 0.08)', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                  {cat.image_url ? (
                                    <img src={getImageUrl(cat.image_url)} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <FolderTree size={24} style={{ color: 'var(--gold)' }} />
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--beige)', marginLeft: '8px' }}>Sort: <span style={{ color: 'var(--cream)' }}>{cat.sort_order}</span></div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ color: 'var(--cream)', fontSize: '0.85rem' }}>{prodCount} <span style={{ color: 'var(--beige)' }}>products</span></div>
                                    {cat.is_active ? (
                                      <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(46, 204, 113, 0.12)', border: '1px solid rgba(46, 204, 113, 0.3)', color: '#2ecc71', fontSize: '0.75rem', fontWeight: 600 }}>Active</span>
                                    ) : (
                                      <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(231, 76, 60, 0.12)', border: '1px solid rgba(231, 76, 60, 0.3)', color: '#e74c3c', fontSize: '0.75rem', fontWeight: 600 }}>Inactive</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductCategoryFilter(cat.slug || cat.name);
                                    setProductSearch('');
                                    setProductAvailabilityFilter('all');
                                    setProductCurrentPage(1);
                                    setActiveTab('products');
                                  }}
                                  style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', color: 'var(--cream)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                  <span>👁</span> Products
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCategory({ ...cat });
                                    setEditCategoryImageFile(null);
                                    setEditCategoryImagePreview('');
                                  }}
                                  style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.3)', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                  <Edit2 size={13} /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryStatus(cat)}
                                  style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--glass-border)', color: 'var(--cream)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                  <span>{cat.is_active ? '⏸' : '▶'}</span> {cat.is_active ? 'Pause' : 'Play'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                  style={{ flex: 1, padding: '8px', borderRadius: '4px', background: 'rgba(183, 110, 121, 0.12)', border: '1px solid rgba(183, 110, 121, 0.35)', color: 'var(--rose-gold)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                >
                                  <Trash2 size={13} /> Del
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="glass-panel" style={{ padding: '0', border: '1px solid var(--glass-border)', overflowX: 'auto', background: 'rgba(10,5,0,0.4)', borderRadius: '8px', marginBottom: '20px' }}>
                      <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>NAME</th>
                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>PRODUCTS</th>
                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>SORT ORDER</th>
                            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>STATUS</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginated.length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--beige)' }}>
                                No categories found matching your search and filter criteria.
                              </td>
                            </tr>
                          ) : (
                            paginated.map((cat) => {
                              const liveMatchingProducts = products.filter((p) => {
                                if (!p.category) return false;
                                const pCat = p.category.toLowerCase().trim();
                                const cSlug = (cat.slug || '').toLowerCase().trim();
                                const cName = cat.name.toLowerCase().trim();
                                return (
                                  pCat === cSlug ||
                                  pCat === cName ||
                                  pCat.includes(cSlug) ||
                                  (cSlug.length > 2 && cSlug.includes(pCat)) ||
                                  pCat.includes(cName) ||
                                  (cName.length > 2 && cName.includes(pCat))
                                );
                              });
                              const prodCount = liveMatchingProducts.length > 0 ? liveMatchingProducts.length : (cat.product_count ?? 0);

                              return (
                                <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  {/* Category Name with Circle Avatar */}
                                  <td style={{ padding: '14px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                      <div
                                        style={{
                                          width: '42px',
                                          height: '42px',
                                          borderRadius: '50%',
                                          background: 'rgba(255, 215, 0, 0.08)',
                                          border: '1px solid var(--glass-border)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          overflow: 'hidden',
                                        }}
                                      >
                                        {cat.image_url ? (
                                          <img src={getImageUrl(cat.image_url)} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                          <FolderTree size={20} style={{ color: 'var(--gold)' }} />
                                        )}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.95rem' }}>{cat.name}</div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Product Count */}
                                  <td style={{ padding: '14px 18px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.92rem' }}>{prodCount}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--beige)' }}>products</div>
                                  </td>

                                  {/* Sort Order */}
                                  <td style={{ padding: '14px 18px', color: 'var(--cream)', fontSize: '0.9rem', fontWeight: 600 }}>
                                    {cat.sort_order}
                                  </td>

                                  {/* Active Status */}
                                  <td style={{ padding: '14px 18px' }}>
                                    {cat.is_active ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        background: 'rgba(46, 204, 113, 0.12)',
                                        border: '1px solid rgba(46, 204, 113, 0.3)',
                                        color: '#2ecc71',
                                        fontSize: '0.78rem',
                                        fontWeight: 600
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ecc71' }}></span>
                                        Active
                                      </span>
                                    ) : (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        background: 'rgba(231, 76, 60, 0.12)',
                                        border: '1px solid rgba(231, 76, 60, 0.3)',
                                        color: '#e74c3c',
                                        fontSize: '0.78rem',
                                        fontWeight: 600
                                      }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e74c3c' }}></span>
                                        Inactive
                                      </span>
                                    )}
                                  </td>

                                  {/* Actions Column (Edit button + Context Dropdown matching screenshot) */}
                                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', position: 'relative' }}>
                                      {/* Edit Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingCategory({ ...cat });
                                          setEditCategoryImageFile(null);
                                          setEditCategoryImagePreview('');
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '5px 12px',
                                          borderRadius: '4px',
                                          background: 'rgba(255, 215, 0, 0.08)',
                                          border: '1px solid rgba(255, 215, 0, 0.3)',
                                          color: 'var(--gold)',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <Edit2 size={13} />
                                        Edit
                                      </button>

                                      {/* Context Menu 3-dots Button & Dropdown Container */}
                                      <div className="category-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenCategoryMenuId(openCategoryMenuId === cat.id ? null : cat.id);
                                          }}
                                          style={{
                                            padding: '5px 9px',
                                            borderRadius: '4px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--beige)',
                                            fontSize: '0.78rem',
                                            cursor: 'pointer',
                                          }}
                                        >
                                          ⋮
                                        </button>

                                        {/* Context Menu Dropdown matching reference screenshot */}
                                        {openCategoryMenuId === cat.id && (
                                          <div
                                            style={{
                                              position: 'absolute',
                                              top: '35px',
                                              right: '0',
                                              background: 'rgba(20, 10, 5, 0.98)',
                                              border: '1px solid var(--glass-border)',
                                              borderRadius: '6px',
                                              padding: '6px 0',
                                              minWidth: '150px',
                                              zIndex: 100,
                                              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                                              textAlign: 'left',
                                            }}
                                          >
                                          {/* View Products */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenCategoryMenuId(null);
                                              setProductCategoryFilter(cat.slug || cat.name);
                                              setProductSearch('');
                                              setProductAvailabilityFilter('all');
                                              setProductCurrentPage(1);
                                              setActiveTab('products');
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              width: '100%',
                                              padding: '8px 14px',
                                              background: 'none',
                                              border: 'none',
                                              color: 'var(--cream)',
                                              fontSize: '0.82rem',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <span>👁</span>
                                            View Products
                                          </button>

                                          {/* Activate / Deactivate Toggle */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenCategoryMenuId(null);
                                              handleToggleCategoryStatus(cat);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              width: '100%',
                                              padding: '8px 14px',
                                              background: 'none',
                                              border: 'none',
                                              color: 'var(--cream)',
                                              fontSize: '0.82rem',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <span>{cat.is_active ? '⏸' : '▶'}</span>
                                            {cat.is_active ? 'Deactivate' : 'Activate'}
                                          </button>

                                          {/* Delete */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setOpenCategoryMenuId(null);
                                              handleDeleteCategory(cat.id, cat.name);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              width: '100%',
                                              padding: '8px 14px',
                                              background: 'none',
                                              border: 'none',
                                              color: 'var(--rose-gold)',
                                              fontSize: '0.82rem',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <Trash2 size={13} />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--beige)' }}>
                      Showing {totalFiltered > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + categoryRowsPerPage, totalFiltered)} of {totalFiltered} categories
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <Pagination
                        currentPage={validPage}
                        totalPages={totalPages}
                        totalItems={totalFiltered}
                        itemsPerPage={categoryRowsPerPage}
                        onPageChange={(p) => setCategoryCurrentPage(p)}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--beige)' }}>
                        <span>Rows per page:</span>
                        <select
                          value={categoryRowsPerPage}
                          onChange={(e) => {
                            setCategoryRowsPerPage(Number(e.target.value));
                            setCategoryCurrentPage(1);
                          }}
                          style={{
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '4px',
                            color: 'var(--cream)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <option value={10} style={{ background: '#120a05' }}>10</option>
                          <option value={25} style={{ background: '#120a05' }}>25</option>
                          <option value={50} style={{ background: '#120a05' }}>50</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Add Category Modal (Matching Screenshot UI with Symmetrical Fields & Batch Queue) */}
            {showAddCategoryForm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div
                  style={{
                    padding: '28px 30px',
                    maxWidth: '520px',
                    width: '100%',
                    border: '1px solid rgba(255, 215, 0, 0.45)',
                    borderRadius: '12px',
                    background: '#0e0703',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.9)',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: '#f5e6d3', margin: 0, fontWeight: 700 }}>
                      {categorySuccess ? '✓ Category Created!' : 'Add New Category'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCategoryForm(false);
                        setPendingBatchCategories([]);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--beige)', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {/* CATEGORY NAME * */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f5e6d3', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        CATEGORY NAME <span style={{ color: 'var(--gold)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dark Chocolate"
                        value={newCategory.name}
                        onChange={(e) => {
                          const slug = e.target.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
                          setNewCategory((p) => ({ ...p, name: e.target.value, slug }));
                        }}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#160c06',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          borderRadius: '6px',
                          color: '#f5e6d3',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* SLUG */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--beige)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        SLUG
                      </label>
                      <input
                        type="text"
                        placeholder="dark-chocolate"
                        value={newCategory.slug}
                        onChange={(e) => setNewCategory((p) => ({ ...p, slug: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#160c06',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          borderRadius: '6px',
                          color: 'var(--beige)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* DESCRIPTION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#f5e6d3' }}>Description</label>
                      <textarea
                        value={newCategory.description}
                        onChange={(e) => setNewCategory((p) => ({ ...p, description: e.target.value }))}
                        rows={3}
                        placeholder="Enter optional category description"
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#140a04',
                          border: '1px solid rgba(255, 215, 0, 0.2)',
                          borderRadius: '6px',
                          color: '#f5e6d3',
                          fontSize: '0.9rem',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                    </div>

                    {/* SORT ORDER */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f5e6d3', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        SORT ORDER
                      </label>
                      <input
                        type="number"
                        value={String(newCategory.sort_order)}
                        onChange={(e) => setNewCategory((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#160c06',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          borderRadius: '6px',
                          color: '#f5e6d3',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    {/* STATUS / Active Visibility */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f5e6d3', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        STATUS
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewCategory((p) => ({ ...p, is_active: !p.is_active }))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: newCategory.is_active ? '#2ecc71' : '#e74c3c',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                        }}
                      >
                        {newCategory.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                        <span>{newCategory.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </div>

                    {/* Pending Batch Categories Queue */}
                    {pendingBatchCategories.length > 0 && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '14px',
                          borderRadius: '8px',
                          background: 'rgba(201,168,76,0.08)',
                          border: '1px solid rgba(201,168,76,0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 700 }}>
                            Pending Categories Queue ({pendingBatchCategories.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setPendingBatchCategories([])}
                            style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            Clear Queue
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                          {pendingBatchCategories.map((c, idx) => (
                            <div
                              key={c.tempId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                background: 'rgba(0,0,0,0.5)',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.08)',
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '0.85rem', color: '#f5e6d3', fontWeight: 600 }}>
                                  {idx + 1}. {c.name}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--beige)' }}>
                                  Slug: {c.slug} • Sort Order: {c.sort_order} • {c.is_active ? 'Active' : 'Inactive'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleEditCategoryBatchItem(c)}
                                  style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}
                                  title="Edit"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategoryFromBatch(c.tempId)}
                                  style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }}
                                  title="Remove"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modal Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                      <Button
                        type="button"
                        variant="glass"
                        onClick={() => {
                          setShowAddCategoryForm(false);
                          setPendingBatchCategories([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddCategoryToBatch}
                        style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}
                      >
                        <Plus size={16} /> Add Another Category
                      </Button>
                      <Button variant="gold" type="submit" glow>
                        {pendingBatchCategories.length > 0
                          ? `Save All Categories (${pendingBatchCategories.length + (trimValue(newCategory.name) ? 1 : 0)})`
                          : 'Create Category'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Category Modal */}
            {editingCategory && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div
                  style={{
                    padding: '28px 30px',
                    maxWidth: '480px',
                    width: '100%',
                    border: '1px solid rgba(255, 215, 0, 0.45)',
                    borderRadius: '12px',
                    background: '#0e0703',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.9)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', color: '#f5e6d3', margin: 0, fontWeight: 700 }}>Edit Category</h2>
                    <button type="button" onClick={() => { setEditingCategory(null); setEditCategoryImageFile(null); setEditCategoryImagePreview(''); }} style={{ color: 'var(--beige)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleEditCategorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f5e6d3', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        CATEGORY NAME <span style={{ color: 'var(--gold)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory((p) => p ? { ...p, name: e.target.value } : p)}
                        required
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#160c06',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          borderRadius: '6px',
                          color: '#f5e6d3',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--beige)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        SLUG
                      </label>
                      <input
                        type="text"
                        value={editingCategory.slug}
                        onChange={(e) => setEditingCategory((p) => p ? { ...p, slug: e.target.value } : p)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#160c06',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          borderRadius: '6px',
                          color: 'var(--beige)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#f5e6d3' }}>Description</label>
                      <textarea
                        value={editingCategory.description || ''}
                        onChange={(e) => setEditingCategory((p) => p ? { ...p, description: e.target.value } : p)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#140a04',
                          border: '1px solid rgba(255, 215, 0, 0.2)',
                          borderRadius: '6px',
                          color: '#f5e6d3',
                          fontSize: '0.9rem',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'var(--font-body)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f5e6d3', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        SORT ORDER
                      </label>
                      <input
                        type="number"
                        value={String(editingCategory.sort_order)}
                        onChange={(e) => setEditingCategory((p) => p ? { ...p, sort_order: parseInt(e.target.value) || 0 } : p)}
                        style={{
                          width: '100%',
                          padding: '11px 14px',
                          background: '#160c06',
                          border: '1px solid rgba(255, 215, 0, 0.45)',
                          borderRadius: '6px',
                          color: '#f5e6d3',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                      <label style={{ fontSize: '0.88rem', color: '#f5e6d3' }}>Active Visibility</label>
                      <button
                        type="button"
                        onClick={() => setEditingCategory((p) => p ? { ...p, is_active: !p.is_active } : p)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: editingCategory.is_active ? '#2ecc71' : '#e74c3c',
                          fontSize: '0.88rem',
                          fontWeight: 600,
                        }}
                      >
                        {editingCategory.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                        <span>{editingCategory.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                      <Button type="button" variant="glass" onClick={() => { setEditingCategory(null); setEditCategoryImageFile(null); setEditCategoryImagePreview(''); }}>
                        Cancel
                      </Button>
                      <Button variant="gold" type="submit" glow>
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* REWARD SETTINGS TAB */}
        {activeTab === 'reward-settings' && <RewardCoinsView />}

        {/* REPORTS & ANALYTICS TAB */}
        {activeTab === 'reports' && <ReportsAnalyticsView />}

        {/* DELIVERY FLEET TAB */}
        {activeTab === 'delivery-boys' && (
          <DeliveryBoysView
            addToast={(msg: string, type?: 'success' | 'error' | 'info') =>
              addToast(type === 'error' ? 'error' : type === 'success' ? 'success' : 'info', msg)
            }
          />
        )}

        {/* OFFLINE SALES TAB */}
        {activeTab === 'offline-sales' && (
          <OfflineSalesView addToast={addToast} currentUserRole={role || user?.role} />
        )}

        {/* COUPONS TAB */}
        {activeTab === 'coupons' && (
          <div>
            {showCreateCouponForm ? (
              <CreateCouponView
                addToast={addToast}
                onAddCoupon={async (payload) => {
                  const created = await adminService.createCoupon(payload);
                  setCouponsList([created, ...couponsList]);
                  setShowCreateCouponForm(false);
                }}
                onCancel={() => setShowCreateCouponForm(false)}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                  <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: 0, fontWeight: 700 }}>
                      Coupons &amp; Discounts
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: 'var(--beige)', marginTop: '4px', margin: 0 }}>
                      Manage discount coupons, influencer codes, and promotional offers
                    </p>
                  </div>

                  <Button
                    variant="gold"
                    glow
                    onClick={() => setShowCreateCouponForm(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
                  >
                    <Plus size={18} />
                    CREATE COUPON
                  </Button>
                </div>

                {/* Coupons List - 2 Cards per line (6 per page) */}
                <div className="glass-panel" style={{ padding: '20px 24px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cream)', margin: 0 }}>
                        Active &amp; Past Coupons ({couponsList.length})
                      </h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--beige)' }}>
                        Displaying 2 coupons per line (6 per page)
                      </span>
                    </div>

                    {couponsList.length === 0 ? (
                      <p style={{ color: 'var(--beige)', fontSize: '0.9rem' }}>No coupons found.</p>
                    ) : (
                      <>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: '16px',
                            marginBottom: '20px',
                          }}
                        >
                          {couponsList.slice((couponsPage - 1) * 6, couponsPage * 6).map((c: any) => {
                            const isExpired = c.status === 'EXPIRED' || c.status === 'Expired' || (c.usage_limit > 0 && (c.usage_count || 0) >= c.usage_limit) || (c.expires_at ? new Date(c.expires_at) < new Date() : false);
                            const isInactive = !c.is_active || c.status === 'INACTIVE';
                            const cType = c.coupon_type || 'CUSTOMER';

                            return (
                              <div
                                key={c.id || c.code}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  padding: '16px',
                                  background: 'rgba(15, 12, 9, 0.75)',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(201, 168, 76, 0.25)',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                  gap: '12px',
                                }}
                              >
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.5px' }}>{c.code}</span>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: cType === 'INFLUENCER' ? 'rgba(155,89,182,0.2)' : 'rgba(52,152,219,0.2)', color: cType === 'INFLUENCER' ? '#9b59b6' : '#3498db', borderRadius: '4px', fontWeight: 700 }}>
                                        {cType}
                                      </span>
                                      {isExpired ? (
                                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: 'rgba(231,76,60,0.2)', color: '#e74c3c', borderRadius: '4px', fontWeight: 700 }}>
                                          EXPIRED
                                        </span>
                                      ) : isInactive ? (
                                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: 'rgba(149,165,166,0.2)', color: '#95a5a6', borderRadius: '4px', fontWeight: 700 }}>
                                          INACTIVE
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.65rem', padding: '2px 7px', background: 'rgba(46,204,113,0.2)', color: '#2ecc71', borderRadius: '4px', fontWeight: 700 }}>
                                          ACTIVE
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div style={{ fontSize: '0.82rem', color: 'var(--beige)', lineHeight: 1.4, minHeight: '36px' }}>
                                    {c.description || c.name || 'No description provided'}
                                  </div>

                                  <div style={{ fontSize: '0.85rem', color: '#2ecc71', fontWeight: 700, marginTop: '8px' }}>
                                    {c.discount_type === 'PERCENTAGE' ? `${c.discount_percent}% OFF` : c.discount_type === 'FIXED_AMOUNT' ? `₹${c.discount_amount} OFF` : 'FREE SHIPPING'}
                                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', marginLeft: '8px', fontWeight: 400 }}>
                                      (Used: {c.usage_count || 0})
                                    </span>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <button 
                                    onClick={() => setEditingCoupon({ ...c })}
                                    style={{ flex: 1, background: 'rgba(201,168,76,0.12)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    title="Edit Coupon"
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCoupon(c.code)}
                                    style={{ flex: 1, background: 'rgba(231,76,60,0.12)', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                    title="Delete Coupon"
                                  >
                                    <Trash2 size={13} /> Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {couponsList.length > 6 && (
                          <div style={{ marginTop: '16px' }}>
                            <Pagination
                              currentPage={couponsPage}
                              totalPages={Math.ceil(couponsList.length / 6)}
                              totalItems={couponsList.length}
                              itemsPerPage={6}
                              onPageChange={(p) => setCouponsPage(p)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                {/* Edit Coupon Modal */}
                {editingCoupon && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '30px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.95)' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--gold)', marginBottom: '20px' }}>
                        Edit Coupon: {editingCoupon.code}
                      </h3>
                      <form onSubmit={handleUpdateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <Input 
                          label="Description" 
                          value={editingCoupon.description || ''} 
                          onChange={e => setEditingCoupon({...editingCoupon, description: e.target.value})}
                          required
                        />
                        <Input 
                          label="Discount Percent (%)" 
                          type="number"
                          min={1}
                          max={100}
                          value={editingCoupon.discount_percent || 0} 
                          onChange={e => setEditingCoupon({...editingCoupon, discount_percent: parseFloat(e.target.value) || 0})}
                          required
                        />
                        <Input 
                          label="Expiry Date (Required)" 
                          type="date"
                          value={editingCoupon.expires_at ? editingCoupon.expires_at.slice(0, 10) : ''} 
                          onChange={e => setEditingCoupon({...editingCoupon, expires_at: e.target.value})}
                          required
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                          <input 
                            type="checkbox"
                            id="coupon-active-check"
                            checked={editingCoupon.is_active ?? true}
                            onChange={e => setEditingCoupon({...editingCoupon, is_active: e.target.checked})}
                          />
                          <label htmlFor="coupon-active-check" style={{ color: 'var(--cream)', fontSize: '0.9rem', cursor: 'pointer' }}>
                            Active Status (Check to enable coupon)
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '15px' }}>
                          <Button variant="gold" type="submit" style={{ flex: 1 }}>Save Changes</Button>
                          <button 
                            type="button"
                            onClick={() => setEditingCoupon(null)}
                            style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--grey-mid)', color: 'var(--cream)', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* REVENUE TAB */}
        {activeTab === 'revenue' && (
          <div>
            <span className="section-label">Enterprise</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--cream)', marginBottom: '35px' }}>
              Revenue Analytics
            </h1>
            
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', marginBottom: '20px' }}>Sales Over Time</h3>
              {dashboardStats?.monthly_revenue ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  {dashboardStats.monthly_revenue.map((m: any, i: number) => (
                    <div key={i} style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--beige)', fontSize: '0.9rem', marginBottom: '8px' }}>{m.month}</div>
                      <div style={{ color: 'var(--gold)', fontSize: '1.2rem', fontWeight: 'bold' }}>₹{m.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--beige)' }}>Loading revenue data...</p>
              )}
            </div>
          </div>
        )}

        {/* SALES COMPARISON TAB */}
        {activeTab === 'sales-comparison' && (
          <div>
            <span className="section-label">Enterprise</span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: 'var(--cream)', marginBottom: '35px' }}>
              Top Products & Sales
            </h1>
            
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', marginBottom: '20px' }}>Top Selling Products</h3>
              {dashboardStats?.top_products ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dashboardStats.top_products.map((p: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: 'var(--cream)' }}>{p.product_name}</span>
                      <span style={{ color: 'var(--gold)', fontWeight: 'bold' }}>{p.units_sold} units</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--beige)' }}>Loading product sales data...</p>
              )}
            </div>
          </div>
        )}

        {/* ORDER MANAGEMENT TAB */}
        {activeTab === 'orders' && (
          <div>
            <OrderManagement
              addToast={addToast}
              handleUpdateOrderStatus={handleUpdateOrderStatus}
            />
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div>
            <CustomerDirectory
              systemUsers={systemUsers}
              adminOrders={adminOrders}
              addToast={addToast}
              onRefreshUsers={fetchCustomersList}
            />
          </div>
        )}

        {/* HOMEPAGE CMS & BANNER MANAGEMENT TAB */}
        {activeTab === 'home-mgmt' && (
          <div>
            <div style={{ display: 'flex', flexDirection: isMobileGrid ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileGrid ? 'flex-start' : 'center', marginBottom: '30px', gap: '12px' }}>
              <div>
                <span className="section-label">Website Settings</span>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--cream)', margin: 0, lineHeight: 1.2 }}>
                  Homepage Banners &amp; Setup
                </h1>
              </div>
              <Button variant="gold" glow onClick={() => setShowAddBannerModal(!showAddBannerModal)} style={{ width: isMobileGrid ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}>
                {showAddBannerModal ? <X size={16} /> : <Plus size={16} />}
                <span style={{ marginLeft: '8px' }}>{showAddBannerModal ? 'Close Form' : 'Add Banner'}</span>
              </Button>
            </div>

            {/* Expandable Add Banner Form */}
            <AnimatePresence>
              {showAddBannerModal && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: '30px' }}>
                  <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--gold)', background: 'rgba(26,13,0,0.85)', borderRadius: '12px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', marginBottom: '16px', fontSize: '1.3rem' }}>
                      Add New Banner
                    </h3>
                    <form onSubmit={handleCreateNewBanner} style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 1fr', gap: '16px' }}>
                      <Input label="Main Heading / Title" required placeholder="Handcrafted Chocolate Masterpieces" value={newBannerData.title} onChange={(e) => setNewBannerData({ ...newBannerData, title: e.target.value })} />
                      <Input label="Subtitle Description" required placeholder="Made with Ghanaian cocoa mass..." value={newBannerData.subtitle} onChange={(e) => setNewBannerData({ ...newBannerData, subtitle: e.target.value })} />
                      <Input label="Category Tag (e.g. Artisanal Series)" required placeholder="Artisanal Series" value={newBannerData.tag} onChange={(e) => setNewBannerData({ ...newBannerData, tag: e.target.value })} />
                      <Input label="Button Label (CTA)" required placeholder="Explore Collection" value={newBannerData.buttonText} onChange={(e) => setNewBannerData({ ...newBannerData, buttonText: e.target.value })} />
                      <Input label="Target Link URL" required placeholder="/products" value={newBannerData.link} onChange={(e) => setNewBannerData({ ...newBannerData, link: e.target.value })} />
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>Banner Image File:</span>
                        <input required ref={newBannerFileInputRef} type="file" accept="image/*" onChange={(e) => setNewBannerImageFile(e.target.files?.[0] || null)} style={{ marginTop: '6px', background: 'rgba(0,0,0,0.3)', color: 'var(--cream)', padding: '6px', width: '100%', borderRadius: '4px' }} />
                      </div>
                      {bannerCreateError && (
                        <p style={{ gridColumn: isMobileGrid ? 'span 1' : 'span 2', color: 'var(--rose-gold)', fontSize: '0.85rem', margin: 0 }}>{bannerCreateError}</p>
                      )}
                      <div style={{ gridColumn: isMobileGrid ? 'span 1' : 'span 2', display: 'flex', gap: '12px', marginTop: '10px' }}>
                        <Button variant="gold" type="submit" glow disabled={isCreatingBanner}>{isCreatingBanner ? 'Creating Banner...' : 'Create Banner'}</Button>
                        <Button variant="glass" type="button" onClick={() => setShowAddBannerModal(false)}>Cancel</Button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Banner Slides List & Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1fr 2fr', gap: '24px', marginBottom: '40px' }}>
              {/* Slide selector list */}
              <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--glass-border)' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', marginBottom: '16px', fontSize: '1.1rem' }}>Current Banners ({banners?.length || 0})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr 1fr' : '1fr', gap: '10px' }}>
                  {banners?.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      onClick={() => setSelectedSlideIdx(idx)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        background: selectedSlideIdx === idx ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.03)',
                        border: selectedSlideIdx === idx ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        minWidth: 0,
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Slide label + title */}
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slide {idx + 1}</span>
                        <p style={{ margin: '3px 0 0 0', color: 'var(--cream)', fontWeight: 600, fontSize: '0.82rem', wordBreak: 'break-word', lineHeight: 1.3 }}>{b.title}</p>
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingBanner(b); }}
                          style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--gold)', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', cursor: 'pointer', padding: '5px 8px', fontSize: '0.75rem', transition: 'all 0.2s' }}
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBanner(b.id); }}
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--rose-gold)', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', cursor: 'pointer', padding: '5px 8px', transition: 'all 0.2s' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Details & Image Upload */}
              {selectedBanner ? (
                <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
                  {/* Slide Title Row with Inline Nav Buttons */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.1rem', margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
                        Slide {selectedSlideIdx + 1}: {selectedBanner.title}
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: 'var(--beige)', marginTop: '2px', display: 'block' }}>{selectedBanner.tag}</span>
                    </div>
                    {/* Left / Right nav buttons — inline side by side */}
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', flexShrink: 0, marginTop: '2px' }}>
                      <button
                        onClick={() => setSelectedSlideIdx(Math.max(0, selectedSlideIdx - 1))}
                        disabled={selectedSlideIdx === 0}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px 10px', color: selectedSlideIdx === 0 ? 'rgba(255,255,255,0.2)' : 'var(--gold)', cursor: selectedSlideIdx === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setSelectedSlideIdx(Math.min((banners?.length || 1) - 1, selectedSlideIdx + 1))}
                        disabled={selectedSlideIdx === (banners?.length || 1) - 1}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px 10px', color: selectedSlideIdx === (banners?.length || 1) - 1 ? 'rgba(255,255,255,0.2)' : 'var(--gold)', cursor: selectedSlideIdx === (banners?.length || 1) - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <p style={{ color: 'var(--cream)', fontSize: '0.9rem', marginBottom: '16px', lineHeight: 1.5 }}>{selectedBanner.subtitle}</p>
                  
                  {selectedBanner.image && (
                    <div style={{ marginBottom: '20px', borderRadius: '8px', overflow: 'hidden', height: '200px', border: '1px solid var(--glass-border)' }}>
                      <img src={getImageUrl(selectedBanner.image)} alt={selectedBanner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ marginTop: 'auto' }}>
                    <input ref={bannerFileRef} type="file" accept="image/*" onChange={handleBannerFileUpload} style={{ display: 'none' }} />
                    <Button variant="gold" glow onClick={() => bannerFileRef.current?.click()} disabled={isReplacingBannerImage} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                      <UploadCloud size={16} className={isReplacingBannerImage ? 'animate-spin' : ''} />
                      {isReplacingBannerImage ? 'Uploading & Replacing...' : 'Replace Slide Image'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--beige)' }}>
                  No hero banners available. Click "Add Banner" above to create one.
                </div>
              )}
            </div>

            {/* Platform Counter Stats Manager */}
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)', marginBottom: '30px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', marginBottom: '10px' }}>
                Website Statistics Counters
              </h3>
              <p style={{ color: 'var(--beige)', fontSize: '0.85rem', marginBottom: '16px' }}>
                Manage the live statistics shown on your homepage.
              </p>
              <form onSubmit={handleSaveSiteStatsSubmit} style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap: '16px', alignItems: 'flex-end' }}>
                <Input label="Happy Customers" type="number" value={siteStats.happy_customers} onChange={(e) => setSiteStats({ ...siteStats, happy_customers: parseInt(e.target.value) || 0 })} />
                <Input label="Products Available" type="number" value={siteStats.products_available} onChange={(e) => setSiteStats({ ...siteStats, products_available: parseInt(e.target.value) || 0 })} />
                <Input label="Orders Delivered" type="number" value={siteStats.orders_delivered} onChange={(e) => setSiteStats({ ...siteStats, orders_delivered: parseInt(e.target.value) || 0 })} />
                <Input label="Customer Rating %" type="number" value={siteStats.customer_rating_percent} onChange={(e) => setSiteStats({ ...siteStats, customer_rating_percent: parseInt(e.target.value) || 0 })} />
                <div style={{ gridColumn: isMobileGrid ? 'span 2' : 'span 4', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <Button variant="gold" type="submit" glow disabled={isSavingStats} style={{ height: '42px', width: isMobileGrid ? '100%' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    {isSavingStats ? <Loader2 size={18} className="animate-spin" /> : statsSavedSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
                    {isSavingStats ? 'Saving Stats...' : statsSavedSuccess ? 'Counter Stats Saved!' : 'Save Counter Stats'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Instagram Reels Showcase Manager */}
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', flexDirection: isMobileGrid ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileGrid ? 'flex-start' : 'center', marginBottom: '20px', gap: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', margin: 0 }}>
                    Instagram Video Showcase ({cmsReels.length})
                  </h3>
                  <p style={{ color: 'var(--beige)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Manage the videos shown in the Instagram section of your homepage.
                  </p>
                </div>
                <Button variant="gold" size="sm" glow onClick={() => setShowAddReelModal(!showAddReelModal)} style={{ width: isMobileGrid ? '100%' : 'auto', display: 'flex', justifyContent: 'center' }}>
                  {showAddReelModal ? <X size={16} /> : <Video size={16} />}
                  <span style={{ marginLeft: '8px' }}>{showAddReelModal ? 'Close Form' : 'Add Reel'}</span>
                </Button>
              </div>

              {showAddReelModal && (
                <form
                  onSubmit={handleCreateReelSubmit}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    marginBottom: '24px',
                    padding: isMobileGrid ? '16px' : '22px',
                    background: 'linear-gradient(135deg, rgba(20,15,10,0.85) 0%, rgba(30,20,15,0.7) 100%)',
                    borderRadius: '14px',
                    border: '1px solid rgba(201,168,76,0.35)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Form Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={18} style={{ color: 'var(--gold)' }} />
                      <span style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.95rem' }}>Add New Instagram Video</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--gold)', background: 'rgba(201,168,76,0.12)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.25)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <Zap size={12} /> Instant Reel Extraction
                    </span>
                  </div>

                  {/* Instagram URL Input + Auto-Fetch Button Row */}
                  <div>
                    <label
                      htmlFor="new-reel-url"
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'var(--beige)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        marginBottom: '8px',
                      }}
                    >
                      Instagram Reel / Post URL <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 600 }}>*</span>
                    </label>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: isMobileGrid ? 'column' : 'row',
                        alignItems: isMobileGrid ? 'stretch' : 'center',
                        gap: '10px',
                        width: '100%',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, width: isMobileGrid ? '100%' : 'auto' }}>
                        <Input
                          id="new-reel-url"
                          required
                          placeholder="https://www.instagram.com/reel/DdQYj55v0dr/ or post link"
                          value={newReelData.instagram_url}
                          containerStyle={{ marginBottom: 0 }}
                          style={{ height: '46px', fontSize: '0.9rem' }}
                          onChange={(e) => {
                            const val = e.target.value;
                            let extractedAccount = newReelData.account_name;
                            const match = val.match(/instagram\.com\/([a-zA-Z0-9._]+)\/(?:reel|p)\//i);
                            if (match && match[1] && !['reel', 'p', 'tv'].includes(match[1].toLowerCase())) {
                              extractedAccount = `@${match[1]}`;
                            }
                            setNewReelData({ ...newReelData, instagram_url: val, account_name: extractedAccount });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAutoFetchReelMeta(newReelData.instagram_url);
                            }
                          }}
                        />
                      </div>

                      <Button
                        variant="gold"
                        type="button"
                        size="sm"
                        glow
                        disabled={isFetchingReelMeta || !newReelData.instagram_url.trim()}
                        onClick={() => handleAutoFetchReelMeta(newReelData.instagram_url)}
                        style={{
                          height: '46px',
                          width: isMobileGrid ? '100%' : 'auto',
                          minWidth: isMobileGrid ? '100%' : '200px',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          letterSpacing: '0.5px',
                          borderRadius: '4px',
                          boxShadow: isFetchingReelMeta ? 'none' : '0 2px 12px rgba(201, 168, 76, 0.3)',
                        }}
                      >
                        {isFetchingReelMeta ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Fetching Details...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            <span>Auto-Fetch Details</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Status notifications */}
                    {isFetchingReelMeta && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(201,168,76,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          fontSize: '0.82rem',
                          color: 'var(--gold)',
                        }}
                      >
                        <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
                        <span>Connecting to Instagram... Resolving direct video MP4 and account handle.</span>
                      </div>
                    )}

                    {fetchReelSuccessMsg && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(46, 204, 113, 0.12)',
                          border: '1px solid rgba(46, 204, 113, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.84rem',
                          color: '#2ecc71',
                          fontWeight: 600,
                        }}
                      >
                        <span>✓</span>
                        <span>{fetchReelSuccessMsg}</span>
                      </div>
                    )}

                    {fetchReelErrorMsg && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: 'rgba(231, 76, 60, 0.12)',
                          border: '1px solid rgba(231, 76, 60, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.82rem',
                          color: '#e74c3c',
                        }}
                      >
                        <span>⚠️</span>
                        <span>{fetchReelErrorMsg}</span>
                      </div>
                    )}

                    <p style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8, margin: '8px 0 0 0' }}>
                      Paste any public Instagram reel or post link. Clicking <strong>Auto-Fetch Details</strong> automatically extracts the creator account and high-speed playable video.
                    </p>
                  </div>

                  {/* Account Name Field */}
                  <div>
                    <Input
                      label="Account Holder Account Name / Handle *"
                      required
                      placeholder="@choviqueofficial"
                      value={newReelData.account_name}
                      containerStyle={{ marginBottom: 0 }}
                      style={{ height: '46px', fontSize: '0.9rem' }}
                      onChange={(e) => setNewReelData({ ...newReelData, account_name: e.target.value })}
                    />
                  </div>

                  {/* Video Live Preview if fetched */}
                  {newReelData.video_url && (newReelData.video_url.endsWith('.mp4') || newReelData.video_url.includes('cloudinary') || newReelData.video_url.includes('mixkit') || newReelData.video_url.includes('fbcdn')) && (
                    <div
                      style={{
                        padding: '14px',
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: '10px',
                        border: '1px solid rgba(201,168,76,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          🎬 Video Stream Preview Verified
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#2ecc71', fontWeight: 600 }}>Ready to Publish</span>
                      </div>
                      <video
                        src={newReelData.video_url}
                        controls
                        muted
                        playsInline
                        style={{ width: '100%', maxHeight: '220px', borderRadius: '8px', background: '#000', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  {/* Optional Custom File Upload */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--beige)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Or Upload Custom Video File (Optional fallback):
                    </span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setNewReelVideoFile(e.target.files?.[0] || null)}
                      style={{
                        color: 'var(--cream)',
                        fontSize: '0.82rem',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        border: '1px dashed rgba(201,168,76,0.25)',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Publish Error Message Banner */}
                  {createReelErrorMsg && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: 'rgba(231, 76, 60, 0.15)',
                        border: '1px solid #e74c3c',
                        color: '#e74c3c',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>⚠️</span>
                      <span>{createReelErrorMsg}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: isMobileGrid ? 'wrap' : 'nowrap' }}>
                    <Button
                      variant="gold"
                      type="submit"
                      size="sm"
                      glow
                      disabled={isCreatingReel || isFetchingReelMeta}
                      style={{
                        height: '44px',
                        minWidth: '150px',
                        width: isMobileGrid ? '100%' : 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontWeight: 600,
                      }}
                    >
                      {isCreatingReel ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Publishing Reel...</span>
                        </>
                      ) : (
                        <>
                          <Video size={16} />
                          <span>Publish Reel</span>
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      size="sm"
                      onClick={() => {
                        setShowAddReelModal(false);
                        setFetchReelSuccessMsg('');
                        setFetchReelErrorMsg('');
                        setCreateReelErrorMsg('');
                      }}
                      style={{
                        height: '44px',
                        width: isMobileGrid ? '100%' : 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {/* Reels Grid — Clean cards showing Account Name and Instagram Redirect */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {cmsReels.map((reel) => {
                  const reelLink = reel.instagramUrl || reel.instagram_url || reel.videoUrl || reel.video_url || 'https://instagram.com';
                  const account = reel.accountName || reel.account_name || '@chovique_chocolatier';

                  return (
                    <div key={reel.id} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      {/* Instagram gradient icon */}
                      <div style={{ flexShrink: 0, width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                        </svg>
                      </div>
                      {/* Account Name + Link */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.88rem', margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {account}
                        </p>
                        <a
                          href={reelLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: 'var(--gold)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <span>Open on Instagram</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      {/* Action Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => { setEditingReel(reel); setEditingReelVideoFile(null); }}
                          title="Edit reel"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteReelSubmit(reel.id, account)}
                          title="Delete reel"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', color: 'var(--rose-gold)', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* HELP & COMPLAINTS PANEL */}
        {activeTab === 'complaints' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span className="section-label">Support Helpdesk</span>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobileGrid ? '1.6rem' : '2.2rem', color: 'var(--cream)', margin: '4px 0 0 0', lineHeight: 1.2 }}>
                  Customer Support Ledger
                </h1>
              </div>
              <Button
                variant="glass"
                onClick={() => exportToCSV('Customer_Complaints_Ledger', tickets)}
                disabled={tickets.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c' }}
              >
                <FileSpreadsheet size={15} /> Export CSV
              </Button>
            </div>

            {/* Support Ticket Summary Counters */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
              <div className="glass-panel" style={{ padding: '12px 14px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Complaints</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0' }}>{tickets.length}</h3>
              </div>
              <div className="glass-panel" style={{ padding: '12px 14px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Resolution</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0', color: 'var(--rose-gold)' }}>
                  {tickets.filter(t => t.status === 'Pending').length}
                </h3>
              </div>
              <div className="glass-panel" style={{ padding: '12px 14px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resolved Issues</span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '2px 0 0 0', color: '#2ecc71' }}>
                  {tickets.filter(t => t.status === 'Resolved').length}
                </h3>
              </div>
            </div>

            {/* Support Ticket Directory List (2 Cards per line, 6 per page) */}
            <div className="glass-panel" style={{ padding: '14px 18px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)', margin: 0 }}>
                  Support Complaints Log ({tickets.length})
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--beige)' }}>
                  Displaying 2 complaints per line (6 per page)
                </span>
              </div>

              <div>
                {tickets.length === 0 ? (
                  <p style={{ color: 'var(--grey-light)', fontStyle: 'italic', padding: '16px', textAlign: 'center' }}>
                    No customer complaints registered.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                      gap: '16px',
                      marginBottom: '20px',
                    }}
                  >
                    {tickets.slice((complaintsPage - 1) * 6, complaintsPage * 6).map((t) => {
                      const isClosedOrResolved = t.status === 'Resolved' || t.status === 'Closed';
                      const currentSelectedStatus = ticketStatusMap[t.id] ?? t.status;
                      return (
                        <div
                          key={t.id}
                          style={{
                            padding: '14px 16px',
                            background: 'rgba(12, 10, 8, 0.75)',
                            borderRadius: '10px',
                            borderLeft: isClosedOrResolved ? '4px solid #2ecc71' : '4px solid var(--gold)',
                            borderTop: '1px solid var(--glass-border)',
                            borderRight: '1px solid var(--glass-border)',
                            borderBottom: '1px solid var(--glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '10px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', flexDirection: isMobileGrid ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileGrid ? 'flex-start' : 'flex-start', gap: '8px', marginBottom: '10px' }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 700, wordBreak: 'break-all' }}>
                                  {t.id} · {t.category}
                                </span>
                                <h4 style={{ margin: '4px 0 0 0', color: 'var(--cream)', fontSize: isMobileGrid ? '0.95rem' : '1.05rem', wordBreak: 'break-word' }}>
                                  {t.customerName} ({t.customerId})
                                </h4>
                              </div>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  alignSelf: isMobileGrid ? 'flex-start' : 'flex-start',
                                  background: isClosedOrResolved ? 'rgba(46, 204, 113, 0.15)' : 'rgba(201, 168, 76, 0.15)',
                                  color: isClosedOrResolved ? '#2ecc71' : 'var(--gold)',
                                  border: `1px solid ${isClosedOrResolved ? '#2ecc71' : 'var(--gold)'}`,
                                }}
                              >
                                {t.status}
                              </span>
                            </div>

                            {/* Stored Order Relationship Display */}
                            {(() => {
                              const relatedOrderId = t.orderId || t.order_id;
                              return relatedOrderId ? (
                                <div style={{ margin: '4px 0 10px 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--beige)' }}>
                                    Order: <strong style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>#{relatedOrderId}</strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const ord = await orderService.getOrder(relatedOrderId);
                                        setViewingComplaintOrder(ord);
                                      } catch (err: any) {
                                        addToast('error', err?.detail || err?.message || 'Failed to load related order details.', 'Order Error');
                                      }
                                    }}
                                    style={{
                                      padding: '2px 8px',
                                      fontSize: '0.72rem',
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
                                    <ExternalLink size={12} /> View Order
                                  </button>
                                </div>
                              ) : (
                                <div style={{ margin: '4px 0 10px 0', fontSize: '0.78rem', color: 'var(--grey-light)', fontStyle: 'italic' }}>
                                  No related order
                                </div>
                              );
                            })()}

                            <p style={{ fontSize: '0.88rem', color: 'var(--beige)', lineHeight: '1.45', margin: '0 0 10px 0' }}>
                              {t.description}
                            </p>

                            {t.adminNotes && (
                              <div
                                style={{
                                  padding: '10px',
                                  background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid var(--glass-border)',
                                  borderRadius: '4px',
                                  fontSize: '0.82rem',
                                  color: 'var(--cream)',
                                  marginBottom: '10px',
                                }}
                              >
                                <span style={{ color: 'var(--gold)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                  Admin Resolution Notes:
                                </span>
                                {t.adminNotes}
                              </div>
                            )}

                            {t.customerResolutionFeedback && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: t.customerResolutionFeedback === 'Resolved' ? '#2ecc71' : 'var(--rose-gold)', marginTop: '6px', marginBottom: '10px' }}>
                                <span style={{ fontWeight: 600 }}>Customer Feedback:</span>
                                <span>{t.customerResolutionFeedback === 'Resolved' ? 'Confirmed Resolved ✓' : 'Reported Unresolved ✗'}</span>
                              </div>
                            )}
                          </div>

                          {!isClosedOrResolved && (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const form = e.currentTarget;
                                const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                                const action = (e.nativeEvent as any).submitter.name;
                                
                                if (action === 'update_status') {
                                  const status = currentSelectedStatus;
                                  try {
                                    await updateSupportTicketStatus(t.id, status, notes);
                                    addToast('success', `Ticket ${t.id} status updated to ${status}. Customer notified.`, 'Status Updated');
                                  } catch (err: any) {
                                    addToast('error', err?.detail || err?.message || 'Failed to update ticket status.', 'Update Error');
                                    setTicketStatusMap((prev) => ({ ...prev, [t.id]: t.status }));
                                  }
                                } else if (action === 'resolve') {
                                  try {
                                    await resolveSupportTicket(t.id, notes);
                                    addToast('success', `Ticket ${t.id} resolved and customer notified.`, 'Ticket Resolved');
                                  } catch (err: any) {
                                    addToast('error', err?.detail || err?.message || 'Failed to resolve ticket. Ensure you have updated the status at least twice.', 'Resolve Error');
                                  }
                                }
                              }}
                              style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}
                            >
                              {/* Status dropdown */}
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--beige)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Update Status
                                </label>
                                <select
                                  name="status"
                                  value={currentSelectedStatus}
                                  onChange={(e) => setTicketStatusMap((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: 'rgba(0,0,0,0.35)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '6px',
                                    color: 'var(--cream)',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Under Review">Under Review</option>
                                  <option value="In Progress">In Progress</option>
                                  <option value="Awaiting Customer Response">Awaiting Response</option>
                                  <option value="Investigating">Investigating</option>
                                  <option value="Resolved">Resolved</option>
                                  <option value="Closed">Closed</option>
                                </select>
                              </div>
                              {/* Notes */}
                              <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--beige)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Admin Notes (Optional)
                                </label>
                                <textarea
                                  key={t.adminNotes || 'notes'}
                                  name="notes"
                                  defaultValue={t.adminNotes || ''}
                                  placeholder="How is this issue being handled..."
                                  rows={2}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: 'rgba(0,0,0,0.35)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '6px',
                                    color: 'var(--cream)',
                                    fontSize: '0.82rem',
                                    outline: 'none',
                                    resize: 'none',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              {/* Action buttons */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <Button variant="secondary" size="sm" type="submit" name="update_status" style={{ flex: '1 1 100px', fontSize: '0.78rem' }}>
                                  Update Status
                                </Button>
                                <Button variant="gold" size="sm" type="submit" name="resolve" glow style={{ flex: '1 1 120px', display: 'flex', justifyContent: 'center', fontSize: '0.78rem' }}>
                                  Resolve Issue
                                </Button>
                              </div>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {tickets.length > 6 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={complaintsPage}
                    totalPages={Math.ceil(tickets.length / 6)}
                    totalItems={tickets.length}
                    itemsPerPage={6}
                    onPageChange={(p) => setComplaintsPage(p)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* REVIEWS & SOCIAL PROOF TAB */}
        {activeTab === 'testimonials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header Section */}
            <div style={{ boxSizing: 'border-box', width: '100%' }}>
              <span className="section-label">Content &amp; Moderation</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobileGrid ? '1.6rem' : '2.2rem', color: 'var(--cream)', margin: '4px 0 6px 0', fontWeight: 700, lineHeight: 1.2 }}>
                Reviews &amp; Testimonials
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--beige)', margin: '0 0 16px 0', whiteSpace: 'normal', wordBreak: 'break-word', maxWidth: '100%', boxSizing: 'border-box' }}>
                Manage verified customer product reviews and homepage testimonials.
              </p>

              {/* Sub-tab Navigation + About Page Video Trigger Button */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setReviewSubTab('product_reviews')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: reviewSubTab === 'product_reviews' ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                      color: reviewSubTab === 'product_reviews' ? '#0a0806' : 'var(--cream)',
                      border: reviewSubTab === 'product_reviews' ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                      boxShadow: reviewSubTab === 'product_reviews' ? '0 0 14px rgba(212, 175, 55, 0.3)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Star size={16} fill={reviewSubTab === 'product_reviews' ? '#0a0806' : 'none'} />
                    Product Reviews ({reviewsList.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewSubTab('site_testimonials')}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: reviewSubTab === 'site_testimonials' ? 'var(--gold)' : 'rgba(255,255,255,0.04)',
                      color: reviewSubTab === 'site_testimonials' ? '#0a0806' : 'var(--cream)',
                      border: reviewSubTab === 'site_testimonials' ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                      boxShadow: reviewSubTab === 'site_testimonials' ? '0 0 14px rgba(212, 175, 55, 0.3)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <MessageSquare size={16} />
                    Customer Testimonials ({testimonialsList.length})
                  </button>
                </div>

                {/* About Page Video Trigger Button */}
                <Button
                  variant={showAboutVideoCard ? 'gold' : 'glass'}
                  glow={showAboutVideoCard}
                  onClick={() => setShowAboutVideoCard((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '1px solid var(--gold)',
                    color: showAboutVideoCard ? '#0a0806' : 'var(--gold)',
                  }}
                >
                  <Video size={16} />
                  {showAboutVideoCard ? 'Close About Page Video' : 'About Page Video'}
                </Button>
              </div>
            </div>

            {/* SEPARATE CARD: ABOUT PAGE VIDEO MANAGEMENT */}
            {showAboutVideoCard && (
              <div
                className="glass-panel"
                style={{
                  padding: isMobileGrid ? '18px' : '24px',
                  border: '1px solid var(--gold)',
                  borderRadius: '12px',
                  background: 'rgba(20, 13, 8, 0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={20} style={{ color: 'var(--gold)' }} />
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--gold)', margin: 0 }}>
                        Our Story / About Page Craft Video
                      </h3>
                    </div>
                    <p style={{ color: 'var(--beige)', fontSize: '0.82rem', margin: '6px 0 0 0', lineHeight: 1.4 }}>
                      Upload or replace the crafting video displayed in the <strong style={{ color: 'var(--cream)' }}>Our Story</strong> page. The video uploaded here is automatically displayed on the About page.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link
                      to="/about"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--gold)',
                        textDecoration: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(212, 175, 55, 0.4)',
                        background: 'rgba(212, 175, 55, 0.08)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ExternalLink size={12} /> View Live on About Page
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowAboutVideoCard(false)}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        color: 'var(--cream)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
                  {/* Left: Video Player */}
                  <div style={{ background: '#000', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(212, 175, 55, 0.25)', padding: '12px' }}>
                    {storyVideoUrl ? (
                      <>
                        <video
                          src={storyVideoUrl}
                          controls
                          style={{ width: '100%', maxHeight: '240px', borderRadius: '6px', objectFit: 'contain', background: '#000' }}
                        />
                        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--beige)' }}>
                            Live Source: <code style={{ color: 'var(--gold)' }}>{storyVideoUrl.slice(0, 38)}...</code>
                          </span>
                          <button
                            type="button"
                            onClick={handleDeleteStoryVideo}
                            style={{
                              background: 'rgba(231,76,60,0.15)',
                              border: '1px solid rgba(231,76,60,0.4)',
                              color: '#ff6b6b',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '0.74rem',
                              cursor: 'pointer',
                            }}
                          >
                            Reset to Default
                          </button>
                        </div>
                      </>
                    ) : (
                      <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', gap: '8px', textAlign: 'center', padding: '20px' }}>
                        <Video size={36} style={{ color: 'var(--gold)', opacity: 0.5 }} />
                        <span style={{ fontSize: '0.85rem' }}>Default Craft Video is currently active</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Upload an MP4 or WebM video to display custom footage</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Upload Form */}
                  <form onSubmit={handleUploadStoryVideo} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '18px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        {storyVideoUrl ? 'Upload New Video to Replace Current' : 'Select Video File'}
                      </label>
                      <p style={{ fontSize: '0.75rem', color: 'var(--beige)', margin: '0 0 10px 0' }}>
                        Supported formats: MP4, WebM, MOV, OGG (Maximum 100MB)
                      </p>
                      <input
                        type="file"
                        accept="video/*"
                        required
                        onChange={(e) => setStoryVideoFile(e.target.files?.[0] || null)}
                        style={{ color: 'var(--cream)', fontSize: '0.82rem', width: '100%' }}
                      />
                      {storyVideoFile && (
                        <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--gold)' }}>
                          Selected: {storyVideoFile.name} ({(storyVideoFile.size / (1024 * 1024)).toFixed(1)} MB)
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                      <Button
                        variant="gold"
                        type="submit"
                        disabled={uploadingStoryVideo || !storyVideoFile}
                        glow
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '0.84rem' }}
                      >
                        {uploadingStoryVideo ? (
                          <>
                            <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                            Uploading &amp; Publishing...
                          </>
                        ) : (
                          <>
                            <UploadCloud size={15} />
                            Upload to About Page
                          </>
                        )}
                      </Button>

                      <Button
                        variant="glass"
                        type="button"
                        onClick={() => {
                          setStoryVideoFile(null);
                          setShowAboutVideoCard(false);
                        }}
                        style={{ fontSize: '0.84rem' }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* SUBTAB 1: PRODUCT REVIEWS MODERATION */}
            {reviewSubTab === 'product_reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Metrics Summary Row */}
                {(() => {
                  const pendingCount = reviewsList.filter((r) => (r.status || 'approved').toLowerCase() === 'pending').length;
                  const approvedCount = reviewsList.filter((r) => (r.status || 'approved').toLowerCase() === 'approved').length;
                  const mediaCount = reviewsList.filter((r) => (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)).length;

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '14px' }}>
                      <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                          Total Reviews
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--cream)' }}>
                          {reviewsList.length}
                        </div>
                      </div>

                      <div className="glass-panel" style={{ padding: '16px', border: pendingCount > 0 ? '1px solid rgba(240, 190, 60, 0.5)' : '1px solid var(--glass-border)', borderRadius: '10px', background: pendingCount > 0 ? 'rgba(240, 190, 60, 0.05)' : undefined }}>
                        <div style={{ fontSize: '0.74rem', color: pendingCount > 0 ? '#e0b040' : 'var(--beige)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> Pending Moderation
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: pendingCount > 0 ? '#e0b040' : 'var(--cream)' }}>
                          {pendingCount}
                        </div>
                      </div>

                      <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.74rem', color: '#6fbf6f', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={12} /> Approved
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#6fbf6f' }}>
                          {approvedCount}
                        </div>
                      </div>

                      <div className="glass-panel" style={{ padding: '16px', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Camera size={12} /> Customer Media
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold)' }}>
                          {mediaCount}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Filter & Controls Bar */}
                <div className="glass-panel" style={{ padding: '16px 20px', border: '1px solid var(--glass-border)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--beige)', marginRight: '4px' }}>Filter:</span>
                    {[
                      { key: 'all', label: 'All', count: reviewsList.length },
                      { key: 'pending', label: 'Pending', count: reviewsList.filter((r) => (r.status || 'approved').toLowerCase() === 'pending').length },
                      { key: 'approved', label: 'Approved', count: reviewsList.filter((r) => (r.status || 'approved').toLowerCase() === 'approved').length },
                      { key: 'featured', label: '★ Featured on Home', count: reviewsList.filter((r) => r.is_featured_on_home && (r.status || 'approved').toLowerCase() === 'approved').length },
                      { key: 'rejected', label: 'Rejected', count: reviewsList.filter((r) => (r.status || 'approved').toLowerCase() === 'rejected').length },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setProductReviewStatusFilter(tab.key);
                          setProductReviewsPage(1);
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: productReviewStatusFilter === tab.key ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                          color: productReviewStatusFilter === tab.key ? 'var(--dark-chocolate)' : 'var(--cream)',
                          border: productReviewStatusFilter === tab.key ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={fetchAdminReviews}
                    disabled={reviewsLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--gold)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={13} className={reviewsLoading ? 'animate-spin' : ''} />
                    {reviewsLoading ? 'Refreshing...' : 'Refresh Reviews'}
                  </button>
                </div>

                {/* Product Reviews List */}
                {(() => {
                  const filtered = reviewsList.filter((r) => {
                    if (productReviewStatusFilter === 'all') return true;
                    if (productReviewStatusFilter === 'featured') {
                      return Boolean(r.is_featured_on_home) && (r.status || 'approved').toLowerCase() === 'approved';
                    }
                    return (r.status || 'approved').toLowerCase() === productReviewStatusFilter.toLowerCase();
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--glass-border)', borderRadius: '10px' }}>
                        <Star size={36} style={{ color: 'var(--gold)', margin: '0 auto 10px', opacity: 0.5, display: 'block' }} />
                        <h4 style={{ color: 'var(--cream)', margin: '0 0 6px 0', fontSize: '1.05rem' }}>No Product Reviews Found</h4>
                        <p style={{ color: 'var(--beige)', fontSize: '0.82rem', margin: 0 }}>
                          {productReviewStatusFilter === 'all'
                            ? 'No customer reviews have been submitted for chocolate products yet.'
                            : `No reviews currently marked as "${productReviewStatusFilter}".`}
                        </p>
                      </div>
                    );
                  }

                  const paginated = filtered.slice((productReviewsPage - 1) * 6, productReviewsPage * 6);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobileGrid ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap: '16px' }}>
                        {paginated.map((rev: any) => {
                          const status = (rev.status || 'approved').toLowerCase();
                          const productImg = rev.product?.image_url;
                          const hasMedia = (rev.images && rev.images.length > 0) || (rev.videos && rev.videos.length > 0);

                          return (
                            <div
                              key={rev.id}
                              style={{
                                background: 'rgba(14, 11, 9, 0.95)',
                                border: status === 'pending'
                                  ? '1px solid rgba(240, 190, 60, 0.4)'
                                  : '1px solid rgba(212, 175, 55, 0.22)',
                                borderRadius: '12px',
                                padding: '18px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '14px',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                              }}
                            >
                              <div>
                                {/* Product Info & Moderation Status Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div
                                      style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        background: 'radial-gradient(circle, rgba(38, 24, 16, 0.9) 0%, rgba(12, 9, 7, 0.98) 100%)',
                                        border: '1px solid rgba(212, 175, 55, 0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                        flexShrink: 0,
                                      }}
                                    >
                                      {productImg ? (
                                        <img
                                          src={getImageUrl(productImg)}
                                          alt={rev.product?.name || 'Product'}
                                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                        />
                                      ) : (
                                        <ShoppingBag size={22} style={{ color: 'var(--gold)', opacity: 0.6 }} />
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ color: 'var(--cream)', fontWeight: 700, fontSize: '0.92rem', lineHeight: 1.2 }}>
                                        {rev.product?.name || 'Chocolate Item'}
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: 'var(--gold)', marginTop: '2px' }}>
                                        {rev.product?.price ? `₹${rev.product.price}` : ''} {rev.product?.category ? `• ${rev.product.category}` : ''}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Moderation Status & Destination Badges */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        padding: '3px 8px',
                                        borderRadius: '8px',
                                        flexShrink: 0,
                                        background:
                                          status === 'approved'
                                            ? 'rgba(90,190,90,0.15)'
                                            : status === 'rejected'
                                            ? 'rgba(250,90,90,0.15)'
                                            : 'rgba(240,190,60,0.15)',
                                        color:
                                          status === 'approved'
                                            ? '#6fbf6f'
                                            : status === 'rejected'
                                            ? '#f07070'
                                            : '#e0b040',
                                        border: `1px solid ${
                                          status === 'approved'
                                            ? '#6fbf6f'
                                            : status === 'rejected'
                                            ? '#f07070'
                                            : '#e0b040'
                                        }`,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      {status === 'approved' && <CheckCircle size={11} />}
                                      {status === 'rejected' && <XCircle size={11} />}
                                      {status === 'pending' && <Clock size={11} />}
                                      {status}
                                    </span>

                                    {/* Destination Status Badge */}
                                    {status === 'approved' && (
                                      rev.is_featured_on_home ? (
                                        <span
                                          title="Live on Product Details Page AND Featured in Landing Page Customer Reviews"
                                          style={{
                                            fontSize: '0.66rem',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(212, 175, 55, 0.12) 100%)',
                                            color: 'var(--gold)',
                                            border: '1px solid rgba(212, 175, 55, 0.55)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            boxShadow: '0 0 10px rgba(212, 175, 55, 0.22)',
                                          }}
                                        >
                                          <Star size={10} fill="var(--gold)" /> Landing Page + Product
                                        </span>
                                      ) : (
                                        <span
                                          title="Live only on this specific product's page"
                                          style={{
                                            fontSize: '0.66rem',
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: '6px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'var(--beige)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                          }}
                                        >
                                          Product Page Only
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>

                                {/* Review Details & Stars */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ display: 'flex', gap: '2px', color: 'var(--gold)' }}>
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                          key={i}
                                          size={13}
                                          fill={i < (rev.rating || 5) ? 'currentColor' : 'none'}
                                          stroke="currentColor"
                                        />
                                      ))}
                                    </div>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 700 }}>
                                      {rev.rating}.0
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {rev.is_verified_purchase && (
                                      <span
                                        style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          color: '#6fbf6f',
                                          background: 'rgba(90, 190, 90, 0.12)',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          border: '1px solid rgba(90, 190, 90, 0.3)',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                        }}
                                      >
                                        <Check size={10} strokeWidth={3} /> Verified Purchase
                                      </span>
                                    )}
                                    <span style={{ fontSize: '0.74rem', color: 'var(--beige)' }}>
                                      {rev.created_at ? new Date(rev.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                                    </span>
                                  </div>
                                </div>

                                {/* Reviewer Name */}
                                <div style={{ fontSize: '0.8rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                                  By {rev.customer_name || 'Customer Chocolatier'}
                                </div>

                                {/* Review Headline */}
                                {rev.title && (
                                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--cream)', marginBottom: '4px' }}>
                                    "{rev.title}"
                                  </div>
                                )}

                                {/* Review Text */}
                                <p style={{ fontSize: '0.84rem', color: 'var(--beige)', lineHeight: 1.45, margin: 0 }}>
                                  {rev.comment}
                                </p>

                                {/* Customer Photos & Videos Reel */}
                                {hasMedia && (
                                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                      Customer Media ({((rev.images || []).length + (rev.videos || []).length)} attachments)
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {/* Images */}
                                      {(rev.images || []).map((imgUrl: string, mIdx: number) => (
                                        <div
                                          key={`img-${mIdx}`}
                                          onClick={() => setSelectedReviewMediaModal({ type: 'image', url: imgUrl, title: rev.title || rev.customer_name })}
                                          title="Click to view full photo"
                                          style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            border: '1px solid rgba(212, 175, 55, 0.35)',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            background: '#000',
                                          }}
                                        >
                                          <img
                                            src={imgUrl}
                                            alt={`Customer photo ${mIdx + 1}`}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                          <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', borderRadius: '3px', padding: '1px 3px' }}>
                                            <Camera size={10} color="var(--gold)" />
                                          </div>
                                        </div>
                                      ))}

                                      {/* Videos */}
                                      {(rev.videos || []).map((vidUrl: string, vIdx: number) => (
                                        <div
                                          key={`vid-${vIdx}`}
                                          onClick={() => setSelectedReviewMediaModal({ type: 'video', url: vidUrl, title: rev.title || rev.customer_name })}
                                          title="Click to play video"
                                          style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '6px',
                                            overflow: 'hidden',
                                            border: '1px solid rgba(212, 175, 55, 0.35)',
                                            position: 'relative',
                                            cursor: 'pointer',
                                            background: '#000',
                                          }}
                                        >
                                          <video
                                            src={vidUrl}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                          />
                                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                                            <Play size={16} fill="var(--gold)" color="var(--gold)" />
                                          </div>
                                          <div style={{ position: 'absolute', bottom: '2px', right: '2px', background: 'rgba(0,0,0,0.65)', borderRadius: '3px', padding: '1px 3px' }}>
                                            <Film size={10} color="var(--gold)" />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Moderation Actions Footer */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--beige)' }}>
                                  ID: <code style={{ color: 'var(--gold)', fontSize: '0.7rem' }}>{rev.id.slice(0, 8)}</code>
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {/* If review is NOT approved, provide TWO distinct approval options */}
                                  {status !== 'approved' && (
                                    <>
                                      {/* Option 1: Approve for Product Page Only */}
                                      <button
                                        type="button"
                                        disabled={reviewActionInProgress === rev.id}
                                        onClick={() => handleApproveProductReview(rev.id, false)}
                                        title="Approve for this specific product's page only"
                                        style={{
                                          background: 'rgba(90, 190, 90, 0.15)',
                                          border: '1px solid #5abf5a',
                                          color: '#70d070',
                                          borderRadius: '6px',
                                          padding: '5px 10px',
                                          fontSize: '0.74rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        <CheckCircle size={12} /> Approve (Product Only)
                                      </button>

                                      {/* Option 2: Approve & Feature on Landing Page */}
                                      <button
                                        type="button"
                                        disabled={reviewActionInProgress === rev.id}
                                        onClick={() => handleApproveProductReview(rev.id, true)}
                                        title="Approve for product page AND feature in the Landing Page customer reviews section"
                                        style={{
                                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.28) 0%, rgba(180, 130, 20, 0.38) 100%)',
                                          border: '1px solid var(--gold)',
                                          color: 'var(--gold)',
                                          borderRadius: '6px',
                                          padding: '5px 11px',
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          boxShadow: '0 0 12px rgba(212, 175, 55, 0.25)',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        <Star size={12} fill="var(--gold)" /> ★ Approve & Feature on Home
                                      </button>
                                    </>
                                  )}

                                  {/* If review IS APPROVED, allow toggling Landing Page feature */}
                                  {status === 'approved' && (
                                    rev.is_featured_on_home ? (
                                      <button
                                        type="button"
                                        disabled={reviewActionInProgress === rev.id}
                                        onClick={() => handleToggleFeaturedOnHome(rev.id, true)}
                                        title="Remove from Landing Page (remains visible on Product Page)"
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.06)',
                                          border: '1px solid rgba(255, 255, 255, 0.2)',
                                          color: 'var(--beige)',
                                          borderRadius: '6px',
                                          padding: '5px 10px',
                                          fontSize: '0.74rem',
                                          fontWeight: 600,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        Remove from Home
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={reviewActionInProgress === rev.id}
                                        onClick={() => handleToggleFeaturedOnHome(rev.id, false)}
                                        title="Feature on Landing Page Customer Reviews"
                                        style={{
                                          background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0.1) 100%)',
                                          border: '1px solid var(--gold)',
                                          color: 'var(--gold)',
                                          borderRadius: '6px',
                                          padding: '5px 10px',
                                          fontSize: '0.74rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          boxShadow: '0 0 10px rgba(212, 175, 55, 0.18)',
                                          transition: 'all 0.2s',
                                        }}
                                      >
                                        <Star size={11} fill="var(--gold)" /> ★ Feature on Home
                                      </button>
                                    )
                                  )}

                                  {status !== 'rejected' && (
                                    <button
                                      type="button"
                                      disabled={reviewActionInProgress === rev.id}
                                      onClick={() => handleRejectProductReview(rev.id)}
                                      title="Reject review"
                                      style={{
                                        background: 'rgba(240, 160, 60, 0.14)',
                                        border: '1px solid #e09040',
                                        color: '#e09040',
                                        borderRadius: '6px',
                                        padding: '5px 10px',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <XCircle size={12} /> Reject
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={reviewActionInProgress === rev.id}
                                    onClick={() => handleDeleteProductReview(rev.id)}
                                    title="Delete permanently"
                                    style={{
                                      background: 'rgba(231, 76, 60, 0.15)',
                                      border: '1px solid rgba(231, 76, 60, 0.35)',
                                      color: '#ff6b6b',
                                      borderRadius: '6px',
                                      padding: '5px 8px',
                                      fontSize: '0.74rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {filtered.length > 6 && (
                        <div style={{ marginTop: '10px' }}>
                          <Pagination
                            currentPage={productReviewsPage}
                            totalPages={Math.ceil(filtered.length / 6)}
                            totalItems={filtered.length}
                            itemsPerPage={6}
                            onPageChange={(p) => setProductReviewsPage(p)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUBTAB 2: SITE TESTIMONIALS */}
            {reviewSubTab === 'site_testimonials' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Action Button: Add Site Testimonial */}
                <div style={{ display: 'flex', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                  <Button
                    variant="gold"
                    glow
                    onClick={() => setShowAddTestimonialModal(true)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600, fontSize: '0.85rem', boxSizing: 'border-box', flex: isMobileGrid ? '1 1 100%' : '0 0 auto' }}
                  >
                    <Plus size={16} />
                    Add Site Testimonial
                  </Button>
                </div>

                {/* Section 1: Customer Testimonials List & Moderation */}
                <div className="glass-panel" style={{ padding: isMobileGrid ? '16px' : '24px', border: '1px solid var(--glass-border)', boxSizing: 'border-box', width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--cream)', margin: 0 }}>
                      Site Testimonials ({testimonialsList.length})
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--beige)' }}>
                      Displaying 2 cards per line (6 per page)
                    </span>
                  </div>

                  {/* Status Filter Tabs */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    {['all', 'pending', 'approved', 'rejected'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusFilterChange(st)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap',
                          background: testimonialStatusFilter === st ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                          color: testimonialStatusFilter === st ? 'var(--dark-chocolate)' : 'var(--cream)',
                          border: testimonialStatusFilter === st ? '1px solid var(--gold)' : '1px solid var(--glass-border)',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {st === 'all' ? 'All' : st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Testimonials Items Grid */}
                  <div>
                    {testimonialsList.length === 0 ? (
                      <p style={{ color: 'var(--beige)', fontStyle: 'italic', padding: '20px 0', margin: 0 }}>
                        No testimonials found in this category.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                          gap: '16px',
                          marginBottom: '20px',
                        }}
                      >
                        {testimonialsList.slice((testimonialsPage - 1) * 6, testimonialsPage * 6).map((t, idx) => {
                          const st = t.status || (t.is_active ? 'approved' : 'pending');
                          return (
                            <div
                              key={t.id || idx}
                              style={{
                                padding: '18px',
                                background: 'rgba(12, 10, 8, 0.75)',
                                border: '1px solid rgba(201, 168, 76, 0.2)',
                                borderRadius: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <div style={{ display: 'flex', gap: '4px', color: 'var(--gold)' }}>
                                    {Array.from({ length: t.rating || t.stars || 5 }).map((_, i) => (
                                      <Star key={i} size={14} fill="currentColor" />
                                    ))}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      background: st === 'approved' ? 'rgba(90,190,90,0.15)' : st === 'rejected' ? 'rgba(250,90,90,0.15)' : 'rgba(240,190,60,0.15)',
                                      color: st === 'approved' ? '#6fbf6f' : st === 'rejected' ? '#f07070' : '#e0b040',
                                      border: `1px solid ${st === 'approved' ? '#6fbf6f' : st === 'rejected' ? '#f07070' : '#e0b040'}`,
                                    }}
                                  >
                                    {st}
                                  </span>
                                </div>
                                <p style={{ color: 'var(--cream)', fontSize: '0.88rem', fontStyle: 'italic', margin: 0, lineHeight: 1.45 }}>
                                  "{t.text}"
                                </p>
                              </div>

                              <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: isMobileGrid ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileGrid ? 'flex-start' : 'center', gap: '10px' }}>
                                <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {t.author}{t.title ? ` — ${t.title}` : ''}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                  {st !== 'approved' && t.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleApproveTestimonial(t.id)}
                                      style={{ background: 'rgba(90,190,90,0.2)', border: '1px solid #6fbf6f', color: '#6fbf6f', borderRadius: '6px', padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      <CheckCircle size={13} /> Approve
                                    </button>
                                  )}
                                  {st !== 'rejected' && t.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleRejectTestimonial(t.id)}
                                      style={{ background: 'rgba(240,160,60,0.12)', border: '1px solid #e09040', color: '#e09040', borderRadius: '6px', padding: '5px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                      Reject
                                    </button>
                                  )}
                                  {t.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTestimonial(t.id)}
                                      style={{ color: '#ff6b6b', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', cursor: 'pointer', padding: '5px 8px', display: 'flex', alignItems: 'center' }}
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {testimonialsList.length > 6 && (
                    <div style={{ marginTop: '16px' }}>
                      <Pagination
                        currentPage={testimonialsPage}
                        totalPages={Math.ceil(testimonialsList.length / 6)}
                        totalItems={testimonialsList.length}
                        itemsPerPage={6}
                        onPageChange={(p) => setTestimonialsPage(p)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODAL 1: ADD CUSTOMER TESTIMONIAL MODAL */}
            {showAddTestimonialModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '30px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.95)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--gold)', margin: 0 }}>
                      + Add Site Testimonial
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddTestimonialModal(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleAddTestimonial} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                      label="Author Name *"
                      required
                      placeholder="e.g. Chef Marco Pierre"
                      value={newTestimonial.author}
                      onChange={(e) => setNewTestimonial({ ...newTestimonial, author: e.target.value })}
                    />
                    <Input
                      label="Author Title / Role"
                      placeholder="e.g. Food Critic, Mumbai"
                      value={newTestimonial.title}
                      onChange={(e) => setNewTestimonial({ ...newTestimonial, title: e.target.value })}
                    />
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', marginBottom: '6px' }}>
                        Rating (1 to 5)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: star <= newTestimonial.rating ? 'var(--gold)' : 'var(--grey-mid)', padding: 0 }}
                          >
                            <Star size={24} fill={star <= newTestimonial.rating ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', marginBottom: '6px' }}>
                        Testimonial Quote *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="What the customer said about Chovique..."
                        value={newTestimonial.text}
                        onChange={(e) => setNewTestimonial({ ...newTestimonial, text: e.target.value })}
                        style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)', color: 'var(--cream)', borderRadius: '4px', resize: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--beige)', marginBottom: '6px' }}>
                        Customer Photo / Avatar (Optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setTestimonialAvatarFile(e.target.files?.[0] || null)}
                        style={{ color: 'var(--beige)', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <Button variant="gold" type="submit" disabled={uploadingTestimonial}>
                        {uploadingTestimonial ? 'Adding...' : 'Save Testimonial'}
                      </Button>
                      <Button variant="glass" type="button" onClick={() => setShowAddTestimonialModal(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 2: ADD / EDIT PROCESS VIDEO MODAL */}
            {showUploadVideoModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '26px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.95)', maxHeight: '90vh', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', margin: 0 }}>
                      {storyVideoUrl ? 'Edit & Replace Process Video' : '+ Add Our Story Process Video'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowUploadVideoModal(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                      ✕
                    </button>
                  </div>

                  {storyVideoUrl && (
                    <div style={{ marginBottom: '18px', padding: '14px', background: 'rgba(0,0,0,0.45)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                        Current Live Crafting Process Video:
                      </span>
                      <video
                        src={storyVideoUrl}
                        controls
                        style={{ width: '100%', maxHeight: '200px', borderRadius: '6px', objectFit: 'cover', background: '#000' }}
                      />
                      <div style={{ fontSize: '0.74rem', color: 'var(--beige)', marginTop: '8px', wordBreak: 'break-all' }}>
                        Source URL: <code style={{ color: 'var(--gold)' }}>{storyVideoUrl}</code>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleUploadStoryVideo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--beige)', marginBottom: '8px' }}>
                        Select Video File (MP4, WebM, MOV, max 100MB)
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        required
                        onChange={(e) => setStoryVideoFile(e.target.files?.[0] || null)}
                        style={{ color: 'var(--cream)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <Button variant="gold" type="submit" disabled={uploadingStoryVideo}>
                        {uploadingStoryVideo ? 'Uploading...' : 'Save Video'}
                      </Button>
                      <Button variant="glass" type="button" onClick={() => setShowUploadVideoModal(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL 3: CUSTOMER REVIEW PHOTO / VIDEO LIGHTBOX */}
            {selectedReviewMediaModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.9)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: '20px',
                }}
                onClick={() => setSelectedReviewMediaModal(null)}
              >
                <div
                  style={{
                    position: 'relative',
                    maxWidth: '90vw',
                    maxHeight: '88vh',
                    background: '#120d0a',
                    border: '1px solid var(--gold)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.95)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedReviewMediaModal(null)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      zIndex: 2,
                    }}
                  >
                    ✕
                  </button>

                  {selectedReviewMediaModal.title && (
                    <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '0.92rem', marginBottom: '12px', maxWidth: '80%', textAlign: 'center' }}>
                      "{selectedReviewMediaModal.title}"
                    </div>
                  )}

                  {selectedReviewMediaModal.type === 'video' ? (
                    <video
                      src={selectedReviewMediaModal.url}
                      controls
                      autoPlay
                      style={{
                        maxWidth: '85vw',
                        maxHeight: '75vh',
                        borderRadius: '8px',
                        outline: 'none',
                        background: '#000',
                      }}
                    />
                  ) : (
                    <img
                      src={selectedReviewMediaModal.url}
                      alt="Customer review attachment"
                      style={{
                        maxWidth: '85vw',
                        maxHeight: '75vh',
                        objectFit: 'contain',
                        borderRadius: '8px',
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTACT MESSAGES & CUSTOMER SUPPORT MGMT TAB */}
        {activeTab === 'contact-messages' && (
          <div>
            {/* Page Header with Action Button */}
            <div style={{ marginBottom: '24px' }}>
              <span className="section-label">Inbox</span>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: isMobileGrid ? '1.6rem' : '2.2rem', color: 'var(--cream)', margin: '4px 0 6px 0', fontWeight: 700, lineHeight: 1.2 }}>
                Contact &amp; Support
              </h1>
              <p style={{ color: 'var(--beige)', fontSize: '0.85rem', margin: '0 0 14px 0', lineHeight: 1.4 }}>
                Customer inquiries from the contact form and support channel settings.
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <Button
                  variant="gold"
                  glow
                  onClick={openEditSupportModal}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600, width: isMobileGrid ? '100%' : 'auto' }}
                >
                  <Headphones size={16} />
                  Support Channel Settings
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('reviews')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600, width: isMobileGrid ? '100%' : 'auto' }}
                >
                  <MessageSquare size={16} />
                  View Testimonials
                </Button>
              </div>
            </div>

            {/* Messages Table */}
            <div className="glass-panel" style={{ padding: '14px 18px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cream)', margin: 0 }}>
                  Received Customer Inquiries ({contactMessages.length})
                </h3>
                <Button
                  variant="glass"
                  onClick={() => exportToCSV('Contact_Messages_Inbox', contactMessages)}
                  disabled={contactMessages.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c' }}
                >
                  <FileSpreadsheet size={15} /> Export CSV
                </Button>
              </div>

              <div className="admin-table-wrapper" style={{ overflowY: 'auto', maxHeight: '550px' }}>
                {isMobileGrid ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '2px' }}>
                    {contactMessages.length === 0 ? (
                      <div className="glass-panel" style={{ textAlign: 'center', color: 'var(--beige)', fontStyle: 'italic', padding: '24px', borderRadius: '8px' }}>
                        No customer contact messages received yet.
                      </div>
                    ) : (
                      contactMessages.slice((contactMessagesPage - 1) * 5, contactMessagesPage * 5).map((msg) => (
                        <div key={msg.id} className="glass-panel" style={{ padding: '14px', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', border: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.95rem' }}>{msg.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>{msg.created_at}</div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                            <a href={`mailto:${msg.email}`} style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.82rem' }}>
                              ✉ {msg.email}
                            </a>
                            {msg.phone && (
                              <div style={{ color: 'var(--beige)', fontSize: '0.82rem' }}>
                                📞 {msg.phone}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{ display: 'inline-block', background: 'rgba(201, 168, 76, 0.15)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', marginBottom: '6px' }}>
                              {msg.subject || 'General'}
                            </span>
                            <div style={{ fontSize: '0.82rem', color: 'var(--beige)', lineHeight: 1.4, background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                              {msg.message?.length > 100 ? `${msg.message.slice(0, 100)}...` : msg.message}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                            <button
                              onClick={() => setSelectedContactMessage(msg)}
                              style={{ flex: 1, background: 'rgba(201, 168, 76, 0.15)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: '4px', cursor: 'pointer', padding: '6px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <Eye size={13} /> View
                            </button>
                            <button
                              onClick={() => handleDeleteContactMessage(msg.id)}
                              style={{ flex: 1, background: 'rgba(255, 0, 0, 0.15)', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '4px', cursor: 'pointer', padding: '6px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Subject</th>
                        <th>Message</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactMessages.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--beige)', fontStyle: 'italic', padding: '30px' }}>
                            No customer contact messages received yet.
                          </td>
                        </tr>
                      ) : (
                        contactMessages.slice((contactMessagesPage - 1) * 5, contactMessagesPage * 5).map((msg) => (
                          <tr key={msg.id}>
                            <td style={{ fontSize: '0.8rem', color: 'var(--gold)', whiteSpace: 'nowrap' }}>{msg.created_at}</td>
                            <td style={{ fontWeight: 600, color: 'var(--cream)' }}>{msg.name}</td>
                            <td>
                              <a href={`mailto:${msg.email}`} style={{ color: 'var(--gold)', textDecoration: 'none' }}>
                                {msg.email}
                              </a>
                            </td>
                            <td>{msg.phone || '—'}</td>
                            <td>
                              <span style={{ background: 'rgba(201, 168, 76, 0.15)', color: 'var(--gold)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {msg.subject || 'General'}
                              </span>
                            </td>
                            <td style={{ maxWidth: '250px', fontSize: '0.85rem', color: 'var(--beige)', lineHeight: 1.4 }}>
                              {msg.message?.length > 70 ? `${msg.message.slice(0, 70)}...` : msg.message}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  onClick={() => setSelectedContactMessage(msg)}
                                  style={{ background: 'rgba(201, 168, 76, 0.15)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="View complete message"
                                >
                                  <Eye size={14} /> View
                                </button>
                                <button
                                  onClick={() => handleDeleteContactMessage(msg.id)}
                                  style={{ background: 'rgba(255, 0, 0, 0.15)', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '4px', cursor: 'pointer', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                  title="Delete message"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {contactMessages.length > 5 && (
                <div style={{ marginTop: '16px' }}>
                  <Pagination
                    currentPage={contactMessagesPage}
                    totalPages={Math.ceil(contactMessages.length / 5)}
                    totalItems={contactMessages.length}
                    itemsPerPage={5}
                    onPageChange={(p) => setContactMessagesPage(p)}
                  />
                </div>
              )}
            </div>

            {/* EDIT CUSTOMER SUPPORT INFO MODAL */}
            {showEditSupportModal && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.95)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(201, 168, 76, 0.2)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Headphones size={22} color="var(--gold)" />
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', margin: 0 }}>
                        Update Customer Support Info
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowEditSupportModal(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                    >
                      ✕
                    </button>
                  </div>

                  <p style={{ color: 'var(--beige)', fontSize: '0.85rem', marginBottom: '20px' }}>
                    Update the contact phone, WhatsApp, email, hours, and address. Changes will immediately reflect across the customer-facing website.
                  </p>

                  <form onSubmit={handleUpdateSupportContact}>
                    <Input
                      label="Customer Support Phone *"
                      required
                      value={supportFormData.phone}
                      onChange={(e) => setSupportFormData({ ...supportFormData, phone: e.target.value })}
                    />

                    <Input
                      label="WhatsApp Support Number *"
                      required
                      value={supportFormData.whatsapp}
                      onChange={(e) => setSupportFormData({ ...supportFormData, whatsapp: e.target.value })}
                    />

                    <Input
                      label="Customer Support Email *"
                      type="email"
                      required
                      value={supportFormData.email}
                      onChange={(e) => setSupportFormData({ ...supportFormData, email: e.target.value })}
                    />

                    <Input
                      label="Support Hours *"
                      placeholder="Mon - Sat: 10:00 AM - 8:00 PM"
                      required
                      value={supportFormData.support_hours}
                      onChange={(e) => setSupportFormData({ ...supportFormData, support_hours: e.target.value })}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Atelier Address
                      </label>
                      <textarea
                        rows={2}
                        value={supportFormData.address}
                        onChange={(e) => setSupportFormData({ ...supportFormData, address: e.target.value })}
                        style={{
                          padding: '10px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid var(--glass-border)',
                          color: 'var(--cream)',
                          borderRadius: '4px',
                          outline: 'none',
                          resize: 'none',
                          fontSize: '0.85rem',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <Button
                        variant="glass"
                        type="button"
                        onClick={() => setShowEditSupportModal(false)}
                        disabled={updatingContact}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="gold"
                        glow
                        type="submit"
                        disabled={updatingContact}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
                      >
                        {updatingContact ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Saving Details...
                          </>
                        ) : (
                          'UPDATE CUSTOMER SUPPORT DETAILS'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW CONTACT INQUIRY DETAILS MODAL */}
            {selectedContactMessage && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                <div className="glass-panel" style={{ width: '100%', maxWidth: '540px', padding: '30px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.95)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(201, 168, 76, 0.2)', paddingBottom: '12px' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', margin: 0 }}>
                      Customer Inquiry Details
                    </h3>
                    <button
                      onClick={() => setSelectedContactMessage(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--cream)', cursor: 'pointer', fontSize: '1.2rem' }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: 'var(--cream)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--beige)', textTransform: 'uppercase', display: 'block' }}>Customer Name</span>
                        <strong style={{ fontSize: '1rem', color: 'var(--cream)' }}>{selectedContactMessage.name}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--beige)', textTransform: 'uppercase', display: 'block' }}>Received Date</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{selectedContactMessage.created_at}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--beige)', textTransform: 'uppercase', display: 'block' }}>Email Address</span>
                        <a href={`mailto:${selectedContactMessage.email}`} style={{ color: 'var(--gold)', fontWeight: 600 }}>{selectedContactMessage.email}</a>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--beige)', textTransform: 'uppercase', display: 'block' }}>Phone Number</span>
                        <span>{selectedContactMessage.phone || '—'}</span>
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--beige)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Subject</span>
                      <span style={{ background: 'rgba(201, 168, 76, 0.15)', color: 'var(--gold)', padding: '3px 10px', borderRadius: '4px', fontSize: '0.82rem', fontWeight: 600 }}>
                        {selectedContactMessage.subject || 'General Inquiries'}
                      </span>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--beige)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Message Text</span>
                      <div style={{ background: 'rgba(0,0,0,0.45)', padding: '14px', borderRadius: '6px', border: '1px solid var(--glass-border)', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--cream)', fontSize: '0.9rem', maxHeight: '200px', overflowY: 'auto' }}>
                        {selectedContactMessage.message}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                      <a
                        href={`mailto:${selectedContactMessage.email}?subject=Re: ${encodeURIComponent(selectedContactMessage.subject || 'Inquiry')}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <Button variant="gold" type="button" glow>
                          Reply via Email
                        </Button>
                      </a>
                      <Button variant="glass" type="button" onClick={() => setSelectedContactMessage(null)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* EDIT PRODUCT MODAL */}
        {editingProduct && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="glass-panel" style={{ padding: '30px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
              <h3 style={{ color: 'var(--cream)', marginBottom: '20px' }}>Edit Product</h3>
              <form onSubmit={handleEditProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Input label="Name" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                <Input label="Price (₹)" type="number" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                <Input label="Stock Quantity" type="number" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} />
                <Select
                  label="Category"
                  options={dynamicCategoryOptions}
                  value={editingProduct.category}
                  onChange={e => setEditingProduct({...editingProduct, category: e.target.value as any})}
                />
                
                <Select
                  label="Badge / Section Tag"
                  value={editingProduct.badge || ''}
                  onChange={e => setEditingProduct({...editingProduct, badge: e.target.value})}
                  options={[
                    { label: 'None (Standard Product)', value: '' },
                    { label: 'New (Shows in New Arrivals section)', value: 'New' },
                    { label: 'Bestseller (Shows in Bestsellers section)', value: 'Bestseller' },
                    { label: 'Premium (Shows in Popular / Premium section)', value: 'Premium' },
                    { label: 'Gift Hamper (Shows in Gift Hampers section)', value: 'Gift Hamper' },
                    { label: 'Signature (Shows in Signature Collection)', value: 'Signature' },
                    { label: 'Limited Edition', value: 'Limited Edition' },
                  ]}
                />
                <Input label="Ingredients" placeholder="e.g. Cocoa Mass, Sugar..." value={editingProduct.ingredients || ''} onChange={e => setEditingProduct({...editingProduct, ingredients: e.target.value})} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Product Description
                  </label>
                  <textarea
                    rows={3}
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    style={{
                      padding: '10px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--cream)',
                      borderRadius: '4px',
                      outline: 'none',
                      resize: 'vertical',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--cream)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Product Images (Optional)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    {editingProductImagePreviews.length > 0 ? (
                      editingProductImagePreviews.map((preview, idx) => (
                        <img key={idx} src={preview} alt={`Preview ${idx + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                      ))
                    ) : (
                      editingProduct.images?.length ? (
                        editingProduct.images.map((imgUrl, idx) => (
                          <img key={idx} src={imgUrl} alt={`Current ${idx + 1}`} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                        ))
                      ) : (
                        <img src={editingProduct.image} alt="Current" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                      )
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length) {
                          setEditingProductImageFiles(files);
                          setEditingProductImagePreviews(files.map(f => URL.createObjectURL(f)));
                        }
                      }}
                      style={{ fontSize: '0.8rem', color: 'var(--cream)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <Button variant="text" type="button" onClick={() => {
                    setEditingProduct(null);
                    setEditingProductImageFiles([]);
                    setEditingProductImagePreviews([]);
                  }}>Cancel</Button>
                  <Button variant="gold" type="submit" disabled={isUpdatingProduct}>
                    {isUpdatingProduct ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT BANNER MODAL */}
        {editingBanner && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', padding: '16px' }}>
            <div className="glass-panel" style={{ padding: '28px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '14px', border: '1px solid var(--gold)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: 0, fontSize: '1.3rem' }}>✏️ Edit Slide</h3>
                <button onClick={() => { setEditingBanner(null); setEditingBannerImageFile(null); }} style={{ background: 'none', border: 'none', color: 'var(--rose-gold)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleEditBannerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Input label="Title" required value={editingBanner.title} onChange={e => setEditingBanner({...editingBanner, title: e.target.value})} />
                <Input label="Subtitle" required value={editingBanner.subtitle || ''} onChange={e => setEditingBanner({...editingBanner, subtitle: e.target.value})} />
                <Input label="Category Tag" required value={editingBanner.tag || ''} onChange={e => setEditingBanner({...editingBanner, tag: e.target.value})} />
                <Input label="Button Text" required value={editingBanner.buttonText || ''} onChange={e => setEditingBanner({...editingBanner, buttonText: e.target.value})} />
                <Input label="Link URL" required value={editingBanner.link || ''} onChange={e => setEditingBanner({...editingBanner, link: e.target.value})} />

                {/* Current Banner Image */}
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--beige)', display: 'block', marginBottom: '8px' }}>Current Slide Image</span>
                  {editingBanner.image ? (
                    <div style={{ borderRadius: '8px', overflow: 'hidden', height: '160px', border: '1px solid var(--glass-border)', marginBottom: '10px' }}>
                      <img
                        src={editingBannerImageFile ? URL.createObjectURL(editingBannerImageFile) : getImageUrl(editingBanner.image)}
                        alt={editingBanner.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <div style={{ height: '80px', borderRadius: '8px', border: '1px dashed var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--beige)', fontSize: '0.8rem', marginBottom: '10px' }}>
                      No image uploaded yet
                    </div>
                  )}
                  <input
                    ref={editingBannerFileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setEditingBannerImageFile(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => editingBannerFileRef.current?.click()}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '8px', color: 'var(--gold)', padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}
                  >
                    <UploadCloud size={16} />
                    {editingBannerImageFile ? `✓ Image Selected: ${editingBannerImageFile.name}` : 'Choose New Image (Optional)'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <Button variant="glass" type="button" onClick={() => { setEditingBanner(null); setEditingBannerImageFile(null); }}>Cancel</Button>
                  <Button variant="gold" type="submit" glow style={{ flex: 1 }}>Save Changes</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT REEL MODAL */}
        {editingReel && (() => {
          const currentVideoUrl = editingReel.video_url || editingReel.videoUrl || (
            (editingReel.instagram_url || editingReel.instagramUrl || '').includes('DdQYj55v0dr')
              ? 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4'
              : ''
          );
          const currentIgUrl = editingReel.instagram_url || editingReel.instagramUrl || '';
          const currentAccount = editingReel.account_name || editingReel.accountName || '@choviqueofficial';

          return (
            <div
              className="modal-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000,
                backdropFilter: 'blur(8px)',
                padding: '16px',
                boxSizing: 'border-box',
              }}
            >
              <div
                className="glass-panel"
                style={{
                  padding: isMobileGrid ? '18px' : '26px',
                  width: '100%',
                  maxWidth: '520px',
                  maxHeight: '92vh',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  borderRadius: '16px',
                  border: '1px solid var(--gold)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                  boxSizing: 'border-box',
                  background: 'linear-gradient(135deg, rgba(20,15,10,0.96) 0%, rgba(30,20,15,0.94) 100%)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
                      <Video size={18} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: 0, fontSize: '1.25rem', lineHeight: 1.2 }}>
                        Edit Instagram Reel
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                        Live Video Preview & Metadata Editor
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReel(null);
                      setEditingReelVideoFile(null);
                      setEditReelSuccessMsg('');
                      setEditReelErrorMsg('');
                    }}
                    style={{
                      background: 'rgba(231,76,60,0.1)',
                      border: '1px solid rgba(231,76,60,0.3)',
                      borderRadius: '8px',
                      color: 'var(--rose-gold)',
                      cursor: 'pointer',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleEditReelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>

                  {/* 1. REAL LIVE PLAYING VIDEO REEL CARD */}
                  <div style={{ width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--beige)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                        Active Reel Video Preview
                      </span>
                      {currentVideoUrl && (
                        <span style={{ fontSize: '0.72rem', color: '#2ecc71', background: 'rgba(46,204,113,0.15)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(46,204,113,0.3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ecc71', display: 'inline-block' }} />
                          Playing Live
                        </span>
                      )}
                    </div>

                    {currentVideoUrl ? (
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#000',
                          border: '1px solid rgba(201,168,76,0.35)',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        }}
                      >
                        {/* Overlay creator handle badge */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            zIndex: 2,
                            background: 'rgba(0,0,0,0.7)',
                            backdropFilter: 'blur(6px)',
                            color: 'var(--cream)',
                            padding: '3px 10px',
                            borderRadius: '10px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            border: '1px solid rgba(255,255,255,0.15)',
                            pointerEvents: 'none',
                          }}
                        >
                          {currentAccount}
                        </div>

                        {/* Live video player that automatically plays the current or newly fetched reel */}
                        <video
                          key={currentVideoUrl}
                          src={currentVideoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          controls
                          style={{
                            width: '100%',
                            maxHeight: '250px',
                            objectFit: 'contain',
                            background: '#000',
                            display: 'block',
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '24px 16px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px dashed rgba(201,168,76,0.3)',
                          textAlign: 'center',
                          color: 'var(--beige)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <Video size={28} style={{ color: 'var(--gold)', margin: '0 auto 8px auto', display: 'block', opacity: 0.7 }} />
                        <span>Paste an Instagram Reel URL below and tap <strong>Auto-Fetch</strong> to play the video.</span>
                      </div>
                    )}
                  </div>

                  {/* 2. INSTAGRAM URL INPUT & AUTO-FETCH BUTTON */}
                  <div>
                    <label
                      htmlFor="edit-modal-reel-url"
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        color: 'var(--beige)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        marginBottom: '8px',
                      }}
                    >
                      Instagram Reel / Post URL <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 600 }}>*</span>
                    </label>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: isMobileGrid ? 'column' : 'row',
                        alignItems: isMobileGrid ? 'stretch' : 'center',
                        gap: '10px',
                        width: '100%',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, width: isMobileGrid ? '100%' : 'auto' }}>
                        <Input
                          id="edit-modal-reel-url"
                          required
                          placeholder="https://www.instagram.com/reel/C.../ or post link"
                          value={currentIgUrl}
                          containerStyle={{ marginBottom: 0 }}
                          style={{ height: '46px', fontSize: '0.9rem' }}
                          onChange={(e) => {
                            const val = e.target.value;
                            let extractedAccount = currentAccount;
                            const match = val.match(/instagram\.com\/([a-zA-Z0-9._]+)\/(?:reel|p)\//i);
                            if (match && match[1] && !['reel', 'p', 'tv'].includes(match[1].toLowerCase())) {
                              extractedAccount = `@${match[1]}`;
                            }
                            setEditingReel({
                              ...editingReel,
                              instagram_url: val,
                              account_name: extractedAccount,
                            });
                          }}
                          onBlur={() => {
                            const url = (editingReel.instagram_url || editingReel.instagramUrl || '').trim();
                            if (url && url.includes('instagram.com')) {
                              handleAutoFetchEditReelMeta(url);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAutoFetchEditReelMeta(editingReel.instagram_url || editingReel.instagramUrl || '');
                            }
                          }}
                        />
                      </div>

                      <Button
                        variant="gold"
                        type="button"
                        size="sm"
                        glow
                        disabled={isFetchingEditReelMeta || !currentIgUrl.trim()}
                        onClick={() => handleAutoFetchEditReelMeta(currentIgUrl)}
                        style={{
                          height: '46px',
                          width: isMobileGrid ? '100%' : 'auto',
                          minWidth: isMobileGrid ? '100%' : '160px',
                          flexShrink: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          borderRadius: '4px',
                        }}
                      >
                        {isFetchingEditReelMeta ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            <span>Auto-Fetch</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Feedback states */}
                    {isFetchingEditReelMeta && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(201,168,76,0.12)',
                          border: '1px solid rgba(201,168,76,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          color: 'var(--gold)',
                        }}
                      >
                        <Loader2 size={14} className="animate-spin" />
                        <span>Resolving new video from Instagram to play automatically...</span>
                      </div>
                    )}

                    {editReelSuccessMsg && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(46, 204, 113, 0.12)',
                          border: '1px solid rgba(46, 204, 113, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.82rem',
                          color: '#2ecc71',
                          fontWeight: 600,
                        }}
                      >
                        <span>✓</span>
                        <span>{editReelSuccessMsg}</span>
                      </div>
                    )}

                    {editReelErrorMsg && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'rgba(231, 76, 60, 0.12)',
                          border: '1px solid rgba(231, 76, 60, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '0.8rem',
                          color: '#e74c3c',
                        }}
                      >
                        <span>⚠️</span>
                        <span>{editReelErrorMsg}</span>
                      </div>
                    )}

                    <p style={{ fontSize: '0.74rem', color: 'var(--beige)', opacity: 0.8, margin: '6px 0 0 0' }}>
                      Change the URL above to replace the reel. Clicking <strong>Auto-Fetch</strong> or moving away from the field instantly loads and plays the new video.
                    </p>
                  </div>

                  {/* 3. ACCOUNT HOLDER NAME / HANDLE */}
                  <div>
                    <Input
                      label="Account Holder Account Name / Handle *"
                      required
                      placeholder="@choviqueofficial"
                      value={currentAccount}
                      containerStyle={{ marginBottom: 0 }}
                      style={{ height: '46px', fontSize: '0.9rem' }}
                      onChange={(e) => setEditingReel({ ...editingReel, account_name: e.target.value })}
                    />
                  </div>

                  {/* 4. OPTIONAL REPLACE VIDEO FILE */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--beige)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                      Replace With Custom Video File (Optional):
                    </span>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px dashed var(--glass-border)',
                        borderRadius: '8px',
                        color: 'var(--beige)',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <Video size={16} style={{ flexShrink: 0, color: 'var(--gold)' }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {editingReelVideoFile ? `✓ ${editingReelVideoFile.name}` : 'Choose replacement video file...'}
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEditingReelVideoFile(file);
                          if (file) {
                            const localBlob = URL.createObjectURL(file);
                            setEditingReel((prev: any) => ({
                              ...prev,
                              video_url: localBlob,
                            }));
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  {/* 5. ACTION BUTTONS */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: isMobileGrid ? 'wrap' : 'nowrap' }}>
                    <Button
                      variant="gold"
                      type="submit"
                      glow
                      disabled={isUpdatingReel || isFetchingEditReelMeta}
                      style={{
                        height: '46px',
                        flex: isMobileGrid ? '1 1 100%' : '2 1 140px',
                        minWidth: '130px',
                        display: 'inline-flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 600,
                      }}
                    >
                      {isUpdatingReel ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setEditingReel(null);
                        setEditingReelVideoFile(null);
                        setEditReelSuccessMsg('');
                        setEditReelErrorMsg('');
                      }}
                      style={{
                        height: '46px',
                        flex: isMobileGrid ? '1 1 100%' : '1 1 100px',
                        minWidth: '90px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      Cancel
                    </Button>
                  </div>

                </form>
              </div>
            </div>
          );
        })()}

        {/* CUSTOM DATE RANGE MODAL */}
        {showCustomDateModal && (
          <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
            <div className="glass-panel" style={{ padding: '30px', width: '90%', maxWidth: '420px', background: 'linear-gradient(135deg, rgba(15, 7, 1, 0.98) 0%, rgba(26, 13, 0, 0.98) 100%)', border: '1px solid var(--gold)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: 0, fontSize: '1.3rem' }}>
                  Select Custom Date Range
                </h3>
                <button type="button" onClick={() => setShowCustomDateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--rose-gold)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleApplyCustomDateRange} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Input
                  label="Start Date *"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  error={customDateError && !customStartDate ? 'Start Date is required' : undefined}
                />

                <Input
                  label="End Date *"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  error={customDateError && !customEndDate ? 'End Date is required' : undefined}
                />

                {customDateError && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--rose-gold)', marginTop: '-6px' }}>
                    {customDateError}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <Button variant="secondary" type="button" onClick={() => setShowCustomDateModal(false)} style={{ flex: 1 }}>
                    Cancel
                  </Button>
                  <Button variant="gold" type="submit" style={{ flex: 1 }}>
                    Apply Filter
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Toast Container */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Destructive Action Confirmation Modal */}
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          isConfirming={confirmModal.isConfirming}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Logout Confirmation Modal */}
        <ConfirmationModal
          isOpen={showLogoutConfirmModal}
          title="Confirm Logout"
          message="Are you sure you want to logout?"
          confirmText={isLoggingOut ? 'Logging out...' : 'Logout'}
          cancelText="Cancel"
          isConfirming={isLoggingOut}
          variant="danger"
          onConfirm={handleConfirmLogout}
          onCancel={() => setShowLogoutConfirmModal(false)}
        />

        {/* Complaint Related Order Detail Modal */}
        {viewingComplaintOrder && (
          <OrderDetailModal
            order={viewingComplaintOrder}
            onClose={() => setViewingComplaintOrder(null)}
            onUpdateStatus={handleUpdateOrderStatus}
            addToast={addToast}
            onRefresh={() => {}}
          />
        )}

        {/* All Offline Sales Modal */}
        {showOfflineSalesModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
            onClick={() => setShowOfflineSalesModal(false)}
          >
            <div
              style={{
                background: '#14100d',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1100px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#c9a84c', margin: 0, fontWeight: 700 }}>
                  All Offline Sales Ledger
                </h2>
                <Button variant="secondary" size="sm" onClick={() => setShowOfflineSalesModal(false)}>
                  Close
                </Button>
              </div>
              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                <OfflineSalesView addToast={addToast} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
