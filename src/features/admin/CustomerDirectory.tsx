import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Award,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  Trash2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  ShieldCheck,
  ExternalLink,
  Compass,
  UserPlus,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { exportToCSV } from '../../utils/exportCsv';
import { getImageUrl } from '../../utils/imageUrl';
import { SystemUser } from '../../types';

interface CustomerAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: number;
  fontSize?: string;
  border?: string;
  glow?: boolean;
}

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  avatarUrl,
  name,
  size = 40,
  fontSize = '0.82rem',
  border = '1px solid rgba(201, 168, 76, 0.4)',
  glow = false,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const initials = name
    ? name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'CU';

  const isUrlLike = (val?: string | null) => {
    if (!val || typeof val !== 'string') return false;
    const v = val.trim();
    return (
      v.startsWith('http://') ||
      v.startsWith('https://') ||
      v.startsWith('data:') ||
      v.startsWith('blob:') ||
      v.startsWith('/') ||
      v.includes('.jpg') ||
      v.includes('.jpeg') ||
      v.includes('.png') ||
      v.includes('.webp') ||
      v.includes('googleusercontent.com') ||
      v.includes('cloudinary.com') ||
      v.includes('/static/') ||
      v.includes('avatars')
    );
  };

  const resolved = isUrlLike(avatarUrl) && !hasError ? getImageUrl(avatarUrl) : null;

  if (resolved) {
    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          border,
          boxShadow: glow ? '0 0 16px rgba(201, 168, 76, 0.45)' : '0 2px 8px rgba(0, 0, 0, 0.35)',
          background: 'rgba(20, 16, 13, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <img
          src={resolved}
          alt={name || 'Customer Avatar'}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        flexShrink: 0,
        background: glow
          ? 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)'
          : 'linear-gradient(135deg, #c9a84c 0%, #8a7028 100%)',
        color: '#0a0806',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize,
        fontFamily: 'var(--font-display)',
        border,
        boxShadow: glow ? '0 0 16px rgba(201, 168, 76, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.25)',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  );
};

export const extractCustomerAvatar = (cust: any): string | null => {
  if (!cust) return null;
  const candidates = [
    cust.avatar_url,
    cust.avatarUrl,
    cust.profile?.avatarUrl,
    cust.profile?.avatar_url,
    cust.user?.avatar_url,
    cust.user?.avatarUrl,
    cust.user?.profile?.avatarUrl,
    cust.user?.profile?.avatar_url,
    cust.avatar,
  ];
  for (const c of candidates) {
    if (
      typeof c === 'string' &&
      (c.startsWith('http://') ||
        c.startsWith('https://') ||
        c.startsWith('data:') ||
        c.startsWith('blob:') ||
        c.startsWith('/') ||
        c.includes('.jpg') ||
        c.includes('.jpeg') ||
        c.includes('.png') ||
        c.includes('.webp') ||
        c.includes('googleusercontent.com') ||
        c.includes('cloudinary.com') ||
        c.includes('/static/') ||
        c.includes('avatars'))
    ) {
      return c;
    }
  }
  return null;
};

interface CustomerDirectoryProps {
  systemUsers?: SystemUser[];
  adminOrders?: any[];
  addToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onRefreshUsers?: () => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  adminOrders,
  addToast,
  onRefreshUsers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const limit = 5; // Exactly 5 customers per page
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 860);

  const reqIdRef = useRef(0);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 860);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Debounce search query input to avoid race condition and lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersData, setCustomersData] = useState<any>(null);

  // Inspector & detail loading states
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'coins' | 'tickets'>('profile');

  // Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'toggle_status' | 'delete';
    customer: any;
    title: string;
    message: string;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Add Customer Modal State
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [addCustomerForm, setAddCustomerForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    gender: '',
    house_number: '',
    street: '',
    area: '',
    landmark: '',
    city: '',
    district: '',
    state: 'Telangana',
    zip: '',
    is_active: true,
  });

  // Fetch paginated customer directory & summary statistics from DB
  const fetchCustomersList = useCallback(async () => {
    const currentReqId = ++reqIdRef.current;
    setCustomersLoading(true);
    try {
      const res = await adminService.getCustomers({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter,
        page,
        limit,
      });

      // Discard stale out-of-order response
      if (currentReqId !== reqIdRef.current) return;

      setCustomersData(res);

      if (res.items && res.items.length > 0) {
        setSelectedCustomerId((prevId) => {
          if (prevId && res.items.some((c: any) => c.id === prevId)) {
            return prevId;
          }
          return res.items[0].id;
        });
      } else {
        setSelectedCustomerId(null);
        setCustomerDetails(null);
      }
    } catch (err: any) {
      if (currentReqId === reqIdRef.current) {
        console.error('Failed to fetch customers from database:', err);
        addToast('error', err?.detail || err?.message || 'Failed to load customers from database.', 'Error');
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setCustomersLoading(false);
      }
    }
  }, [debouncedSearch, statusFilter, page, limit, addToast]);

  useEffect(() => {
    fetchCustomersList();
  }, [fetchCustomersList]);

  // Fetch full details when selected customer changes
  useEffect(() => {
    if (!selectedCustomerId) return;
    setLoadingDetails(true);
    adminService
      .getCustomerDetails(selectedCustomerId)
      .then((details) => {
        setCustomerDetails(details);
      })
      .catch((err) => {
        console.error('Failed to load customer details:', err);
        setCustomerDetails(null);
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  }, [selectedCustomerId]);

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomerId(cust.id);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCustomerForm.full_name.trim()) {
      addToast('error', 'Full name is required.', 'Validation Error');
      return;
    }
    if (!addCustomerForm.email.trim()) {
      addToast('error', 'Email is required.', 'Validation Error');
      return;
    }
    setIsSubmittingCustomer(true);
    try {
      const res = await adminService.createCustomer({
        full_name: addCustomerForm.full_name.trim(),
        email: addCustomerForm.email.trim().toLowerCase(),
        phone: addCustomerForm.phone.trim() || undefined,
        password: addCustomerForm.password.trim() || undefined,
        gender: addCustomerForm.gender.trim() || undefined,
        house_number: addCustomerForm.house_number.trim() || undefined,
        street: addCustomerForm.street.trim() || undefined,
        area: addCustomerForm.area.trim() || undefined,
        landmark: addCustomerForm.landmark.trim() || undefined,
        city: addCustomerForm.city.trim() || undefined,
        district: addCustomerForm.district.trim() || undefined,
        state: addCustomerForm.state.trim() || undefined,
        zip: addCustomerForm.zip.trim() || undefined,
        is_active: addCustomerForm.is_active,
      });

      addToast('success', `Customer ${(res?.user as any)?.full_name || addCustomerForm.full_name} created successfully!`, 'Customer Added');
      setIsAddCustomerOpen(false);
      setAddCustomerForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        gender: '',
        house_number: '',
        street: '',
        area: '',
        landmark: '',
        city: '',
        district: '',
        state: 'Telangana',
        zip: '',
        is_active: true,
      });
      await fetchCustomersList();
      if (onRefreshUsers) {
        await onRefreshUsers();
      }
      if (res?.user?.id) {
        setSelectedCustomerId(res.user.id);
      }
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      addToast('error', err?.detail || err?.message || 'Failed to create customer account.', 'Creation Failed');
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  // Initiate Toggle Active/Deactivate confirmation
  const initiateToggleStatus = (cust: any) => {
    const isCurrentlyActive = cust.is_active !== false;
    setConfirmDialog({
      type: 'toggle_status',
      customer: cust,
      title: isCurrentlyActive ? 'Deactivate Customer Account' : 'Activate Customer Account',
      message: isCurrentlyActive
        ? `Are you sure you want to deactivate ${cust.name}'s account? They will not be able to log in or place orders.`
        : `Are you sure you want to reactivate ${cust.name}'s account?`,
    });
  };

  // Execute confirmed action
  const executeConfirmAction = async () => {
    if (!confirmDialog) return;
    setIsConfirming(true);
    const { type, customer } = confirmDialog;

    try {
      if (type === 'toggle_status') {
        const newStatus = !(customer.is_active !== false);
        const updated = await adminService.updateCustomer(customer.id, { is_active: newStatus });
        setCustomerDetails(updated);
        addToast(
          'success',
          `Customer ${customer.name} is now ${newStatus ? 'Active' : 'Inactive'}.`,
          'Status Changed'
        );
      } else if (type === 'delete') {
        await adminService.deleteCustomer(customer.id);
        addToast('success', `Customer ${customer.name} deleted permanently.`, 'Customer Deleted');
        setSelectedCustomerId(null);
      }
      fetchCustomersList();
      if (onRefreshUsers) onRefreshUsers();
      setConfirmDialog(null);
    } catch (err: any) {
      addToast('error', err?.detail || err?.message || 'Action failed.', 'Error');
    } finally {
      setIsConfirming(false);
    }
  };

  // Summary Metrics strictly from SQL database aggregations
  const summary = customersData?.summary || {};
  const summaryMetrics = {
    totalCust: summary.total_customers ?? 0,
    activeCust: summary.active_accounts ?? 0,
    totalOrdersCount: summary.total_orders_placed ?? 0,
    totalRevenue: summary.lifetime_spend ?? 0,
  };

  const rawCustomersList = customersData?.items || [];
  // Client-side safety filter to guarantee only matching customers are displayed
  const customersList = debouncedSearch.trim()
    ? rawCustomersList.filter((c: any) => {
        const q = debouncedSearch.trim().toLowerCase();
        return (
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q))
        );
      })
    : rawCustomersList;

  const totalCount = customersData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const selectedCust = customersList.find((c: any) => c.id === selectedCustomerId) || (customerDetails?.user ? {
    id: customerDetails.user.id,
    name: customerDetails.user.full_name || customerDetails.user.name,
    email: customerDetails.user.email,
    phone: customerDetails.user.phone,
    is_active: customerDetails.user.is_active,
    orders_count: customerDetails.total_orders,
    total_spent: customerDetails.total_spent,
    reward_coins: customerDetails.reward_coins,
  } : null);

  const customerOrdersList: any[] = (customerDetails?.recent_orders && customerDetails.recent_orders.length > 0)
    ? customerDetails.recent_orders
    : (adminOrders ? adminOrders.filter((o: any) => (o.user_id && o.user_id === selectedCust?.id) || (o.user && o.user.id === selectedCust?.id)) : []);

  const totalOrdersCount = customerDetails?.total_orders != null ? customerDetails.total_orders : (customerOrdersList.length > 0 ? customerOrdersList.length : (selectedCust?.orders_count ?? 0));
  const totalSpentAmount = customerDetails?.total_spent != null ? customerDetails.total_spent : (customerOrdersList.length > 0 ? customerOrdersList.filter((o: any) => o.status !== 'Cancelled').reduce((sum: number, o: any) => sum + (o.total || 0), 0) : (selectedCust?.total_spent ?? 0));
  const totalRewardCoins = customerDetails?.reward_coins != null ? customerDetails.reward_coins : (selectedCust?.reward_coins ?? 0);

  // Address Extraction (Version 2 Logistics & Precision Location)
  const defaultAddr = customerDetails?.default_address || (customerDetails?.addresses && customerDetails.addresses.length > 0 ? customerDetails.addresses[0] : null);
  const addrHouseNumber = defaultAddr?.house_number || '';
  const addrStreet = defaultAddr?.street || defaultAddr?.address || customerDetails?.user?.profile?.address?.street || '';
  const addrArea = defaultAddr?.area || '';
  const addrLandmark = defaultAddr?.landmark || '';
  const addrCity = defaultAddr?.city || customerDetails?.user?.profile?.address?.city || '';
  const addrDistrict = defaultAddr?.district || '';
  const addrState = defaultAddr?.state || customerDetails?.user?.profile?.address?.state || '';
  const addrZip = defaultAddr?.pincode || defaultAddr?.zip || defaultAddr?.zip_code || customerDetails?.user?.profile?.address?.zip || '';
  const addrPhone = defaultAddr?.phone || selectedCust?.phone || '';
  const addrLat = defaultAddr?.latitude != null ? Number(defaultAddr.latitude) : null;
  const addrLng = defaultAddr?.longitude != null ? Number(defaultAddr.longitude) : null;
  const addrFormatted = defaultAddr?.formatted_address || defaultAddr?.formattedAddress || '';
  const addrLocationSource = defaultAddr?.location_source || defaultAddr?.locationSource || (addrLat != null ? 'CURRENT_LOCATION' : 'MANUAL');
  const hasAddress = Boolean(addrHouseNumber || addrStreet || addrCity || addrState || addrZip);

  // Authoritative Google Maps URL
  const googleMapsUrl =
    addrLat != null && addrLng != null
      ? `https://www.google.com/maps/search/?api=1&query=${addrLat},${addrLng}`
      : hasAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          [addrHouseNumber, addrStreet, addrArea, addrCity, addrState, addrZip].filter(Boolean).join(', ')
        )}`
      : null;

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCustomersList();
      if (onRefreshUsers) {
        await onRefreshUsers();
      }
      if (selectedCustomerId) {
        setLoadingDetails(true);
        const details = await adminService.getCustomerDetails(selectedCustomerId);
        setCustomerDetails(details);
        setLoadingDetails(false);
      }
      addToast('info', 'Customer directory & profiles refreshed from database.', 'Refreshed');
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '28px' }}>
        <span className="section-label">Access &amp; Customers</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--cream)', margin: 0 }}>
            Customer Directory
          </h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 18px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: 'var(--gold)', color: '#0e0a06',
                boxShadow: '0 2px 10px rgba(201,168,76,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <UserPlus size={15} />
              Add Customer
            </button>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                border: '1px solid rgba(201,168,76,0.35)',
                background: 'rgba(201,168,76,0.08)', color: 'var(--gold)',
                opacity: isRefreshing ? 0.7 : 1,
              }}
            >
              <RefreshCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Directory'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Customers', value: summaryMetrics.totalCust, color: '#c9a84c' },
          { label: 'Active Accounts', value: summaryMetrics.activeCust, color: '#2ecc71' },
          { label: 'Total Orders Placed', value: summaryMetrics.totalOrdersCount, color: '#3498db' },
          { label: 'Lifetime Customer Spend', value: `₹${summaryMetrics.totalRevenue.toLocaleString('en-IN')}`, color: '#c9a84c' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="glass-panel"
            style={{ padding: '16px 18px', border: `1px solid ${kpi.color}25`, borderRadius: '10px', borderTop: `2px solid ${kpi.color}` }}
          >
            <div style={{ fontSize: '0.68rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: kpi.color, fontFamily: 'var(--font-display)' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Directory & Details Container — Symmetrical & Equal Length on Desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 1.15fr) minmax(320px, 1fr)', gap: '22px', alignItems: 'stretch' }}>
        
        {/* LEFT CARD: Customer Directory List (5 per page) */}
        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '22px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-light)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search by name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '36px', paddingRight: searchQuery ? '32px' : '12px',
                  paddingTop: '9px', paddingBottom: '9px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px', color: 'var(--cream)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--grey-light)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => { setStatusFilter(st); setPage(1); }}
                    style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      background: statusFilter === st ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.04)',
                      color: statusFilter === st ? 'var(--gold)' : 'var(--beige)',
                      border: statusFilter === st ? '1px solid rgba(201,168,76,0.5)' : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {st === 'ALL' ? 'All Customers' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => exportToCSV('customer_directory', customersList)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '5px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.4)',
                }}
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.76rem', color: 'var(--grey-light)', marginBottom: '12px' }}>
            Showing {totalCount > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, totalCount)} of {totalCount} customers
          </div>

          {/* List of 5 customers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: '340px' }}>
            {customersLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--beige)' }}>
                <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block', color: 'var(--gold)' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Loading customer records...</p>
              </div>
            ) : customersList.length === 0 ? (
              <div style={{ padding: '50px 20px', textAlign: 'center' }}>
                <User size={36} color="var(--grey-light)" style={{ margin: '0 auto 12px', display: 'block' }} />
                <p style={{ color: 'var(--grey-light)', margin: 0, fontSize: '0.88rem' }}>
                  {totalCount === 0 && !debouncedSearch && statusFilter === 'ALL'
                    ? 'No Customers Found.'
                    : 'No customers match the current filter or search criteria.'}
                </p>
              </div>
            ) : (
              customersList.map((cust: any) => {
                const isSelected = cust.id === selectedCustomerId;
                const totalSpent = cust.total_spent || 0;
                const ordersCnt = cust.orders_count || 0;

                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    style={{
                      padding: '13px 15px', borderRadius: '8px', cursor: 'pointer',
                      background: isSelected ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CustomerAvatar
                        avatarUrl={extractCustomerAvatar(cust)}
                        name={cust.name}
                        size={38}
                        fontSize="0.82rem"
                        border={isSelected ? '2px solid var(--gold)' : '1px solid rgba(201, 168, 76, 0.35)'}
                        glow={isSelected}
                      />
                      <div>
                        <h4 style={{ margin: 0, color: 'var(--cream)', fontSize: '0.9rem', fontWeight: 600 }}>{cust.name}</h4>
                        <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)' }}>{cust.email}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
                        ₹{totalSpent.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--grey-light)', marginTop: '2px' }}>{ordersCnt} order{ordersCnt === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Left/Right Arrow Pagination Controls */}
          <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)' }}>
              Page <strong style={{ color: 'var(--gold)' }}>{page}</strong> of <strong style={{ color: 'var(--cream)' }}>{totalPages}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                disabled={page <= 1 || customersLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px', borderRadius: '6px',
                  background: page <= 1 ? 'rgba(255,255,255,0.02)' : 'rgba(201,168,76,0.1)',
                  border: page <= 1 ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(201,168,76,0.35)',
                  color: page <= 1 ? 'rgba(255,255,255,0.25)' : 'var(--gold)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <button
                type="button"
                disabled={page >= totalPages || customersLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 12px', borderRadius: '6px',
                  background: page >= totalPages ? 'rgba(255,255,255,0.02)' : 'rgba(201,168,76,0.1)',
                  border: page >= totalPages ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(201,168,76,0.35)',
                  color: page >= totalPages ? 'rgba(255,255,255,0.25)' : 'var(--gold)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Customer Profile & Details (Equal Height) */}
        <div className="glass-panel" style={{ padding: isMobile ? '16px' : '22px', border: '1px solid var(--glass-border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
          {loadingDetails ? (
            <div style={{ padding: '60px', textAlign: 'center', margin: 'auto' }}>
              <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block', color: 'var(--gold)' }} />
              <p style={{ color: 'var(--beige)', margin: 0 }}>Loading customer profile...</p>
            </div>
          ) : selectedCust ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <CustomerAvatar
                    avatarUrl={extractCustomerAvatar(customerDetails?.user) || extractCustomerAvatar(selectedCust)}
                    name={selectedCust.name}
                    size={54}
                    fontSize="1.15rem"
                    border="2px solid var(--gold)"
                    glow
                  />
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', margin: 0 }}>{selectedCust.name}</h2>
                    <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)', marginTop: '2px' }}>
                      Customer since {customerDetails?.joined_date || selectedCust.joined_date || 'Member'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => initiateToggleStatus(selectedCust)} style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', background: selectedCust.is_active !== false ? 'rgba(231,76,60,0.1)' : 'rgba(46,204,113,0.1)', border: `1px solid ${selectedCust.is_active !== false ? '#e74c3c' : '#2ecc71'}40`, color: selectedCust.is_active !== false ? '#e74c3c' : '#2ecc71' }}>
                    {selectedCust.is_active !== false ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase' }}>Total Orders</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>{totalOrdersCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase' }}>Total Spent</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>₹{totalSpentAmount.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--grey-light)', textTransform: 'uppercase' }}>Reward Coins</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f39c12', fontFamily: 'var(--font-display)' }}>{totalRewardCoins}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '16px', paddingBottom: '8px', overflowX: 'auto' }}>
                {[
                  { id: 'profile', label: 'Profile' },
                  { id: 'orders', label: `Orders (${customerOrdersList.length})` },
                  { id: 'coins', label: 'Reward Coins' },
                  { id: 'tickets', label: `Support (${customerDetails?.support_tickets?.length || 0})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    style={{ background: 'none', border: 'none', padding: '5px 10px', fontSize: '0.78rem', fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? 'var(--gold)' : 'var(--grey-light)', borderBottom: activeTab === t.id ? '2px solid var(--gold)' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1 }}>
                {activeTab === 'profile' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
                    {/* Customer Identity & Profile DP Showcase */}
                    {(() => {
                      const activeAvatar =
                        extractCustomerAvatar(customerDetails?.user) ||
                        extractCustomerAvatar(selectedCust);
                      const isGoogle = Boolean(
                        activeAvatar && activeAvatar.includes('googleusercontent.com')
                      );
                      const isCustom = Boolean(activeAvatar && !isGoogle);

                      return (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '14px',
                            padding: '14px 16px',
                            background:
                              'linear-gradient(135deg, rgba(201,168,76,0.09) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid rgba(201,168,76,0.25)',
                            borderRadius: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ position: 'relative' }}>
                              <CustomerAvatar
                                avatarUrl={activeAvatar}
                                name={selectedCust.name}
                                size={56}
                                fontSize="1.2rem"
                                border="2px solid var(--gold)"
                                glow
                              />
                              {isGoogle && (
                                <div
                                  title="Google Profile DP"
                                  style={{
                                    position: 'absolute',
                                    bottom: '-2px',
                                    right: '-2px',
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(0,0,0,0.1)',
                                  }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.96rem' }}>
                                  {selectedCust.name}
                                </span>
                                {isGoogle ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(66, 133, 244, 0.12)',
                                      border: '1px solid rgba(66, 133, 244, 0.35)',
                                      color: '#6ba5ff',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Google Synced DP
                                  </span>
                                ) : isCustom ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(46, 204, 113, 0.12)',
                                      border: '1px solid rgba(46, 204, 113, 0.35)',
                                      color: '#2ecc71',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <CheckCircle size={10} /> Verified Avatar
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      background: 'rgba(201, 168, 76, 0.12)',
                                      border: '1px solid rgba(201, 168, 76, 0.35)',
                                      color: 'var(--gold)',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Gold Monogram DP
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--beige)', marginTop: '3px' }}>
                                Customer ID: <span style={{ fontFamily: 'monospace', color: 'var(--gold)' }}>{selectedCust.id}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Mail size={15} color="var(--gold)" />
                        <div>
                          <div style={{ fontSize: '0.67rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</div>
                          <div style={{ color: 'var(--cream)', fontWeight: 500, wordBreak: 'break-all' }}>{selectedCust.email}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Phone size={15} color="var(--gold)" />
                        <div>
                          <div style={{ fontSize: '0.67rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</div>
                          <div style={{ color: 'var(--cream)', fontWeight: 500 }}>{selectedCust.phone || 'Not provided'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Calendar size={15} color="var(--gold)" />
                        <div>
                          <div style={{ fontSize: '0.67rem', color: 'var(--grey-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Status</div>
                          <div style={{ color: selectedCust.is_active !== false ? '#2ecc71' : '#e74c3c', fontWeight: 600 }}>
                            {selectedCust.is_active !== false ? '● Active Account' : '● Deactivated'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Default Address Section (V2 Logistics & Maps) */}
                    <div style={{ background: 'rgba(255,255,255,0.025)', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                          <MapPin size={13} /> Default Delivery Address
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {addrLat != null && addrLng != null && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                              📍 GPS VERIFIED
                            </span>
                          )}
                          {hasAddress && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px', background: 'rgba(201, 168, 76, 0.15)', color: 'var(--gold)', border: '1px solid rgba(201, 168, 76, 0.3)' }}>
                              DEFAULT
                            </span>
                          )}
                        </div>
                      </div>

                      {hasAddress ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--cream)', fontSize: '0.84rem' }}>
                          <div style={{ fontWeight: 500, lineHeight: 1.4 }}>
                            {addrHouseNumber ? `${addrHouseNumber}, ` : ''}
                            {addrStreet}
                            {addrArea ? `, ${addrArea}` : ''}
                          </div>
                          {addrLandmark && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--gold-light)' }}>
                              Landmark: {addrLandmark}
                            </div>
                          )}
                          {(addrCity || addrDistrict || addrState || addrZip) && (
                            <div style={{ color: 'var(--beige)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                              <span>{[addrCity, addrDistrict, addrState].filter(Boolean).join(', ')}</span>
                              {addrZip && (
                                <span style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(201,168,76,0.3)' }}>
                                  PIN: {addrZip}
                                </span>
                              )}
                            </div>
                          )}
                          {addrPhone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--grey-light)', marginTop: '2px' }}>
                              Contact: {addrPhone}
                            </div>
                          )}

                          {/* Action Button: Open in Google Maps */}
                          {googleMapsUrl && (
                            <div style={{ marginTop: '8px' }}>
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.75rem',
                                  padding: '5px 12px',
                                  borderRadius: '4px',
                                  background: 'rgba(201, 168, 76, 0.15)',
                                  color: 'var(--gold)',
                                  border: '1px solid rgba(201, 168, 76, 0.3)',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <ExternalLink size={12} />
                                <span>Open in Google Maps</span>
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', padding: '6px 0' }}>
                          No default address on file for this customer.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'orders' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                    {customerOrdersList.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--grey-light)', fontSize: '0.85rem' }}>No orders placed by this customer yet.</div>
                    ) : (
                      customerOrdersList.map((ord: any) => (
                        <div key={ord.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><div style={{ fontWeight: 700, color: 'var(--gold)', fontSize: '0.78rem', fontFamily: 'monospace' }}>{ord.id}</div><div style={{ fontSize: '0.7rem', color: 'var(--grey-light)', marginTop: '2px' }}>{ord.created_at || ord.date}</div></div>
                          <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.82rem' }}>₹{ord.total?.toLocaleString()}</div><span style={{ fontSize: '0.67rem', fontWeight: 700, color: ord.status === 'Cancelled' ? '#e74c3c' : '#2ecc71' }}>{ord.status}</span></div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'coins' && (
                  <div style={{ padding: '16px', background: 'rgba(243,156,18,0.05)', border: '1px solid rgba(243,156,18,0.2)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}><Award size={18} color="#f39c12" /><span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f39c12' }}>Reward Wallet</span></div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>{customerDetails?.reward_coins || 0} <span style={{ fontSize: '0.85rem', color: 'var(--beige)' }}>Coins</span></div>
                  </div>
                )}

                {activeTab === 'tickets' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                    {customerDetails?.support_tickets?.length === 0 ? (
                      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--grey-light)', fontSize: '0.85rem' }}>No support tickets submitted by this customer.</div>
                    ) : (
                      customerDetails?.support_tickets?.map((t: any) => (
                        <div key={t.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}><span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--cream)' }}>{t.subject || 'Support Ticket'}</span><span style={{ fontSize: '0.67rem', fontWeight: 700, color: t.status === 'Resolved' ? '#2ecc71' : '#f39c12' }}>{t.status}</span></div>
                          <p style={{ fontSize: '0.73rem', color: 'var(--grey-light)', margin: 0 }}>{t.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px 20px', textAlign: 'center', margin: 'auto' }}>
              <User size={36} color="var(--grey-light)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--grey-light)', margin: 0, fontSize: '0.88rem' }}>Select a customer from the left directory list to view profile details.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── CONFIRMATION MODAL FOR DESTRUCTIVE ACTIONS ─────────────── */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9500,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              background: '#0e0a06',
              border: '1px solid rgba(231,76,60,0.4)',
              borderRadius: '12px',
              padding: '34px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={42} color="#e74c3c" style={{ margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--cream)', marginBottom: '12px' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ color: 'var(--beige)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '24px' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{ padding: '9px 20px', borderRadius: '6px', fontSize: '0.83rem', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--cream)', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmAction}
                disabled={isConfirming}
                style={{ padding: '9px 20px', borderRadius: '6px', fontSize: '0.83rem', cursor: 'pointer', background: '#e74c3c', border: 'none', color: '#fff', fontWeight: 700 }}
              >
                {isConfirming ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD NEW CUSTOMER MODAL ─────────────────────────────────── */}
      {isAddCustomerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9600,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingCustomer) {
              setIsAddCustomerOpen(false);
            }
          }}
        >
          <div
            style={{
              background: '#0e0a06',
              border: '1px solid rgba(201,168,76,0.4)',
              borderRadius: '14px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(201,168,76,0.15)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(201,168,76,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(201,168,76,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  <UserPlus size={20} color="var(--gold)" />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.25rem',
                      color: 'var(--cream)',
                      margin: 0,
                    }}
                  >
                    Add New Customer
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--grey-light)' }}>
                    Directly register and configure a customer profile in Chovique
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingCustomer && setIsAddCustomerOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--grey-light)',
                  cursor: isSubmittingCustomer ? 'not-allowed' : 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form
              onSubmit={handleAddCustomerSubmit}
              style={{
                padding: '24px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* SECTION 1: ACCOUNT CREDENTIALS */}
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <User size={13} />
                  Account Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Full Name <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rohith Sharma"
                      value={addCustomerForm.full_name}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, full_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Email Address <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rohith@example.com"
                      value={addCustomerForm.email}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={addCustomerForm.phone}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Temporary Password (Default: Customer@123)
                    </label>
                    <input
                      type="text"
                      placeholder="Customer@123"
                      value={addCustomerForm.password}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Gender
                    </label>
                    <select
                      value={addCustomerForm.gender}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, gender: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: '#15110d',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '24px' }}>
                    <input
                      type="checkbox"
                      id="customer_is_active_toggle"
                      checked={addCustomerForm.is_active}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--gold)', cursor: 'pointer' }}
                    />
                    <label htmlFor="customer_is_active_toggle" style={{ fontSize: '0.82rem', color: 'var(--cream)', cursor: 'pointer' }}>
                      Active Account (Can login &amp; place orders)
                    </label>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DEFAULT SHIPPING & DELIVERY ADDRESS */}
              <div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--gold)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MapPin size={13} />
                  Delivery Address (Optional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Flat / House / Building
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 402, Royal Palms"
                      value={addCustomerForm.house_number}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, house_number: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Street Address / Road
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Road No. 36, Jubilee Hills"
                      value={addCustomerForm.street}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, street: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Madhapur"
                      value={addCustomerForm.area}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, area: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      Landmark
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Near Metro Pillar 1400"
                      value={addCustomerForm.landmark}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, landmark: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad"
                      value={addCustomerForm.city}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, city: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Telangana"
                      value={addCustomerForm.state}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, state: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--beige)', marginBottom: '5px' }}>
                      PIN Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 500081"
                      value={addCustomerForm.zip}
                      onChange={(e) => setAddCustomerForm({ ...addCustomerForm, zip: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '6px',
                        color: 'var(--cream)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  marginTop: '10px',
                }}
              >
                <button
                  type="button"
                  disabled={isSubmittingCustomer}
                  onClick={() => setIsAddCustomerOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    cursor: isSubmittingCustomer ? 'not-allowed' : 'pointer',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--cream)',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    fontSize: '0.84rem',
                    cursor: isSubmittingCustomer ? 'not-allowed' : 'pointer',
                    background: 'var(--gold)',
                    border: 'none',
                    color: '#0e0a06',
                    fontWeight: 700,
                    boxShadow: '0 2px 12px rgba(201,168,76,0.3)',
                    opacity: isSubmittingCustomer ? 0.7 : 1,
                  }}
                >
                  {isSubmittingCustomer ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Creating Customer...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      Create Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomerDirectory;
