import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  ShieldCheck,
  Truck,
  CreditCard,
  ChevronRight,
  Loader2,
  Coins,
  Tag,
  QrCode,
  Smartphone,
  Timer,
  RefreshCw,
  MessageSquare,
  Phone,
  Send,
  ExternalLink,
  MapPin,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useQrPaymentPoller } from './useQrPaymentPoller';
import { useApp } from '../../app/providers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Progress } from '../../components/ui/Progress';
import { pageTransition, scaleUp } from '../../lib/framer';
import { apiPost } from '../../lib/api';
import { orderService } from '../../services/orderService';
import { walletService } from '../../services/walletService';
import { cartService } from '../../services/cartService';
import { userService } from '../../services/userService';
import { shippingService } from '../../services/shippingService';
import { DeliveryLocationPicker, AddressFormData } from './DeliveryLocationPicker';
import type { Order, CheckoutInitiateResponse, VerifyPaymentPayload, ShippingCalculateResponse } from '../../types';
import { RAZORPAY_CHOVIQUE_LOGO } from '../../assets/razorpayLogo';

// Razorpay global type declaration
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, any>) => { open: () => void };
  }
}

/** Coupon data passed from CartPage via sessionStorage */
interface CheckoutCouponData {
  code: string;
  discount_percent: number;
  discount_amount: number;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const CheckoutPage: React.FC = () => {
  const { cart, user, wallet, refreshWallet, placeOrderLocal, storeConfig } = useApp();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // ─── UPI QR Code payment state ─────────────────────────────────────────────
  const [qrCodeData, setQrCodeData] = useState<{
    qr_code_id: string;
    image_url: string;
    close_by: number; // Unix timestamp
  } | null>(null);
  const [isQrMode, setIsQrMode] = useState(false);
  const [isQrExpired, setIsQrExpired] = useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = useState(0);
  // Internal order ID saved during QR flow to fetch order after capture
  const [qrInternalOrderId, setQrInternalOrderId] = useState<string | null>(null);

  // Coins redemption state
  const [coinsToUse, setCoinsToUse] = useState(0);
  const [coinPreview, setCoinPreview] = useState<{
    allowed_coins: number;
    coin_discount: number;
    max_usable_coins: number;
    message: string;
  }>({ allowed_coins: 0, coin_discount: 0, max_usable_coins: 0, message: '' });

  // The checkout items to display and place order for (uses full cart infrastructure)
  const checkoutItems = cart;

  // Redirect if checkout items list is empty (only on steps 1–5, not success screen)
  useEffect(() => {
    if (checkoutItems.length === 0 && activeStep < 6) {
      navigate('/cart');
    }
  }, [checkoutItems, navigate, activeStep]);

  // Pre-fill shipping form from authenticated user's default address if available
  const [shippingForm, setShippingForm] = useState<AddressFormData>({
    name: user?.profile?.name || user?.name || '',
    phone: user?.profile?.phone || '',
    house_number: '',
    street: '',
    area: '',
    landmark: '',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '',
    latitude: null,
    longitude: null,
    formatted_address: null,
    google_place_id: null,
    location_source: 'MANUAL',
    location_verified: false,
    address_type: 'HOME',
    save_to_book: true,
  });

  const [shippingQuote, setShippingQuote] = useState<ShippingCalculateResponse | null>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);

  // Fetch the user's addresses and populate the default or last used one (Amazon/Zepto instant address load)
  useEffect(() => {
    // 1. Instantly check localStorage cache so returning customers never wait or re-type
    try {
      const cached =
        localStorage.getItem('chovique_default_address') ||
        localStorage.getItem('chovique_last_saved_address');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.street || parsed.area || parsed.pincode)) {
          setShippingForm((prev) => ({
            ...prev,
            ...parsed,
            name: parsed.name || prev.name,
            phone: parsed.phone || prev.phone,
            pincode: (parsed.pincode || parsed.zip || '').replace(/\D/g, '').slice(0, 6),
          }));
        }
      }
    } catch {}

    // 2. Fetch authenticated user's address book from backend and update if available
    if (user && user.role !== 'guest') {
      userService
        .getAddresses()
        .then((addrs) => {
          if (addrs && addrs.length > 0) {
            const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
            setShippingForm((prev) => ({
              ...prev,
              name: defaultAddr.name || prev.name,
              phone: defaultAddr.phone || prev.phone,
              house_number: defaultAddr.house_number || (defaultAddr as any).houseNumber || '',
              street: defaultAddr.street || '',
              area: defaultAddr.area || '',
              landmark: defaultAddr.landmark || '',
              city: defaultAddr.city || 'Visakhapatnam',
              district: defaultAddr.district || 'Visakhapatnam',
              state: defaultAddr.state || 'Andhra Pradesh',
              pincode: (defaultAddr.pincode || defaultAddr.zip || '').replace(/\D/g, '').slice(0, 6),
              latitude: defaultAddr.latitude ?? null,
              longitude: defaultAddr.longitude ?? null,
              formatted_address: defaultAddr.formatted_address || (defaultAddr as any).formattedAddress || null,
              google_place_id: defaultAddr.google_place_id || (defaultAddr as any).googlePlaceId || null,
              location_source: defaultAddr.location_source || (defaultAddr as any).locationSource || 'SAVED_ADDRESS',
              location_verified: Boolean(defaultAddr.location_verified || (defaultAddr as any).locationVerified),
            }));
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Pricing calculations (display-only; backend recalculates authoritatively)
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Recalculate shipping quote when 6-digit PIN code is typed or subtotal changes
  const calculateShippingQuote = useCallback(async (
    pincode: string,
    lat?: number | null,
    lng?: number | null
  ) => {
    if (!pincode || pincode.trim().length !== 6) return null;
    setIsCalculatingQuote(true);
    try {
      const quote = await shippingService.calculateShipping({
        pincode: pincode.trim(),
        subtotal,
        city: shippingForm.city,
        district: shippingForm.district,
        state: shippingForm.state,
        latitude: lat ?? shippingForm.latitude,
        longitude: lng ?? shippingForm.longitude,
      });
      setShippingQuote(quote);
      return quote;
    } catch (err: any) {
      console.warn('Shipping calculation error:', err);
      return null;
    } finally {
      setIsCalculatingQuote(false);
    }
  }, [subtotal, shippingForm.city, shippingForm.district, shippingForm.state, shippingForm.latitude, shippingForm.longitude]);

  useEffect(() => {
    if (shippingForm.pincode && shippingForm.pincode.length === 6) {
      calculateShippingQuote(shippingForm.pincode, shippingForm.latitude, shippingForm.longitude);
    }
  }, [shippingForm.pincode, subtotal, calculateShippingQuote]);

  const [deliveryOption, setDeliveryOption] = useState('Standard Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [paymentError, setPaymentError] = useState('');

  // Shipping form validation errors
  const [shippingErrors, setShippingErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

  // Coupon state: read initial coupon from sessionStorage or allow applying/removing directly
  const [appliedCoupon, setAppliedCoupon] = useState<CheckoutCouponData | null>(() => {
    try {
      const raw = sessionStorage.getItem('chovique_checkout_coupon');
      return raw ? (JSON.parse(raw) as CheckoutCouponData) : null;
    } catch {
      return null;
    }
  });

  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.role !== 'guest') {
      cartService
        .getAvailableCoupons()
        .then((coupons) => {
          const eligible = (coupons || []).filter(
            (c: any) =>
              c.is_active !== false &&
              c.status !== 'Used' &&
              c.status !== 'USED' &&
              c.status !== 'Expired' &&
              c.status !== 'EXPIRED' &&
              c.status !== 'Not Available'
          );
          setAvailableCoupons(eligible);
        })
        .catch(() => {});
    }
  }, [user]);

  const discountAmount = appliedCoupon?.discount_amount ?? 0;

  // Re-validate applied coupon against backend whenever items or subtotal changes
  useEffect(() => {
    if (appliedCoupon && appliedCoupon.code && checkoutItems.length > 0) {
      cartService
        .validateCoupon(appliedCoupon.code)
        .then((res) => {
          if (res.valid) {
            const discountVal = res.calculated_discount ?? (
              res.discount_percent
                ? Math.round(subtotal * (res.discount_percent / 100) * 100) / 100
                : (res.discount_amount ?? 0)
            );
            const updatedPayload: CheckoutCouponData = {
              code: res.code || appliedCoupon.code,
              discount_percent: res.discount_percent || 0,
              discount_amount: discountVal,
            };
            setAppliedCoupon(updatedPayload);
            sessionStorage.setItem('chovique_checkout_coupon', JSON.stringify(updatedPayload));
            setCouponError('');
          } else {
            setAppliedCoupon(null);
            sessionStorage.removeItem('chovique_checkout_coupon');
            setCouponError(res.message || 'Selected coupon is no longer applicable to your cart.');
          }
        })
        .catch(() => {});
    }
  }, [checkoutItems, subtotal]);

  // Calculate coin redemption when coinsToUse, wallet, subtotal, or coupon changes
  useEffect(() => {
    if (wallet && wallet.coin_balance > 0 && coinsToUse > 0) {
      walletService
        .calculateRedemption({
          subtotal,
          coupon_discount: discountAmount,
          coins_to_use: coinsToUse,
        })
        .then((res) => {
          setCoinPreview(res);
        })
        .catch(() => {
          setCoinPreview({ allowed_coins: 0, coin_discount: 0, max_usable_coins: 0, message: 'Available reward coins are insufficient for redemption on this order.' });
        });
    } else {
      setCoinPreview({ allowed_coins: 0, coin_discount: 0, max_usable_coins: 0, message: '' });
    }
  }, [wallet, coinsToUse, subtotal, discountAmount]);

  const coinsPerRupee = wallet?.settings?.coins_per_rupee || 10;
  const coinDiscountAmount =
    coinsToUse > 0
      ? (coinPreview.coin_discount > 0
          ? coinPreview.coin_discount
          : Math.round((coinsToUse / coinsPerRupee) * 100) / 100)
      : 0;
  
  // Dynamic Shipping Fee (Calculated from delivery address and service areas)
  const freeShippingMin = storeConfig?.free_shipping_min_order ?? 500;
  const shippingFee = shippingQuote ? shippingQuote.delivery_charge : (subtotal >= freeShippingMin || subtotal === 0 ? 0 : 50);

  // Tax
  const gstRate = storeConfig?.gst_rate ?? 0;
  const taxAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100;

  // Total
  const total = Math.max(0, subtotal - discountAmount - coinDiscountAmount + shippingFee + taxAmount);

  const formatCouponExpiry = (rawExp: any): string => {
    if (!rawExp) return '';
    const strVal = String(rawExp).trim();
    if (!strVal || strVal.toLowerCase() === 'no expiry' || strVal.toLowerCase() === 'none' || strVal.toLowerCase() === 'null' || strVal.toLowerCase() === 'undefined') {
      return '';
    }

    const matchYMD = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchYMD) {
      const [, y, m, d] = matchYMD;
      return `${d}-${m}-${y}`;
    }

    const matchDMY = strVal.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (matchDMY) {
      return `${matchDMY[1]}-${matchDMY[2]}-${matchDMY[3]}`;
    }

    const matchSlashDMY = strVal.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (matchSlashDMY) {
      const [, d, m, y] = matchSlashDMY;
      return `${d}-${m}-${y}`;
    }

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

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponError('');
    setIsCouponLoading(true);

    try {
      const formatted = couponCode.trim().toUpperCase();
      const result = await cartService.validateCoupon(formatted);
      if (result.valid) {
        const discountVal = result.calculated_discount ?? (
          result.discount_percent
            ? Math.round(subtotal * (result.discount_percent / 100) * 100) / 100
            : (result.discount_amount ?? 0)
        );
        const couponPayload: CheckoutCouponData = {
          code: result.code || formatted,
          discount_percent: result.discount_percent || 0,
          discount_amount: discountVal,
        };
        setAppliedCoupon(couponPayload);
        sessionStorage.setItem('chovique_checkout_coupon', JSON.stringify(couponPayload));
        setCouponCode('');
      } else {
        setCouponError(result.message || 'Invalid coupon code.');
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleUseAvailableCoupon = async (code: string) => {
    const formatted = code.trim().toUpperCase();
    setCouponCode(formatted);
    setCouponError('');
    setIsCouponLoading(true);

    try {
      const result = await cartService.validateCoupon(formatted);
      if (result.valid) {
        const discountVal = result.calculated_discount ?? (
          result.discount_percent
            ? Math.round(subtotal * (result.discount_percent / 100) * 100) / 100
            : (result.discount_amount ?? 0)
        );
        const couponPayload: CheckoutCouponData = {
          code: result.code || formatted,
          discount_percent: result.discount_percent || 0,
          discount_amount: discountVal,
        };
        setAppliedCoupon(couponPayload);
        sessionStorage.setItem('chovique_checkout_coupon', JSON.stringify(couponPayload));
        setCouponCode('');
      } else {
        setCouponError(result.message || 'Invalid coupon code.');
      }
    } catch {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    sessionStorage.removeItem('chovique_checkout_coupon');
  };

  // Validate shipping form before proceeding from Step 1
  const validateShipping = (): boolean => {
    const errors: Partial<Record<keyof AddressFormData, string>> = {};
    const name = shippingForm.name.trim();
    const phone = shippingForm.phone.trim();
    const houseNumber = shippingForm.house_number.trim();
    const street = shippingForm.street.trim();
    const area = shippingForm.area.trim();
    const city = shippingForm.city.trim();
    const state = shippingForm.state.trim();
    const pincode = shippingForm.pincode.trim();

    if (!name) errors.name = 'Full name is required.';
    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(phone)) {
      errors.phone = 'Phone number must contain exactly 10 numeric digits.';
    }

    if (!houseNumber) errors.house_number = 'Flat / House / Door number is required.';
    if (!street) errors.street = 'Street address is required.';
    if (!area) errors.area = 'Area / Locality is required.';
    if (!city) errors.city = 'City is required.';
    if (!state) errors.state = 'State is required.';

    if (!pincode) {
      errors.pincode = 'PIN code is required.';
    } else if (!/^\d{6}$/.test(pincode)) {
      errors.pincode = 'PIN code must contain exactly 6 numeric digits.';
    }

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = async () => {
    // Step 1 -> Step 2
    if (activeStep === 1) {
      if (!validateShipping()) return;

      // Ensure shipping quote is verified
      let quote = shippingQuote;
      if (!quote || quote.serviceable === undefined) {
        quote = await calculateShippingQuote(shippingForm.pincode, shippingForm.latitude, shippingForm.longitude);
      }

      if (quote && !quote.serviceable) {
        setOrderError(quote.message || 'Delivery is currently unavailable to this PIN code.');
        return;
      }
      setOrderError('');

      // If user opted to save to address book and is authenticated
      if (shippingForm.save_to_book && user && user.role !== 'guest') {
        try {
          userService.addAddress({
            title: shippingForm.address_type || 'Delivery Address',
            name: shippingForm.name,
            phone: shippingForm.phone,
            house_number: shippingForm.house_number,
            street: shippingForm.street,
            area: shippingForm.area,
            landmark: shippingForm.landmark,
            city: shippingForm.city,
            district: shippingForm.district,
            state: shippingForm.state,
            pincode: shippingForm.pincode,
            zip: shippingForm.pincode,
            latitude: shippingForm.latitude,
            longitude: shippingForm.longitude,
            formatted_address: shippingForm.formatted_address,
            google_place_id: shippingForm.google_place_id,
            location_source: shippingForm.location_source,
            location_verified: shippingForm.location_verified,
            type: shippingForm.address_type || 'HOME',
            isDefault: false,
          }).catch(() => {});
        } catch {}
      }

      // Save permanently into localStorage cache for Amazon/Zepto 1-click checkout
      try {
        localStorage.setItem('chovique_last_saved_address', JSON.stringify(shippingForm));
        localStorage.setItem('chovique_default_address', JSON.stringify(shippingForm));
      } catch {}

      setActiveStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Step 2 -> Step 3
    if (activeStep === 2) {
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Step 3 -> Step 4
    if (activeStep === 3) {
      if (!paymentMethod) {
        setPaymentError('Please select a payment method before proceeding.');
        return;
      }
      setPaymentError('');
      setActiveStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Step 4: Final Place Order
    if (activeStep === 4) {
      setIsPlacingOrder(true);
      setOrderError('');

      const orderPayload = {
        items: checkoutItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        shipping_address: {
          name: shippingForm.name,
          phone: shippingForm.phone,
          house_number: shippingForm.house_number,
          street: shippingForm.street,
          area: shippingForm.area,
          landmark: shippingForm.landmark,
          city: shippingForm.city,
          district: shippingForm.district,
          state: shippingForm.state,
          pincode: shippingForm.pincode,
          zip: shippingForm.pincode,
          latitude: shippingForm.latitude,
          longitude: shippingForm.longitude,
          formatted_address: shippingForm.formatted_address,
          google_place_id: shippingForm.google_place_id,
          location_source: shippingForm.location_source,
          location_verified: shippingForm.location_verified,
        },
        delivery_option:
          shippingQuote?.fulfillment_type === 'LOCAL'
            ? 'Local Fast Delivery'
            : 'Standard Courier Delivery',
        payment_method: paymentMethod,
        ...(appliedCoupon ? { coupon_code: appliedCoupon.code } : {}),
        coins_to_use: coinsToUse > 0 ? coinsToUse : 0,
      };

      const isCod = ['Cash on Delivery', 'COD', 'Cash On Delivery'].includes(paymentMethod);

      if (isCod) {
        setActiveStep(5); // Processing screen
        try {
          const order = await orderService.placeOrder(orderPayload);
          if (!order || !order.id) {
            throw new Error('Order creation failed. No confirmation received.');
          }
          placeOrderLocal(order);
          setCreatedOrder(order);
          refreshWallet();
          sessionStorage.removeItem('chovique_checkout_coupon');
          sessionStorage.removeItem('chovique_buy_now_item');
          setActiveStep(6);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to place order. Please try again.';
          setOrderError(message);
          setActiveStep(4);
        } finally {
          setIsPlacingOrder(false);
        }
        return;
      }

      // ─── UPI QR Code Payment Flow ────────────────────────────────────────────
      if (paymentMethod === 'UPI QR Code') {
        try {
          // Step 1: Create Razorpay Order + Payment record (same initiate endpoint)
          const initData = await orderService.initiateCheckout(orderPayload);
          if (!initData || !initData.razorpay_order_id) {
            throw new Error('Failed to initiate payment session.');
          }

          // Step 2: Request a dynamic UPI QR Code from our backend
          const qrData = await apiPost<{
            qr_code_id: string;
            image_url: string;
            close_by: number;
          }>('/payments/qr-code', {
            razorpay_order_id: initData.razorpay_order_id,
            amount: initData.amount / 100, // convert paise back to INR
            order_id: initData.order_id,
          });

          if (!qrData || !qrData.qr_code_id || !qrData.image_url) {
            throw new Error('QR Code generation failed. Please try another payment method.');
          }

          setQrCodeData(qrData);
          setQrInternalOrderId(initData.order_id);
          setIsQrMode(true);
          setIsQrExpired(false);
          setQrSecondsLeft(Math.max(0, qrData.close_by - Math.floor(Date.now() / 1000)));
          setActiveStep(5); // QR display screen
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to generate QR code.';
          setOrderError(message);
        } finally {
          setIsPlacingOrder(false);
        }
        return;
      }

      // ─── Online Payment Flow (Razorpay Modal — Card / UPI in-modal / NetBanking) ─
      try {
        const initData = await orderService.initiateCheckout(orderPayload);
        if (!initData || !initData.razorpay_order_id) {
          throw new Error('Failed to initiate online payment session.');
        }

        const isLoaded = await loadRazorpayScript();
        if (!isLoaded || !window.Razorpay) {
          throw new Error('Razorpay SDK failed to load. Please check your network connection.');
        }

        // Map customer's choice from Step 3 to Razorpay prefill method
        // This opens Razorpay directly to the chosen payment screen (Card, UPI, or Net Banking)
        // without restricting available instruments or throwing "No appropriate payment method found"
        let methodPrefill: string | undefined = undefined;
        if (paymentMethod === 'Credit Card') {
          methodPrefill = 'card';
        } else if (paymentMethod === 'Net Banking') {
          methodPrefill = 'netbanking';
        }

        const razorpayKey = initData.key_id || ((import.meta as any).env?.VITE_RAZORPAY_KEY_ID as string | undefined)?.trim();
        if (!razorpayKey) {
          throw new Error('Payment gateway configuration is temporarily unavailable. Please select Cash on Delivery or contact concierge.');
        }

        const options = {
          key: razorpayKey,
          amount: initData.amount,
          currency: initData.currency || 'INR',
          name: 'CHOVIQUE',
          description: `Order #${initData.order_id}`,
          image: RAZORPAY_CHOVIQUE_LOGO,
          order_id: initData.razorpay_order_id,
          prefill: {
            name: shippingForm.name,
            contact: shippingForm.phone,
            email: user?.email || '',
            ...(methodPrefill ? { method: methodPrefill } : {}),
          },
          theme: {
            color: '#1a100c',
          },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            setActiveStep(5); // Show processing screen during verification
            try {
              const verifyRes = await orderService.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: initData.order_id,
              });

              if (!verifyRes.success) {
                throw new Error(verifyRes.message || 'Payment verification failed.');
              }

              const confirmedOrder = await orderService.getOrder(initData.order_id);
              placeOrderLocal(confirmedOrder);
              setCreatedOrder(confirmedOrder);
              refreshWallet();
              sessionStorage.removeItem('chovique_checkout_coupon');
              sessionStorage.removeItem('chovique_buy_now_item');
              setActiveStep(6);
            } catch (vErr: unknown) {
              const msg = vErr instanceof Error ? vErr.message : 'Payment verification failed.';
              setOrderError(msg);
              setActiveStep(4);
            } finally {
              setIsPlacingOrder(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsPlacingOrder(false);
              setOrderError('Payment session was cancelled. You can try again.');
            },
          },
        };

        const rzp = new window.Razorpay(options);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (rzp as any).on('payment.failed', (failResp: any) => {
          setIsPlacingOrder(false);
          const errDesc = failResp?.error?.description || 'Payment was unsuccessful. Please try another method or card.';
          setOrderError(errDesc);
          setActiveStep(4);
        });
        rzp.open();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to initiate payment. Please try again.';
        setOrderError(message);
        setIsPlacingOrder(false);
      }
      return;
    }

    setActiveStep((prev) => Math.min(prev + 1, 4));
  };

  const prevStep = () => {
    // When going back from QR display screen, also clear QR state
    if (activeStep === 5 && isQrMode) {
      setIsQrMode(false);
      setQrCodeData(null);
      setIsQrExpired(false);
      setQrInternalOrderId(null);
      setActiveStep(4);
      return;
    }
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  // ─── QR Payment Poller ─────────────────────────────────────────────────────
  // Called by useQrPaymentPoller when payment captured successfully
  const handleQrPaymentSuccess = useCallback(async (orderId: string) => {
    try {
      const confirmedOrder = await orderService.getOrder(orderId);
      placeOrderLocal(confirmedOrder);
      setCreatedOrder(confirmedOrder);
      refreshWallet();
      sessionStorage.removeItem('chovique_checkout_coupon');
      sessionStorage.removeItem('chovique_buy_now_item');
      setIsQrMode(false);
      setQrCodeData(null);
      setActiveStep(6);
    } catch {
      setOrderError('Payment received but order confirmation failed. Please check your orders.');
      setActiveStep(4);
    }
  }, [orderService, placeOrderLocal, refreshWallet]);

  const handleQrExpired = useCallback(() => {
    setIsQrExpired(true);
  }, []);

  const handleQrError = useCallback((msg: string) => {
    setIsQrExpired(true);
    setOrderError(msg);
  }, []);

  useQrPaymentPoller({
    qrCodeId: isQrMode && activeStep === 5 ? (qrCodeData?.qr_code_id ?? null) : null,
    closeBy: qrCodeData?.close_by ?? null,
    onSuccess: handleQrPaymentSuccess,
    onExpired: handleQrExpired,
    onError: handleQrError,
  });

  // QR countdown timer (1-second tick)
  useEffect(() => {
    if (!isQrMode || !qrCodeData || activeStep !== 5) return;

    const tickInterval = setInterval(() => {
      const sLeft = Math.max(0, qrCodeData.close_by - Math.floor(Date.now() / 1000));
      setQrSecondsLeft(sLeft);
      if (sLeft === 0) clearInterval(tickInterval);
    }, 1000);

    return () => clearInterval(tickInterval);
  }, [isQrMode, qrCodeData, activeStep]);

  const stepsHeader = [
    { num: 1, label: 'Delivery Location' },
    { num: 2, label: 'Order Review' },
    { num: 3, label: 'Payment Method' },
    { num: 4, label: 'Confirm & Place' },
  ];

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="checkout-page"
    >
      <div className="container">
        {/* Checkout Header steps indicator (Only for steps 1-4) */}
        {activeStep <= 4 && (
          <div className="checkout-steps">
            {/* Desktop / Tablet Stepper */}
            <div className="checkout-steps-desktop">
              <div className="checkout-step-list">
                {stepsHeader.map((st) => (
                  <div
                    key={st.num}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: activeStep >= st.num ? 1 : 0.4,
                      transition: 'opacity 0.3s',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: activeStep >= st.num ? 'var(--gradient-gold)' : 'rgba(255,255,255,0.1)',
                        color: activeStep >= st.num ? 'var(--dark-chocolate)' : 'var(--cream)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      {st.num}
                    </span>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: activeStep === st.num ? 600 : 400,
                        color: activeStep === st.num ? 'var(--gold)' : 'var(--cream)',
                      }}
                    >
                      {st.label}
                    </span>
                    {st.num < 4 && <ChevronRight size={14} style={{ color: 'var(--grey-mid)' }} />}
                  </div>
                ))}
              </div>
              <Progress value={activeStep} max={4} height={3} />
            </div>

            {/* Mobile Adaptive Stepper */}
            <div className="checkout-steps-mobile">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.78rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    fontWeight: 700,
                    color: 'var(--gold)',
                  }}
                >
                  Step {activeStep} of 4
                </span>
                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: 'var(--cream)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {stepsHeader[activeStep - 1]?.label}
                </span>
              </div>
              {/* Segmented 4-step progress pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {stepsHeader.map((st) => (
                  <div
                    key={st.num}
                    style={{
                      height: '4px',
                      borderRadius: '2px',
                      background:
                        activeStep >= st.num
                          ? 'var(--gradient-gold)'
                          : 'rgba(255, 255, 255, 0.15)',
                      boxShadow: activeStep === st.num ? '0 0 8px rgba(212, 175, 55, 0.5)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step Content panels */}
        <div className="checkout-panel">
          <AnimatePresence mode="wait">
            {/* STEP 1: DELIVERY LOCATION & SHIPPING ADDRESS */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                exit="initial"
                className="glass-panel checkout-panel-card"
              >
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cream)', margin: '0 0 6px 0' }}>
                    1. Delivery Destination & Location
                  </h2>
                  <p style={{ color: 'var(--beige)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                    Please confirm your delivery address. Chovique supports both <strong>Local Fast Delivery</strong> (within 3-5 hours in Visakhapatnam) and <strong>Standard Express Courier</strong> (Pan-India). Delivery charges and serviceability are determined by your location.
                  </p>
                </div>

                {orderError && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(231, 76, 60, 0.1)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      fontSize: '0.88rem',
                      marginBottom: '16px',
                    }}
                  >
                    {orderError}
                  </div>
                )}

                <DeliveryLocationPicker
                  value={shippingForm}
                  onChange={setShippingForm}
                  shippingQuote={shippingQuote}
                  isCalculatingQuote={isCalculatingQuote}
                  errors={shippingErrors}
                  onClearError={(f) => setShippingErrors((prev) => ({ ...prev, [f]: undefined }))}
                  onProceedToReview={nextStep}
                />

                <div className="checkout-actions" style={{ marginTop: '24px' }}>
                  <Button variant="secondary" onClick={() => navigate('/cart')}>
                    Return to Cart
                  </Button>
                  <Button
                    variant="gold"
                    onClick={nextStep}
                    glow
                    disabled={isCalculatingQuote || Boolean(shippingQuote && !shippingQuote.serviceable)}
                    style={{ minWidth: '220px' }}
                  >
                    {isCalculatingQuote ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Verifying Serviceability...</span>
                      </>
                    ) : (
                      'Proceed to Order Review'
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: ORDER REVIEW & PRICING BREAKDOWN */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                exit="initial"
                className="glass-panel checkout-panel-card"
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cream)', marginBottom: '16px' }}>
                  2. Review Order & Pricing
                </h2>

                {/* Fulfillment Mode Banner */}
                {shippingQuote && (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      marginBottom: '20px',
                      background:
                        shippingQuote.fulfillment_type === 'LOCAL'
                          ? 'linear-gradient(135deg, rgba(201, 168, 76, 0.18), rgba(44, 21, 3, 0.5))'
                          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(26, 13, 0, 0.5))',
                      border:
                        shippingQuote.fulfillment_type === 'LOCAL'
                          ? '1px solid rgba(201, 168, 76, 0.4)'
                          : '1px solid rgba(59, 130, 246, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: shippingQuote.fulfillment_type === 'LOCAL' ? 'var(--gold)' : '#3b82f6',
                        color: shippingQuote.fulfillment_type === 'LOCAL' ? 'var(--dark-chocolate)' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {shippingQuote.fulfillment_type === 'LOCAL' ? '⚡' : <Truck size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.95rem' }}>
                        {shippingQuote.fulfillment_type === 'LOCAL'
                          ? '⚡ Local Express Delivery (Within 24 Hours)'
                          : '📦 Premium Courier Delivery (iThink Logistics Express)'}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--beige)', marginTop: '2px' }}>
                        {shippingQuote.message} · Est: <strong>{shippingQuote.estimated_delivery}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Destination Mini Card */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '4px' }}>
                      Delivering To:
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--cream)' }}>
                      {shippingForm.name} ({shippingForm.phone})
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--beige)', marginTop: '2px' }}>
                      {shippingForm.house_number ? `${shippingForm.house_number}, ` : ''}{shippingForm.street}, {shippingForm.area}, {shippingForm.city} — {shippingForm.pincode}
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setActiveStep(1)} style={{ fontSize: '0.78rem' }}>
                    Change Address
                  </Button>
                </div>

                {/* Cart Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                  {checkoutItems.map((item) => (
                    <div
                      key={item.product.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '2px' }}
                        />
                        <div>
                          <h4 style={{ fontSize: '0.95rem', color: 'var(--cream)', margin: 0 }}>{item.product.name}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>
                            {item.product.weight} · Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--cream)' }}>
                        ₹{(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Promo Code Entry & Available Coupons Section */}
                <div style={{ marginBottom: '25px' }}>
                  {appliedCoupon ? (
                    <div
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(46, 204, 113, 0.1)',
                        border: '1px solid #2ecc71',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#2ecc71' }}>
                        <Tag size={18} />
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Coupon Code Applied: {appliedCoupon.code}</span>
                          <span style={{ fontSize: '0.8rem', opacity: 0.9, display: 'block' }}>Saving -₹{discountAmount.toLocaleString()} on this order</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Manual Promo Code input */}
                      <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: couponError ? '8px' : '20px' }}>
                        <div style={{ flex: 1 }}>
                          <Input
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value);
                              if (couponError) setCouponError('');
                            }}
                            placeholder="Enter promo code"
                            style={{ textTransform: 'uppercase', height: '42px', width: '100%' }}
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="gold"
                          disabled={isCouponLoading || !couponCode.trim()}
                          style={{ whiteSpace: 'nowrap', minWidth: '90px', height: '42px' }}
                        >
                          {isCouponLoading ? <Loader2 size={16} className="animate-spin" /> : 'APPLY'}
                        </Button>
                      </form>

                      {couponError && (
                        <p style={{ color: '#e74c3c', fontSize: '0.8rem', margin: '0 0 15px 0' }}>{couponError}</p>
                      )}

                      {/* Available Coupons list */}
                      {availableCoupons.length > 0 && (
                        <div style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h4 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '10px', marginTop: 0 }}>Available Coupons</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {availableCoupons.map((c) => {
                              const rawExp = c.expires_at || c.expiryDate || c.expiry_date || c.expiresAt || c.end_date || c.exp;
                              const expFormatted = formatCouponExpiry(rawExp);
                              const desc = c.description || (c.name && c.name !== c.code ? c.name : (c.discount_percent ? `Get ${c.discount_percent}% off on your chocolate order` : ''));
                              return (
                                <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--cream)', fontSize: '0.9rem' }}>{c.code}</div>
                                    {desc && <div style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>{desc}</div>}
                                    {expFormatted && (
                                      <div style={{ fontSize: '0.72rem', color: 'var(--gold)', marginTop: '2px' }}>
                                        Expires: {expFormatted}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUseAvailableCoupon(c.code)}
                                    disabled={isCouponLoading}
                                    style={{ fontSize: '0.8rem', color: 'var(--gold)', background: 'none', border: '1px solid var(--gold)', borderRadius: '4px', padding: '3px 10px', cursor: 'pointer', fontWeight: 600 }}
                                  >
                                    Use
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Rewards Panel */}
                {wallet && wallet.coin_balance > 0 ? (() => {
                  const coinsPerRupeeVal = wallet.settings?.coins_per_rupee || 10;
                  const maxRedemptionPct = wallet.settings?.max_redemption_percentage || 20;
                  const eligibleSubtotal = Math.max(0, subtotal - discountAmount);
                  const maxDiscountAllowed = eligibleSubtotal * (maxRedemptionPct / 100);
                  const maxUsableForOrder = Math.min(wallet.coin_balance, Math.floor(maxDiscountAllowed * coinsPerRupeeVal));
                  const availableRupeeVal = (wallet.coin_balance / coinsPerRupeeVal).toFixed(2);
                  const currentCoinDiscount = coinsToUse > 0 ? (coinsToUse / coinsPerRupeeVal) : 0;

                  return (
                    <div
                      style={{
                        padding: '18px 20px',
                        background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px solid var(--gold)',
                        borderRadius: '6px',
                        marginBottom: '25px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Coins size={24} style={{ color: 'var(--gold)' }} />
                          <div>
                            <h4 style={{ color: 'var(--cream)', margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                              Chovique Reward Coins
                            </h4>
                            <p style={{ color: 'var(--beige)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                              Available: <strong style={{ color: 'var(--gold)' }}>{wallet.coin_balance} Coins</strong> (₹{availableRupeeVal} discount value)
                            </p>
                          </div>
                        </div>
                      </div>

                      <div style={{ paddingTop: '12px', borderTop: '1px dashed rgba(212, 175, 55, 0.3)' }}>
                        <label style={{ display: 'block', color: 'var(--cream)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
                          Redeem Coins
                        </label>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(201, 168, 76, 0.4)', borderRadius: '6px', overflow: 'hidden' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.max(0, coinsToUse - 1);
                                setCoinsToUse(nextVal);
                              }}
                              disabled={coinsToUse <= 0}
                              style={{
                                width: '36px',
                                height: '36px',
                                background: 'transparent',
                                border: 'none',
                                color: coinsToUse <= 0 ? 'rgba(255,255,255,0.2)' : 'var(--gold)',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                cursor: coinsToUse <= 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Decrease coins"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              max={maxUsableForOrder}
                              value={coinsToUse === 0 ? '0' : coinsToUse}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  setCoinsToUse(0);
                                  return;
                                }
                                const parsed = parseInt(raw, 10);
                                if (isNaN(parsed) || parsed < 0) {
                                  setCoinsToUse(0);
                                } else if (parsed > maxUsableForOrder) {
                                  setCoinsToUse(maxUsableForOrder);
                                } else {
                                  setCoinsToUse(parsed);
                                }
                              }}
                              style={{
                                width: '60px',
                                height: '36px',
                                background: 'transparent',
                                border: 'none',
                                textAlign: 'center',
                                color: 'var(--cream)',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                outline: 'none',
                                MozAppearance: 'textfield',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextVal = Math.min(maxUsableForOrder, coinsToUse + 1);
                                setCoinsToUse(nextVal);
                              }}
                              disabled={coinsToUse >= maxUsableForOrder}
                              style={{
                                width: '36px',
                                height: '36px',
                                background: 'transparent',
                                border: 'none',
                                color: coinsToUse >= maxUsableForOrder ? 'rgba(255,255,255,0.2)' : 'var(--gold)',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                cursor: coinsToUse >= maxUsableForOrder ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Increase coins"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setCoinsToUse(maxUsableForOrder)}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              background: 'rgba(201, 168, 76, 0.15)',
                              border: '1px solid rgba(201, 168, 76, 0.35)',
                              color: 'var(--gold)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Use Max ({maxUsableForOrder})
                          </button>

                          {coinsToUse > 0 && (
                            <button
                              type="button"
                              onClick={() => setCoinsToUse(0)}
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.78rem',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: 'var(--beige)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.82rem' }}>
                          <div style={{ color: 'var(--beige)' }}>
                            Maximum usable: <strong style={{ color: 'var(--cream)' }}>{maxUsableForOrder} Coins</strong>
                          </div>

                          {coinsToUse > 0 && (
                            <div style={{ color: '#2ecc71', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span>Discount from coins: ₹{currentCoinDiscount.toFixed(2)}</span>
                            </div>
                          )}

                          {coinPreview.message && coinPreview.message !== 'Reward coins cannot be applied to this order.' && (
                            <div style={{ color: coinPreview.allowed_coins > 0 ? 'var(--gold)' : '#e74c3c', fontSize: '0.8rem', marginTop: '2px' }}>
                              {coinPreview.message}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      marginBottom: '25px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.85rem',
                      color: 'var(--beige)',
                    }}
                  >
                    <Coins size={18} style={{ color: 'var(--gold)' }} />
                    <span>You will earn <strong style={{ color: 'var(--gold)' }}>+{Math.floor(subtotal / 10)} Chovique Reward Coins</strong> on this order!</span>
                  </div>
                )}

                {/* Step 2 Pricing totals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px', borderBottom: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--beige)', fontSize: '0.9rem' }}>
                    <span>Items Subtotal:</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>

                  {appliedCoupon && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span>Coupon Discount ({appliedCoupon.code}):</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {coinsToUse > 0 && coinDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span>Coins Discount ({coinsToUse} coins):</span>
                      <span>-₹{coinDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--beige)', fontSize: '0.9rem' }}>
                    <span>Delivery Charges:</span>
                    <span>{shippingFee === 0 ? `Free (Order over ₹${freeShippingMin.toLocaleString()})` : `₹${shippingFee.toFixed(2)}`}</span>
                  </div>

                  {taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--beige)', fontSize: '0.9rem' }}>
                      <span>Tax (GST):</span>
                      <span>₹{taxAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cream)', fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span>Total:</span>
                    <span style={{ color: 'var(--gold)' }}>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="checkout-actions">
                  <Button variant="secondary" onClick={() => setActiveStep(1)}>
                    Back to Address
                  </Button>
                  <Button variant="gold" onClick={nextStep} glow>
                    Proceed to Payment
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: PAYMENT OPTIONS */}
            {activeStep === 3 && (
              <motion.div
                key="step3"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                exit="initial"
                className="glass-panel checkout-panel-card"
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cream)', marginBottom: '20px' }}>
                  3. Choose Payment Option
                </h2>
                {paymentError && (
                  <p style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: '15px' }}>{paymentError}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
                  {[
                    { id: 'Credit Card', label: 'Credit / Debit Card', sub: 'Visa, Mastercard, RuPay', icon: <CreditCard size={22} /> },
                    { id: 'UPI QR Code', label: 'UPI QR Code', sub: 'Scan with GPay, PhonePe, Paytm, any UPI app', icon: <QrCode size={22} />, highlight: true },
                    { id: 'Net Banking', label: 'Net Banking', sub: 'All major Indian banks', icon: <ShieldCheck size={22} /> },
                    { id: 'Cash on Delivery', label: 'Cash on Delivery', sub: 'Pay when your order arrives', icon: <Truck size={22} /> },
                  ].map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        id={`payment-method-${method.id.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => { setPaymentMethod(method.id); if (paymentError) setPaymentError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setPaymentMethod(method.id); if (paymentError) setPaymentError(''); } }}
                        style={{
                          padding: '14px 20px',
                          borderRadius: '8px',
                          background: isSelected
                            ? (method.highlight ? 'rgba(124, 58, 237, 0.12)' : 'rgba(201, 168, 76, 0.08)')
                            : 'rgba(0, 0, 0, 0.25)',
                          border: isSelected
                            ? (method.highlight ? '1.5px solid #7c3aed' : '1.5px solid var(--gold)')
                            : '1px solid var(--glass-border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          position: 'relative',
                          outline: 'none',
                        }}
                      >
                        <span style={{ color: isSelected ? (method.highlight ? '#a78bfa' : 'var(--gold)') : 'var(--beige)', flexShrink: 0 }}>
                          {method.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--cream)', fontSize: '0.97rem', fontWeight: 600 }}>{method.label}</span>
                            {method.highlight && (
                              <span style={{
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                padding: '2px 7px',
                                borderRadius: '20px',
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                color: '#fff',
                              }}>Instant</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--beige)', marginTop: '2px', opacity: 0.85 }}>{method.sub}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle size={18} style={{ color: method.highlight ? '#a78bfa' : 'var(--gold)', flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="checkout-actions">
                  <Button variant="secondary" onClick={prevStep}>
                    Back
                  </Button>
                  <Button variant="gold" onClick={nextStep} glow>
                    Order Summary
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: READ-ONLY ORDER PREVIEW & PLACE ORDER */}
            {activeStep === 4 && (
              <motion.div
                key="step4"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                exit="initial"
                className="glass-panel checkout-panel-card"
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cream)', marginBottom: '20px' }}>
                  4. Review and Place Order
                </h2>

                {/* Order error banner */}
                {orderError && (
                  <div
                    role="alert"
                    style={{
                      background: 'rgba(231, 76, 60, 0.1)',
                      border: '1px solid #e74c3c',
                      color: '#e74c3c',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      fontSize: '0.9rem',
                      marginBottom: '20px',
                    }}
                  >
                    {orderError}
                  </div>
                )}

                {/* Sub panels details */}
                <div className="checkout-grid-two" style={{ gap: '15px', marginBottom: '25px' }}>
                  <div
                    style={{
                      padding: '16px',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        Deliver To:
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveStep(1)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Change
                      </button>
                    </div>
                    <p style={{ color: 'var(--cream)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                      <strong>{shippingForm.name}</strong> {shippingForm.phone ? `(${shippingForm.phone})` : ''}
                      <br />
                      {shippingForm.house_number ? `${shippingForm.house_number}, ` : ''}{shippingForm.street}
                      {shippingForm.area ? <><br />{shippingForm.area}</> : null}
                      {shippingForm.landmark ? <><br /><span style={{ color: 'var(--beige)', fontSize: '0.82rem' }}>Landmark: {shippingForm.landmark}</span></> : null}
                      <br />
                      {shippingForm.city}, {shippingForm.state} - {shippingForm.pincode}
                    </p>
                    {shippingForm.latitude && shippingForm.longitude ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#10b981', marginTop: '10px', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <MapPin size={11} /> Pinpoint Location Verified ({shippingForm.location_source === 'BROWSER_GPS' ? 'GPS' : 'Map Pin'})
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--beige)', marginTop: '10px', opacity: 0.8 }}>
                        <MapPin size={11} /> Standard Postal Address
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '16px',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                        Payment & Fulfillment:
                      </h4>
                      <button
                        type="button"
                        onClick={() => setActiveStep(3)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--gold)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Change
                      </button>
                    </div>
                    <p style={{ color: 'var(--cream)', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                      <strong>Payment Method:</strong> {paymentMethod}
                    </p>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      {shippingQuote?.fulfillment_mode === 'LOCAL' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(56,189,248,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56,189,248,0.3)' }}>
                          <Zap size={12} /> Local Fast Delivery
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, background: 'rgba(201,168,76,0.1)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(201,168,76,0.3)' }}>
                          <Truck size={12} /> Standard Courier Delivery
                        </div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: 'var(--beige)', marginTop: '4px' }}>
                        {shippingQuote?.estimated_delivery_text || (shippingQuote?.fulfillment_mode === 'LOCAL' ? 'Same-day within 3-5 hours' : '2-4 business days')}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--cream)', marginTop: '6px' }}>
                        <strong>Delivery Charge:</strong> {shippingFee === 0 ? <span style={{ color: '#10b981', fontWeight: 600 }}>FREE</span> : `₹${shippingFee.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* READ-ONLY Pricing summary displaying Step 1 choices */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px', borderBottom: '1px solid var(--glass-border)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--beige)', fontSize: '0.9rem' }}>
                    <span>Items Subtotal:</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>

                  {appliedCoupon && discountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span>Coupon Discount ({appliedCoupon.code}):</span>
                      <span>-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {coinsToUse > 0 && coinDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71', fontSize: '0.9rem', fontWeight: 600 }}>
                      <span>Coins Discount ({coinsToUse} coins):</span>
                      <span>-₹{coinDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--beige)', fontSize: '0.9rem' }}>
                    <span>Delivery Charges:</span>
                    <span>{shippingFee === 0 ? `Free (Order over ₹${freeShippingMin.toLocaleString()})` : `₹${shippingFee}`}</span>
                  </div>

                  {taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--beige)', fontSize: '0.9rem' }}>
                      <span>Tax (GST):</span>
                      <span>₹{taxAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cream)', fontSize: '1.25rem', fontWeight: 700, marginTop: '8px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span>Final Payable Amount:</span>
                    <span style={{ color: 'var(--gold)' }}>₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="checkout-actions">
                  <Button variant="secondary" onClick={prevStep} disabled={isPlacingOrder}>
                    Back
                  </Button>
                  <Button
                    variant="gold"
                    onClick={nextStep}
                    glow
                    disabled={isPlacingOrder}
                    style={{ gap: '10px' }}
                  >
                    {isPlacingOrder ? (
                      <>
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Placing Order...
                      </>
                    ) : (
                      `Place Order (₹${total.toLocaleString()})`
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 5A: UPI QR CODE DISPLAY */}
            {activeStep === 5 && isQrMode && qrCodeData && (
              <motion.div
                key="step5-qr"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                exit="initial"
                className="glass-panel checkout-panel-card"
                style={{ textAlign: 'center', padding: '40px 30px' }}
              >
                {/* Header */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                    <QrCode size={28} style={{ color: '#a78bfa' }} />
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', color: 'var(--cream)', margin: 0 }}>
                      Scan to Pay
                    </h2>
                  </div>
                  <p style={{ color: 'var(--beige)', fontSize: '0.9rem', margin: 0 }}>
                    Open <strong style={{ color: 'var(--cream)' }}>Google Pay, PhonePe, Paytm</strong> or any UPI app and scan the QR code below
                  </p>
                </div>

                {/* QR Image + Overlay on Expiry */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                  <div style={{
                    padding: '16px',
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: isQrExpired ? 'none' : '0 0 40px rgba(167, 139, 250, 0.25), 0 0 0 2px rgba(124, 58, 237, 0.4)',
                    display: 'inline-block',
                    transition: 'box-shadow 0.3s',
                    opacity: isQrExpired ? 0.3 : 1,
                  }}>
                    <img
                      src={qrCodeData.image_url}
                      alt="UPI Payment QR Code"
                      width={220}
                      height={220}
                      style={{ display: 'block', borderRadius: '4px' }}
                    />
                  </div>
                  {isQrExpired && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '16px',
                      background: 'rgba(15, 10, 8, 0.82)',
                      gap: '10px',
                    }}>
                      <Timer size={32} style={{ color: '#e74c3c' }} />
                      <span style={{ color: '#e74c3c', fontWeight: 700, fontSize: '0.95rem' }}>QR Code Expired</span>
                    </div>
                  )}
                </div>

                {/* Amount badge */}
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 24px',
                  background: 'rgba(167, 139, 250, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
                  borderRadius: '40px',
                  marginBottom: '20px',
                }}>
                  <span style={{ color: 'var(--beige)', fontSize: '0.9rem' }}>Amount to Pay:</span>
                  <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: '1.15rem' }}>₹{total.toLocaleString()}</span>
                </div>

                {/* Status row */}
                {!isQrExpired ? (
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '10px',
                      padding: '10px 20px',
                      background: 'rgba(46, 204, 113, 0.08)',
                      border: '1px solid rgba(46, 204, 113, 0.3)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                    }}>
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: '#2ecc71',
                        boxShadow: '0 0 8px rgba(46, 204, 113, 0.8)',
                        animation: 'qrPulse 1.4s ease-in-out infinite',
                        flexShrink: 0,
                      }} />
                      <span style={{ color: '#2ecc71', fontWeight: 600, fontSize: '0.9rem' }}>Waiting for payment...</span>
                    </div>
                    {/* Countdown */}
                    <div style={{ color: 'var(--beige)', fontSize: '0.82rem' }}>
                      <Timer size={13} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle', opacity: 0.7 }} />
                      QR expires in{' '}
                      <strong style={{ color: qrSecondsLeft < 60 ? '#e74c3c' : 'var(--cream)' }}>
                        {Math.floor(qrSecondsLeft / 60)}:{String(qrSecondsLeft % 60).padStart(2, '0')}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#e74c3c', fontWeight: 600, marginBottom: '8px' }}>
                      This QR code has expired. Please go back and place your order again.
                    </p>
                    {orderError && (
                      <p style={{ color: 'rgba(231, 76, 60, 0.8)', fontSize: '0.85rem', margin: 0 }}>{orderError}</p>
                    )}
                  </div>
                )}

                {/* App logos */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '28px', opacity: 0.65, fontSize: '0.78rem', color: 'var(--beige)' }}>
                  <span>Works with:</span>
                  <span style={{ fontWeight: 600 }}>Google Pay · PhonePe · Paytm · BHIM · Any UPI App</span>
                </div>

                {/* Back / Retry */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={prevStep}
                    style={{
                      padding: '10px 22px',
                      background: 'transparent',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--beige)',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    ← Back
                  </button>
                  {isQrExpired && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsQrMode(false);
                        setQrCodeData(null);
                        setIsQrExpired(false);
                        setQrInternalOrderId(null);
                        setActiveStep(4);
                      }}
                      style={{
                        padding: '10px 22px',
                        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <RefreshCw size={14} /> Try Again
                    </button>
                  )}
                </div>

                {/* Inline keyframe animation for the pulsing dot */}
                <style>{`
                  @keyframes qrPulse {
                    0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 8px rgba(46, 204, 113, 0.8); }
                    50% { opacity: 0.6; transform: scale(1.3); box-shadow: 0 0 14px rgba(46, 204, 113, 0.4); }
                  }
                `}</style>
              </motion.div>
            )}

            {/* STEP 5B: STANDARD PROCESSING LOADER */}
            {activeStep === 5 && !isQrMode && (
              <motion.div
                key="step5-processing"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                exit="initial"
                style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  background: 'rgba(var(--dark-chocolate-rgb), 0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                }}
              >
                <Loader2
                  size={48}
                  style={{
                    color: 'var(--gold)',
                    margin: '0 auto 24px auto',
                    display: 'block',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cream)', marginBottom: '10px' }}>
                  Processing Transaction...
                </h2>
                <p style={{ color: 'var(--beige)', maxWidth: '400px', margin: '0 auto' }}>
                  Securing payment credentials and lodging your artisan order inside our ledger. Please do not close the window.
                </p>
              </motion.div>
            )}

            {/* STEP 6: SUCCESS SCREEN */}
            {activeStep === 6 && createdOrder && (
              <motion.div
                key="step7"
                variants={scaleUp}
                initial="initial"
                animate="animate"
                style={{
                  textAlign: 'center',
                  padding: '60px 40px',
                  background: 'rgba(var(--dark-chocolate-rgb), 0.6)',
                  border: '1px solid var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  borderRadius: '8px',
                }}
              >
                <CheckCircle size={64} style={{ color: '#2ecc71', margin: '0 auto 24px auto' }} />
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2.2rem',
                    color: 'var(--cream)',
                    marginBottom: '10px',
                  }}
                >
                  Order Lodged Successfully!
                </h2>
                <p style={{ color: 'var(--gold)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '24px' }}>
                  Ticket Reference: {createdOrder.id}
                </p>
                <p style={{ color: 'var(--beige)', maxWidth: '500px', margin: '0 auto 20px auto', lineHeight: 1.6 }}>
                  Thank you for ordering with Chovique. Your chocolates are being prepared by hand and packaged in cooler-packs to ensure they reach you in immaculate form.
                </p>

                {createdOrder.coins_earned && createdOrder.coins_earned > 0 ? (
                  <div
                    style={{
                      maxWidth: '500px',
                      margin: '0 auto 30px auto',
                      padding: '12px 20px',
                      background: 'rgba(212, 175, 55, 0.15)',
                      border: '1px solid var(--gold)',
                      borderRadius: '6px',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                    }}
                  >
                    <Coins size={20} />
                    <span>You earned <strong>+{createdOrder.coins_earned} Chovique Reward Coins</strong> on this purchase!</span>
                  </div>
                ) : null}

                {/* Invoice sheet */}
                <div
                  className="glass-panel"
                  style={{
                    padding: '24px',
                    textAlign: 'left',
                    marginBottom: '35px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <h4 style={{ color: 'var(--gold)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '8px', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Artisan Invoice Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', color: 'var(--cream)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--beige)' }}>Items total:</span>
                      <span>₹{createdOrder.subtotal.toLocaleString()}</span>
                    </div>
                    {(createdOrder.coupon_discount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                        <span>Coupon Discount:</span>
                        <span>-₹{createdOrder.coupon_discount?.toLocaleString()}</span>
                      </div>
                    )}
                    {(createdOrder.coin_discount || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                        <span>Coin Discount:</span>
                        <span>-₹{createdOrder.coin_discount?.toLocaleString()}</span>
                      </div>
                    )}
                    {(createdOrder.discount > 0 && !createdOrder.coupon_discount && !createdOrder.coin_discount) && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                        <span>Promo Discount:</span>
                        <span>-₹{createdOrder.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--beige)' }}>Shipping:</span>
                      <span>{createdOrder.shipping === 0 ? 'Free' : `₹${createdOrder.shipping}`}</span>
                    </div>
                    {(createdOrder.tax || 0) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--beige)' }}>Tax (GST):</span>
                        <span>₹{createdOrder.tax.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', fontSize: '1rem', color: 'var(--gold)' }}>
                      <span>Charged Total:</span>
                      <span>₹{createdOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* WHATSAPP ORDER UPDATES CARD */}
                {(() => {
                  const custPhone = createdOrder.shippingAddress?.phone || '';
                  const cleanCust = custPhone.replace(/\D/g, '');
                  const normPhone = cleanCust.length === 10 ? `91${cleanCust}` : cleanCust;
                  const ownerCleanPhone = '918309854870';

                  const waReceiptText = `🍫 *CHOVIQUE — Order Confirmation*\n\nThank you for ordering with Chovique Luxury Chocolates!\n\n📦 *Order Reference:* ${createdOrder.id}\n📅 *Date:* ${createdOrder.date || new Date().toLocaleDateString()}\n💳 *Payment Method:* ${createdOrder.paymentMethod || 'UPI'}\n💰 *Total Amount:* ₹${createdOrder.total.toLocaleString()}\n🚚 *Delivery:* ${createdOrder.deliveryOption || 'Standard Delivery'}\n\n📍 *Shipping Address:*\n${createdOrder.shippingAddress?.name}\n${createdOrder.shippingAddress?.street}, ${createdOrder.shippingAddress?.city}, ${createdOrder.shippingAddress?.state} - ${createdOrder.shippingAddress?.zip}\nPhone: ${custPhone}\n\nFor support, contact Chovique Concierge at +91 83098 54870 or hello@chovique.com.`;

                  const custWaUrl = createdOrder.customer_whatsapp_url || (normPhone ? `https://wa.me/${normPhone}?text=${encodeURIComponent(waReceiptText)}` : null);
                  const conciergeWaUrl = createdOrder.owner_whatsapp_url || `https://wa.me/${ownerCleanPhone}?text=${encodeURIComponent(waReceiptText)}`;

                  return (
                    <div
                      style={{
                        maxWidth: '560px',
                        margin: '0 auto 32px auto',
                        padding: '22px 24px',
                        background: 'linear-gradient(145deg, rgba(20, 35, 25, 0.5) 0%, rgba(15, 12, 10, 0.7) 100%)',
                        border: '1px solid rgba(37, 211, 102, 0.4)',
                        borderRadius: '10px',
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'rgba(37, 211, 102, 0.18)',
                            border: '1px solid rgba(37, 211, 102, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#25D366',
                            flexShrink: 0,
                          }}
                        >
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: '#f5efe6', fontSize: '1.05rem', fontWeight: 700 }}>
                            Instant WhatsApp Order Updates
                          </h4>
                          <p style={{ margin: '2px 0 0 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.84rem' }}>
                            Order receipt prepared for customer phone:{' '}
                            <strong style={{ color: '#25D366' }}>{custPhone || 'Your Mobile Number'}</strong>
                          </p>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: 'var(--beige)', lineHeight: 1.5 }}>
                        Your artisanal order confirmation is ready. Open WhatsApp to receive and view your receipt on your mobile, or message our private concierge desk.
                      </p>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        {custWaUrl && (
                          <a
                            href={custWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 18px',
                              borderRadius: '6px',
                              background: '#25D366',
                              color: '#0a1d10',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              textDecoration: 'none',
                              boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                            }}
                          >
                            <Send size={15} /> Send / Open on My WhatsApp
                          </a>
                        )}

                        <a
                          href={conciergeWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(201, 168, 76, 0.5)',
                            color: 'var(--gold)',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                          }}
                        >
                          <Phone size={14} /> Chovique Concierge (+91 83098 54870)
                        </a>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <Button variant="glass" onClick={() => window.print()}>
                    Print Invoice
                  </Button>
                  <Button variant="gold" onClick={() => navigate('/')} glow>
                    Return to Boutique
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
