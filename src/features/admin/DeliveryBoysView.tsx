import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bike,
  Plus,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Shield,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  SlidersHorizontal,
  Check,
  ShieldCheck,
  Edit2,
  Eye,
  EyeOff,
  Navigation,
  ExternalLink,
  Trash2,
  Send,
  Zap,
  Key,
} from 'lucide-react';
import { deliveryService, CreateDeliveryBoyPayload } from '../../services/deliveryService';
import { adminService } from '../../services/adminService';
import type { DeliveryBoy } from '../../types';

interface DeliveryBoysViewProps {
  addToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  currentUserRole?: string;
  isSuperAdmin?: boolean;
}

interface PolicyOption {
  value: number;
  label: string;
}

const DEFAULT_ORDER_OPTIONS: PolicyOption[] = [
  { value: 1, label: '1 Order (Single-trip exclusive)' },
  { value: 2, label: '2 Orders (Light route)' },
  { value: 3, label: '3 Orders (Standard batch)' },
  { value: 4, label: '4 Orders (Medium density)' },
  { value: 5, label: '5 Orders (High volume cluster - Recommended)' },
  { value: 6, label: '6 Orders (Extended cluster)' },
  { value: 8, label: '8 Orders (Peak festive rush)' },
  { value: 10, label: '10 Orders (Maximum capacity)' },
];

const DEFAULT_RADIUS_OPTIONS: PolicyOption[] = [
  { value: 5, label: '5 KM (Inner City Express)' },
  { value: 8, label: '8 KM (Core Town)' },
  { value: 10, label: '10 KM (Standard Metropolitan)' },
  { value: 12, label: '12 KM (Urban Extension)' },
  { value: 15, label: '15 KM (Greater Urban Area - Default)' },
  { value: 20, label: '20 KM (Suburban Hub)' },
  { value: 25, label: '25 KM (Extended Suburban)' },
  { value: 30, label: '30 KM (Regional Perimeter)' },
];

export const DeliveryBoysView: React.FC<DeliveryBoysViewProps> = ({ addToast, currentUserRole, isSuperAdmin }) => {
  const navigate = useNavigate();

  // Role resolution: Only superadmin has privileges for Open Delivery Console and View & Update Policies
  const isSuper = useMemo(() => {
    if (typeof isSuperAdmin === 'boolean') return isSuperAdmin;
    if (currentUserRole) {
      const r = currentUserRole.toLowerCase();
      return r === 'superadmin' || r === 'super_admin';
    }
    const storedUser = localStorage.getItem('user') || localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        const r = (parsed.role || '').toLowerCase();
        if (r === 'superadmin' || r === 'super_admin') return true;
      } catch (e) {}
    }
    return false;
  }, [isSuperAdmin, currentUserRole]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('ALL');

  // Inline Create Form State (Expands in-place like Admin Management)
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateDeliveryBoyPayload>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Edit Delivery Executive State
  const [editingBoy, setEditingBoy] = useState<DeliveryBoy | null>(null);
  const [editForm, setEditForm] = useState<{
    full_name: string;
    email: string;
    phone: string;
    password: string;
    is_active: boolean;
  }>({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    is_active: true,
  });
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');

  // Superadmin Fleet Governance & Dispatch Policy Controls
  const [showPolicySettings, setShowPolicySettings] = useState<boolean>(false);
  const [fleetPolicies, setFleetPolicies] = useState({
    maxConcurrentOrders: 5,
    otpVerificationRequired: true,
    maxDeliveryRadiusKm: 15,
    autoAssignmentMode: 'MANUAL',
  });

  // Dynamic Standards for Dropdowns with Persistent Storage
  const [orderOptions, setOrderOptions] = useState<PolicyOption[]>(() => {
    try {
      const saved = localStorage.getItem('chovique_order_standards');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ORDER_OPTIONS;
  });
  const [showAddOrderModal, setShowAddOrderModal] = useState<boolean>(false);
  const [customOrderInput, setCustomOrderInput] = useState<string>('');

  const [radiusOptions, setRadiusOptions] = useState<PolicyOption[]>(() => {
    try {
      const saved = localStorage.getItem('chovique_radius_standards');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RADIUS_OPTIONS;
  });
  const [showAddRadiusModal, setShowAddRadiusModal] = useState<boolean>(false);
  const [customRadiusInput, setCustomRadiusInput] = useState<string>('');

  const [ithinkConfig, setIthinkConfig] = useState<{ configured: boolean; api_key?: string }>({ configured: false });
  const [ithinkApiKeyInput, setIthinkApiKeyInput] = useState<string>('');
  const [ithinkSecretKeyInput, setIthinkSecretKeyInput] = useState<string>('');
  const [isSavingIThink, setIsSavingIThink] = useState<boolean>(false);
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState<boolean>(false);
  const [isRadiusDropdownOpen, setIsRadiusDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    adminService.getIThinkConfig().then((cfg) => {
      if (cfg) setIthinkConfig(cfg);
    }).catch(() => {});
  }, []);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (addToast) {
      addToast(msg, type);
    } else {
      alert(msg);
    }
  };

  const fetchBoys = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const data = await deliveryService.getDeliveryBoys();
      setDeliveryBoys(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch delivery boys.';
      notify(msg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBoys();
  }, [fetchBoys]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setCreateError('Please complete all required fields (Name, Email, Password).');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }

    setIsCreating(true);
    setCreateError('');
    try {
      await deliveryService.createDeliveryBoy(createForm);
      notify(`Delivery boy account for ${createForm.full_name} created successfully!`, 'success');
      setIsCreateOpen(false);
      setCreateForm({ full_name: '', email: '', phone: '', password: '' });
      fetchBoys();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create delivery boy.';
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (boy: DeliveryBoy) => {
    try {
      await deliveryService.updateDeliveryBoy(boy.id, { is_active: !boy.is_active });
      notify(`${boy.full_name} is now ${!boy.is_active ? 'Active' : 'Inactive'}.`, 'success');
      setDeliveryBoys((prev) =>
        prev.map((b) => (b.id === boy.id ? { ...b, is_active: !b.is_active } : b))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update status.';
      notify(msg, 'error');
    }
  };

  const handleOpenEdit = (boy: DeliveryBoy) => {
    setEditingBoy(boy);
    setEditForm({
      full_name: boy.full_name || '',
      email: boy.email || '',
      phone: boy.phone || '',
      password: '',
      is_active: boy.is_active,
    });
    setShowEditPassword(false);
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoy) return;
    if (!editForm.full_name.trim() || !editForm.email.trim()) {
      setEditError('Full Name and Email are required.');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      setEditError('New password must be at least 6 characters if provided.');
      return;
    }

    setIsUpdating(true);
    setEditError('');
    try {
      const payload: {
        full_name: string;
        email: string;
        phone?: string;
        password?: string;
        is_active: boolean;
      } = {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
        is_active: editForm.is_active,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const updated = await deliveryService.updateDeliveryBoy(editingBoy.id, payload);
      notify(`Executive ${updated.full_name || editForm.full_name} details updated successfully!`, 'success');
      setEditingBoy(null);
      fetchBoys(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update delivery executive.';
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSavePolicies = () => {
    notify('Delivery operations and dispatch rules updated and enforced across system.', 'success');
    setShowPolicySettings(false);
  };

  // Delete Order Standard Handler
  const handleDeleteOrderStandard = (valToDelete: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (orderOptions.length <= 1) {
      notify('At least one order capacity standard must remain.', 'error');
      return;
    }
    const updated = orderOptions.filter((o) => o.value !== valToDelete);
    setOrderOptions(updated);
    try {
      localStorage.setItem('chovique_order_standards', JSON.stringify(updated));
    } catch {}
    if (fleetPolicies.maxConcurrentOrders === valToDelete) {
      setFleetPolicies((prev) => ({ ...prev, maxConcurrentOrders: updated[0].value }));
    }
    notify(`Removed ${valToDelete} Orders standard.`, 'info');
  };

  // Add Custom Order Standard Handler
  const handleAddCustomOrderStandard = () => {
    const val = parseInt(customOrderInput.trim(), 10);
    if (isNaN(val) || val <= 0) {
      notify('Please enter a valid positive number for order capacity.', 'error');
      return;
    }
    const exists = orderOptions.some((o) => o.value === val);
    if (!exists) {
      const newOption: PolicyOption = {
        value: val,
        label: `${val} Orders (Custom Standard)`,
      };
      const updated = [...orderOptions, newOption].sort((a, b) => a.value - b.value);
      setOrderOptions(updated);
      try {
        localStorage.setItem('chovique_order_standards', JSON.stringify(updated));
      } catch {}
    }
    setFleetPolicies((prev) => ({ ...prev, maxConcurrentOrders: val }));
    notify(`Added and selected ${val} Orders as standard!`, 'success');
    setCustomOrderInput('');
    setShowAddOrderModal(false);
  };

  // Delete Radius Standard Handler
  const handleDeleteRadiusStandard = (valToDelete: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (radiusOptions.length <= 1) {
      notify('At least one delivery radius standard must remain.', 'error');
      return;
    }
    const updated = radiusOptions.filter((r) => r.value !== valToDelete);
    setRadiusOptions(updated);
    try {
      localStorage.setItem('chovique_radius_standards', JSON.stringify(updated));
    } catch {}
    if (fleetPolicies.maxDeliveryRadiusKm === valToDelete) {
      setFleetPolicies((prev) => ({ ...prev, maxDeliveryRadiusKm: updated[0].value }));
    }
    notify(`Removed ${valToDelete} KM radius standard.`, 'info');
  };

  // Add Custom Radius Standard Handler
  const handleAddCustomRadiusStandard = () => {
    const val = parseFloat(customRadiusInput.trim());
    if (isNaN(val) || val <= 0) {
      notify('Please enter a valid positive number for delivery radius.', 'error');
      return;
    }
    const exists = radiusOptions.some((r) => r.value === val);
    if (!exists) {
      const newOption: PolicyOption = {
        value: val,
        label: `${val} KM (Custom Standard)`,
      };
      const updated = [...radiusOptions, newOption].sort((a, b) => a.value - b.value);
      setRadiusOptions(updated);
      try {
        localStorage.setItem('chovique_radius_standards', JSON.stringify(updated));
      } catch {}
    }
    setFleetPolicies((prev) => ({ ...prev, maxDeliveryRadiusKm: val }));
    notify(`Added and selected ${val} KM as delivery radius standard!`, 'success');
    setCustomRadiusInput('');
    setShowAddRadiusModal(false);
  };

  // Save iThink Logistics Credentials
  const handleSaveIThinkCredentials = async () => {
    if (!ithinkApiKeyInput.trim() && !ithinkSecretKeyInput.trim()) {
      notify('Please enter an iThink Logistics API Key or Secret Key.', 'error');
      return;
    }
    setIsSavingIThink(true);
    try {
      const res = await adminService.updateIThinkConfig({
        api_key: ithinkApiKeyInput.trim(),
        secret_key: ithinkSecretKeyInput.trim(),
      });
      setIthinkConfig({
        configured: res.configured,
        api_key: res.api_key_masked,
      });
      setIthinkApiKeyInput('');
      setIthinkSecretKeyInput('');
      notify('iThink Logistics API credentials successfully saved and activated!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save iThink Logistics credentials.';
      notify(msg, 'error');
    } finally {
      setIsSavingIThink(false);
    }
  };

  const filtered = deliveryBoys.filter((b) => {
    const matchesSearch =
      b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.phone && b.phone.includes(searchQuery));

    const matchesStatus =
      filterActive === 'ALL' ||
      (filterActive === 'ACTIVE' && b.is_active) ||
      (filterActive === 'INACTIVE' && !b.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-display, serif)',
              fontSize: '1.75rem',
              color: '#f5efe6',
              margin: '0 0 6px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(201,168,76,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(201,168,76,0.3)',
              }}
            >
              <Bike size={22} color="var(--gold)" />
            </div>
            Delivery Personnel Management
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0 }}>
            Manage delivery personnel, assign orders, configure dispatch policies, and monitor active fulfillment.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Dedicated Button to Launch Delivery Console — Super Admin only */}
          {isSuper && (
            <button
              onClick={() => navigate('/delivery')}
              title="Open Live Delivery Partner Console & Dashboard"
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(201,168,76,0.2) 0%, rgba(26,18,11,0.9) 100%)',
                border: '1px solid rgba(201,168,76,0.5)',
                color: '#f5d77f',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.84rem',
                boxShadow: '0 4px 14px rgba(201,168,76,0.2)',
                transition: 'all 0.2s ease',
              }}
            >
              <Navigation size={15} color="#c9a84c" />
              <span>Open Delivery Console</span>
              <ExternalLink size={13} style={{ opacity: 0.7 }} />
            </button>
          )}

          {/* View & Update Policies — Super Admin only */}
          {isSuper && (
            <button
              onClick={() => {
                setShowPolicySettings(!showPolicySettings);
                if (isCreateOpen) setIsCreateOpen(false);
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: showPolicySettings ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${showPolicySettings ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.12)'}`,
                color: showPolicySettings ? 'var(--gold)' : '#f5efe6',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.84rem',
                transition: 'all 0.2s ease',
              }}
            >
              <SlidersHorizontal size={15} />
              {showPolicySettings ? 'Close Policies' : 'View & Update Policies'}
            </button>
          )}

          <button
            onClick={() => fetchBoys()}
            disabled={isRefreshing}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f5efe6',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.84rem',
            }}
          >
            <RefreshCw size={15} className={isRefreshing ? 'spinning' : ''} />
            Refresh
          </button>

          <button
            onClick={() => {
              setIsCreateOpen(!isCreateOpen);
              if (showPolicySettings) setShowPolicySettings(false);
            }}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: isCreateOpen ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #c9a84c 0%, #a07d2c 100%)',
              border: isCreateOpen ? '1px solid rgba(255,255,255,0.15)' : 'none',
              color: isCreateOpen ? '#f5efe6' : '#0f0c0a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontWeight: 800,
              fontSize: '0.86rem',
              boxShadow: isCreateOpen ? 'none' : '0 4px 14px rgba(201,168,76,0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            {isCreateOpen ? <X size={16} /> : <Plus size={16} />}
            {isCreateOpen ? 'Close Form' : 'Add Delivery Executive'}
          </button>
        </div>
      </div>

      {/* ─── Expandable Inline Register Executive Panel ─────────────────── */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="glass-panel"
              style={{
                background: 'linear-gradient(135deg, rgba(26, 18, 11, 0.98), rgba(16, 12, 9, 0.98))',
                border: '1px solid rgba(201, 168, 76, 0.35)',
                borderRadius: '14px',
                padding: '24px 28px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(201,168,76,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(201,168,76,0.3)',
                    }}
                  >
                    <Bike size={18} color="var(--gold)" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.25rem', color: '#f5efe6', margin: 0 }}>
                      Register Delivery Executive
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                      Add credentials for an internal delivery boy. They can immediately log in to the Delivery Portal and deliver assigned orders.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {createError && (
                <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.35)', color: '#e74c3c', fontSize: '0.82rem', fontWeight: 600, marginBottom: '16px' }}>
                  ⚠️ {createError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={createForm.full_name}
                      onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Email Address (Login Username) *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul.delivery@chovique.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Mobile Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Login Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="At least 6 characters"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 42px 10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(14,11,9,0.9)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: showPassword ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px',
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
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
                    disabled={isCreating}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '8px',
                      background: 'var(--gold)',
                      border: 'none',
                      color: '#0e0a06',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isCreating ? 'not-allowed' : 'pointer',
                      opacity: isCreating ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 10px rgba(201,168,76,0.3)',
                    }}
                  >
                    <Bike size={16} />
                    {isCreating ? 'Creating Executive...' : 'Register Executive'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Expandable Fleet Governance & Policies Panel (Super Admin only) ─── */}
      <AnimatePresence>
        {isSuper && showPolicySettings && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="glass-panel"
              style={{
                background: 'rgba(22, 17, 14, 0.95)',
                border: '1px solid rgba(201, 168, 76, 0.3)',
                borderRadius: '14px',
                padding: '22px 26px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: 'rgba(201,168,76,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(201,168,76,0.3)',
                    }}
                  >
                    <SlidersHorizontal size={16} color="var(--gold)" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.15rem', color: '#f5efe6', margin: 0 }}>
                      Delivery Operations &amp; Dispatch Rules
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                      Configure dispatch limits, customer OTP enforcement, delivery radius standards, and third-party iThink Logistics courier integration.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPolicySettings(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                {/* 1. Max Concurrent Orders Dropdown with Integrated Delete & Add */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--gold)', fontWeight: 700 }}>
                      Max Concurrent Orders / Executive
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddOrderModal(!showAddOrderModal);
                        setIsOrderDropdownOpen(true);
                      }}
                      style={{
                        background: showAddOrderModal ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.35)',
                        color: 'var(--gold)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      Add Standard
                    </button>
                  </div>

                  {/* Custom Dropdown Trigger */}
                  <div
                    onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#15110d',
                      border: `1px solid ${isOrderDropdownOpen ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '6px',
                      color: 'var(--cream)',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {orderOptions.find((o) => o.value === fleetPolicies.maxConcurrentOrders)?.label ||
                        `${fleetPolicies.maxConcurrentOrders} Orders`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)', marginLeft: '8px' }}>
                      {isOrderDropdownOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Interactive Dropdown Menu with Option Selection & Trash Delete Buttons */}
                  {isOrderDropdownOpen && (
                    <div
                      style={{
                        marginTop: '6px',
                        background: '#120d09',
                        border: '1px solid rgba(201,168,76,0.35)',
                        borderRadius: '8px',
                        padding: '6px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      }}
                    >
                      {orderOptions.map((opt) => {
                        const isSelected = opt.value === fleetPolicies.maxConcurrentOrders;
                        return (
                          <div
                            key={opt.value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              background: isSelected ? 'rgba(201,168,76,0.18)' : 'transparent',
                              marginBottom: '3px',
                              gap: '6px',
                            }}
                          >
                            <div
                              onClick={() => {
                                setFleetPolicies({ ...fleetPolicies, maxConcurrentOrders: opt.value });
                                setIsOrderDropdownOpen(false);
                              }}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                color: isSelected ? '#f5d77f' : '#e0d8cf',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {isSelected ? <Check size={13} color="var(--gold)" /> : <span style={{ width: '13px' }} />}
                              <span>{opt.label}</span>
                            </div>

                            {/* Delete Standard Button inside Dropdown */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteOrderStandard(opt.value, e)}
                              title={`Delete standard: ${opt.label}`}
                              style={{
                                background: 'rgba(231,76,60,0.12)',
                                border: '1px solid rgba(231,76,60,0.3)',
                                color: '#e74c3c',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddOrderModal(true)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--gold)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={12} /> Add Custom Standard...
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Add Order Standard Form */}
                  {showAddOrderModal && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        background: 'rgba(26,18,11,0.95)',
                        border: '1px solid rgba(201,168,76,0.4)',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        Add Custom Order Standard:
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          placeholder="e.g. 7"
                          value={customOrderInput}
                          onChange={(e) => setCustomOrderInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomOrderStandard();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#0e0a06',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomOrderStandard}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--gold)',
                            border: 'none',
                            color: '#0e0a06',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddOrderModal(false)}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'var(--cream)',
                            fontSize: '0.78rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <span style={{ fontSize: '0.7rem', color: 'var(--beige)', marginTop: '4px', display: 'block' }}>
                    Controls maximum simultaneous deliveries a single executive can accept from store.
                  </span>
                </div>

                {/* 2. Mandatory OTP Verification Toggle */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '6px' }}>
                    Customer Doorstep OTP Verification
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="checkbox"
                      id="policy_otp_toggle"
                      checked={fleetPolicies.otpVerificationRequired}
                      onChange={(e) => setFleetPolicies({ ...fleetPolicies, otpVerificationRequired: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="policy_otp_toggle" style={{ fontSize: '0.82rem', color: 'var(--cream)', cursor: 'pointer' }}>
                      Mandatory 6-Digit OTP Verification
                    </label>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--beige)', marginTop: '6px', display: 'block' }}>
                    Delivery boy cannot mark order as Delivered without customer providing active OTP.
                  </span>
                </div>

                {/* 3. Delivery Radius Dropdown with Integrated Delete & Add */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.76rem', color: 'var(--gold)', fontWeight: 700 }}>
                      Local Express Service Radius
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddRadiusModal(!showAddRadiusModal);
                        setIsRadiusDropdownOpen(true);
                      }}
                      style={{
                        background: showAddRadiusModal ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.35)',
                        color: 'var(--gold)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={12} />
                      Add Standard
                    </button>
                  </div>

                  {/* Custom Radius Dropdown Trigger */}
                  <div
                    onClick={() => setIsRadiusDropdownOpen(!isRadiusDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#15110d',
                      border: `1px solid ${isRadiusDropdownOpen ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`,
                      borderRadius: '6px',
                      color: 'var(--cream)',
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {radiusOptions.find((r) => r.value === fleetPolicies.maxDeliveryRadiusKm)?.label ||
                        `${fleetPolicies.maxDeliveryRadiusKm} KM`}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gold)', marginLeft: '8px' }}>
                      {isRadiusDropdownOpen ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Interactive Radius Dropdown Menu with Option Selection & Trash Delete Buttons */}
                  {isRadiusDropdownOpen && (
                    <div
                      style={{
                        marginTop: '6px',
                        background: '#120d09',
                        border: '1px solid rgba(201,168,76,0.35)',
                        borderRadius: '8px',
                        padding: '6px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      }}
                    >
                      {radiusOptions.map((opt) => {
                        const isSelected = opt.value === fleetPolicies.maxDeliveryRadiusKm;
                        return (
                          <div
                            key={opt.value}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              background: isSelected ? 'rgba(201,168,76,0.18)' : 'transparent',
                              marginBottom: '3px',
                              gap: '6px',
                            }}
                          >
                            <div
                              onClick={() => {
                                setFleetPolicies({ ...fleetPolicies, maxDeliveryRadiusKm: opt.value });
                                setIsRadiusDropdownOpen(false);
                              }}
                              style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                color: isSelected ? '#f5d77f' : '#e0d8cf',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {isSelected ? <Check size={13} color="var(--gold)" /> : <span style={{ width: '13px' }} />}
                              <span>{opt.label}</span>
                            </div>

                            {/* Delete Radius Standard Button inside Dropdown */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRadiusStandard(opt.value, e)}
                              title={`Delete standard: ${opt.label}`}
                              style={{
                                background: 'rgba(231,76,60,0.12)',
                                border: '1px solid rgba(231,76,60,0.3)',
                                color: '#e74c3c',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}

                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddRadiusModal(true)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--gold)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={12} /> Add Custom Radius...
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Add Radius Standard Form */}
                  {showAddRadiusModal && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px 12px',
                        background: 'rgba(26,18,11,0.95)',
                        border: '1px solid rgba(201,168,76,0.4)',
                        borderRadius: '6px',
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: 'var(--cream)', fontWeight: 600, marginBottom: '6px' }}>
                        Add Custom Radius Standard (in KM):
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="e.g. 20"
                          value={customRadiusInput}
                          onChange={(e) => setCustomRadiusInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomRadiusStandard();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            background: '#0e0a06',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomRadiusStandard}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--gold)',
                            border: 'none',
                            color: '#0e0a06',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddRadiusModal(false)}
                          style={{
                            padding: '6px 10px',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'var(--cream)',
                            fontSize: '0.78rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <span style={{ fontSize: '0.7rem', color: 'var(--beige)', marginTop: '4px', display: 'block' }}>
                    Distances exceeding this radius route to Pan-India Courier delivery automatically.
                  </span>
                </div>

                {/* 4. iThink Logistics Courier API Key & Secret Integration */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Send size={15} color="var(--gold)" />
                      <label style={{ fontSize: '0.78rem', color: 'var(--gold)', fontWeight: 700 }}>
                        iThink Logistics Courier API
                      </label>
                    </div>
                    {ithinkConfig.configured ? (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#2ecc71',
                          background: 'rgba(46,204,113,0.15)',
                          border: '1px solid rgba(46,204,113,0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <CheckCircle size={10} /> Active &amp; Live
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          color: '#f39c12',
                          background: 'rgba(243,156,18,0.15)',
                          border: '1px solid rgba(243,156,18,0.3)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Zap size={10} /> Demo Mode
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <input
                        type="text"
                        placeholder={ithinkConfig.api_key ? `Key: ${ithinkConfig.api_key}` : 'Enter iThink API Key'}
                        value={ithinkApiKeyInput}
                        onChange={(e) => setIthinkApiKeyInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          background: '#0e0a06',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.78rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        placeholder={ithinkConfig.configured ? '•••••••••••• (Secret Configured)' : 'Enter iThink Secret Key'}
                        value={ithinkSecretKeyInput}
                        onChange={(e) => setIthinkSecretKeyInput(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          background: '#0e0a06',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.78rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a
                        href="https://ithinklogistics.com"
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'underline' }}
                      >
                        Get iThink API Keys
                      </a>
                      <button
                        type="button"
                        onClick={handleSaveIThinkCredentials}
                        disabled={isSavingIThink}
                        style={{
                          padding: '5px 12px',
                          background: 'linear-gradient(135deg, rgba(201,168,76,0.3) 0%, rgba(26,18,11,0.9) 100%)',
                          border: '1px solid rgba(201,168,76,0.5)',
                          borderRadius: '4px',
                          color: '#f5d77f',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: isSavingIThink ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Key size={11} />
                        {isSavingIThink ? 'Saving...' : 'Save Keys'}
                      </button>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--beige)', marginTop: '6px', display: 'block' }}>
                    Courier orders directly dispatch via BlueDart, Delhivery, XpressBees &amp; DTDC.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSavePolicies}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: 'var(--gold)',
                    border: 'none',
                    color: '#0e0a06',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Check size={14} />
                  Save Policy Configuration
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ background: 'rgba(22, 17, 14, 0.9)', border: '1px solid rgba(201, 168, 76, 0.2)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#c9a84c', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL EXECUTIVES</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f5efe6', marginTop: '4px' }}>{deliveryBoys.length}</div>
        </div>

        <div style={{ background: 'rgba(22, 17, 14, 0.9)', border: '1px solid rgba(46, 204, 113, 0.2)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#2ecc71', fontWeight: 700, textTransform: 'uppercase' }}>ACTIVE & ON DUTY</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2ecc71', marginTop: '4px' }}>
            {deliveryBoys.filter((b) => b.is_active).length}
          </div>
        </div>

        <div style={{ background: 'rgba(22, 17, 14, 0.9)', border: '1px solid rgba(52, 152, 219, 0.2)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '0.74rem', color: '#3498db', fontWeight: 700, textTransform: 'uppercase' }}>ORDERS CURRENTLY EN ROUTE</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3498db', marginTop: '4px' }}>
            {deliveryBoys.reduce((acc, b) => acc + (b.active_orders || 0), 0)}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 34px',
              borderRadius: '8px',
              background: 'rgba(22, 17, 14, 0.8)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              fontSize: '0.84rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', background: 'rgba(14,11,9,0.7)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterActive(mode)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: filterActive === mode ? '#c9a84c' : 'transparent',
                border: 'none',
                color: filterActive === mode ? '#0f0c0a' : 'rgba(255,255,255,0.7)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#c9a84c' }}>
          Loading delivery executives...
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(22, 17, 14, 0.95)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(201, 168, 76, 0.2)', background: 'rgba(201, 168, 76, 0.05)' }}>
                <th style={{ padding: '12px 18px', textAlign: 'left', color: '#c9a84c', fontWeight: 700 }}>Executive</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', color: '#c9a84c', fontWeight: 700 }}>Contact Info</th>
                <th style={{ padding: '12px 18px', textAlign: 'center', color: '#c9a84c', fontWeight: 700 }}>Active Deliveries</th>
                <th style={{ padding: '12px 18px', textAlign: 'center', color: '#c9a84c', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', color: '#c9a84c', fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((boy) => (
                <tr
                  key={boy.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, rgba(201,168,76,0.3), rgba(26,17,14,0.8))',
                          border: '1px solid rgba(201,168,76,0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#c9a84c',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                        }}
                      >
                        {boy.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .substring(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f5efe6' }}>{boy.full_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                          ID: {boy.id.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f5efe6', marginBottom: '3px' }}>
                      <Mail size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                      <span>{boy.email}</span>
                    </div>
                    {boy.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem' }}>
                        <Phone size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                        <span>{boy.phone}</span>
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: (boy.active_orders || 0) > 0 ? 'rgba(52, 152, 219, 0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${(boy.active_orders || 0) > 0 ? 'rgba(52, 152, 219, 0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: (boy.active_orders || 0) > 0 ? '#3498db' : 'rgba(255,255,255,0.4)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                      }}
                    >
                      {boy.active_orders || 0} In Transit
                    </span>
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: boy.is_active ? 'rgba(46, 204, 113, 0.12)' : 'rgba(231, 76, 60, 0.12)',
                        border: `1px solid ${boy.is_active ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`,
                        color: boy.is_active ? '#2ecc71' : '#e74c3c',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      {boy.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenEdit(boy)}
                        title="Edit Executive Details"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(201, 168, 76, 0.12)',
                          border: '1px solid rgba(201, 168, 76, 0.35)',
                          color: '#c9a84c',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.2s',
                        }}
                      >
                        <Edit2 size={13} />
                        Edit
                      </button>

                      <button
                        onClick={() => handleToggleActive(boy)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: boy.is_active ? 'rgba(231, 76, 60, 0.12)' : 'rgba(46, 204, 113, 0.12)',
                          border: `1px solid ${boy.is_active ? 'rgba(231, 76, 60, 0.3)' : 'rgba(46, 204, 113, 0.3)'}`,
                          color: boy.is_active ? '#e74c3c' : '#2ecc71',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {boy.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                        {boy.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.6)' }}>
              No delivery executives found matching your filter criteria.
            </div>
          )}
        </div>
      )}

      {/* ─── Edit Delivery Executive Modal ─────────────────────────────── */}
      <AnimatePresence>
        {editingBoy && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.82)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100,
              padding: '20px',
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'linear-gradient(135deg, rgba(26, 18, 11, 0.99), rgba(16, 12, 9, 0.99))',
                border: '1px solid rgba(201, 168, 76, 0.45)',
                borderRadius: '16px',
                padding: '28px 32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
                color: '#f5efe6',
                position: 'relative',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(201,168,76,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(201,168,76,0.3)',
                    }}
                  >
                    <Edit2 size={20} color="var(--gold)" />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.3rem', color: '#f5efe6', margin: 0 }}>
                      Edit Delivery Executive
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                      Update profile details, credentials, or active status.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBoy(null)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {editError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(231,76,60,0.15)',
                    border: '1px solid rgba(231,76,60,0.35)',
                    color: '#e74c3c',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    marginBottom: '18px',
                  }}
                >
                  ⚠️ {editError}
                </div>
              )}

              <form onSubmit={handleEditSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Email Address (Login Username) *
                    </label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '6px' }}>
                      Mobile Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.9)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        color: '#fff',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700 }}>
                        Change Password
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                        (Leave blank to keep existing)
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        placeholder="Enter new password (optional, min 6 chars)"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 42px 10px 12px',
                          borderRadius: '8px',
                          background: 'rgba(14,11,9,0.9)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        title={showEditPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: showEditPassword ? 'var(--gold)' : 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '4px',
                        }}
                      >
                        {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9a84c', fontWeight: 700, marginBottom: '8px' }}>
                      Account Status
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(14,11,9,0.7)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                        style={{ accentColor: 'var(--gold)', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.84rem', color: editForm.is_active ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                        {editForm.is_active ? 'Active & Eligible for Order Assignments' : 'Inactive (Suspended from Fulfillment)'}
                      </span>
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingBoy(null)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.12)',
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
                    disabled={isUpdating}
                    style={{
                      padding: '10px 22px',
                      borderRadius: '8px',
                      background: 'var(--gold)',
                      border: 'none',
                      color: '#0e0a06',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: isUpdating ? 'not-allowed' : 'pointer',
                      opacity: isUpdating ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
