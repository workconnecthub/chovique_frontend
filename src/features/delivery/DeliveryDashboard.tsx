import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Package,
  PackageCheck,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  ArrowRight,
  Store,
  Layers,
  Sparkles,
  Award,
  Route,
  Compass,
  SlidersHorizontal,
  Home,
  Power,
  Boxes,
  Bell,
  Menu,
  Camera,
  Edit2,
  Upload,
  Lock,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { useApp } from '../../app/providers';
import { deliveryService, DeliveryBoyProfile } from '../../services/deliveryService';
import type { Order } from '../../types';
import '../../styles/delivery.css';

export type DeliveryTab = 'mission' | 'queue' | 'route' | 'history' | 'profile';

export const DeliveryDashboard: React.FC = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const isSupervisor = user?.role === 'admin' || user?.role === 'superadmin';

  // Responsive state
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Duty status
  const [isOnDuty, setIsOnDuty] = useState<boolean>(true);

  const handleToggleDuty = () => {
    setIsOnDuty((prev) => {
      const next = !prev;
      showToast(next ? 'You are now ON DUTY (Available for orders).' : 'You are now OFF DUTY (Standby mode).', next ? 'success' : 'info');
      return next;
    });
  };

  // State
  const [profile, setProfile] = useState<DeliveryBoyProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DeliveryTab>('mission');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Reject Modal State
  const [rejectModalOrder, setRejectModalOrder] = useState<Order | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Location out of range');
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // OTP Verification State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');
  const [completedCelebrationOrder, setCompletedCelebrationOrder] = useState<Order | null>(null);

  // General Notification / Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Live GPS Location State ─────────────────────────────────────────────
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'pending' | 'granted' | 'denied' | 'asking'>('pending');
  const [isRequestingLocation, setIsRequestingLocation] = useState<boolean>(false);

  // Haversine formula: calculate distance in km between two lat/lng points
  const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Resolve latitude and longitude from explicit fields or estimated area coordinates in Visakhapatnam
  const getOrderCoordinates = (order: Order): { lat: number; lng: number } | null => {
    const rawLat = order.shipping_latitude ?? (order as any).shippingAddress?.latitude ?? (order as any).shipping_address?.latitude;
    const rawLng = order.shipping_longitude ?? (order as any).shippingAddress?.longitude ?? (order as any).shipping_address?.longitude;
    if (rawLat && rawLng && !isNaN(Number(rawLat)) && !isNaN(Number(rawLng))) {
      return { lat: Number(rawLat), lng: Number(rawLng) };
    }
    // Fallback to recognized Visakhapatnam district/suburb coordinates for testing/manual entries
    const addressText = [
      order.shipping_area,
      order.shipping_street,
      order.shipping_formatted_address,
      (order as any).shippingAddress?.area,
      (order as any).shippingAddress?.street,
      (order as any).shippingAddress?.formatted_address,
    ].filter(Boolean).join(' ').toLowerCase();

    if (addressText.includes('rushikonda') || addressText.includes('sez') || addressText.includes('gitam')) {
      return { lat: 17.7815, lng: 83.3820 };
    }
    if (addressText.includes('mvp') || addressText.includes('sector')) {
      return { lat: 17.7423, lng: 83.3371 };
    }
    if (addressText.includes('lawsons') || addressText.includes('beach') || addressText.includes('pandurangapuram')) {
      return { lat: 17.7200, lng: 83.3300 };
    }
    if (addressText.includes('siripuram') || addressText.includes('dutt')) {
      return { lat: 17.7210, lng: 83.3150 };
    }
    if (addressText.includes('dwaraka') || addressText.includes('complex')) {
      return { lat: 17.7280, lng: 83.3050 };
    }
    if (addressText.includes('seethammadhara') || addressText.includes('hb colony')) {
      return { lat: 17.7400, lng: 83.3180 };
    }
    if (addressText.includes('gajuwaka') || addressText.includes('steel')) {
      return { lat: 17.6900, lng: 83.2100 };
    }
    if (addressText.includes('madhurawada') || addressText.includes('kommadi')) {
      return { lat: 17.8010, lng: 83.3550 };
    }
    return null;
  };

  // Get real-time dynamic distance in km for an order from live GPS coordinates
  const getOrderDistance = (order: Order): number | null => {
    if (!liveLocation) return null;
    const coords = getOrderCoordinates(order);
    if (!coords) return null;
    return haversineKm(liveLocation.lat, liveLocation.lng, coords.lat, coords.lng);
  };

  // Dispatch nearest order from coordinates helper
  const dispatchNearestFromCoords = (coords: { lat: number; lng: number }, candidates: Order[]) => {
    const scored = candidates.map((order) => {
      const oCoords = getOrderCoordinates(order);
      const dist = oCoords ? haversineKm(coords.lat, coords.lng, oCoords.lat, oCoords.lng) : null;
      return { order, dist };
    });

    // Sort strictly by shortest distance (orders with calculated distance first)
    scored.sort((a, b) => {
      if (a.dist === null && b.dist === null) return 0;
      if (a.dist === null) return 1;
      if (b.dist === null) return -1;
      return a.dist - b.dist;
    });

    const nearest = scored[0];
    if (nearest) {
      setActiveOrderId(nearest.order.id);
      setActiveTab('mission');
      const remainingCount = candidates.length;
      const distText =
        nearest.dist !== null
          ? nearest.dist < 1
            ? `${Math.round(nearest.dist * 1000)} meters`
            : `${nearest.dist.toFixed(1)} km`
          : 'nearest stop';
      showToast(
        `🎯 Nearest Stop Assigned: Order #${nearest.order.id} for ${getCustomerName(nearest.order)} (${distText} away)! ${remainingCount} total in queue.`,
        'success'
      );
    }
  };

  // Core "Near Me" delivery trigger: calculates shortest distance among all remaining undelivered orders
  const handleFindNearestOrder = (targetCoords?: { lat: number; lng: number }) => {
    // Only consider orders that are not DELIVERED, REJECTED, or CANCELLED
    const undelivered = orders.filter(
      (o) =>
        o.fulfillment_status !== 'DELIVERED' &&
        o.fulfillment_status !== 'REJECTED' &&
        o.fulfillment_status !== 'CANCELLED'
    );

    if (undelivered.length === 0) {
      showToast('All assigned orders have been successfully delivered today! Fantastic job! 🎉', 'success');
      return;
    }

    const currentCoords = targetCoords || liveLocation;

    if (!currentCoords) {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser. Selecting first order.', 'info');
        setActiveOrderId(undelivered[0].id);
        setActiveTab('mission');
        return;
      }
      setIsRequestingLocation(true);
      setLocationPermission('asking');
      showToast('Accessing live GPS location to calculate nearest stop...', 'info');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLiveLocation(coords);
          setLocationPermission('granted');
          setIsRequestingLocation(false);
          // Start watching updates
          navigator.geolocation.watchPosition(
            (p) => setLiveLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => {},
            { enableHighAccuracy: true, maximumAge: 30000 }
          );
          dispatchNearestFromCoords(coords, undelivered);
        },
        (err) => {
          console.warn('Location access denied:', err);
          setLocationPermission('denied');
          setIsRequestingLocation(false);
          setActiveOrderId(undelivered[0].id);
          setActiveTab('mission');
          showToast(`Location denied. Selected next order in queue (#${undelivered[0].id}).`, 'info');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
      return;
    }

    dispatchNearestFromCoords(currentCoords, undelivered);
  };

  // Request live location from browser
  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.', 'error');
      setLocationPermission('denied');
      return;
    }
    setIsRequestingLocation(true);
    setLocationPermission('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationPermission('granted');
        setIsRequestingLocation(false);
        showToast('Live location enabled! You can now use "Near Me Delivery" to find closest stops.', 'success');
        // Start watching for location updates
        navigator.geolocation.watchPosition(
          (p) => setLiveLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => {},
          { enableHighAccuracy: true, maximumAge: 30000 }
        );
      },
      (err) => {
        console.warn('Location denied:', err);
        setLocationPermission('denied');
        setIsRequestingLocation(false);
        showToast('Location access denied. Multi-stop route will use default order.', 'info');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };


  // Auto-prompt location on mount (for delivery boys only)
  useEffect(() => {
    if (!isSupervisor && typeof navigator !== 'undefined' && navigator.geolocation) {
      // Check permission state if Permissions API is available
      if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
          if (result.state === 'granted') {
            setLocationPermission('granted');
            navigator.geolocation.getCurrentPosition(
              (pos) => setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => {}
            );
          } else if (result.state === 'denied') {
            setLocationPermission('denied');
          } else {
            setLocationPermission('pending'); // will show the prompt banner
          }
        }).catch(() => {
          setLocationPermission('pending');
        });
      } else {
        setLocationPermission('pending');
      }
    }
  }, [isSupervisor]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Mobile Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenEditProfile = () => {
    setEditFullName(profile?.full_name || user?.profile?.name || user?.name || '');
    setEditPhone(profile?.phone || user?.profile?.phone || '');
    setEditAvatarUrl(profile?.avatar_url || user?.profile?.avatarUrl || '');
    setAvatarPreview(profile?.avatar_url || user?.profile?.avatarUrl || '');
    setEditPassword('');
    setShowEditPassword(false);
    setAvatarFile(null);
    setIsEditProfileOpen(true);
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size should be less than 5MB.', 'error');
      return;
    }
    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editFullName.trim()) {
      showToast('Please enter your full name.', 'error');
      return;
    }
    setIsSavingProfile(true);
    try {
      let finalAvatarUrl = editAvatarUrl.trim() || undefined;

      // If user uploaded a new file, upload to Cloudinary/backend first
      if (avatarFile) {
        try {
          const uploadRes = await deliveryService.uploadAvatar(avatarFile);
          if (uploadRes?.avatar_url) {
            finalAvatarUrl = uploadRes.avatar_url;
          }
        } catch (uploadErr) {
          console.warn('Avatar upload failed, continuing with URL:', uploadErr);
        }
      }

      const updated = await deliveryService.updateProfile({
        full_name: editFullName.trim(),
        phone: editPhone.trim() || undefined,
        avatar_url: finalAvatarUrl,
        password: editPassword.trim() ? editPassword.trim() : undefined,
      });

      if (updated) {
        setProfile(updated);
      } else {
        setProfile((prev) => (prev ? {
          ...prev,
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          avatar_url: finalAvatarUrl || prev.avatar_url,
        } : null));
      }

      showToast('Profile credentials and photo updated successfully! ✨', 'success');
      setIsEditProfileOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      showToast(msg, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Fetch delivery boy data
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const [profData, ordersData] = await Promise.all([
        deliveryService.getProfile().catch(() => null),
        deliveryService.getAssignedOrders(),
      ]);

      if (profData) {
        setProfile(profData);
        if (profData.is_active !== undefined) {
          setIsOnDuty(profData.is_active);
        }
      } else if (user) {
        setProfile({
          id: user.id || 'supervisor',
          full_name: user.profile?.name || user.name || 'Store Supervisor',
          email: user.email,
          phone: user.profile?.phone || 'N/A',
          is_active: true,
          role: user.role,
        });
      }
      setOrders(ordersData || []);

      // Auto-select active delivery mission if not already set
      setActiveOrderId((prevId) => {
        if (prevId && ordersData.some((o) => o.id === prevId && o.fulfillment_status !== 'DELIVERED' && o.fulfillment_status !== 'REJECTED')) {
          return prevId;
        }
        // Pick first order that is OUT_FOR_DELIVERY, PICKED_UP, or ACCEPTED
        const activeOrder = ordersData.find(
          (o) => o.fulfillment_status === 'OUT_FOR_DELIVERY' || o.fulfillment_status === 'PICKED_UP' || o.fulfillment_status === 'ACCEPTED'
        );
        return activeOrder ? activeOrder.id : ordersData[0]?.id || null;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to synchronize delivery orders.';
      if (msg.includes('403') || msg.toLowerCase().includes('restricted') || msg.toLowerCase().includes('denied')) {
        showToast('Operating in supervisory inspection mode.', 'info');
      } else {
        showToast(msg, 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    // Poll every 30s for real-time order assignments
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived stats
  const assignedOrders = orders.filter((o) => o.fulfillment_status === 'ASSIGNED');
  const acceptedOrders = orders.filter((o) => o.fulfillment_status === 'ACCEPTED');
  const pickedOrders = orders.filter((o) => o.fulfillment_status === 'PICKED_UP');
  const outOrders = orders.filter((o) => o.fulfillment_status === 'OUT_FOR_DELIVERY');
  const inProgressOrders = orders.filter(
    (o) => o.fulfillment_status === 'ACCEPTED' || o.fulfillment_status === 'PICKED_UP' || o.fulfillment_status === 'OUT_FOR_DELIVERY'
  );
  const deliveredOrders = orders.filter((o) => o.fulfillment_status === 'DELIVERED');

  const activeMissionOrder = orders.find((o) => o.id === activeOrderId) || inProgressOrders[0] || assignedOrders[0] || null;

  // ─── Actions ───────────────────────────────────────────────────────────────

  const [isBatchAccepting, setIsBatchAccepting] = useState<boolean>(false);

  // Accept Order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const updated = await deliveryService.acceptOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setActiveOrderId(orderId);
      const remainingAssigned = assignedOrders.filter((o) => o.id !== orderId);
      if (remainingAssigned.length === 0) {
        setActiveTab('mission');
      }
      showToast(`Order #${orderId} accepted! Please proceed to store for pickup.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to accept order.';
      showToast(msg, 'error');
    }
  };

  // Batch Accept All Assigned Orders
  const handleBatchAcceptAll = async () => {
    if (assignedOrders.length === 0) return;
    setIsBatchAccepting(true);
    try {
      const orderIds = assignedOrders.map((o) => o.id);
      const res = await deliveryService.batchAcceptOrders(orderIds);
      setOrders((prev) =>
        prev.map((o) =>
          orderIds.includes(o.id)
            ? { ...o, fulfillment_status: 'ACCEPTED', status: 'Processing' }
            : o
        )
      );
      if (orderIds.length > 0 && !activeOrderId) {
        setActiveOrderId(orderIds[0]);
      }
      showToast(`Accepted ${res.count || orderIds.length} orders successfully! Routing optimized.`, 'success');
      setActiveTab('route');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to batch accept orders.';
      showToast(msg, 'error');
    } finally {
      setIsBatchAccepting(false);
    }
  };

  // Reject Order
  const handleConfirmReject = async () => {
    if (!rejectModalOrder) return;
    setIsRejecting(true);
    const finalReason = rejectReason === 'Other' ? customRejectReason : rejectReason;
    try {
      await deliveryService.rejectOrder(rejectModalOrder.id, finalReason);
      setOrders((prev) => prev.filter((o) => o.id !== rejectModalOrder.id));
      if (activeOrderId === rejectModalOrder.id) {
        setActiveOrderId(null);
      }
      showToast(`Order #${rejectModalOrder.id} declined. Admin notified for reassignment.`, 'info');
      setRejectModalOrder(null);
      setCustomRejectReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reject order.';
      showToast(msg, 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // Mark Picked Up
  const handleMarkPickedUp = async (orderId: string) => {
    try {
      const updated = await deliveryService.markPickedUp(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      showToast(`Order #${orderId} marked as Picked Up! You may now navigate to customer.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark picked up.';
      showToast(msg, 'error');
    }
  };

  // Mark Out for Delivery (Generates OTP on backend)
  const handleMarkOutForDelivery = async (orderId: string) => {
    try {
      const resp = await deliveryService.markOutForDelivery(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...resp.order, fulfillment_status: 'OUT_FOR_DELIVERY', status: 'Out for Delivery' } : o)));
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError('');
      showToast('Order marked as Out for Delivery! 6-digit OTP sent to customer app.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark out for delivery.';
      showToast(msg, 'error');
    }
  };

  // OTP Digits Keypad Handler
  const handleOtpDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');

    // Auto advance focus
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    const newDigits = [...otpDigits];
    for (let i = 0; i < paste.length; i++) {
      newDigits[i] = paste[i];
    }
    setOtpDigits(newDigits);
    if (paste.length === 6) {
      otpInputRefs.current[5]?.focus();
    }
  };

  // Verify OTP and complete delivery
  const handleVerifyOtpAndDeliver = async (orderId: string) => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP provided by the customer.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');
    try {
      const resp = await deliveryService.completeDelivery(orderId, fullOtp);
      const updatedOrder = resp.order;
      const updatedOrders = orders.map((o) => (o.id === orderId ? { ...o, ...updatedOrder, fulfillment_status: 'DELIVERED', status: 'Delivered' } : o));
      setOrders(updatedOrders);

      // Trigger celebration modal
      setCompletedCelebrationOrder(updatedOrder);

      // Find the next nearest order among the remaining undelivered orders (e.g. 4 remaining from 5)
      const remainingCandidates = updatedOrders.filter(
        (o) =>
          o.id !== orderId &&
          o.fulfillment_status !== 'DELIVERED' &&
          o.fulfillment_status !== 'REJECTED' &&
          o.fulfillment_status !== 'CANCELLED'
      );

      if (remainingCandidates.length > 0) {
        if (liveLocation) {
          const scored = remainingCandidates.map((o) => ({ order: o, dist: getOrderDistance(o) }));
          scored.sort((a, b) => {
            if (a.dist === null && b.dist === null) return 0;
            if (a.dist === null) return 1;
            if (b.dist === null) return -1;
            return a.dist - b.dist;
          });
          setActiveOrderId(scored[0].order.id);
        } else {
          setActiveOrderId(remainingCandidates[0].id);
        }
      } else {
        setActiveOrderId(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Incorrect OTP. Please re-check with customer.';
      setOtpError(msg);
      showToast(msg, 'error');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Build Google Maps turn-by-turn navigation URL
  const getGoogleMapsUrl = (order: Order): string => {
    const lat = order.shipping_latitude ?? order.shippingAddress?.latitude;
    const lng = order.shipping_longitude ?? order.shippingAddress?.longitude;

    if (lat && lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }

    const addr =
      order.shipping_formatted_address ||
      order.shippingAddress?.formatted_address ||
      [
        order.shipping_house_number || order.shippingAddress?.house_number,
        order.shipping_street || order.shippingAddress?.street,
        order.shipping_area || order.shippingAddress?.area,
        order.shipping_city || order.shippingAddress?.city,
        order.shipping_state || order.shippingAddress?.state,
        order.shipping_pincode || order.shippingAddress?.zip,
      ]
        .filter(Boolean)
        .join(', ');

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr || 'India')}`;
  };

  // Helper for customer phone
  const getCustomerPhone = (order: Order): string => {
    return order.customer_phone || order.shipping_phone || order.shippingAddress?.phone || '';
  };

  const getCustomerName = (order: Order): string => {
    return order.customer_name || order.shipping_name || order.shippingAddress?.name || 'Customer';
  };

  const getFullAddress = (order: Order): string => {
    return (
      order.shipping_formatted_address ||
      order.shippingAddress?.formatted_address ||
      [
        order.shipping_house_number || order.shippingAddress?.house_number,
        order.shipping_street || order.shippingAddress?.street,
        order.shipping_area || order.shippingAddress?.area,
        order.shipping_landmark ? `(Near: ${order.shipping_landmark})` : null,
        order.shipping_city || order.shippingAddress?.city,
        order.shipping_state || order.shippingAddress?.state,
        order.shipping_pincode || order.shippingAddress?.zip,
      ]
        .filter(Boolean)
        .join(', ') ||
      'Customer address provided at checkout'
    );
  };

  return (
    <div className="delivery-layout-container" style={{ position: 'relative', minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #1a1410 0%, #0c0907 100%)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            background: toastMessage.type === 'error' ? '#e74c3c' : toastMessage.type === 'success' ? '#2ecc71' : '#c9a84c',
            color: toastMessage.type === 'error' || toastMessage.type === 'success' ? '#fff' : '#0f0c0a',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.88rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'error' && <AlertCircle size={18} />}
          {toastMessage.type === 'success' && <CheckCircle size={18} />}
          {toastMessage.text}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP STATIONARY SIDEBAR (> 768px only)
          ══════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <aside
          className="delivery-desktop-sidebar"
          style={{
            width: '260px',
            height: '100vh',
            background: 'linear-gradient(180deg, #16100c 0%, #0d0907 100%)',
            borderRight: '1px solid rgba(201, 168, 76, 0.22)',
            position: 'fixed',
            top: 0,
            left: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px 16px',
            zIndex: 110,
            fontFamily: 'var(--font-body, system-ui, sans-serif)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflow: 'hidden' }}>
            {/* Brand Header with Unique Official Chovique Logo */}
            <div
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                paddingLeft: '6px',
              }}
              title="Return to Public Store"
            >
              <img
                src="/assets/logo.png"
                alt="Chovique Logo"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  border: '1px solid #c9a84c',
                  objectFit: 'cover',
                  boxShadow: '0 0 10px rgba(201, 168, 76, 0.35)',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=100&q=80';
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display, serif)',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    letterSpacing: '1.5px',
                    background: 'var(--gradient-gold-text, linear-gradient(135deg, #d4af37 0%, #f3e5ab 50%, #aa771c 100%))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1.1,
                  }}
                >
                  CHOVIQUE
                </span>
                <span
                  style={{
                    fontSize: '0.66rem',
                    color: '#c9a84c',
                    textTransform: 'uppercase',
                    letterSpacing: '1.8px',
                    fontWeight: 700,
                    marginTop: '2px',
                  }}
                >
                  Delivery Workspace
                </span>
              </div>
            </div>

            {/* Quick Duty Status Toggle Card */}
            <div
              style={{
                background: isOnDuty ? 'rgba(46, 204, 113, 0.08)' : 'rgba(231, 76, 60, 0.08)',
                border: `1px solid ${isOnDuty ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`,
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isOnDuty ? '#2ecc71' : '#e74c3c',
                    boxShadow: isOnDuty ? '0 0 8px #2ecc71' : 'none',
                  }}
                />
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isOnDuty ? '#2ecc71' : '#e74c3c' }}>
                    {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>
                    {isOnDuty ? 'Accepting deliveries' : 'Standby mode'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleDuty}
                title="Toggle duty status"
                style={{
                  background: isOnDuty ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${isOnDuty ? '#2ecc71' : 'rgba(255, 255, 255, 0.2)'}`,
                  color: isOnDuty ? '#2ecc71' : 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isOnDuty ? 'Go Off' : 'Go On'}
              </button>
            </div>

            {/* Navigation Items List */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  color: '#c9a84c',
                  textTransform: 'uppercase',
                  letterSpacing: '1.8px',
                  fontWeight: 700,
                  paddingLeft: '8px',
                  marginBottom: '2px',
                }}
              >
                DISPATCH NAVIGATION
              </span>

              {/* 1. Active Mission */}
              <button
                onClick={() => setActiveTab('mission')}
                className={`delivery-sidebar-item ${activeTab === 'mission' ? 'active' : ''}`}
              >
                <div className="sidebar-item-left">
                  <Navigation size={16} color={activeTab === 'mission' ? '#0f0c0a' : '#c9a84c'} />
                  <span>Active Mission</span>
                </div>
                {activeMissionOrder && (
                  <span className="sidebar-badge" style={{ background: activeTab === 'mission' ? '#0f0c0a' : 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>LIVE</span>
                )}
              </button>

              {/* 2. Assigned Queue */}
              <button onClick={() => setActiveTab('queue')} className={`delivery-sidebar-item ${activeTab === 'queue' ? 'active' : ''}`}>
                <div className="sidebar-item-left">
                  <Package size={16} color={activeTab === 'queue' ? '#0f0c0a' : '#c9a84c'} />
                  <span>Assigned Queue</span>
                </div>
                {assignedOrders.length > 0 && (
                  <span className="sidebar-badge" style={{ background: activeTab === 'queue' ? '#0f0c0a' : '#e67e22', color: activeTab === 'queue' ? '#e67e22' : '#fff' }}>{assignedOrders.length}</span>
                )}
              </button>

              {/* 3. Route Multi-Stop */}
              <button onClick={() => setActiveTab('route')} className={`delivery-sidebar-item ${activeTab === 'route' ? 'active' : ''}`}>
                <div className="sidebar-item-left">
                  <Route size={16} color={activeTab === 'route' ? '#0f0c0a' : '#c9a84c'} />
                  <span>Multi-Stop Route</span>
                </div>
                <span className="sidebar-badge" style={{ background: activeTab === 'route' ? '#0f0c0a' : 'rgba(52,152,219,0.2)', color: '#3498db' }}>{inProgressOrders.length}</span>
              </button>

              {/* 4. Delivered History */}
              <button onClick={() => setActiveTab('history')} className={`delivery-sidebar-item ${activeTab === 'history' ? 'active' : ''}`}>
                <div className="sidebar-item-left">
                  <Award size={16} color={activeTab === 'history' ? '#0f0c0a' : '#c9a84c'} />
                  <span>Delivered History</span>
                </div>
                <span className="sidebar-badge" style={{ background: activeTab === 'history' ? '#0f0c0a' : 'rgba(46,204,113,0.2)', color: '#2ecc71' }}>{deliveredOrders.length}</span>
              </button>

              {/* 5. Profile */}
              <button onClick={() => setActiveTab('profile')} className={`delivery-sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}>
                <div className="sidebar-item-left">
                  <User size={16} color={activeTab === 'profile' ? '#0f0c0a' : '#c9a84c'} />
                  <span>Profile &amp; Hub</span>
                </div>
              </button>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '8px 0' }} />

              {/* View Store Quick Action */}
              <button
                onClick={() => navigate('/')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.65)',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Store size={15} color="#c9a84c" />
                <span>Customer Shop & Home Page</span>
                <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
              </button>
            </nav>
          </div>

          {/* Sidebar Footer: Executive Profile Card & Logout */}
          <div
            style={{
              paddingTop: '16px',
              borderTop: '1px solid rgba(201, 168, 76, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(26,17,14,0.9))',
                  border: '1px solid #c9a84c',
                  color: '#c9a84c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {profile?.full_name?.charAt(0) || user?.name?.charAt(0) || 'D'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#f5efe6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.full_name || user?.name || 'Executive'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#c9a84c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>{isSupervisor ? (user?.role === 'superadmin' ? 'Superadmin Supervisor' : 'Admin Supervisor') : 'Delivery Partner'}</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
                  <span style={{ color: isOnDuty ? '#2ecc71' : '#e74c3c' }}>{isOnDuty ? 'Active' : 'Standby'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(231, 76, 60, 0.1)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                color: '#e74c3c',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOBILE TOP NAVBAR (Fixed, ≤ 768px only)
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <header
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'rgba(18, 14, 11, 0.98)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(201, 168, 76, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            zIndex: 1000,
          }}
        >
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <img
              src="/assets/logo.png"
              alt="Chovique Logo"
              style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #c9a84c', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=100&q=80';
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display, serif)',
                fontWeight: 700,
                fontSize: '1.1rem',
                letterSpacing: '1px',
                background: 'var(--gradient-gold-text, linear-gradient(135deg, #d4af37 0%, #f3e5ab 50%, #aa771c 100%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              CHOVIQUE
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                background: 'rgba(201,168,76,0.18)',
                color: '#c9a84c',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                letterSpacing: '0.5px',
              }}
            >
              DELIVERY PARTNER
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

            {/* If Supervisor, Return to Admin */}
            {isSupervisor && (
              <button
                onClick={() => navigate(user?.role === 'superadmin' ? '/superadmin' : '/admin')}
                title="Return to Admin Dashboard"
                style={{
                  background: 'rgba(46, 204, 113, 0.12)',
                  border: '1px solid rgba(46, 204, 113, 0.3)',
                  color: '#2ecc71',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ShieldCheck size={15} />
              </button>
            )}

            {/* Duty Toggle Button */}
            <button
              onClick={handleToggleDuty}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '16px',
                background: isOnDuty ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                border: `1px solid ${isOnDuty ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)'}`,
                color: isOnDuty ? '#2ecc71' : '#e74c3c',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isOnDuty ? '#2ecc71' : '#e74c3c',
                }}
              />
              {isOnDuty ? 'ON' : 'OFF'}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData()}
              disabled={isRefreshing}
              title="Refresh Orders"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
            </button>

            {/* Hamburger Menu Drawer Trigger */}
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              title="More Navigation Options"
              style={{
                background: 'rgba(201, 168, 76, 0.15)',
                border: '1px solid rgba(201, 168, 76, 0.35)',
                color: '#f5d77f',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Menu size={16} />
            </button>
          </div>
        </header>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOBILE HAMBURGER DRAWER (Slide-out menu for remaining items)
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && isMobileDrawerOpen && (
        <>
          <div
            onClick={() => setIsMobileDrawerOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              zIndex: 1100,
            }}
          />

          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '280px',
              background: 'linear-gradient(180deg, #18120d 0%, #0d0907 100%)',
              borderLeft: '1px solid rgba(201,168,76,0.3)',
              zIndex: 1200,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '20px 16px',
              boxSizing: 'border-box',
              boxShadow: '-6px 0 24px rgba(0,0,0,0.6)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src="/assets/logo.png"
                    alt="Logo"
                    style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #c9a84c' }}
                  />
                  <div style={{ lineHeight: 1.1 }}>
                    <div style={{ fontFamily: 'serif', fontWeight: 700, color: '#f5efe6', fontSize: '0.95rem' }}>CHOVIQUE</div>
                    <div style={{ fontSize: '0.62rem', color: '#c9a84c', letterSpacing: '1px', textTransform: 'uppercase' }}>Partner Menu</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* User Card in Drawer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(201,168,76,0.2)', marginBottom: '16px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid #c9a84c', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a110e', color: '#c9a84c', fontWeight: 800 }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    profile?.full_name?.charAt(0) || user?.name?.charAt(0) || 'D'
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#f5efe6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile?.full_name || user?.name || 'Executive'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#c9a84c' }}>
                    {isSupervisor ? (user?.role === 'superadmin' ? 'Superadmin Supervisor' : 'Admin Supervisor') : 'Delivery Partner'}
                  </div>
                </div>
              </div>

              {/* Drawer Navigation Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setIsMobileDrawerOpen(false);
                    handleOpenEditProfile();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    color: '#f5d77f',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Edit2 size={16} />
                  <span>Edit Profile & Photo</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/');
                    setIsMobileDrawerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f5efe6',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <Store size={16} color="#c9a84c" />
                  <span>Customer Shop & Home Page</span>
                </button>

                {isSupervisor && (
                  <button
                    onClick={() => {
                      navigate(user?.role === 'superadmin' ? '/superadmin' : '/admin');
                      setIsMobileDrawerOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#f5efe6',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <ShieldCheck size={16} color="#2ecc71" />
                    <span>Return to {user?.role === 'superadmin' ? 'Superadmin' : 'Admin'} Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    fetchData();
                    setIsMobileDrawerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: '#f5efe6',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <RefreshCw size={16} color="#3498db" />
                  <span>Sync & Refresh Orders</span>
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(201,168,76,0.2)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleToggleDuty()}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: isOnDuty ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)',
                  border: `1px solid ${isOnDuty ? '#2ecc71' : '#e74c3c'}`,
                  color: isOnDuty ? '#2ecc71' : '#e74c3c',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span className="status-dot-pulse" style={{ background: isOnDuty ? '#2ecc71' : '#e74c3c' }} />
                <span>{isOnDuty ? 'ON DUTY (Active)' : 'OFF DUTY (Standby)'}</span>
              </button>

              <button
                onClick={() => logout()}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(231,76,60,0.12)',
                  border: '1px solid rgba(231,76,60,0.3)',
                  color: '#e74c3c',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <LogOut size={15} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOBILE FIXED BOTTOM NAVBAR (≤ 768px only)
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <nav
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '68px',
            background: 'rgba(18, 14, 11, 0.98)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(201, 168, 76, 0.3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            alignItems: 'center',
            zIndex: 1000,
            boxShadow: '0 -6px 20px rgba(0, 0, 0, 0.6)',
            padding: '0 4px',
          }}
        >
          {/* Mission */}
          <button
            onClick={() => setActiveTab('mission')}
            className={`delivery-mobile-bottom-btn ${activeTab === 'mission' ? 'active' : ''}`}
          >
            <Navigation size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'mission' ? 700 : 500 }}>Mission</span>
            {activeMissionOrder && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '18px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#2ecc71',
                }}
              />
            )}
          </button>

          {/* Queue */}
          <button
            onClick={() => setActiveTab('queue')}
            className={`delivery-mobile-bottom-btn ${activeTab === 'queue' ? 'active' : ''}`}
          >
            <Package size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'queue' ? 700 : 500 }}>Queue</span>
            {assignedOrders.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '14px',
                  background: '#e67e22',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  lineHeight: 1.1,
                }}
              >
                {assignedOrders.length}
              </span>
            )}
          </button>

          {/* Route (Center accent) */}
          <button
            onClick={() => setActiveTab('route')}
            className={`delivery-mobile-bottom-btn ${activeTab === 'route' ? 'active' : ''}`}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: activeTab === 'route' ? 'var(--gradient-gold, linear-gradient(135deg, #c9a84c 0%, #a07d2c 100%))' : 'rgba(201, 168, 76, 0.15)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                color: activeTab === 'route' ? '#0f0c0a' : '#c9a84c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '-12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            >
              <Route size={18} />
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'route' ? 700 : 500 }}>
              Route ({inProgressOrders.length})
            </span>
          </button>

          {/* History */}
          <button
            onClick={() => setActiveTab('history')}
            className={`delivery-mobile-bottom-btn ${activeTab === 'history' ? 'active' : ''}`}
          >
            <Award size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'history' ? 700 : 500 }}>History</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`delivery-mobile-bottom-btn ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <User size={18} />
            <span style={{ fontSize: '0.68rem', fontWeight: activeTab === 'profile' ? 700 : 500 }}>Profile</span>
          </button>
        </nav>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ══════════════════════════════════════════════════════════════ */}
      <main
        style={{
          marginLeft: isMobile ? 0 : '260px',
          width: isMobile ? '100%' : 'calc(100% - 260px)',
          minHeight: '100vh',
          paddingTop: isMobile ? '68px' : 0,
          paddingBottom: isMobile ? '86px' : '40px',
          boxSizing: 'border-box',
        }}
      >
        {/* Desktop Top Header (When not mobile) */}
        {!isMobile && (
          <header
            style={{
              background: 'rgba(20, 15, 12, 0.9)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid rgba(201, 168, 76, 0.2)',
              padding: '16px 28px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 90,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display, serif)',
                  fontSize: '1.4rem',
                  color: '#f5efe6',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {activeTab === 'mission' && 'Active Delivery Mission'}
                {activeTab === 'queue' && 'Assigned Orders Queue'}
                {activeTab === 'route' && `Multi-Stop Batch Route (${inProgressOrders.length} Locations)`}
                {activeTab === 'history' && 'Delivered Fulfillment History'}
                {activeTab === 'profile' && 'Delivery Partner Profile & Fulfillment Hub'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                {activeTab === 'mission' && 'Live turn-by-turn routing, customer details & secure OTP handoff.'}
                {activeTab === 'queue' && 'Review incoming batch assignments, accept pickups or decline.'}
                {activeTab === 'route' && 'High-density multi-stop delivery cluster with dynamic map navigation.'}
                {activeTab === 'history' && 'Completed order receipts, customer signatures, and fulfillment logs.'}
                {activeTab === 'profile' && 'Executive profile credentials, central dispatch fulfillment center details & duty controls.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {/* Duty Pill with Toggle */}
              <button
                type="button"
                onClick={handleToggleDuty}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: isOnDuty ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                  border: `1px solid ${isOnDuty ? 'rgba(46, 204, 113, 0.4)' : 'rgba(231, 76, 60, 0.4)'}`,
                  color: isOnDuty ? '#2ecc71' : '#e74c3c',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isOnDuty ? '#2ecc71' : '#e74c3c',
                    boxShadow: isOnDuty ? '0 0 8px #2ecc71' : 'none',
                  }}
                />
                <span>{isOnDuty ? 'ON DUTY (LIVE)' : 'OFF DUTY (STANDBY)'}</span>
              </button>

              {/* Refresh Button */}
              <button
                onClick={() => fetchData()}
                disabled={isRefreshing}
                title="Refresh Assigned Orders"
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#f5efe6',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: isRefreshing ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                <RefreshCw size={14} className={isRefreshing ? 'spinning' : ''} />
                <span>Refresh</span>
              </button>

              {/* Executive Avatar */}
              <div
                onClick={() => setActiveTab('profile')}
                title="View Profile"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(26,17,14,0.9))',
                  border: '1px solid #c9a84c',
                  color: '#c9a84c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {profile?.full_name?.charAt(0) || user?.name?.charAt(0) || 'D'}
              </div>
            </div>
          </header>
        )}

        {/* ─── Supervisor Mode Reassurance Banner (Admin / Superadmin) ────── */}
        {isSupervisor && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 18px',
              background: 'linear-gradient(90deg, rgba(201, 168, 76, 0.15) 0%, rgba(26, 17, 14, 0.8) 100%)',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color="#c9a84c" />
              <div>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f5efe6' }}>
                  Supervisor Mode Active — {user?.role === 'superadmin' ? 'Superadmin' : 'Admin'} Privilege
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
                  You have full supervisory access to monitor, test, and manage all delivery routes and assigned orders.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(user?.role === 'superadmin' ? '/superadmin' : '/admin')}
              style={{
                padding: '6px 14px',
                background: 'rgba(201, 168, 76, 0.2)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                borderRadius: '8px',
                color: '#f5d77f',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Return to {user?.role === 'superadmin' ? 'Superadmin' : 'Admin'} Dashboard</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* ─── Metric Stats Strip ────────────────────────────────────────────── */}
        <section className="delivery-stats-grid" style={{ marginTop: '20px' }}>
          <div className="delivery-stat-card">
            <div className="delivery-stat-icon" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>
              <Package size={20} />
            </div>
            <div>
              <div className="delivery-stat-val">{assignedOrders.length}</div>
              <div className="delivery-stat-lbl">New Assigned</div>
            </div>
          </div>

          <div className="delivery-stat-card">
            <div className="delivery-stat-icon" style={{ background: 'rgba(52,152,219,0.15)', color: '#3498db' }}>
              <Navigation size={20} />
            </div>
            <div>
              <div className="delivery-stat-val">{inProgressOrders.length}</div>
              <div className="delivery-stat-lbl">In Progress / Picked</div>
            </div>
          </div>

          <div className="delivery-stat-card">
            <div className="delivery-stat-icon" style={{ background: 'rgba(46,204,113,0.15)', color: '#2ecc71' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="delivery-stat-val">{deliveredOrders.length}</div>
              <div className="delivery-stat-lbl">Delivered Today</div>
            </div>
          </div>

          <div className="delivery-stat-card">
            <div className="delivery-stat-icon" style={{ background: 'rgba(155,89,182,0.15)', color: '#9b59b6' }}>
              <Layers size={20} />
            </div>
            <div>
              <div className="delivery-stat-val">{orders.length}</div>
              <div className="delivery-stat-lbl">Total Batch Orders</div>
            </div>
          </div>
        </section>

        {/* ─── Main Content Views ─────────────────────────────────────────────── */}
        <div className="delivery-content">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#c9a84c' }}>
            <RefreshCw size={36} className="spinning" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Synchronizing Assigned Deliveries...</div>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════════════════════
                TAB 1: ACTIVE MISSION (Single Order Focus Mode)
               ════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'mission' && (
              <div>
                {/* Multi-Order Route Recommendation Banner */}
                {inProgressOrders.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(26,17,14,0.92) 100%)',
                      border: '1px solid rgba(201,168,76,0.4)',
                      borderRadius: '12px',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(201,168,76,0.2)',
                          border: '1px solid var(--gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--gold)',
                          flexShrink: 0,
                        }}
                      >
                        <Route size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: '#f5efe6', fontSize: '0.9rem' }}>
                          🚚 You have {inProgressOrders.length} active deliveries accepted!
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>
                          Use Multi-Stop Route Optimizer to deliver to the nearest customer first.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('route');
                        handleFindNearestOrder();
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #c9a84c 0%, #a07d2c 100%)',
                        color: '#0f0c0a',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(201,168,76,0.25)',
                      }}
                    >
                      <Navigation size={14} />
                      <span>🗺️ Optimize Route</span>
                    </button>
                  </div>
                )}

                {activeMissionOrder ? (
                  <div className="active-mission-card">
                    {/* Header */}
                    <div className="mission-header">
                      <div>
                        <div className="mission-tag">
                          <Sparkles size={13} />
                          CURRENT ACTIVE DELIVERY TARGET
                        </div>
                        <h2 className="mission-order-id">Order #{activeMissionOrder.id}</h2>
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>
                          Placed on {activeMissionOrder.date || 'Recent'} • {activeMissionOrder.paymentMethod || 'Prepaid UPI'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background:
                              activeMissionOrder.fulfillment_status === 'OUT_FOR_DELIVERY'
                                ? 'rgba(230, 126, 34, 0.2)'
                                : activeMissionOrder.fulfillment_status === 'PICKED_UP'
                                ? 'rgba(52, 152, 219, 0.2)'
                                : activeMissionOrder.fulfillment_status === 'ACCEPTED'
                                ? 'rgba(46, 204, 113, 0.2)'
                                : 'rgba(201, 168, 76, 0.2)',
                            color:
                              activeMissionOrder.fulfillment_status === 'OUT_FOR_DELIVERY'
                                ? '#e67e22'
                                : activeMissionOrder.fulfillment_status === 'PICKED_UP'
                                ? '#3498db'
                                : activeMissionOrder.fulfillment_status === 'ACCEPTED'
                                ? '#2ecc71'
                                : '#c9a84c',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Status: {activeMissionOrder.fulfillment_status || activeMissionOrder.status}
                        </span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f5efe6', marginTop: '6px' }}>
                          ₹{activeMissionOrder.total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          <span style={{ fontSize: '0.74rem', color: '#c9a84c', marginLeft: '6px' }}>
                            ({activeMissionOrder.payment_status || 'PAID'})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mission Lifecycle Stepper */}
                    <div className="mission-progress-track">
                      <div className="mission-progress-line">
                        <div
                          className="mission-progress-line-fill"
                          style={{
                            width:
                              activeMissionOrder.fulfillment_status === 'DELIVERED'
                                ? '100%'
                                : activeMissionOrder.fulfillment_status === 'OUT_FOR_DELIVERY'
                                ? '75%'
                                : activeMissionOrder.fulfillment_status === 'PICKED_UP'
                                ? '50%'
                                : activeMissionOrder.fulfillment_status === 'ACCEPTED'
                                ? '25%'
                                : '0%',
                          }}
                        />
                      </div>

                      <div
                        className={`mission-step-node ${
                          ['ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeMissionOrder.fulfillment_status || '')
                            ? 'done'
                            : 'active'
                        }`}
                      >
                        <div className="mission-step-circle">1</div>
                        <span className="mission-step-label">Accept</span>
                      </div>

                      <div
                        className={`mission-step-node ${
                          ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeMissionOrder.fulfillment_status || '')
                            ? 'done'
                            : activeMissionOrder.fulfillment_status === 'ACCEPTED'
                            ? 'active'
                            : ''
                        }`}
                      >
                        <div className="mission-step-circle">2</div>
                        <span className="mission-step-label">Pickup</span>
                      </div>

                      <div
                        className={`mission-step-node ${
                          ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(activeMissionOrder.fulfillment_status || '')
                            ? 'done'
                            : activeMissionOrder.fulfillment_status === 'PICKED_UP'
                            ? 'active'
                            : ''
                        }`}
                      >
                        <div className="mission-step-circle">3</div>
                        <span className="mission-step-label">Out En Route</span>
                      </div>

                      <div
                        className={`mission-step-node ${
                          activeMissionOrder.fulfillment_status === 'DELIVERED'
                            ? 'done'
                            : activeMissionOrder.fulfillment_status === 'OUT_FOR_DELIVERY'
                            ? 'active'
                            : ''
                        }`}
                      >
                        <div className="mission-step-circle">4</div>
                        <span className="mission-step-label">OTP & Deliver</span>
                      </div>
                    </div>

                    {/* Main Grid: Customer Details & Order Contents */}
                    <div className="mission-grid">
                      {/* Left: Customer Location & Google Maps Redirection */}
                      <div className="mission-box">
                        <div className="mission-box-title">
                          <MapPin size={16} />
                          Customer Delivery Destination
                        </div>

                        <div className="mission-customer-name">{getCustomerName(activeMissionOrder)}</div>
                        <div className="mission-address">{getFullAddress(activeMissionOrder)}</div>

                        {/* Customer Quick Call / WhatsApp */}
                        {getCustomerPhone(activeMissionOrder) && (
                          <div className="mission-contact-actions">
                            <a href={`tel:${getCustomerPhone(activeMissionOrder)}`} className="btn-contact btn-call">
                              <Phone size={15} /> Call Customer
                            </a>
                            <a
                              href={`https://wa.me/${getCustomerPhone(activeMissionOrder).replace(/\D/g, '')}?text=Hello! I am your Chovique delivery executive with your chocolate order #${activeMissionOrder.id}.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-contact btn-whatsapp"
                            >
                              <MessageSquare size={15} /> WhatsApp
                            </a>
                          </div>
                        )}

                        {/* Google Maps Turn-by-Turn Navigation */}
                        <a
                          href={getGoogleMapsUrl(activeMissionOrder)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-maps"
                        >
                          <Navigation size={18} />
                          Start GPS Navigation in Google Maps ↗
                        </a>
                      </div>

                      {/* Right: Items & Store Details */}
                      <div className="mission-box">
                        <div className="mission-box-title">
                          <Store size={16} />
                          Store & Package Items
                        </div>

                        <div style={{ marginBottom: '12px', fontSize: '0.84rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Pickup Origin: </span>
                          <strong style={{ color: '#c9a84c' }}>
                            {activeMissionOrder.store_name || 'Chovique Flagship Store (MVP Colony, Visakhapatnam)'}
                          </strong>
                        </div>

                        <div style={{ maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                          {(activeMissionOrder.items || []).map((it, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '6px 0',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                fontSize: '0.84rem',
                              }}
                            >
                              <span style={{ color: '#f5efe6' }}>
                                {it.product?.name || 'Artisanal Chocolate'} × <strong style={{ color: '#c9a84c' }}>{it.quantity}</strong>
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                                ₹{(((it as any).price || it.product?.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Payment Mode:</span>
                          <strong style={{ color: activeMissionOrder.paymentMethod?.toLowerCase().includes('cash') ? '#e74c3c' : '#2ecc71' }}>
                            {activeMissionOrder.paymentMethod || 'Prepaid Online'}
                            {activeMissionOrder.paymentMethod?.toLowerCase().includes('cash') && ' (COLLECT CASH)'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* ─── Workflow Step Action Controls ──────────────────────── */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                      {/* State 1: Assigned -> Needs Accept or Decline */}
                      {activeMissionOrder.fulfillment_status === 'ASSIGNED' && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            className="btn-accept"
                            style={{ flex: 2, padding: '14px 20px', fontSize: '1rem' }}
                            onClick={() => handleAcceptOrder(activeMissionOrder.id)}
                          >
                            <CheckCircle size={18} />
                            Accept Assigned Delivery
                          </button>
                          <button
                            className="btn-reject"
                            style={{ flex: 1, padding: '14px 20px', fontSize: '0.95rem' }}
                            onClick={() => setRejectModalOrder(activeMissionOrder)}
                          >
                            <XCircle size={18} />
                            Decline / Reject
                          </button>
                        </div>
                      )}

                      {/* State 2: Accepted -> Needs Store Pickup */}
                      {activeMissionOrder.fulfillment_status === 'ACCEPTED' && (
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <button
                            className="btn-action-primary"
                            style={{ padding: '14px 22px', fontSize: '1rem', background: '#2ecc71' }}
                            onClick={() => handleMarkPickedUp(activeMissionOrder.id)}
                          >
                            <Store size={18} />
                            Confirm Picked Up from Store
                          </button>
                          <button
                            className="btn-reject"
                            style={{ padding: '14px 18px' }}
                            onClick={() => setRejectModalOrder(activeMissionOrder)}
                          >
                            Cancel Assignment
                          </button>
                        </div>
                      )}

                      {/* State 3: Picked Up -> On the way to customer -> Trigger Out for Delivery */}
                      {activeMissionOrder.fulfillment_status === 'PICKED_UP' && (
                        <div>
                          <div style={{ marginBottom: '12px', color: '#c9a84c', fontSize: '0.88rem', fontWeight: 600 }}>
                            📍 En route to customer. When you reach customer location, mark as Out for Delivery to issue OTP.
                          </div>
                          <button
                            className="btn-action-primary"
                            style={{ padding: '15px 24px', fontSize: '1.05rem', background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color: '#fff' }}
                            onClick={() => handleMarkOutForDelivery(activeMissionOrder.id)}
                          >
                            <Truck size={20} />
                            Mark Out for Delivery (Arrived / Reached)
                          </button>
                        </div>
                      )}

                      {/* State 4: Out for Delivery -> Collect and Verify Customer OTP */}
                      {activeMissionOrder.fulfillment_status === 'OUT_FOR_DELIVERY' && (
                        <div className="otp-entry-box">
                          <div className="otp-title">
                            <ShieldCheck size={22} color="#2ecc71" />
                            CUSTOMER DELIVERY VERIFICATION OTP
                          </div>
                          <div className="otp-subtext">
                            Ask the customer for the 6-digit OTP displayed in their Chovique app to confirm handover.
                          </div>

                          {/* 6 Digit Input Row */}
                          <div className="otp-inputs-row" onPaste={handleOtpPaste}>
                            {otpDigits.map((digit, idx) => (
                              <input
                                key={idx}
                                ref={(el) => {
                                  otpInputRefs.current[idx] = el;
                                }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                className="otp-digit-input"
                                autoFocus={idx === 0}
                              />
                            ))}
                          </div>

                          {otpError && (
                            <div style={{ color: '#e74c3c', fontSize: '0.84rem', fontWeight: 700, marginBottom: '14px' }}>
                              ⚠️ {otpError}
                            </div>
                          )}

                          <button
                            className="btn-confirm-delivery"
                            onClick={() => handleVerifyOtpAndDeliver(activeMissionOrder.id)}
                            disabled={isVerifyingOtp || otpDigits.join('').length !== 6}
                          >
                            {isVerifyingOtp ? (
                              <RefreshCw size={18} className="spinning" />
                            ) : (
                              <CheckCircle size={20} />
                            )}
                            {isVerifyingOtp ? 'Verifying OTP...' : 'Verify OTP & Complete Delivery'}
                          </button>
                        </div>
                      )}

                      {/* State 5: Delivered */}
                      {activeMissionOrder.fulfillment_status === 'DELIVERED' && (
                        <div style={{ textAlign: 'center', padding: '16px', color: '#2ecc71' }}>
                          <CheckCircle size={32} style={{ margin: '0 auto 8px' }} />
                          <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Order Delivered Successfully!</div>
                          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                            Package verified and handed over with OTP.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(24, 19, 15, 0.8)',
                      border: '1px dashed rgba(201, 168, 76, 0.3)',
                      borderRadius: '16px',
                      padding: '50px 20px',
                      textAlign: 'center',
                    }}
                  >
                    <Package size={48} color="#c9a84c" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
                    <h3 style={{ fontSize: '1.25rem', color: '#f5efe6', marginBottom: '8px' }}>No Active Delivery Mission Selected</h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.88rem' }}>
                      Choose an order from your assigned queue to set as your primary active delivery target.
                    </p>
                    <button className="btn-tab" style={{ background: '#c9a84c', color: '#0f0c0a', padding: '10px 20px', borderRadius: '8px', fontWeight: 700 }} onClick={() => setActiveTab('queue')}>
                      View Assigned Orders Queue
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                TAB 2: ASSIGNED ORDERS QUEUE
               ════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'queue' && (
              <div>
                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                  {['ALL', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: statusFilter === st ? '#c9a84c' : 'rgba(255,255,255,0.06)',
                        color: statusFilter === st ? '#0f0c0a' : 'rgba(255,255,255,0.7)',
                        border: '1px solid',
                        borderColor: statusFilter === st ? '#c9a84c' : 'rgba(255,255,255,0.1)',
                      }}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                {/* Batch Accept Banner when assigned orders exist */}
                {assignedOrders.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      background: 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(28,18,12,0.95))',
                      border: '1px solid rgba(201,168,76,0.4)',
                      borderRadius: '12px',
                      marginBottom: '18px',
                      flexWrap: 'wrap',
                      gap: '12px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div>
                      <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡ {assignedOrders.length} New Orders Assigned to You</span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', marginTop: '3px' }}>
                        Accept your assigned orders to enable nearest stop route optimization and store pickup.
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isBatchAccepting}
                      onClick={handleBatchAcceptAll}
                      style={{
                        padding: '9px 20px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #c9a84c 0%, #a07d2c 100%)',
                        color: '#0f0c0a',
                        fontWeight: 800,
                        fontSize: '0.84rem',
                        border: 'none',
                        cursor: isBatchAccepting ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(201,168,76,0.25)',
                      }}
                    >
                      {isBatchAccepting ? <RefreshCw size={14} className="spinning" /> : <CheckCircle2 size={15} />}
                      <span>{isBatchAccepting ? 'Accepting All...' : `Accept All (${assignedOrders.length}) Orders`}</span>
                    </button>
                  </div>
                )}

                <div className="delivery-orders-grid">
                  {orders
                    .filter((o) => (statusFilter === 'ALL' ? o.fulfillment_status !== 'DELIVERED' : o.fulfillment_status === statusFilter))
                    .map((order) => {
                      const isCurrent = order.id === activeOrderId;
                      return (
                        <div key={order.id} className={`delivery-order-card ${isCurrent ? 'is-active-target' : ''}`}>
                          <div>
                            <div className="order-card-top">
                              <div className="order-badge-row">
                                <span
                                  className="order-status-pill"
                                  style={{
                                    background:
                                      order.fulfillment_status === 'OUT_FOR_DELIVERY'
                                        ? 'rgba(230,126,34,0.2)'
                                        : order.fulfillment_status === 'PICKED_UP'
                                        ? 'rgba(52,152,219,0.2)'
                                        : order.fulfillment_status === 'ACCEPTED'
                                        ? 'rgba(46,204,113,0.2)'
                                        : 'rgba(201,168,76,0.2)',
                                    color:
                                      order.fulfillment_status === 'OUT_FOR_DELIVERY'
                                        ? '#e67e22'
                                        : order.fulfillment_status === 'PICKED_UP'
                                        ? '#3498db'
                                        : order.fulfillment_status === 'ACCEPTED'
                                        ? '#2ecc71'
                                        : '#c9a84c',
                                  }}
                                >
                                  {order.fulfillment_status || order.status}
                                </span>
                                {isCurrent && (
                                  <span style={{ fontSize: '0.68rem', background: '#c9a84c', color: '#0f0c0a', padding: '3px 6px', borderRadius: '4px', fontWeight: 800 }}>
                                    CURRENT TARGET
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f5efe6' }}>
                                ₹{order.total?.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div className="order-card-customer">
                              <div className="order-card-customer-name">
                                Order #{order.id} • {getCustomerName(order)}
                              </div>
                              <div className="order-card-address">{getFullAddress(order)}</div>
                            </div>

                            <div className="order-card-meta">
                              <span>{order.items?.length || 1} Products</span>
                              <span style={{ color: order.paymentMethod?.toLowerCase().includes('cash') ? '#e74c3c' : '#2ecc71' }}>
                                {order.paymentMethod || 'Prepaid'}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div>
                            {order.fulfillment_status === 'ASSIGNED' ? (
                              <div className="order-actions-row">
                                <button className="btn-accept" onClick={() => handleAcceptOrder(order.id)}>
                                  <Check size={14} /> Accept
                                </button>
                                <button className="btn-reject" onClick={() => setRejectModalOrder(order)}>
                                  <X size={14} /> Decline
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn-action-primary"
                                  onClick={() => {
                                    setActiveOrderId(order.id);
                                    setActiveTab('mission');
                                  }}
                                >
                                  <Navigation size={14} />
                                  {isCurrent ? 'Continue Mission' : 'Set as Active Mission'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {orders.filter((o) => o.fulfillment_status !== 'DELIVERED').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.6)' }}>
                    <CheckCircle size={40} color="#2ecc71" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f5efe6' }}>Queue Clear!</div>
                    <p style={{ fontSize: '0.85rem' }}>All assigned orders have been safely delivered.</p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                TAB 3: MULTI-STOP ROUTE (e.g. 5 Locations)
               ════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'route' && (
              <div>
                {/* ─── Route Tab Top Action Bar ─────────────────────────────── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '16px',
                    padding: '12px 16px',
                    background: 'rgba(20,16,13,0.9)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: '12px',
                  }}
                >
                  {/* Left: Duty + Live GPS status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.8rem', fontWeight: 800,
                        color: isOnDuty ? '#2ecc71' : '#e74c3c',
                      }}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnDuty ? '#2ecc71' : '#e74c3c', boxShadow: isOnDuty ? '0 0 8px #2ecc71' : 'none', display: 'inline-block' }} />
                      {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
                    </span>
                    {locationPermission === 'granted' && liveLocation && (
                      <span style={{ fontSize: '0.75rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 6px #2ecc71', display: 'inline-block' }} />
                        Live GPS
                      </span>
                    )}
                  </div>

                  {/* Right: Near Me + Refresh */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-near-me"
                      onClick={() => { setActiveTab('route'); handleFindNearestOrder(); }}
                      title="Find nearest delivery stop from your GPS location"
                    >
                      <span className="btn-near-me-radar" />
                      <Navigation size={14} />
                      <span>Near Me Delivery</span>
                      {orders.filter((o) => o.fulfillment_status !== 'DELIVERED' && o.fulfillment_status !== 'REJECTED' && o.fulfillment_status !== 'CANCELLED').length > 0 && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(15,12,10,0.35)', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                          {orders.filter((o) => o.fulfillment_status !== 'DELIVERED' && o.fulfillment_status !== 'REJECTED' && o.fulfillment_status !== 'CANCELLED').length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => fetchData()}
                      disabled={isRefreshing}
                      title="Refresh orders"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: '#f5efe6',
                        padding: '7px 13px',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        cursor: isRefreshing ? 'not-allowed' : 'pointer',
                        fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >
                      <RefreshCw size={13} className={isRefreshing ? 'spinning' : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Location Permission Banner — only shown when PENDING (not granted/denied) */}
                {locationPermission === 'pending' && (
                  <div className="location-permission-banner">
                    <div className="location-permission-icon">
                      <Navigation size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4>Enable Live Location for Smart Routing</h4>
                      <p>Allow location access to automatically sort your delivery stops by nearest distance — like a professional dispatch system.</p>
                    </div>
                    <button
                      className="btn-allow-location"
                      onClick={handleRequestLocation}
                      disabled={isRequestingLocation}
                    >
                      {isRequestingLocation ? (
                        <><RefreshCw size={14} className="spinning" /><span>Locating...</span></>
                      ) : (
                        <><MapPin size={14} /><span>Allow Live Location</span></>
                      )}
                    </button>
                  </div>
                )}

                {/* Route Header */}
                <div style={{ background: 'rgba(20,16,13,0.9)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '16px', padding: '18px 20px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', color: '#f5efe6', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Route size={18} color="#c9a84c" /> Multi-Stop Delivery Circuit
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                        {locationPermission === 'granted' && liveLocation
                          ? '📍 Sorted by nearest distance from your current location'
                          : 'Deliver one-by-one. Enable location for proximity-based sorting.'}
                      </p>
                    </div>
                    {locationPermission === 'denied' && (
                      <button
                        onClick={handleRequestLocation}
                        style={{ padding: '7px 14px', borderRadius: '8px', background: 'rgba(52,152,219,0.15)', border: '1px solid rgba(52,152,219,0.35)', color: '#3498db', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <MapPin size={13} /> Retry Location
                      </button>
                    )}
                    {locationPermission === 'granted' && liveLocation && (
                      <span style={{ fontSize: '0.72rem', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 6px #2ecc71', display: 'inline-block' }} />
                        Live GPS Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Proximity Auto-Dispatch Action Banner */}
                {orders.some((o) => o.fulfillment_status !== 'DELIVERED') && (
                  <div className="proximity-dispatch-banner">
                    <div className="proximity-dispatch-text">
                      <h3>
                        <Navigation size={18} color="#c9a84c" />
                        Proximity Multi-Stop Dispatch
                      </h3>
                      <p>
                        Target orders one-by-one by shortest GPS distance. After completing each drop-off, re-click to get the next closest delivery.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-near-me"
                      onClick={() => handleFindNearestOrder()}
                    >
                      <span className="btn-near-me-radar" />
                      <MapPin size={15} />
                      <span>Target Nearest Stop (Near Me)</span>
                    </button>
                  </div>
                )}

                {/* Sorted Stops List */}
                {(() => {
                  // Sort accepted/in-progress orders by proximity if location granted, else keep original order
                  const routeOrders = [...orders];
                  if (locationPermission === 'granted' && liveLocation) {
                    routeOrders.sort((a, b) => {
                      if (a.fulfillment_status === 'DELIVERED' && b.fulfillment_status !== 'DELIVERED') return 1;
                      if (b.fulfillment_status === 'DELIVERED' && a.fulfillment_status !== 'DELIVERED') return -1;
                      const dA = getOrderDistance(a);
                      const dB = getOrderDistance(b);
                      if (dA === null && dB === null) return 0;
                      if (dA === null) return 1;
                      if (dB === null) return -1;
                      return dA - dB;
                    });
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {routeOrders.map((order, idx) => {
                        const isDelivered = order.fulfillment_status === 'DELIVERED';
                        const isCurrent = order.id === activeOrderId;
                        const distKm = getOrderDistance(order);
                        const isNearest = idx === 0 && !isDelivered && distKm !== null;
                        return (
                          <div
                            key={order.id}
                            className={`route-stop-card ${isNearest ? 'is-nearest' : ''}`}
                            style={{
                              border: `1px solid ${isCurrent ? '#c9a84c' : isNearest ? '#2ecc71' : 'rgba(255,255,255,0.08)'}`,
                              background: isCurrent
                                ? 'linear-gradient(135deg, rgba(35,28,22,0.95), rgba(20,16,13,0.95))'
                                : 'rgba(22,17,14,0.85)',
                              opacity: isDelivered ? 0.6 : 1,
                            }}
                          >
                            {isNearest && <span className="nearest-badge">⚡ Nearest Stop</span>}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '220px' }}>
                              <div
                                style={{
                                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                  background: isDelivered ? '#2ecc71' : isCurrent ? '#c9a84c' : isNearest ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.1)',
                                  border: isNearest && !isDelivered && !isCurrent ? '1.5px solid #2ecc71' : 'none',
                                  color: isDelivered || isCurrent ? '#0f0c0a' : isNearest ? '#2ecc71' : '#f5efe6',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontWeight: 800, fontSize: '0.85rem',
                                }}
                              >
                                {isDelivered ? <Check size={18} strokeWidth={3} /> : idx + 1}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                                  <strong style={{ color: '#f5efe6', fontSize: '0.9rem' }}>{getCustomerName(order)}</strong>
                                  <span style={{ fontSize: '0.68rem', color: '#c9a84c', fontWeight: 700 }}>#{order.id}</span>
                                  {isCurrent && <span style={{ fontSize: '0.65rem', background: '#c9a84c', color: '#0f0c0a', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>CURRENT</span>}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {getFullAddress(order)}
                                </div>
                                {distKm !== null ? (
                                  <span
                                    className="distance-badge"
                                    style={{
                                      marginTop: '6px',
                                      background: 'rgba(201, 168, 76, 0.14)',
                                      border: '1px solid rgba(201, 168, 76, 0.3)',
                                      color: '#f5d77f',
                                    }}
                                  >
                                    <MapPin size={11} />
                                    {distKm < 1 ? `${Math.round(distKm * 1000)} meters away` : `${distKm.toFixed(1)} km away`}
                                  </span>
                                ) : (
                                  <span
                                    className="distance-badge"
                                    style={{
                                      marginTop: '6px',
                                      background: 'rgba(255, 255, 255, 0.05)',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      color: 'rgba(255, 255, 255, 0.6)',
                                    }}
                                  >
                                    <MapPin size={11} />
                                    {liveLocation ? 'Zone destination' : 'Enable GPS for distance'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <a
                                href={getGoogleMapsUrl(order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ padding: '7px 12px', borderRadius: '7px', background: 'rgba(27,110,194,0.2)', border: '1px solid rgba(27,110,194,0.4)', color: '#3498db', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                              >
                                <ExternalLink size={12} /> Maps
                              </a>
                              {!isDelivered && (
                                <button
                                  onClick={() => {
                                    setActiveOrderId(order.id);
                                    setActiveTab('mission');
                                    showToast(`Targeting Stop #${idx + 1}: Order #${order.id} for ${getCustomerName(order)}.`, 'info');
                                  }}
                                  style={{
                                    padding: '7px 14px',
                                    borderRadius: '7px',
                                    background: isCurrent ? '#c9a84c' : 'rgba(255,255,255,0.1)',
                                    border: isCurrent ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                    color: isCurrent ? '#0f0c0a' : '#f5efe6',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Navigation size={12} />
                                  {isCurrent ? 'Current Target' : 'Target Stop'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {orders.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.6)' }}>
                    <Route size={40} color="#c9a84c" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f5efe6' }}>No stops in circuit</div>
                    <p style={{ fontSize: '0.85rem' }}>Accept orders from the queue to build your multi-stop route.</p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                TAB 4: DELIVERED HISTORY
               ════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'history' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {deliveredOrders.map((order) => (
                    <div
                      key={order.id}
                      style={{
                        background: 'rgba(20, 16, 13, 0.85)',
                        border: '1px solid rgba(46, 204, 113, 0.25)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: 'rgba(46, 204, 113, 0.15)',
                            color: '#2ecc71',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f5efe6' }}>
                            Order #{order.id} • {getCustomerName(order)}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>
                            {getFullAddress(order)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#2ecc71', fontSize: '1rem' }}>
                          ₹{order.total?.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#c9a84c', marginTop: '2px' }}>
                          OTP Verified & Handed Over
                        </div>
                      </div>
                    </div>
                  ))}

                  {deliveredOrders.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.5)' }}>
                      <Clock size={36} color="#c9a84c" style={{ margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>No delivered orders yet today</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                TAB 5: FULFILLMENT HUB & PROFILE
                ════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'profile' && (
              <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '30px' }}>
                {/* Executive Profile Card */}
                <div
                  className="glass-panel"
                  style={{
                    background: 'linear-gradient(135deg, rgba(26, 18, 11, 0.98), rgba(16, 12, 9, 0.98))',
                    border: '1px solid rgba(201, 168, 76, 0.35)',
                    borderRadius: '16px',
                    padding: '28px',
                    marginBottom: '24px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <div
                      onClick={handleOpenEditProfile}
                      title="Click to change avatar photo"
                      style={{
                        position: 'relative',
                        width: '74px',
                        height: '74px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(201,168,76,0.4), rgba(26,17,14,0.9))',
                        border: '2px solid #c9a84c',
                        color: '#c9a84c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        boxShadow: '0 0 20px rgba(201,168,76,0.25)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                      }}
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt="Avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        profile?.full_name?.charAt(0) || user?.name?.charAt(0) || 'D'
                      )}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '24px',
                          background: 'rgba(0,0,0,0.65)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Camera size={12} color="#f5d77f" />
                      </div>
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.4rem', color: '#f5efe6', margin: 0 }}>
                          {profile?.full_name || user?.name || 'Executive'}
                        </h3>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(201, 168, 76, 0.15)',
                            border: '1px solid rgba(201, 168, 76, 0.35)',
                            color: '#c9a84c',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                          }}
                        >
                          {isSupervisor ? (user?.role === 'superadmin' ? 'SUPERADMIN SUPERVISOR' : 'ADMIN SUPERVISOR') : 'DELIVERY PARTNER'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.84rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="#c9a84c" />
                          <span>{profile?.phone || 'Phone not set'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={14} color="#c9a84c" />
                          <span>{profile?.email || user?.email || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={14} color="#2ecc71" />
                          <span style={{ color: '#2ecc71', fontWeight: 600 }}>Verified Partner</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleOpenEditProfile}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.1) 100%)',
                          border: '1px solid rgba(201, 168, 76, 0.5)',
                          color: '#f5d77f',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Edit2 size={15} />
                        <span>Edit Profile & Photo</span>
                      </button>

                      <button
                        onClick={handleToggleDuty}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          background: isOnDuty ? 'rgba(46, 204, 113, 0.15)' : 'rgba(231, 76, 60, 0.15)',
                          border: `1px solid ${isOnDuty ? '#2ecc71' : '#e74c3c'}`,
                          color: isOnDuty ? '#2ecc71' : '#e74c3c',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <span className="status-dot-pulse" style={{ background: isOnDuty ? '#2ecc71' : '#e74c3c' }} />
                        {isOnDuty ? 'Duty Active (Toggle Off)' : 'Duty Offline (Toggle On)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hub Details & Operating Protocol */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div
                    style={{
                      background: 'rgba(22, 17, 14, 0.9)',
                      border: '1px solid rgba(201, 168, 76, 0.25)',
                      borderRadius: '12px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Store size={20} color="#c9a84c" />
                      <h4 style={{ margin: 0, color: '#f5efe6', fontSize: '1rem', fontFamily: 'var(--font-display, serif)' }}>
                        Assigned Fulfillment Center
                      </h4>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                      <strong style={{ color: '#f5efe6' }}>Chovique Central Store & Fulfillment Hub</strong><br />
                      Plot 42, Jubilee Hills Road No. 36<br />
                      Hyderabad, Telangana 500033<br />
                      <span style={{ color: '#c9a84c' }}>Hub Dispatch Hours: 09:00 AM – 10:00 PM (Daily Express)</span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(22, 17, 14, 0.9)',
                      border: '1px solid rgba(201, 168, 76, 0.25)',
                      borderRadius: '12px',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Award size={20} color="#2ecc71" />
                      <h4 style={{ margin: 0, color: '#f5efe6', fontSize: '1rem', fontFamily: 'var(--font-display, serif)' }}>
                        Fulfillment Performance
                      </h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>SUCCESS RATE</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2ecc71' }}>100%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>TOTAL BATCH DELIVERIES</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#c9a84c' }}>{deliveredOrders.length}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>MAX MULTI-STOP LIMIT</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3498db' }}>5 Orders</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>DISPATCH PROTOCOL</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5efe6' }}>OTP Secured</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Session Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => navigate('/')}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#f5efe6',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Store size={15} />
                    <span>Live Storefront / Home Page</span>
                  </button>
                  <button
                    onClick={() => logout()}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: 'rgba(231, 76, 60, 0.15)',
                      border: '1px solid rgba(231, 76, 60, 0.4)',
                      color: '#e74c3c',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <LogOut size={15} />
                    <span>Log Out of Delivery Portal</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </main>

      {/* ─── Reject Order Modal ───────────────────────────────────────────────── */}
      {rejectModalOrder && (
        <div className="delivery-modal-overlay">
          <div className="delivery-modal">
            <h3 className="delivery-modal-title">Decline Assigned Order #{rejectModalOrder.id}?</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Please provide a reason. The order will be instantly returned to the dispatcher pool for reassignment.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[
                'Location out of range / inaccessible',
                'Vehicle breakdown / bike tire puncture',
                'Heavy traffic / road closed',
                'Severe rain or storm weather',
                'Shift hours completed',
                'Other',
              ].map((reason) => (
                <label
                  key={reason}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.84rem',
                    color: '#f5efe6',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: rejectReason === reason ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${rejectReason === reason ? '#c9a84c' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            {rejectReason === 'Other' && (
              <textarea
                placeholder="Specify rejection reason..."
                value={customRejectReason}
                onChange={(e) => setCustomRejectReason(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(14, 11, 9, 0.9)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                  resize: 'none',
                  height: '70px',
                }}
              />
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-reject"
                style={{ flex: 1, padding: '12px' }}
                onClick={handleConfirmReject}
                disabled={isRejecting}
              >
                {isRejecting ? 'Declining...' : 'Confirm Decline'}
              </button>
              <button
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#f5efe6',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={() => setRejectModalOrder(null)}
              >
                Keep Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Celebration Modal (Delivery Completed) ───────────────────────────── */}
      {completedCelebrationOrder && (
        <div className="delivery-modal-overlay">
          <div className="delivery-modal" style={{ textAlign: 'center', borderColor: '#2ecc71' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(46, 204, 113, 0.2)',
                border: '2px solid #2ecc71',
                color: '#2ecc71',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Award size={36} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.4rem', color: '#2ecc71', margin: '0 0 6px' }}>
              Delivery Verified & Completed! 🎉
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '18px' }}>
              Order #{completedCelebrationOrder.id} has been delivered to <strong>{getCustomerName(completedCelebrationOrder)}</strong>.
            </p>

            {(() => {
              const remainingOrders = orders.filter(
                (o) =>
                  o.id !== completedCelebrationOrder.id &&
                  o.fulfillment_status !== 'DELIVERED' &&
                  o.fulfillment_status !== 'REJECTED' &&
                  o.fulfillment_status !== 'CANCELLED'
              );
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {remainingOrders.length > 0 ? (
                    <button
                      className="btn-near-me"
                      style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.96rem' }}
                      onClick={() => {
                        setCompletedCelebrationOrder(null);
                        handleFindNearestOrder();
                      }}
                    >
                      <span className="btn-near-me-radar" />
                      <Navigation size={18} />
                      <span>Deliver Next Nearest Order ({remainingOrders.length} Remaining)</span>
                    </button>
                  ) : (
                    <div style={{ color: '#2ecc71', fontWeight: 800, fontSize: '1rem', margin: '10px 0' }}>
                      🏁 All Assigned Deliveries Completed! Fantastic Work!
                    </div>
                  )}

                  <button
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f5efe6',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setCompletedCelebrationOrder(null);
                      setActiveTab('route');
                    }}
                  >
                    View Multi-Stop Route Circuit
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── Edit Profile & Credentials Modal ─────────────────────────────── */}
      {isEditProfileOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #18120d 0%, #0e0a08 100%)',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              padding: '24px',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <User size={18} color="#c9a84c" />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#f5efe6', fontSize: '1.15rem', fontFamily: 'serif' }}>Edit Profile & Photo</h3>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Update delivery credentials & avatar photo</span>
                </div>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Avatar Upload Preview Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(201,168,76,0.15)' }}>
                <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', border: '2px solid #c9a84c', overflow: 'hidden', flexShrink: 0, background: '#1a110e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#c9a84c' }}>
                      {editFullName.charAt(0) || 'D'}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f5efe6', marginBottom: '4px' }}>Profile Photo</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      style={{ display: 'none' }}
                      onChange={handleAvatarFileChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(201, 168, 76, 0.2)',
                        border: '1px solid rgba(201, 168, 76, 0.4)',
                        color: '#f5d77f',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Camera size={13} />
                      <span>Upload Photo</span>
                    </button>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview('');
                          setEditAvatarUrl('');
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: 'rgba(231,76,60,0.1)',
                          border: '1px solid rgba(231,76,60,0.3)',
                          color: '#e74c3c',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>PNG, JPG or WebP up to 5MB</div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    color: '#f5efe6',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    color: '#f5efe6',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Optional Avatar URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                  Photo URL (Optional)
                </label>
                <input
                  type="url"
                  value={editAvatarUrl}
                  onChange={(e) => {
                    setEditAvatarUrl(e.target.value);
                    if (!avatarFile) setAvatarPreview(e.target.value);
                  }}
                  placeholder="https://example.com/photo.jpg"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    color: '#f5efe6',
                    fontSize: '0.84rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Optional Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                  New Password (Leave blank to keep current)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      color: '#f5efe6',
                      fontSize: '0.84rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#f5efe6',
                    fontWeight: 600,
                    fontSize: '0.84rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  style={{
                    flex: 2,
                    padding: '11px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #c9a84c 0%, #a07d2c 100%)',
                    border: 'none',
                    color: '#0f0c0a',
                    fontWeight: 800,
                    fontSize: '0.86rem',
                    cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(201,168,76,0.3)',
                  }}
                >
                  {isSavingProfile ? <RefreshCw size={15} className="spinning" /> : <Check size={15} />}
                  <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
