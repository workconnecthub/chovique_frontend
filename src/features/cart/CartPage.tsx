import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Trash2, ArrowRight, Minus, Plus, Tag, Loader2 } from 'lucide-react';
import { useApp } from '../../app/providers';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { pageTransition } from '../../lib/framer';
import { cartService } from '../../services/cartService';
import type { CouponValidationResponse } from '../../types';
import { getImageUrl } from '../../utils/imageUrl';

export const CartPage: React.FC = () => {
  const { cart, updateCartQuantity, removeFromCart, role, storeConfig } = useApp();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<CouponValidationResponse | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);

  React.useEffect(() => {
    if (role !== 'guest') {
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
  }, [role]);

  // Read and revalidate coupon from sessionStorage whenever cart changes
  React.useEffect(() => {
    const stored = sessionStorage.getItem('chovique_checkout_coupon');
    if (stored && cart.length > 0) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.code) {
          const codeToApply = parsed.code.trim().toUpperCase();
          setIsCouponLoading(true);
          cartService
            .validateCoupon(codeToApply)
            .then((res) => {
              if (res.valid) {
                setCouponData(res);
                setCouponCode(codeToApply);
                setCouponError('');
                sessionStorage.setItem(
                  'chovique_checkout_coupon',
                  JSON.stringify({
                    code: res.code,
                    discount_amount: res.calculated_discount,
                  })
                );
              } else {
                setCouponData(null);
                sessionStorage.removeItem('chovique_checkout_coupon');
                setCouponError(res.message || 'Selected coupon is no longer applicable to your cart.');
              }
            })
            .catch(() => {
              setCouponData(null);
              sessionStorage.removeItem('chovique_checkout_coupon');
            })
            .finally(() => setIsCouponLoading(false));
        }
      } catch {
        sessionStorage.removeItem('chovique_checkout_coupon');
      }
    }
  }, [cart]);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Discount comes from backend coupon validation response
  const discountAmount = couponData?.calculated_discount ?? 0;
  const discountPercent = couponData?.discount_percent ?? 0;

  // Shipping: Free if subtotal meets threshold; otherwise dynamic at checkout based on delivery address
  const freeShippingMin = storeConfig?.free_shipping_min_order ?? 500;
  const isFreeDelivery = subtotal >= freeShippingMin && subtotal > 0;
  const standardShipping = storeConfig?.standard_shipping_charge ?? 50;
  const shippingAmount = isFreeDelivery || subtotal === 0 ? 0 : standardShipping;

  // Tax
  const gstRate = storeConfig?.gst_rate ?? 0;
  const taxAmount = Math.round(subtotal * (gstRate / 100) * 100) / 100;

  // Total (before dynamic delivery fee is confirmed at checkout)
  const totalAmount = Math.max(0, subtotal - discountAmount + (isFreeDelivery ? 0 : 0) + taxAmount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponError('');
    setIsCouponLoading(true);

    try {
      const result = await cartService.validateCoupon(couponCode.trim().toUpperCase());
      if (result.valid) {
        setCouponData(result);
        sessionStorage.setItem(
          'chovique_checkout_coupon',
          JSON.stringify({
            code: result.code,
            discount_amount: result.calculated_discount,
          })
        );
      } else {
        setCouponData(null);
        setCouponError(result.message || 'Invalid coupon code.');
        sessionStorage.removeItem('chovique_checkout_coupon');
      }
    } catch {
      setCouponData(null);
      setCouponError('Could not validate coupon. Please try again.');
      sessionStorage.removeItem('chovique_checkout_coupon');
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
        setCouponData(result);
        sessionStorage.setItem(
          'chovique_checkout_coupon',
          JSON.stringify({
            code: result.code,
            discount_amount: result.calculated_discount,
          })
        );
      } else {
        setCouponData(null);
        setCouponError(result.message || 'Invalid coupon code.');
        sessionStorage.removeItem('chovique_checkout_coupon');
      }
    } catch {
      setCouponData(null);
      setCouponError('Could not validate coupon. Please try again.');
      sessionStorage.removeItem('chovique_checkout_coupon');
    } finally {
      setIsCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponData(null);
    setCouponCode('');
    setCouponError('');
    sessionStorage.removeItem('chovique_checkout_coupon');
  };

  const handleCheckout = () => {
    sessionStorage.removeItem('chovique_buy_now_item');
    if (couponData) {
      sessionStorage.setItem(
        'chovique_checkout_coupon',
        JSON.stringify({
          code: couponData.code,
          discount_amount: discountAmount,
        })
      );
    } else {
      sessionStorage.removeItem('chovique_checkout_coupon');
    }

    if (role === 'guest') {
      navigate('/login', { state: { from: '/checkout' } });
    } else {
      navigate('/checkout');
    }
  };


  if (cart.length === 0) {
    return (
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="cart-page"
        style={{
          minHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: 'var(--gradient-hero)',
          padding: '24px 20px 60px 20px',
        }}
      >
        <ShoppingBag size={64} style={{ color: 'var(--gold)', marginBottom: '24px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--cream)', marginBottom: '10px' }}>
          Your Cart is Empty
        </h2>
        <p style={{ color: 'var(--beige)', marginBottom: '30px', maxWidth: '400px' }}>
          Indulge in our premium selections of dark truffles, golden pralines, and hot chocolate shaves.
        </p>
        <Link to="/shop">
          <Button variant="gold" size="lg" glow>
            Start Shopping
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="cart-page"
      style={{
        minHeight: '100vh',
        background: 'var(--gradient-hero)',
        paddingBottom: '60px',
      }}
    >
      <div className="container">
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.5rem',
            fontWeight: 700,
            color: 'var(--cream)',
            borderBottom: '1px solid var(--glass-border)',
            paddingBottom: '15px',
            marginBottom: '30px',
          }}
        >
          Your Chocolates Cart
        </h1>

        <div className="cart-layout">
          {/* Cart items list */}
          <div className="cart-items-list">
            {/* Add More Items Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <Button variant="outline" onClick={() => navigate('/shop')} size="sm" glow>
                + Add Items
              </Button>
            </div>

            {cart.map((item) => (
              <div
                key={item.product.id}
                className="cart-item-card"
                style={{
                  background: 'var(--product-card-bg, rgba(26, 18, 13, 0.75))',
                  border: '1px solid var(--product-card-border, var(--glass-border))',
                  borderRadius: '12px',
                  color: 'var(--product-card-text, var(--cream))',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                }}
              >
                {/* Product image */}
                <div style={{ width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(var(--gold-rgb), 0.25)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                  <img
                    src={getImageUrl(item.product.image)}
                    alt={item.product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=200&q=80';
                    }}
                  />
                </div>

                {/* Details */}
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--product-card-text, var(--cream))', fontWeight: 600, margin: '0 0 6px 0' }}>
                    {item.product.name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {item.product.weight} · {item.product.category}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1px solid var(--product-card-border, var(--glass-border))',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)',
                    width: 'fit-content',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => {
                      if (item.quantity <= 1) {
                        removeFromCart(item.product.id);
                      } else {
                        updateCartQuantity(item.product.id, item.quantity - 1);
                      }
                    }}
                    style={{ padding: '8px 12px', color: 'var(--beige)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--beige)'}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span
                    className="font-number cart-item-quantity"
                    data-number="true"
                    style={{
                      width: '34px',
                      textAlign: 'center',
                      fontWeight: 700,
                      color: 'var(--cream)',
                      fontSize: '0.95rem',
                      fontFamily: 'var(--font-number, var(--font-body))',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    style={{ padding: '8px 12px', color: 'var(--beige)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--beige)'}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Pricing & remove */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                  <span
                    className="font-number cart-item-price"
                    data-number="true"
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: 'var(--gold)',
                      fontFamily: 'var(--font-number, var(--font-body))',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ₹{(item.product.price * item.quantity).toLocaleString()}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    style={{
                      color: 'var(--rose-gold)',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'flex-end',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#ff6b6b';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--rose-gold)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Summary Sidepanel */}
          <aside
            className="cart-summary"
            style={{
              border: '1px solid var(--product-card-border, var(--glass-border))',
              background: 'var(--product-card-bg, rgba(26, 18, 13, 0.75))',
              borderRadius: '12px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--cream)', marginBottom: '20px' }}>
              Order Summary
            </h3>

            {/* Price Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--beige)' }}>
                <span>Subtotal</span>
                <span className="font-number" data-number="true" style={{ fontWeight: 600, fontFamily: 'var(--font-number, var(--font-body))', fontVariantNumeric: 'tabular-nums', color: 'var(--cream)' }}>₹{subtotal.toLocaleString()}</span>
              </div>
              {couponData && discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#2ecc71' }}>
                  <span>Promo Discount{discountPercent > 0 ? ` (${discountPercent}%)` : ''}</span>
                  <span className="font-number" data-number="true" style={{ fontWeight: 600, fontFamily: 'var(--font-number, var(--font-body))', fontVariantNumeric: 'tabular-nums' }}>-₹{discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--beige)' }}>
                <span>Shipping</span>
                <span>
                  {isFreeDelivery ? (
                    <span className="font-number" data-number="true" style={{ color: '#4ade80', fontWeight: 700, fontFamily: 'var(--font-number, var(--font-body))' }}>FREE (Order ₹500+)</span>
                  ) : (
                    <span style={{ color: 'var(--gold)', fontSize: '0.85rem' }}>Calculated at checkout</span>
                  )}
                </span>
              </div>
              {!isFreeDelivery && (
                <p style={{ fontSize: '0.75rem', color: 'var(--grey-light)', margin: '-8px 0 0 0' }}>
                  Delivery charge calculated based on your address. Free on orders above <span className="font-number" data-number="true" style={{ fontFamily: 'var(--font-number, var(--font-body))', fontWeight: 600, color: 'var(--gold)' }}>₹{freeShippingMin.toLocaleString()}</span>.
                </p>
              )}
              {taxAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: 'var(--beige)', marginTop: '8px' }}>
                  <span>Tax (GST)</span>
                  <span className="font-number" data-number="true" style={{ fontWeight: 600, fontFamily: 'var(--font-number, var(--font-body))', fontVariantNumeric: 'tabular-nums', color: 'var(--cream)' }}>₹{taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div
                style={{
                  borderTop: '1px solid var(--product-card-border, var(--glass-border))',
                  paddingTop: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: 'var(--cream)',
                }}
              >
                <span>Total</span>
                <span className="font-number cart-total-price" data-number="true" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-number, var(--font-body))', fontVariantNumeric: 'tabular-nums' }}>₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Available Coupons */}
            {availableCoupons.length > 0 && (
              <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ color: 'var(--gold)', fontSize: '0.9rem', marginBottom: '10px' }}>Available Coupons</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {availableCoupons.map((c) => {
                    let expText = '';
                    const rawExp = c.expires_at || c.expiryDate || c.expiry_date || c.expiresAt || c.end_date || c.exp;
                    if (rawExp) {
                      const strVal = String(rawExp).trim();
                      const matchYMD = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
                      const matchDMY = strVal.match(/^(\d{2})-(\d{2})-(\d{4})/);
                      const matchSlashDMY = strVal.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
                      const matchSlashYMD = strVal.match(/^(\d{4})\/(\d{2})\/(\d{2})/);
                      if (matchYMD) {
                        expText = `Expires: ${matchYMD[3]}-${matchYMD[2]}-${matchYMD[1]}`;
                      } else if (matchDMY) {
                        expText = `Expires: ${matchDMY[1]}-${matchDMY[2]}-${matchDMY[3]}`;
                      } else if (matchSlashDMY) {
                        expText = `Expires: ${matchSlashDMY[1]}-${matchSlashDMY[2]}-${matchSlashDMY[3]}`;
                      } else if (matchSlashYMD) {
                        expText = `Expires: ${matchSlashYMD[3]}-${matchSlashYMD[2]}-${matchSlashYMD[1]}`;
                      } else {
                        try {
                          const d = new Date(rawExp);
                          if (!isNaN(d.getTime())) {
                            const day = String(d.getUTCDate()).padStart(2, '0');
                            const month = String(d.getUTCMonth() + 1).padStart(2, '0');
                            const year = d.getUTCFullYear();
                            expText = `Expires: ${day}-${month}-${year}`;
                          }
                        } catch {
                          expText = `Expires: ${rawExp}`;
                        }
                      }
                    }
                    return (
                      <div key={c.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: 'var(--cream)', fontSize: '0.9rem' }}>{c.code}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>{c.description}</div>
                          {expText && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--gold)', marginTop: '2px' }}>{expText}</div>
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

            {/* Coupon Promo Section */}
            {couponData ? (
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(46, 204, 113, 0.1)',
                  border: '1px solid #2ecc71',
                  borderRadius: '10px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2ecc71', fontWeight: 700, fontSize: '0.95rem' }}>
                    <Tag size={16} />
                    <span>Coupon Applied: {couponData.code}</span>
                  </div>
                  <div style={{ color: 'var(--cream)', fontSize: '0.85rem', marginTop: '4px', fontWeight: 600 }}>
                    Discount: <span className="font-number" data-number="true" style={{ fontFamily: 'var(--font-number, var(--font-body))', fontVariantNumeric: 'tabular-nums' }}>-₹{discountAmount.toFixed(2)}</span> {couponData.discount_percent ? `(${couponData.discount_percent}% OFF)` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(231, 76, 60, 0.6)',
                    color: '#e74c3c',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Remove Coupon
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div style={{ flexGrow: 1 }}>
                    <Input
                      placeholder="Promo Code"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        if (couponError) setCouponError('');
                      }}
                      error={couponError}
                      fullWidth
                      disabled={isCouponLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="glass"
                    style={{ height: '48px', marginBottom: '15px', minWidth: '72px' }}
                    disabled={isCouponLoading || !couponCode.trim()}
                  >
                    {isCouponLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply'}
                  </Button>
                </div>
              </form>
            )}

            {/* Checkout proceed */}
            <Button
              variant="gold"
              fullWidth
              size="lg"
              glow
              onClick={handleCheckout}
              style={{
                background: 'var(--cart-color, var(--gold))',
                color: 'var(--cart-text, #0f0c0a)',
                fontWeight: 800,
                border: 'none',
                boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
              }}
            >
              Proceed to Checkout
              <ArrowRight size={16} />
            </Button>
          </aside>
        </div>
      </div>
    </motion.div>
  );
};

export default CartPage;
