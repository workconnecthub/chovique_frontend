import React, { useState, useEffect } from 'react';
import { Plus, Tag, Edit2, Trash2, Calendar, Clock, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { CreateCouponView } from './CreateCouponView';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';

interface CouponsManagementViewProps {
  addToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const CouponsManagementView: React.FC<CouponsManagementViewProps> = ({ addToast }) => {
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCouponForm, setShowCreateCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);
  const [couponsPage, setCouponsPage] = useState(1);

  const notify = (type: 'success' | 'error' | 'info', msg: string, title?: string) => {
    if (addToast) {
      addToast(type, msg, title);
    }
  };

  const loadCoupons = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getCoupons();
      setCouponsList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load coupons:', err);
      notify('error', 'Failed to fetch coupons from server.', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleDeleteCoupon = async (code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) {
      return;
    }
    try {
      await adminService.deleteCoupon(code);
      setCouponsList((prev) => prev.filter((c) => c.code !== code));
      notify('success', `Coupon "${code}" deleted successfully.`);
    } catch (err: any) {
      console.error('Failed to delete coupon:', err);
      notify('error', `Failed to delete coupon "${code}".`);
    }
  };

  const handleUpdateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;
    try {
      const payload = {
        description: editingCoupon.description,
        discount_percent: editingCoupon.discount_percent,
        discount_amount: editingCoupon.discount_amount,
        expires_at: editingCoupon.expires_at,
        is_active: editingCoupon.is_active,
      };
      const updated = await adminService.updateCoupon(editingCoupon.code, payload);
      setCouponsList((prev) =>
        prev.map((c) => (c.code === editingCoupon.code ? { ...c, ...updated } : c))
      );
      setEditingCoupon(null);
      notify('success', `Coupon "${editingCoupon.code}" updated successfully.`);
    } catch (err: any) {
      console.error('Failed to update coupon:', err);
      notify('error', `Failed to update coupon "${editingCoupon.code}".`);
    }
  };

  if (showCreateCouponForm) {
    return (
      <CreateCouponView
        addToast={notify}
        onAddCoupon={async (payload) => {
          const created = await adminService.createCoupon(payload);
          setCouponsList([created, ...couponsList]);
          setShowCreateCouponForm(false);
          notify('success', `Coupon "${payload.code}" created successfully!`);
        }}
        onCancel={() => setShowCreateCouponForm(false)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <span style={{ color: 'rgba(201, 168, 76, 0.85)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            — PROMOTIONAL SYSTEM
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', color: 'var(--cream)', margin: 0, fontWeight: 700 }}>
            Coupons &amp; Discounts
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--beige)', marginTop: '4px', margin: 0 }}>
            Manage discount coupons, influencer promo codes, and precise expiration limits (days, hours, minutes)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="glass"
            onClick={loadCoupons}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '9px 14px' }}
          >
            <RefreshCw size={15} className={isLoading ? 'spin' : ''} /> Refresh
          </Button>
          <Button
            variant="gold"
            glow
            onClick={() => setShowCreateCouponForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
          >
            <Plus size={18} />
            Create Coupon
          </Button>
        </div>
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

        {isLoading ? (
          <p style={{ color: 'var(--beige)', fontSize: '0.9rem', padding: '20px 0' }}>Loading coupons...</p>
        ) : couponsList.length === 0 ? (
          <p style={{ color: 'var(--beige)', fontSize: '0.9rem', padding: '20px 0' }}>No coupons found. Click "Create Coupon" to create one.</p>
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
                const isExpired =
                  c.status === 'EXPIRED' ||
                  c.status === 'Expired' ||
                  (c.usage_limit > 0 && (c.usage_count || 0) >= c.usage_limit) ||
                  (c.expires_at ? new Date(c.expires_at) < new Date() : false);
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
                      border: '1px solid rgba(var(--gold-rgb), 0.25)',
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

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#2ecc71', fontWeight: 700 }}>
                          {c.discount_type === 'PERCENTAGE' ? `${c.discount_percent}% OFF` : c.discount_type === 'FIXED_AMOUNT' ? `₹${c.discount_amount} OFF` : 'FREE SHIPPING'}
                          <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', marginLeft: '8px', fontWeight: 400 }}>
                            (Used: {c.usage_count || 0})
                          </span>
                        </div>
                        {c.expires_at && (
                          <span style={{ fontSize: '0.74rem', color: isExpired ? '#e74c3c' : 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {new Date(c.expires_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        onClick={() => setEditingCoupon({ ...c })}
                        style={{ flex: 1, background: 'rgba(var(--gold-rgb), 0.12)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: '6px', cursor: 'pointer', padding: '6px 10px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', border: '1px solid var(--gold)', background: 'rgba(20,10,0,0.96)', borderRadius: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '16px' }}>
              Edit Coupon: {editingCoupon.code}
            </h3>
            <form onSubmit={handleUpdateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                label="Description"
                value={editingCoupon.description || ''}
                onChange={(e) => setEditingCoupon({ ...editingCoupon, description: e.target.value })}
                required
              />
              <Input
                label="Discount Percent (%)"
                type="number"
                min={1}
                max={100}
                value={editingCoupon.discount_percent || 0}
                onChange={(e) => setEditingCoupon({ ...editingCoupon, discount_percent: parseFloat(e.target.value) || 0 })}
                required
              />
              <Input
                label="Expiry Date &amp; Time (Required)"
                type="datetime-local"
                value={editingCoupon.expires_at ? editingCoupon.expires_at.slice(0, 16) : ''}
                onChange={(e) => setEditingCoupon({ ...editingCoupon, expires_at: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '-4px' }}>
                {[
                  { label: '+30m', mins: 30 },
                  { label: '+1h', mins: 60 },
                  { label: '+6h', mins: 360 },
                  { label: '+12h', mins: 720 },
                  { label: '+24h (1d)', mins: 1440 },
                  { label: '+3d', mins: 4320 },
                  { label: '+7d', mins: 10080 },
                  { label: '+30d', mins: 43200 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const target = new Date(Date.now() + p.mins * 60 * 1000);
                      const pad = (n: number) => n.toString().padStart(2, '0');
                      const fmt = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
                      setEditingCoupon({ ...editingCoupon, expires_at: fmt });
                    }}
                    style={{
                      background: 'rgba(201, 168, 76, 0.12)',
                      border: '1px solid rgba(201, 168, 76, 0.35)',
                      color: 'var(--gold)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="modal-coupon-active-check"
                  checked={editingCoupon.is_active ?? true}
                  onChange={(e) => setEditingCoupon({ ...editingCoupon, is_active: e.target.checked })}
                />
                <label htmlFor="modal-coupon-active-check" style={{ color: 'var(--cream)', fontSize: '0.88rem', cursor: 'pointer' }}>
                  Active Status (Check to enable coupon)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
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
  );
};
