import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Loader2,
  FileText,
  Eye,
  RefreshCw,
  AlertTriangle,
  Package,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Truck,
  FileSpreadsheet,
  ExternalLink,
  Navigation,
  UserCheck,
  Check,
  Crown,
  Zap,
  Send,
  Key,
  CheckCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { deliveryService } from '../../services/deliveryService';
import { Pagination } from '../../components/ui/Pagination';
import { exportToCSV } from '../../utils/exportCsv';

// ─── Status Definitions ───────────────────────────────────────────────────────

const FULFILLMENT_STATUSES = [
  'ALL',
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
];

const PAYMENT_STATUSES = [
  'ALL',
  'Pending',
  'Processing',
  'Paid',
  'Failed',
  'Cancelled',
  'Refund Pending',
  'Refunded',
  'Partially Refunded',
];

// Valid forward-only transitions
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery', 'Delivered', 'Cancelled'],
  'Out for Delivery': ['Delivered', 'Cancelled'],
  Out_For_Delivery: ['Delivered', 'Cancelled'],
  Delivered: ['Returned'],
  Cancelled: [],
  Returned: [],
};

const STATUS_LABELS: Record<string, string> = {
  Out_For_Delivery: 'Out for Delivery',
};

const FULFILLMENT_COLORS: Record<string, { bg: string; color: string }> = {
  Pending: { bg: 'rgba(243,156,18,0.15)', color: '#f39c12' },
  Confirmed: { bg: 'rgba(52,152,219,0.15)', color: '#3498db' },
  Processing: { bg: 'rgba(201,168,76,0.15)', color: '#c9a84c' },
  Shipped: { bg: 'rgba(52,73,94,0.4)', color: '#a9c0d8' },
  'Out for Delivery': { bg: 'rgba(230,126,34,0.15)', color: '#e67e22' },
  Out_For_Delivery: { bg: 'rgba(230,126,34,0.15)', color: '#e67e22' },
  Delivered: { bg: 'rgba(46,204,113,0.15)', color: '#2ecc71' },
  Cancelled: { bg: 'rgba(231,76,60,0.15)', color: '#e74c3c' },
  Returned: { bg: 'rgba(155,89,182,0.15)', color: '#9b59b6' },
};

const PAYMENT_COLORS: Record<string, { bg: string; color: string }> = {
  Pending: { bg: 'rgba(243,156,18,0.15)', color: '#f39c12' },
  PENDING: { bg: 'rgba(243,156,18,0.15)', color: '#f39c12' },
  Processing: { bg: 'rgba(52,152,219,0.15)', color: '#3498db' },
  PROCESSING: { bg: 'rgba(52,152,219,0.15)', color: '#3498db' },
  Paid: { bg: 'rgba(46,204,113,0.15)', color: '#2ecc71' },
  PAID: { bg: 'rgba(46,204,113,0.15)', color: '#2ecc71' },
  Failed: { bg: 'rgba(231,76,60,0.15)', color: '#e74c3c' },
  FAILED: { bg: 'rgba(231,76,60,0.15)', color: '#e74c3c' },
  Cancelled: { bg: 'rgba(231,76,60,0.15)', color: '#e74c3c' },
  CANCELLED: { bg: 'rgba(231,76,60,0.15)', color: '#e74c3c' },
  'Refund Pending': { bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
  'REFUND PENDING': { bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
  REFUND_PENDING: { bg: 'rgba(241,196,15,0.15)', color: '#f1c40f' },
  Refunded: { bg: 'rgba(155,89,182,0.15)', color: '#9b59b6' },
  REFUNDED: { bg: 'rgba(155,89,182,0.15)', color: '#9b59b6' },
  'Partially Refunded': { bg: 'rgba(142,68,173,0.15)', color: '#8e44ad' },
  'PARTIALLY REFUNDED': { bg: 'rgba(142,68,173,0.15)', color: '#8e44ad' },
  PARTIALLY_REFUNDED: { bg: 'rgba(142,68,173,0.15)', color: '#8e44ad' },
};

const IRREVERSIBLE = new Set(['Cancelled', 'Returned']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string; map: Record<string, { bg: string; color: string }> }> = ({ status, map }) => {
  const c = map[status] || map[status?.toUpperCase?.()] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--cream)' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '0.72rem',
      fontWeight: 700,
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.color}50`,
    }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

// ─── Order Detail Modal ───────────────────────────────────────────────────────

export const OrderDetailModal: React.FC<{
  order: any;
  onClose: () => void;
  onUpdateStatus: (id: string, payload: { status?: string; payment_status?: string }) => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string, title?: string) => void;
  onRefresh: () => void;
}> = ({ order, onClose, onUpdateStatus, addToast, onRefresh }) => {
  const [confirmPayload, setConfirmPayload] = useState<{ status?: string; payment_status?: string } | null>(null);
  const [confirmMsg, setConfirmMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Keyboard shortcut: Escape to close modal or cancel confirm dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmPayload) {
          setConfirmPayload(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmPayload, onClose]);

  // Lock body scrolling while the modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const isCod = order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'COD' || order.payment_method === 'Cash on Delivery' || order.payment_method === 'COD';
  const currentSt = order.status || 'Processing';
  const currentPs = order.payment_status || order.paymentStatus || 'PENDING';
  const allowedNext = ALLOWED_TRANSITIONS[currentSt] || [];

  const shipAddr = order.shipping_address || order.shippingAddress || {};
  const customerName = order.shipping_name || shipAddr.name || shipAddr.full_name || order.customer_name || order.user_name || order.name || 'Customer';
  const customerPhone = order.shipping_phone || shipAddr.phone || shipAddr.phoneNumber || order.customer_phone || order.phone || '';
  const customerEmail = shipAddr.email || order.user_email || order.customer_email || order.email || '';

  const houseNumber = order.shipping_house_number || shipAddr.house_number || '';
  const street = order.shipping_street || shipAddr.street || shipAddr.address || shipAddr.address_line1 || shipAddr.street_address || '';
  const area = order.shipping_area || shipAddr.area || '';
  const landmark = order.shipping_landmark || shipAddr.landmark || '';
  const city = order.shipping_city || shipAddr.city || '';
  const district = order.shipping_district || shipAddr.district || '';
  const state = order.shipping_state || shipAddr.state || '';
  const pincode = order.shipping_pincode || shipAddr.pincode || shipAddr.zip || shipAddr.postalCode || shipAddr.zip_code || '';
  const lat = order.shipping_latitude != null ? Number(order.shipping_latitude) : (shipAddr.latitude != null ? Number(shipAddr.latitude) : null);
  const lng = order.shipping_longitude != null ? Number(order.shipping_longitude) : (shipAddr.longitude != null ? Number(shipAddr.longitude) : null);
  const locationSource = order.shipping_location_source || shipAddr.location_source || (lat != null ? 'CURRENT_LOCATION' : 'MANUAL');
  const fulfillmentType = order.fulfillment_type || (order.shipping_provider?.includes('Courier') ? 'COURIER' : 'LOCAL');
  const shippingProvider = order.shipping_provider || (fulfillmentType === 'LOCAL' ? 'Chovique Local Express' : 'iThink Logistics Express');

  const mapsUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [houseNumber, street, area, city, state, pincode].filter(Boolean).join(', ')
        )}`;

  const initiateStatusChange = (newSt: string) => {
    if (!allowedNext.includes(newSt)) {
      addToast('error', `Cannot transition from ${currentSt} to ${newSt}.`, 'Invalid Transition');
      return;
    }
    if (IRREVERSIBLE.has(newSt)) {
      setConfirmPayload({ status: newSt });
      setConfirmMsg(
        newSt === 'Cancelled'
          ? `This will permanently cancel order ${order.id}. This cannot be undone.`
          : `Marking as Delivered finalizes this order permanently.`
      );
    } else {
      doUpdate({ status: newSt });
    }
  };

  const initiateCodPaid = () => {
    setConfirmPayload({ payment_status: 'PAID' });
    setConfirmMsg(`Mark COD payment as PAID for order ${order.id}? This cannot be reversed.`);
  };

  const doUpdate = async (payload: { status?: string; payment_status?: string }) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(order.id, payload);
      addToast('success', 'Order updated successfully.', 'Updated');
      onRefresh();
      onClose();
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to update order status.', 'Error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delivery Executive Assignment State
  const [deliveryBoysList, setDeliveryBoysList] = useState<any[]>([]);
  const [selectedBoyId, setSelectedBoyId] = useState<string>('');
  const [isAssigningBoy, setIsAssigningBoy] = useState<boolean>(false);

  useEffect(() => {
    deliveryService.getDeliveryBoys(true).then((data) => {
      setDeliveryBoysList(data || []);
    }).catch(() => {});
  }, []);

  const handleAssignBoy = async (boyId: string) => {
    if (!boyId) return;
    setIsAssigningBoy(true);
    try {
      await deliveryService.assignOrder(order.id, boyId);
      addToast('success', 'Delivery executive successfully assigned!', 'Assigned');
      onRefresh();
      onClose();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to assign delivery executive.', 'Assignment Error');
    } finally {
      setIsAssigningBoy(false);
    }
  };

  const handleUnassignBoy = async () => {
    setIsAssigningBoy(true);
    try {
      await deliveryService.unassignOrder(order.id);
      addToast('info', 'Delivery executive unassigned. Order returned to pool.', 'Unassigned');
      onRefresh();
      onClose();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to unassign.', 'Error');
    } finally {
      setIsAssigningBoy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-details-modal-title"
      onClick={(e) => {
        // Clicking backdrop closes modal
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto',
      }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: 'min(92vh, 880px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px',
          border: '1px solid var(--gold)',
          background: 'rgba(18, 10, 5, 0.98)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 35px rgba(201,168,76,0.12)',
          margin: 'auto',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Pinned Sticky Header */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            background: 'rgba(24, 13, 7, 0.98)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.68rem',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                fontWeight: 700,
                display: 'block',
              }}
            >
              Order Details
            </span>
            <h2
              id="order-details-modal-title"
              style={{
                fontFamily: 'monospace',
                fontSize: '1.15rem',
                color: 'var(--cream)',
                margin: '2px 0 0 0',
                wordBreak: 'break-all',
              }}
            >
              {order.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            title="Close modal (Esc)"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--cream)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(201,168,76,0.2)';
              e.currentTarget.style.borderColor = 'var(--gold)';
              e.currentTarget.style.color = 'var(--gold)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)';
              e.currentTarget.style.color = 'var(--cream)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Customer & Shipping Address Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '10px',
            }}
          >
            {/* Customer Details */}
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.66rem',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontWeight: 700,
                }}
              >
                <User size={12} /> Customer Information
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--cream)',
                  fontSize: '0.88rem',
                  wordBreak: 'break-word',
                }}
              >
                {customerName}
              </div>
              {customerPhone && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: 'var(--beige)',
                  }}
                >
                  <Phone size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <a
                    href={`tel:${customerPhone}`}
                    style={{ color: 'var(--beige)', textDecoration: 'none', wordBreak: 'break-all' }}
                  >
                    {customerPhone}
                  </a>
                </div>
              )}
              {customerEmail && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.74rem',
                    color: 'var(--grey-light)',
                    wordBreak: 'break-all',
                  }}
                >
                  <Mail size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <span>{customerEmail}</span>
                </div>
              )}
            </div>

            {/* Delivery & Shipping Address (V2 Logistics & Precision Location) */}
            <div
              style={{
                background: 'rgba(255,255,255,0.025)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.66rem',
                    color: 'var(--gold)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 700,
                  }}
                >
                  <MapPin size={12} /> Shipping Destination
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      background: fulfillmentType === 'LOCAL' ? 'rgba(201,168,76,0.18)' : 'rgba(59,130,246,0.18)',
                      color: fulfillmentType === 'LOCAL' ? 'var(--gold)' : '#93c5fd',
                      border: fulfillmentType === 'LOCAL' ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(59,130,246,0.3)',
                    }}
                  >
                    {fulfillmentType === 'LOCAL' ? '⚡ LOCAL EXPRESS' : '📦 iThink Logistics Express'}
                  </span>
                  {lat != null && lng != null && (
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(74,222,128,0.15)',
                        color: '#4ade80',
                        fontWeight: 700,
                      }}
                    >
                      📍 GPS
                    </span>
                  )}
                </div>
              </div>

              {street || houseNumber ? (
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: 'var(--cream)',
                    fontWeight: 500,
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                  }}
                >
                  {houseNumber ? `${houseNumber}, ` : ''}{street}{area ? `, ${area}` : ''}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
                  Address line not specified
                </div>
              )}

              {landmark && (
                <div style={{ fontSize: '0.75rem', color: 'var(--gold-light)', wordBreak: 'break-word' }}>
                  Landmark: {landmark}
                </div>
              )}

              {(city || state || pincode) && (
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--beige)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginTop: '2px',
                    wordBreak: 'break-word',
                  }}
                >
                  <span>{[city, district, state].filter(Boolean).join(', ')}</span>
                  {pincode && (
                    <span
                      style={{
                        background: 'rgba(201,168,76,0.12)',
                        color: 'var(--gold)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        border: '1px solid rgba(201,168,76,0.25)',
                      }}
                    >
                      PIN: {pincode}
                    </span>
                  )}
                </div>
              )}

              {/* Provider and Navigation Button */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '4px',
                  borderTop: '1px dashed rgba(255,255,255,0.06)',
                  paddingTop: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--grey-light)' }}>
                  <Truck size={11} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  <span>Provider: <strong style={{ color: 'var(--cream)' }}>{shippingProvider}</strong></span>
                </div>

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(201,168,76,0.15)',
                      color: 'var(--gold)',
                      border: '1px solid rgba(201,168,76,0.3)',
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={11} /> Open in Google Maps
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Fulfillment Action Box: Local Delivery Assignment vs iThink Logistics Courier Dispatch */}
          {fulfillmentType === 'LOCAL' ? (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(201,168,76,0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(201,168,76,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={13} /> Local Express Delivery Assignment
                </span>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: '#f5efe6', fontWeight: 600 }}>
                  Fulfillment: {order.fulfillment_status || 'UNASSIGNED'}
                </span>
              </div>

              {order.delivery_boy_name ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ color: '#f5efe6', fontWeight: 700, fontSize: '0.85rem' }}>
                      Assigned: <strong style={{ color: 'var(--gold)' }}>{order.delivery_boy_name}</strong>
                    </div>
                    {order.delivery_otp && (
                      <div style={{ fontSize: '0.74rem', color: '#2ecc71', fontWeight: 700, marginTop: '2px' }}>
                        🔑 Customer Delivery OTP: <span style={{ background: 'rgba(46,204,113,0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(46,204,113,0.4)' }}>{order.delivery_otp}</span>
                      </div>
                    )}
                  </div>
                  <button
                    disabled={isAssigningBoy}
                    onClick={handleUnassignBoy}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'rgba(231,76,60,0.15)',
                      border: '1px solid rgba(231,76,60,0.4)',
                      color: '#e74c3c',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isAssigningBoy ? 'Unassigning...' : 'Unassign / Change'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={selectedBoyId}
                    onChange={(e) => setSelectedBoyId(e.target.value)}
                    style={{
                      flex: '1 1 180px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: 'rgba(15,12,10,0.9)',
                      border: '1px solid rgba(201,168,76,0.3)',
                      color: '#f5efe6',
                      fontSize: '0.78rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">Select Delivery Executive...</option>
                    {deliveryBoysList.map((boy) => (
                      <option key={boy.id} value={boy.id}>
                        {boy.full_name} ({boy.active_orders || 0} active orders)
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={!selectedBoyId || isAssigningBoy}
                    onClick={() => handleAssignBoy(selectedBoyId)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: !selectedBoyId ? 'rgba(255,255,255,0.1)' : 'var(--gold)',
                      border: 'none',
                      color: '#0f0c0a',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: !selectedBoyId ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isAssigningBoy ? 'Assigning...' : 'Assign to Order'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(59,130,246,0.06)',
                borderRadius: '8px',
                border: '1px solid rgba(59,130,246,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={13} color="#60a5fa" /> iThink Logistics Courier Fulfillment
                </span>
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#93c5fd', fontWeight: 600 }}>
                  Carrier Network: BlueDart, Delhivery, DTDC, XpressBees
                </span>
              </div>

              {order.tracking_number ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ color: '#f5efe6', fontWeight: 700, fontSize: '0.85rem' }}>
                      AWB Tracking Number: <strong style={{ color: '#93c5fd', fontFamily: 'monospace' }}>{order.tracking_number}</strong>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--beige)', marginTop: '2px' }}>
                      Provider: {order.shipping_provider || 'iThink Logistics Express'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={order.tracking_url || `https://ithinklogistics.com/track?awb=${order.tracking_number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(26,18,11,0.9) 100%)',
                        border: '1px solid rgba(59,130,246,0.5)',
                        color: '#93c5fd',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ExternalLink size={12} /> Live Tracking
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--cream)' }}>
                    Ready for instant booking with third-party logistics (iThink Multi-Carrier).
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await adminService.pushOrderToIThink(order.id);
                        addToast('success', res.message || 'Order booked with iThink Logistics!', 'Courier Dispatched');
                        onUpdateStatus(order.id, {});
                      } catch (err: any) {
                        addToast('error', err?.detail || err?.message || 'Failed to dispatch order.', 'Dispatch Error');
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.35) 0%, rgba(30,58,138,0.7) 100%)',
                      border: '1px solid rgba(59,130,246,0.6)',
                      color: '#93c5fd',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={13} />
                    Book &amp; Push to iThink Logistics
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Statuses row */}
          <div
            style={{
              display: 'flex',
              gap: '10px 14px',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Order Status
              </div>
              <StatusBadge status={currentSt} map={FULFILLMENT_COLORS} />
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Payment
              </div>
              <StatusBadge status={currentPs} map={PAYMENT_COLORS} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                Method
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--cream)', fontWeight: 600 }}>{order.paymentMethod || '—'}</span>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '8px' }}>
              Items
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {order.items?.map((it: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.04)',
                    gap: '10px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--cream)', fontWeight: 600, wordBreak: 'break-word' }}>
                      {it.product?.name || 'Product'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--grey-light)' }}>
                      Qty: {it.quantity} × ₹{it.price}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.85rem', flexShrink: 0 }}>
                    ₹{(it.quantity * it.price).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cream)' }}>
                <span>Subtotal</span>
                <span style={{ fontWeight: 600 }}>₹{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cream)' }}>
                <span>Delivery</span>
                <span style={{ fontWeight: 600 }}>{order.shipping > 0 ? `₹${order.shipping.toLocaleString()}` : 'Free'}</span>
              </div>
              {(order.tax || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cream)' }}>
                  <span>Tax (GST)</span>
                  <span style={{ fontWeight: 600 }}>₹{order.tax.toLocaleString()}</span>
                </div>
              )}
              {(order.coupon_discount || order.discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                  <span>Coupon {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                  <span style={{ fontWeight: 600 }}>−₹{(order.coupon_discount || order.discount || 0).toLocaleString()}</span>
                </div>
              )}
              {(order.coin_discount || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2ecc71' }}>
                  <span>Reward Coins ({order.coins_used})</span>
                  <span style={{ fontWeight: 600 }}>−₹{(order.coin_discount || 0).toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '2px' }}>
                <span style={{ color: 'var(--cream)', fontWeight: 700, fontSize: '0.88rem' }}>Total</span>
                <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>
                  ₹{(order.total || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {(allowedNext.length > 0 || (isCod && currentPs === 'PENDING')) && (
            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '8px' }}>
                Update Status & Payment
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {allowedNext.map((st) => (
                  <button
                    key={st}
                    disabled={isUpdating}
                    onClick={() => initiateStatusChange(st)}
                    style={{
                      flex: '1 1 110px',
                      minHeight: '36px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      background: st === 'Cancelled' ? 'rgba(231,76,60,0.15)' : 'rgba(201,168,76,0.15)',
                      color: st === 'Cancelled' ? '#e74c3c' : 'var(--gold)',
                      border: st === 'Cancelled' ? '1px solid rgba(231,76,60,0.4)' : '1px solid var(--gold)',
                      opacity: isUpdating ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    → {STATUS_LABELS[st] || st}
                  </button>
                ))}
                {isCod && currentPs === 'PENDING' && (
                  <button
                    disabled={isUpdating}
                    onClick={initiateCodPaid}
                    style={{
                      flex: '1 1 110px',
                      minHeight: '36px',
                      padding: '7px 12px',
                      borderRadius: '6px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      background: 'rgba(46,204,113,0.15)',
                      color: '#2ecc71',
                      border: '1px solid rgba(46,204,113,0.4)',
                      opacity: isUpdating ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Mark COD Paid
                  </button>
                )}
              </div>
            </div>
          )}

          {confirmPayload && (
            <div style={{ padding: '14px', borderRadius: '8px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#f5e6d3' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>{confirmMsg}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  disabled={isUpdating}
                  onClick={() => doUpdate(confirmPayload)}
                  style={{ padding: '7px 16px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {isUpdating ? 'Updating...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmPayload(null)}
                  style={{ padding: '7px 16px', background: 'rgba(255,255,255,0.1)', color: 'var(--cream)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Footer Action Bar */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 18px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(15, 8, 3, 0.98)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--grey-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Press <kbd style={{ padding: '1px 5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--cream)', fontSize: '0.68rem', fontFamily: 'monospace' }}>ESC</kbd> or click outside to close</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'var(--cream)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              marginLeft: 'auto',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
            }}
          >
            <X size={14} /> Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Quick Confirm Dialog ─────────────────────────────────────────────────────

const QuickConfirmDialog: React.FC<{
  orderId: string;
  newStatus: string;
  isUpdating?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ orderId, newStatus, isUpdating, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUpdating) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUpdating, onCancel]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUpdating) {
          onCancel();
        }
      }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--gold)',
          background: 'rgba(18,10,5,0.96)',
          textAlign: 'center',
          margin: 'auto',
        }}
      >
        <AlertTriangle size={36} color="#e74c3c" style={{ margin: '0 auto 12px auto', display: 'block' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: '0 0 8px 0', fontSize: '1.2rem' }}>Confirm Status Change</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--beige)', marginBottom: '20px' }}>
          {newStatus === '_MARK_PAID'
            ? `Are you sure you want to mark COD payment as PAID for order ${orderId}?`
            : `Are you sure you want to change order ${orderId} status to "${STATUS_LABELS[newStatus] || newStatus}"?`}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            disabled={isUpdating}
            onClick={onCancel}
            style={{ padding: '9px 20px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--cream)', borderRadius: '6px', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isUpdating ? 0.6 : 1 }}
          >
            Cancel
          </button>
          <button
            disabled={isUpdating}
            onClick={onConfirm}
            style={{ padding: '9px 20px', background: 'var(--gold)', border: 'none', color: '#000', borderRadius: '6px', cursor: isUpdating ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: isUpdating ? 0.6 : 1 }}
          >
            {isUpdating ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Assign Delivery Executive Modal ─────────────────────────────────────────

export const AssignDeliveryModal: React.FC<{
  order?: any | null;
  initialSelectedOrders?: any[];
  availableLocalOrders?: any[];
  deliveryBoys: any[];
  onClose: () => void;
  onAssigned: () => void;
  addToast: (type: 'success' | 'error' | 'info', msg: string, title?: string) => void;
}> = ({
  order,
  initialSelectedOrders = [],
  availableLocalOrders = [],
  deliveryBoys,
  onClose,
  onAssigned,
  addToast,
}) => {
  // Aggregate pool of local orders for batch selection
  const ordersMap = new Map<string, any>();
  if (order) ordersMap.set(order.id, order);
  initialSelectedOrders.forEach((o) => { if (o?.id) ordersMap.set(o.id, o); });
  availableLocalOrders.forEach((o) => { if (o?.id) ordersMap.set(o.id, o); });
  const poolOrders = Array.from(ordersMap.values());

  const initialIds = initialSelectedOrders.length > 0
    ? initialSelectedOrders.map((o) => o.id)
    : order
    ? [order.id]
    : poolOrders.length > 0
    ? [poolOrders[0].id]
    : [];

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(initialIds);
  const [selectedBoyId, setSelectedBoyId] = useState<string>(
    order?.delivery_boy_id || (deliveryBoys.length > 0 ? deliveryBoys[0].id : '')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBoy = deliveryBoys.find((b) => b.id === selectedBoyId);

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === poolOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(poolOrders.map((o) => o.id));
    }
  };

  const handleSelectUnassignedOnly = () => {
    const unassigned = poolOrders.filter((o) => !o.delivery_boy_id).map((o) => o.id);
    setSelectedOrderIds(unassigned);
  };

  const handleAssign = async () => {
    if (!selectedBoyId) {
      addToast('error', 'Please select a delivery executive from the dropdown.', 'Selection Required');
      return;
    }
    if (selectedOrderIds.length === 0) {
      addToast('error', 'Please select at least one local order to assign.', 'No Orders Selected');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedOrderIds.length === 1) {
        await deliveryService.assignOrder(selectedOrderIds[0], selectedBoyId);
      } else {
        await deliveryService.batchAssignOrders(selectedOrderIds, selectedBoyId);
      }
      addToast(
        'success',
        `Assigned ${selectedOrderIds.length} order(s) to ${selectedBoy?.full_name || 'delivery executive'}.`,
        'Assigned Successfully'
      );
      onAssigned();
      onClose();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to assign delivery executive.', 'Assignment Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnassignSingle = async (orderId: string) => {
    setIsSubmitting(true);
    try {
      await deliveryService.unassignOrder(orderId);
      addToast('info', `Order ${orderId} unassigned and returned to pool.`, 'Executive Unassigned');
      onAssigned();
      onClose();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to unassign.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, rgba(22, 17, 13, 0.98), rgba(14, 10, 8, 0.98))',
          border: '1px solid var(--gold)',
          borderRadius: '14px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 800 }}>
                ⚡ Local Express Operations
              </span>
              <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(201,168,76,0.18)', color: 'var(--gold)', fontWeight: 700 }}>
                BATCH DISPATCH
              </span>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.25rem', margin: '4px 0 0 0' }}>
              Assign Delivery Executive
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--grey-light)' }}>
              Select an active delivery person from the dropdown and assign any number of orders at once.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--grey-light)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
          {/* Executive Selection Dropdown */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '8px' }}>
              Select Active Delivery Person (Dropdown) <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            {deliveryBoys.length === 0 ? (
              <div style={{ padding: '14px', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.25)', borderRadius: '8px', color: '#e74c3c', fontSize: '0.82rem' }}>
                No active delivery executives found. Please create or activate one under <strong>Delivery Management</strong>.
              </div>
            ) : (
              <div>
                <select
                  value={selectedBoyId}
                  onChange={(e) => setSelectedBoyId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: 'rgba(12, 9, 7, 0.95)',
                    border: '1px solid var(--gold)',
                    color: 'var(--cream)',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}
                >
                  <option value="">-- Choose Delivery Person ({deliveryBoys.length} available) --</option>
                  {deliveryBoys.map((boy) => (
                    <option key={boy.id} value={boy.id}>
                      {boy.full_name} ({boy.phone || boy.email}) — {boy.active_orders || 0} active orders
                    </option>
                  ))}
                </select>

                {selectedBoy && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(201,168,76,0.08)',
                      border: '1px solid rgba(201,168,76,0.25)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #c9a84c, #8c7335)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0f0c0a',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                        }}
                      >
                        {selectedBoy.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '0.86rem' }}>
                          {selectedBoy.full_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--grey-light)' }}>
                          {selectedBoy.phone || selectedBoy.email}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: (selectedBoy.active_orders || 0) === 0 ? 'rgba(46,204,113,0.18)' : 'rgba(230,126,34,0.18)',
                        color: (selectedBoy.active_orders || 0) === 0 ? '#2ecc71' : '#e67e22',
                        fontWeight: 700,
                        border: `1px solid ${(selectedBoy.active_orders || 0) === 0 ? '#2ecc7155' : '#e67e2255'}`,
                      }}
                    >
                      {selectedBoy.active_orders || 0} active assigned
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Orders Multi-Select Card List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Local Orders to Assign ({selectedOrderIds.length} of {poolOrders.length} selected)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: 'var(--cream)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {selectedOrderIds.length === poolOrders.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectUnassignedOnly}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    background: 'rgba(201,168,76,0.12)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    color: 'var(--gold)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Unassigned Only
                </button>
              </div>
            </div>

            {poolOrders.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--grey-light)', fontSize: '0.82rem' }}>
                No local express orders available.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
                {poolOrders.map((ord: any) => {
                  const isChecked = selectedOrderIds.includes(ord.id);
                  const shipAddr = ord.shipping_address || ord.shippingAddress || {};
                  const custName = ord.shipping_name || shipAddr.name || ord.customer_name || ord.name || 'Customer';
                  const custPhone = ord.shipping_phone || shipAddr.phone || ord.customer_phone || '';
                  const street = ord.shipping_street || shipAddr.street || '';
                  const area = ord.shipping_area || shipAddr.area || '';
                  const pin = ord.shipping_pincode || shipAddr.pincode || shipAddr.zip || '';

                  return (
                    <div
                      key={ord.id}
                      onClick={() => toggleOrderSelection(ord.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: isChecked ? 'rgba(201,168,76,0.14)' : 'rgba(255,255,255,0.025)',
                        border: isChecked ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: 'var(--gold)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                              {ord.id}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--cream)', fontWeight: 600 }}>
                              • {custName}
                            </span>
                            {custPhone && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--beige)' }}>
                                ({custPhone})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--grey-light)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {[street, area].filter(Boolean).join(', ')} {pin ? `• PIN: ${pin}` : ''}
                          </div>
                          {ord.delivery_boy_name && (
                            <div style={{ fontSize: '0.7rem', color: '#2ecc71', marginTop: '2px' }}>
                              Currently: <strong>{ord.delivery_boy_name}</strong> ({ord.fulfillment_status})
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.85rem' }}>
                          ₹{ord.total?.toLocaleString('en-IN') || '0'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--grey-light)', marginTop: '2px' }}>
                          {ord.items?.length || 1} item(s)
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          {order && order.delivery_boy_id && selectedOrderIds.length === 1 && selectedOrderIds[0] === order.id ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleUnassignSingle(order.id)}
              style={{
                padding: '9px 16px',
                borderRadius: '6px',
                background: 'rgba(231,76,60,0.15)',
                border: '1px solid rgba(231,76,60,0.4)',
                color: '#e74c3c',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Unassign Order
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--cream)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || !selectedBoyId || selectedOrderIds.length === 0 || deliveryBoys.length === 0}
              onClick={handleAssign}
              style={{
                padding: '9px 22px',
                borderRadius: '6px',
                background: !selectedBoyId || selectedOrderIds.length === 0 ? 'rgba(255,255,255,0.1)' : 'var(--gold)',
                border: 'none',
                color: '#0f0c0a',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: !selectedBoyId || selectedOrderIds.length === 0 || isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: !selectedBoyId || selectedOrderIds.length === 0 ? 'none' : '0 4px 14px rgba(201,168,76,0.3)',
              }}
            >
              {isSubmitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={14} />}
              {isSubmitting
                ? 'Assigning...'
                : `Assign ${selectedOrderIds.length} Order${selectedOrderIds.length > 1 ? 's' : ''} to ${selectedBoy ? selectedBoy.full_name : 'Executive'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main OrderManagement Component ──────────────────────────────────────────

interface OrderManagementProps {
  handleUpdateOrderStatus: (orderId: string, payload: { status?: string; payment_status?: string }) => Promise<any>;
  addToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({
  handleUpdateOrderStatus,
  addToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fulfillmentTypeFilter, setFulfillmentTypeFilter] = useState<'ALL' | 'LOCAL' | 'COURIER'>('ALL');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [dbOrderData, setDbOrderData] = useState<any>(null);

  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [assignModalOrder, setAssignModalOrder] = useState<any | null>(null);
  const [selectedLocalOrderIds, setSelectedLocalOrderIds] = useState<string[]>([]);
  const [batchAssignModalOpen, setBatchAssignModalOpen] = useState<boolean>(false);
  const [deliveryBoysList, setDeliveryBoysList] = useState<any[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<{ order: any; newStatus: string } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [isPushingIThink, setIsPushingIThink] = useState<string | null>(null);
  const [showIThinkSettingsModal, setShowIThinkSettingsModal] = useState<boolean>(false);
  const [ithinkConfig, setIthinkConfig] = useState<{ configured: boolean; api_key?: string }>({ configured: false });
  const [ithinkApiKeyInput, setIthinkApiKeyInput] = useState<string>('');
  const [ithinkSecretKeyInput, setIthinkSecretKeyInput] = useState<string>('');
  const [isSavingIThinkConfig, setIsSavingIThinkConfig] = useState<boolean>(false);

  useEffect(() => {
    adminService.getIThinkConfig().then((cfg) => {
      if (cfg) setIthinkConfig(cfg);
    }).catch(() => {});
  }, []);

  const handlePushToIThink = async (orderId: string) => {
    setIsPushingIThink(orderId);
    try {
      const res = await adminService.pushOrderToIThink(orderId);
      addToast('success', res.message || `Booked with iThink Logistics! AWB: ${res.awb_number}`, 'iThink Courier Dispatched');
      fetchDbOrders();
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to dispatch order to iThink Logistics.', 'iThink Error');
    } finally {
      setIsPushingIThink(null);
    }
  };

  const handleSaveIThinkFromModal = async () => {
    if (!ithinkApiKeyInput.trim() && !ithinkSecretKeyInput.trim()) {
      addToast('error', 'Please enter an API Key or Secret Key.', 'Missing Credentials');
      return;
    }
    setIsSavingIThinkConfig(true);
    try {
      const res = await adminService.updateIThinkConfig({
        api_key: ithinkApiKeyInput.trim(),
        secret_key: ithinkSecretKeyInput.trim(),
      });
      setIthinkConfig({ configured: res.configured, api_key: res.api_key_masked });
      setIthinkApiKeyInput('');
      setIthinkSecretKeyInput('');
      setShowIThinkSettingsModal(false);
      addToast('success', 'iThink Logistics API credentials updated successfully.', 'Credentials Saved');
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Failed to save iThink credentials.', 'Save Error');
    } finally {
      setIsSavingIThinkConfig(false);
    }
  };

  const fetchDeliveryBoys = useCallback(() => {
    deliveryService.getDeliveryBoys(true).then((data) => {
      setDeliveryBoysList(data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDeliveryBoys();
  }, [fetchDeliveryBoys]);

  const fetchDbOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await adminService.getAllOrders({
        fulfillment_type: fulfillmentTypeFilter !== 'ALL' ? fulfillmentTypeFilter : undefined,
        status: fulfillmentFilter !== 'ALL' ? fulfillmentFilter : undefined,
        payment_status: paymentFilter !== 'ALL' ? paymentFilter : undefined,
        search: searchQuery.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        limit,
      });
      setDbOrderData(data);
    } catch (err: any) {
      console.error('Failed to fetch orders from database:', err);
      addToast('error', err?.detail || err?.message || 'Failed to load order data from database.', 'API Error');
    } finally {
      setOrdersLoading(false);
    }
  }, [fulfillmentTypeFilter, fulfillmentFilter, paymentFilter, searchQuery, dateFrom, dateTo, page, limit, addToast]);

  useEffect(() => {
    fetchDbOrders();
  }, [fetchDbOrders]);

  const summary = dbOrderData?.summary || {};
  const ordersList = dbOrderData?.items || [];
  const totalCount = dbOrderData?.total || 0;
  const totalPages = dbOrderData?.total_pages || 1;

  const isLocalExpressOrder = (o: any) =>
    o.fulfillment_type === 'LOCAL' ||
    (!o.fulfillment_type && !o.shipping_provider?.includes('Courier'));

  const localOrdersOnPage = ordersList.filter(isLocalExpressOrder);
  const unassignedLocalOrders = localOrdersOnPage.filter(
    (o: any) => !o.delivery_boy_id && o.status !== 'Delivered' && o.status !== 'Cancelled'
  );

  const toggleSelectLocalOrder = (orderId: string) => {
    setSelectedLocalOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllLocalOrders = () => {
    if (selectedLocalOrderIds.length === localOrdersOnPage.length && localOrdersOnPage.length > 0) {
      setSelectedLocalOrderIds([]);
    } else {
      setSelectedLocalOrderIds(localOrdersOnPage.map((o: any) => o.id));
    }
  };

  const kpis = {
    total: summary.total_orders ?? 0,
    pending: (summary.processing ?? 0) + (summary.confirmed ?? 0),
    transit: (summary.shipped ?? 0) + (summary.out_for_delivery ?? 0),
    delivered: summary.delivered ?? 0,
    cancelled: summary.cancelled ?? 0,
    revenue: summary.total_revenue ?? 0,
    local: summary.local_orders ?? 0,
    courier: summary.courier_orders ?? 0,
    unassignedLocal: summary.unassigned_local ?? 0,
  };

  const handleQuickChange = (order: any, newSt: string) => {
    const currentSt = order.status || 'Processing';
    if (!(ALLOWED_TRANSITIONS[currentSt] || []).includes(newSt)) {
      addToast('error', `Cannot change from "${currentSt}" to "${newSt}".`, 'Invalid Transition');
      return;
    }
    if (IRREVERSIBLE.has(newSt)) {
      setPendingConfirm({ order, newStatus: newSt });
    } else {
      handleUpdateOrderStatus(order.id, { status: newSt }).then(() => {
        addToast('success', `Order ${order.id} → ${STATUS_LABELS[newSt] || newSt}`, 'Status Updated');
        fetchDbOrders();
      });
    }
  };

  const handleMarkCodPaid = (order: any) => {
    setPendingConfirm({ order, newStatus: '_MARK_PAID' });
  };

  const confirmUpdate = async () => {
    if (!pendingConfirm) return;
    setIsConfirming(true);
    const { order, newStatus } = pendingConfirm;
    try {
      if (newStatus === '_MARK_PAID') {
        await handleUpdateOrderStatus(order.id, { payment_status: 'PAID' });
        addToast('success', `COD marked PAID for ${order.id}`, 'Payment Updated');
      } else {
        await handleUpdateOrderStatus(order.id, { status: newStatus });
        addToast('success', `Order ${order.id} → ${STATUS_LABELS[newStatus] || newStatus}`, 'Status Updated');
      }
      fetchDbOrders();
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      addToast('error', err?.detail || err?.message || 'Failed to update order status.', 'Error');
    } finally {
      setIsConfirming(false);
      setPendingConfirm(null);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <div>
          <span className="section-label">Order Operations</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--cream)', margin: 0 }}>Order Management</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* iThink Logistics API Key Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowIThinkSettingsModal(true)}
            title="Configure iThink Logistics API Key & Multi-Carrier Courier Integration"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '10px 16px',
              borderRadius: '6px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid rgba(59,130,246,0.4)',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(26,18,11,0.9) 100%)',
              color: '#93c5fd',
              boxShadow: '0 2px 10px rgba(59,130,246,0.15)',
            }}
          >
            <Send size={14} color="#60a5fa" />
            <span>iThink Logistics API</span>
            {ithinkConfig.configured ? (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#2ecc71',
                  boxShadow: '0 0 6px #2ecc71',
                  display: 'inline-block',
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  background: 'rgba(243,156,18,0.2)',
                  color: '#f39c12',
                }}
              >
                Sandbox
              </span>
            )}
          </button>

          <button
            onClick={() => exportToCSV('Order_Management_Export', ordersList)}
            disabled={ordersList.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: ordersList.length === 0 ? 'not-allowed' : 'pointer', border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.12)', color: 'var(--gold)' }}
          >
            <FileSpreadsheet size={15} />
            Export CSV
          </button>
          <button
            onClick={() => { fetchDbOrders(); fetchDeliveryBoys(); }}
            disabled={ordersLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(201,168,76,0.35)', background: 'rgba(201,168,76,0.08)', color: 'var(--gold)' }}
          >
            {ordersLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Top Segmented Channel Filter: All / Local Express / iThink Logistics Courier */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* All Royal Orders */}
        <button
          type="button"
          onClick={() => { setFulfillmentTypeFilter('ALL'); setPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 20px',
            borderRadius: '24px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            background: fulfillmentTypeFilter === 'ALL'
              ? 'linear-gradient(135deg, #c9a84c 0%, #a07d2c 100%)'
              : 'rgba(255,255,255,0.04)',
            color: fulfillmentTypeFilter === 'ALL' ? '#0f0c0a' : 'var(--cream)',
            border: fulfillmentTypeFilter === 'ALL' ? '1px solid #e5c158' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: fulfillmentTypeFilter === 'ALL' ? '0 4px 14px rgba(201,168,76,0.35)' : 'none',
          }}
        >
          <Crown size={15} color={fulfillmentTypeFilter === 'ALL' ? '#0f0c0a' : 'var(--gold)'} />
          <span>All Orders</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: fulfillmentTypeFilter === 'ALL' ? '#0f0c0a' : 'rgba(255,255,255,0.1)',
            color: fulfillmentTypeFilter === 'ALL' ? 'var(--gold)' : 'var(--cream)',
            fontWeight: 800,
          }}>
            {kpis.total}
          </span>
        </button>

        {/* Local Express Orders */}
        <button
          type="button"
          onClick={() => { setFulfillmentTypeFilter('LOCAL'); setPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 20px',
            borderRadius: '24px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            background: fulfillmentTypeFilter === 'LOCAL'
              ? 'linear-gradient(135deg, rgba(201,168,76,0.28) 0%, rgba(26,18,11,0.95) 100%)'
              : 'rgba(255,255,255,0.04)',
            color: fulfillmentTypeFilter === 'LOCAL' ? 'var(--gold)' : 'var(--cream)',
            border: fulfillmentTypeFilter === 'LOCAL' ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: fulfillmentTypeFilter === 'LOCAL' ? '0 4px 14px rgba(201,168,76,0.25)' : 'none',
          }}
        >
          <Zap size={15} color="#e5c158" />
          <span>Local Express Orders</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(201,168,76,0.25)',
            color: 'var(--gold)',
            fontWeight: 800,
          }}>
            {kpis.local}
          </span>
          {kpis.unassignedLocal > 0 && (
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(231,76,60,0.25)',
              border: '1px solid rgba(231,76,60,0.5)',
              color: '#ff6b6b',
              fontWeight: 800,
            }}>
              🔴 {kpis.unassignedLocal} Unassigned
            </span>
          )}
        </button>

        {/* iThink Logistics Courier Orders */}
        <button
          type="button"
          onClick={() => { setFulfillmentTypeFilter('COURIER'); setPage(1); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 20px',
            borderRadius: '24px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            background: fulfillmentTypeFilter === 'COURIER'
              ? 'linear-gradient(135deg, rgba(59,130,246,0.28) 0%, rgba(15,23,42,0.95) 100%)'
              : 'rgba(255,255,255,0.04)',
            color: fulfillmentTypeFilter === 'COURIER' ? '#93c5fd' : 'var(--cream)',
            border: fulfillmentTypeFilter === 'COURIER' ? '1px solid rgba(59,130,246,0.7)' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: fulfillmentTypeFilter === 'COURIER' ? '0 4px 14px rgba(59,130,246,0.25)' : 'none',
          }}
        >
          <Send size={14} color="#93c5fd" />
          <span>iThink Logistics Express</span>
          <span style={{
            fontSize: '0.72rem',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'rgba(59,130,246,0.2)',
            color: '#93c5fd',
            fontWeight: 800,
          }}>
            {kpis.courier}
          </span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px', marginBottom: '26px' }}>
        {[
          { label: 'Total Orders', value: kpis.total, color: '#c9a84c' },
          { label: 'Local Express', value: `${kpis.local}${kpis.unassignedLocal > 0 ? ` (${kpis.unassignedLocal} unassigned)` : ''}`, color: '#e67e22' },
          { label: 'iThink Courier', value: kpis.courier, color: '#3498db' },
          { label: 'Processing', value: kpis.pending, color: '#f1c40f' },
          { label: 'In Transit', value: kpis.transit, color: '#9b59b6' },
          { label: 'Delivered', value: kpis.delivered, color: '#2ecc71' },
          { label: 'Cancelled', value: kpis.cancelled, color: '#e74c3c' },
          { label: 'Net Revenue', value: `₹${kpis.revenue.toLocaleString('en-IN')}`, color: '#c9a84c' },
        ].map((k) => (
          <div key={k.label} className="glass-panel" style={{ padding: '14px 16px', borderRadius: '10px', borderTop: `2px solid ${k.color}`, border: `1px solid ${k.color}22` }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '7px' }}>{k.label}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 700, color: k.color, fontFamily: 'var(--font-display)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: isMobile ? '12px 12px' : '18px 22px', marginBottom: '18px', border: '1px solid var(--glass-border)', boxSizing: 'border-box', overflow: 'hidden' }}>
        {isMobile ? (
          /* Mobile View: Two side-by-side dropdowns */
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Order Status
              </label>
              <select
                value={fulfillmentFilter}
                onChange={(e) => { setFulfillmentFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#f5efe6',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'auto',
                  boxSizing: 'border-box',
                }}
              >
                {FULFILLMENT_STATUSES.map((st) => (
                  <option key={st} value={st} style={{ background: '#1a120b', color: '#f5efe6' }}>
                    {st === 'ALL' ? 'All Statuses' : STATUS_LABELS[st] || st}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={{ fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, display: 'block', marginBottom: '5px' }}>
                Payment Status
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: '6px',
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: '#f5efe6',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'auto',
                  boxSizing: 'border-box',
                }}
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps} value={ps} style={{ background: '#1a120b', color: '#f5efe6' }}>
                    {ps === 'ALL' ? 'All Payments' : ps}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          /* Desktop View: Pill buttons */
          <>
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, display: 'block', marginBottom: '9px' }}>Order Status</span>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {FULFILLMENT_STATUSES.map((st) => {
                  const isActive = fulfillmentFilter === st;
                  const badge = FULFILLMENT_COLORS[st];
                  return (
                    <button key={st} type="button"
                      onClick={() => { setFulfillmentFilter(st); setPage(1); }}
                      style={{ padding: '5px 13px', borderRadius: '20px', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: isActive ? (badge?.bg || 'rgba(201,168,76,0.2)') : 'rgba(255,255,255,0.04)', color: isActive ? (badge?.color || 'var(--gold)') : 'var(--beige)', border: isActive ? `1px solid ${badge?.color || 'var(--gold)'}60` : '1px solid rgba(255,255,255,0.1)' }}>
                      {STATUS_LABELS[st] || st}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, display: 'block', marginBottom: '9px' }}>Payment Status</span>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {PAYMENT_STATUSES.map((ps) => {
                  const isActive = paymentFilter === ps;
                  const badge = PAYMENT_COLORS[ps];
                  return (
                    <button key={ps} type="button"
                      onClick={() => { setPaymentFilter(ps); setPage(1); }}
                      style={{ padding: '5px 13px', borderRadius: '20px', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', background: isActive ? (badge?.bg || 'rgba(201,168,76,0.15)') : 'rgba(255,255,255,0.04)', color: isActive ? (badge?.color || 'var(--gold)') : 'var(--beige)', border: isActive ? `1px solid ${badge?.color || 'var(--gold)'}60` : '1px solid rgba(255,255,255,0.1)' }}>
                      {ps}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', alignItems: isMobile ? 'stretch' : 'center' }}>
          <div style={{ flex: isMobile ? 'none' : '1 1 200px', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? '0' : '180px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-light)', pointerEvents: 'none', zIndex: 2 }} />
            <input type="text" placeholder="Search by Order ID, customer name or phone..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', paddingLeft: '34px', paddingRight: searchQuery ? '32px' : '10px', paddingTop: '8px', paddingBottom: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'var(--cream)', fontSize: '0.8rem', outline: 'none', boxSizing: 'border-box' }} />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setPage(1); }} style={{ position: 'absolute', right: '9px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--grey-light)', cursor: 'pointer', zIndex: 2 }}>
                <X size={13} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: isMobile ? '100%' : 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--grey-light)', whiteSpace: 'nowrap' }}>From:</span>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                style={{ width: '100%', minWidth: 0, padding: '6px 4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'var(--cream)', fontSize: '0.72rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--grey-light)', whiteSpace: 'nowrap' }}>To:</span>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                style={{ width: '100%', minWidth: 0, padding: '6px 4px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'var(--cream)', fontSize: '0.72rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' }} />
            </div>
            {(dateFrom || dateTo || searchQuery || fulfillmentTypeFilter !== 'ALL' || fulfillmentFilter !== 'ALL' || paymentFilter !== 'ALL') && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setSearchQuery(''); setFulfillmentTypeFilter('ALL'); setFulfillmentFilter('ALL'); setPaymentFilter('ALL'); setPage(1); }}
                style={{ padding: '6px 8px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', color: '#e74c3c', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Batch Operations Bar for Local Express Orders */}
      {selectedLocalOrderIds.length > 0 && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.18) 0%, rgba(26,13,0,0.85) 100%)',
            border: '1px solid var(--gold)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(201,168,76,0.2)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={17} color="var(--gold)" />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--gold)', fontSize: '0.92rem' }}>
                {selectedLocalOrderIds.length} Local Express Order{selectedLocalOrderIds.length > 1 ? 's' : ''} Selected
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--cream)', opacity: 0.85 }}>
                Assign all selected local orders to a chosen delivery executive at once.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSelectedLocalOrderIds([])}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: 'var(--cream)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => setBatchAssignModalOpen(true)}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                background: 'var(--gold)',
                border: 'none',
                color: '#0f0c0a',
                fontSize: '0.82rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(201,168,76,0.35)',
              }}
            >
              <Truck size={15} />
              Assign to Delivery Boy ({selectedLocalOrderIds.length})
            </button>
          </div>
        </div>
      )}

      {unassignedLocalOrders.length > 0 && selectedLocalOrderIds.length === 0 && (
        <div style={{ marginBottom: '14px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              setSelectedLocalOrderIds(unassignedLocalOrders.map((o: any) => o.id));
              setBatchAssignModalOpen(true);
            }}
            style={{
              padding: '7px 14px',
              borderRadius: '6px',
              background: 'rgba(201,168,76,0.12)',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'var(--gold)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} />
            Quick Batch Assign All Unassigned Local Orders ({unassignedLocalOrders.length})
          </button>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0', border: '1px solid var(--glass-border)', overflowX: 'auto', borderRadius: '10px' }}>
        {ordersLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--beige)' }}>
            <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 14px auto', display: 'block' }} />
            <p style={{ margin: 0 }}>Loading orders from database...</p>
          </div>
        ) : ordersList.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Package size={40} color="var(--grey-light)" style={{ margin: '0 auto 14px auto', display: 'block' }} />
            <p style={{ color: 'var(--grey-light)', margin: 0 }}>
              {totalCount === 0 && !searchQuery && !dateFrom && !dateTo && fulfillmentFilter === 'ALL' && paymentFilter === 'ALL'
                ? 'No orders found in database.'
                : 'No orders match the selected search or filter criteria.'}
            </p>
          </div>
        ) : (
          <>
            {isMobile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
                {ordersList.map((ord: any, idx: number) => {
                  const isCod = ord.paymentMethod === 'Cash on Delivery' || ord.paymentMethod === 'COD';
                  const currentPs = ord.payment_status || 'PENDING';
                  const currentSt = ord.status || 'Processing';
                  const allowedNext = ALLOWED_TRANSITIONS[currentSt] || [];
                  const fBadge = FULFILLMENT_COLORS[currentSt] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--cream)' };
                  const pBadge = PAYMENT_COLORS[currentPs] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--cream)' };
                  const isFinal = currentSt === 'Delivered' || currentSt === 'Cancelled';
                  const ordDate = ord.created_at || ord.date || 'Today';

                  return (
                    <div key={ord.id} className="glass-panel" style={{ padding: '16px', borderRadius: '8px', background: 'rgba(26,13,0,0.4)', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isLocalExpressOrder(ord) && (
                            <input
                              type="checkbox"
                              checked={selectedLocalOrderIds.includes(ord.id)}
                              onChange={() => toggleSelectLocalOrder(ord.id)}
                              title="Select order for batch assignment"
                              style={{ cursor: 'pointer', accentColor: 'var(--gold)', width: '16px', height: '16px', flexShrink: 0 }}
                            />
                          )}
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{ord.id}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)' }}>{ordDate?.slice(0, 10)}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '1rem' }}>
                          ₹{ord.total?.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.9rem' }}>
                          {ord.shipping_address?.name || ord.shippingAddress?.name || ord.customer_name || ord.name || '—'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>
                          {ord.shipping_address?.phone || ord.shippingAddress?.phone || ord.customer_phone || ord.phone || ''}
                        </div>
                      </div>

                      {/* Mobile Fulfillment Channel */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px', borderRadius: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <div>
                          {ord.fulfillment_type === 'LOCAL' || (!ord.fulfillment_type && !ord.shipping_provider?.includes('Courier')) ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 800, background: 'rgba(201,168,76,0.18)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
                              ⚡ LOCAL EXPRESS
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 800, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
                              <Send size={10} /> iThink Logistics
                            </span>
                          )}
                        </div>
                        <div>
                          {ord.fulfillment_type === 'LOCAL' || (!ord.fulfillment_type && !ord.shipping_provider?.includes('Courier')) ? (
                            ord.delivery_boy_name ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '0.74rem', color: '#2ecc71', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <UserCheck size={12} /> {ord.delivery_boy_name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setAssignModalOrder(ord)}
                                  style={{ padding: '2px 6px', fontSize: '0.65rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--cream)', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAssignModalOrder(ord)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#e74c3c', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                <Truck size={11} /> + Assign Boy
                              </button>
                            )
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {ord.tracking_number && (
                                <a
                                  href={ord.tracking_url || `https://ithinklogistics.com/track?awb=${ord.tracking_number}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontSize: '0.68rem', color: '#93c5fd', textDecoration: 'none', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(59,130,246,0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  <ExternalLink size={10} /> {ord.tracking_number}
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePushToIThink(ord.id)}
                                disabled={isPushingIThink === ord.id}
                                style={{ padding: '3px 8px', fontSize: '0.68rem', background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(30,58,138,0.7) 100%)', border: '1px solid rgba(59,130,246,0.5)', color: '#93c5fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                              >
                                {isPushingIThink === ord.id ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={10} />}
                                {ord.tracking_number ? 'Re-push' : 'Push iThink'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                        {ord.items?.slice(0, 2).map((it: any, i: number) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: 'var(--cream)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{it.product?.name || 'Product'}</span>
                            <span style={{ color: 'var(--gold)', fontWeight: 700, marginLeft: '8px' }}>×{it.quantity}</span>
                          </div>
                        ))}
                        {(ord.items?.length || 0) > 2 && <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)', textAlign: 'right' }}>+{ord.items.length - 2} more</div>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--beige)' }}>Payment: {ord.paymentMethod || '—'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: pBadge.bg, color: pBadge.color, border: `1px solid ${pBadge.color}50` }}>
                            {currentPs}
                          </span>
                          {isCod && currentPs === 'PENDING' && (
                            <button type="button" onClick={() => handleMarkCodPaid(ord)}
                              style={{ padding: '3px 8px', fontSize: '0.75rem', background: 'rgba(46,204,113,0.12)', border: '1px solid #2ecc7155', color: '#2ecc71', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: fBadge.bg, color: fBadge.color, border: `1px solid ${fBadge.color}50` }}>
                          {STATUS_LABELS[currentSt] || currentSt}
                        </span>
                        {!isFinal && allowedNext.length > 0 && (
                          <select value="" onChange={(e) => { if (e.target.value) handleQuickChange(ord, e.target.value); }}
                            style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.35)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', outline: 'none' }}>
                            <option value="">→ Change Status</option>
                            {allowedNext.map((st) => (
                              <option key={st} value={st}>{STATUS_LABELS[st] || st}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <button onClick={() => setViewingOrder(ord)}
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                        <Eye size={16} /> View Order Details
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <th style={{ padding: '13px 12px', textAlign: 'center', width: '38px', background: 'rgba(201,168,76,0.05)' }}>
                      <input
                        type="checkbox"
                        checked={localOrdersOnPage.length > 0 && selectedLocalOrderIds.length === localOrdersOnPage.length}
                        onChange={toggleSelectAllLocalOrders}
                        title="Select/deselect all local express orders on page"
                        style={{ cursor: 'pointer', accentColor: 'var(--gold)', width: '16px', height: '16px' }}
                      />
                    </th>
                    {['Order ID & Date', 'Customer', 'Fulfillment Channel', 'Items & Qty', 'Payment Method', 'Payment Status', 'Order Status', 'Total', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '13px 15px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--gold)', background: 'rgba(201,168,76,0.05)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordersList.map((ord: any, idx: number) => {
                    const isCod = ord.paymentMethod === 'Cash on Delivery' || ord.paymentMethod === 'COD';
                    const currentPs = ord.payment_status || 'PENDING';
                    const currentSt = ord.status || 'Processing';
                    const allowedNext = ALLOWED_TRANSITIONS[currentSt] || [];
                    const fBadge = FULFILLMENT_COLORS[currentSt] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--cream)' };
                    const pBadge = PAYMENT_COLORS[currentPs] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--cream)' };
                    const isFinal = currentSt === 'Delivered' || currentSt === 'Cancelled';
                    const ordDate = ord.created_at || ord.date || 'Today';

                    return (
                      <tr key={ord.id}
                        style={{
                          borderBottom: idx < ordersList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                          transition: 'background 0.2s',
                          background: selectedLocalOrderIds.includes(ord.id) ? 'rgba(201,168,76,0.08)' : 'transparent',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = selectedLocalOrderIds.includes(ord.id) ? 'rgba(201,168,76,0.14)' : 'rgba(255,255,255,0.022)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedLocalOrderIds.includes(ord.id) ? 'rgba(201,168,76,0.08)' : 'transparent')}
                      >
                        {/* Multi-Select Checkbox */}
                        <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {isLocalExpressOrder(ord) ? (
                            <input
                              type="checkbox"
                              checked={selectedLocalOrderIds.includes(ord.id)}
                              onChange={() => toggleSelectLocalOrder(ord.id)}
                              title="Select order for batch assignment"
                              style={{ cursor: 'pointer', accentColor: 'var(--gold)', width: '16px', height: '16px' }}
                            />
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        {/* Order ID & Date */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{ord.id}</div>
                          <div style={{ fontSize: '0.67rem', color: 'var(--grey-light)', marginTop: '2px' }}>{ordDate?.slice(0, 10)}</div>
                        </td>
                        {/* Customer */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                            {ord.shipping_address?.name || ord.shippingAddress?.name || ord.customer_name || ord.name || '—'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--beige)' }}>
                            {ord.shipping_address?.phone || ord.shippingAddress?.phone || ord.customer_phone || ord.phone || ''}
                          </div>
                        </td>
                        {/* Fulfillment Channel */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {ord.fulfillment_type === 'LOCAL' || (!ord.fulfillment_type && !ord.shipping_provider?.includes('Courier')) ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 800, background: 'rgba(201,168,76,0.18)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>
                                  ⚡ LOCAL EXPRESS
                                </span>
                              </div>
                              {ord.delivery_boy_name ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.74rem', color: '#2ecc71', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <UserCheck size={12} /> {ord.delivery_boy_name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setAssignModalOrder(ord)}
                                    title="Change assigned delivery executive"
                                    style={{ padding: '1px 6px', fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--cream)', borderRadius: '3px', cursor: 'pointer' }}
                                  >
                                    Change
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setAssignModalOrder(ord)}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.4)', color: '#e74c3c', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                                  >
                                    <Truck size={11} /> + Assign Executive
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 800, background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>
                                  <Send size={10} /> iThink Logistics
                                </span>
                              </div>
                              {ord.tracking_number ? (
                                <div style={{ marginTop: '3px' }}>
                                  <a
                                    href={ord.tracking_url || `https://ithinklogistics.com/track?awb=${ord.tracking_number}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: '0.67rem', color: '#93c5fd', textDecoration: 'none', background: 'rgba(59,130,246,0.12)', padding: '2px 6px', borderRadius: '3px', border: '1px solid rgba(59,130,246,0.3)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <ExternalLink size={9} /> {ord.tracking_number}
                                  </a>
                                </div>
                              ) : null}
                              <div style={{ marginTop: '3px' }}>
                                <button
                                  type="button"
                                  onClick={() => handlePushToIThink(ord.id)}
                                  disabled={isPushingIThink === ord.id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(30,58,138,0.7) 100%)',
                                    border: '1px solid rgba(59,130,246,0.4)',
                                    color: '#93c5fd',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isPushingIThink === ord.id ? <Loader2 size={9} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={9} />}
                                  {ord.tracking_number ? 'Re-push iThink' : 'Book on iThink'}
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Items */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle', maxWidth: '160px' }}>
                          {ord.items?.slice(0, 2).map((it: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.74rem', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, display: 'inline-block' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.product?.name || 'Product'}</span>
                              <span style={{ color: 'var(--gold)', fontWeight: 700, flexShrink: 0 }}>×{it.quantity}</span>
                            </div>
                          ))}
                          {(ord.items?.length || 0) > 2 && <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)' }}>+{ord.items.length - 2} more</div>}
                        </td>
                        {/* Payment Method */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--cream)' }}>{ord.paymentMethod || '—'}</span>
                        </td>
                        {/* Payment Status */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, background: pBadge.bg, color: pBadge.color, border: `1px solid ${pBadge.color}50`, whiteSpace: 'nowrap' }}>
                            {currentPs}
                          </span>
                          {isCod && currentPs === 'PENDING' && (
                            <button type="button" onClick={() => handleMarkCodPaid(ord)}
                              style={{ display: 'block', marginTop: '4px', padding: '2px 7px', fontSize: '0.63rem', background: 'rgba(46,204,113,0.12)', border: '1px solid #2ecc7155', color: '#2ecc71', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              Mark Paid
                            </button>
                          )}
                        </td>
                        {/* Order Status */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, background: fBadge.bg, color: fBadge.color, border: `1px solid ${fBadge.color}50`, whiteSpace: 'nowrap' }}>
                            {STATUS_LABELS[currentSt] || currentSt}
                          </span>
                          {!isFinal && allowedNext.length > 0 && (
                            <select value="" onChange={(e) => { if (e.target.value) handleQuickChange(ord, e.target.value); }}
                              style={{ display: 'block', width: '100%', marginTop: '4px', padding: '3px 6px', background: 'rgba(0,0,0,0.35)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '4px', fontSize: '0.68rem', cursor: 'pointer', outline: 'none' }}>
                              <option value="">→ Change</option>
                              {allowedNext.map((st) => (
                                <option key={st} value={st}>{STATUS_LABELS[st] || st}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        {/* Total */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.88rem' }}>₹{ord.total?.toLocaleString('en-IN')}</div>
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                          <button onClick={() => setViewingOrder(ord)}
                            style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                            <Eye size={11} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--beige)' }}>
          Showing {totalCount > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} orders
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalCount}
            itemsPerPage={limit}
            onPageChange={(p) => setPage(p)}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--beige)' }}>
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: 'var(--cream)', fontSize: '0.8rem' }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {viewingOrder && (
        <OrderDetailModal
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          onUpdateStatus={handleUpdateOrderStatus}
          addToast={addToast}
          onRefresh={fetchDbOrders}
        />
      )}

      {/* Assign Delivery Executive Modal (Single or Batch) */}
      {(assignModalOrder || batchAssignModalOpen) && (
        <AssignDeliveryModal
          order={assignModalOrder}
          initialSelectedOrders={
            assignModalOrder
              ? [assignModalOrder]
              : ordersList.filter((o: any) => selectedLocalOrderIds.includes(o.id))
          }
          availableLocalOrders={localOrdersOnPage}
          deliveryBoys={deliveryBoysList}
          onClose={() => {
            setAssignModalOrder(null);
            setBatchAssignModalOpen(false);
          }}
          onAssigned={() => {
            setSelectedLocalOrderIds([]);
            fetchDbOrders();
            fetchDeliveryBoys();
          }}
          addToast={addToast}
        />
      )}

      {/* Quick Confirm Dialog */}
      {pendingConfirm && (
        <QuickConfirmDialog
          orderId={pendingConfirm.order.id}
          newStatus={pendingConfirm.newStatus}
          isUpdating={isConfirming}
          onConfirm={confirmUpdate}
          onCancel={() => !isConfirming && setPendingConfirm(null)}
        />
      )}

      {/* Quick iThink Logistics Settings Modal */}
      {showIThinkSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIThinkSettingsModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'linear-gradient(135deg, rgba(22, 17, 13, 0.98), rgba(14, 10, 8, 0.98))',
              border: '1px solid rgba(59,130,246,0.5)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} color="#60a5fa" />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', fontSize: '1.2rem', margin: 0 }}>
                    iThink Logistics Courier API
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--beige)', margin: '2px 0 0 0' }}>
                    Multi-Carrier Courier Dispatch (BlueDart, Delhivery, DTDC, XpressBees)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIThinkSettingsModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--grey-light)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 700 }}>Connection Status</span>
                {ithinkConfig.configured ? (
                  <span style={{ fontSize: '0.72rem', color: '#2ecc71', fontWeight: 800, background: 'rgba(46,204,113,0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(46,204,113,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={11} /> API Connected &amp; Active
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#f39c12', fontWeight: 800, background: 'rgba(243,156,18,0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(243,156,18,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={11} /> Sandbox Simulation Mode
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '6px' }}>
                  iThink Logistics API Key
                </label>
                <input
                  type="text"
                  placeholder={ithinkConfig.api_key ? `Configured: ${ithinkConfig.api_key}` : 'e.g. itl_live_abc123...'}
                  value={ithinkApiKeyInput}
                  onChange={(e) => setIthinkApiKeyInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0e0a06', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '6px' }}>
                  iThink Logistics Secret Key
                </label>
                <input
                  type="password"
                  placeholder={ithinkConfig.configured ? '•••••••••••••••• (Active)' : 'Enter Secret Key'}
                  value={ithinkSecretKeyInput}
                  onChange={(e) => setIthinkSecretKeyInput(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: '#0e0a06', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <a
                href="https://ithinklogistics.com"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.75rem', color: '#93c5fd', textDecoration: 'underline' }}
              >
                Sign in to iThink Dashboard
              </a>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowIThinkSettingsModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--cream)', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingIThinkConfig}
                  onClick={handleSaveIThinkFromModal}
                  style={{ padding: '8px 18px', borderRadius: '6px', background: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(30,58,138,0.8) 100%)', border: '1px solid rgba(59,130,246,0.6)', color: '#93c5fd', fontWeight: 800, fontSize: '0.8rem', cursor: isSavingIThinkConfig ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Key size={13} />
                  {isSavingIThinkConfig ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderManagement;
