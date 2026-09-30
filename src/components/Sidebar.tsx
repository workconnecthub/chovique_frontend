import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  FolderTree,
  ListOrdered,
  Users,
  Tag,
  Coins,
  Star,
  Settings,
  Image,
  ShieldCheck,
  Palette,
  FileClock,
  Database,
  AlertTriangle,
  Menu,
  X,
  Mail,
  BarChart3,
  Bell,
  Home,
  ExternalLink,
  User as UserIcon,
  KeyRound,
  LogOut,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Receipt,
  TrendingUp,
  IndianRupee,
  FileSpreadsheet,
  Truck,
  Bike,
  Store,
} from 'lucide-react';
import { NotificationHeaderDropdown } from './NotificationHeaderDropdown';
import { getImageUrl } from '../utils/imageUrl';
import { useApp } from '../app/providers';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRequestLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onRequestLogout }) => {
  const { role, logout, user } = useApp();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isOpen, setIsOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close drawer on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Full Admin items for Desktop
  const adminDesktopItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'orders', label: 'Order Management', icon: ListOrdered },
    { id: 'delivery-boys', label: 'Delivery Management', icon: Bike },
    { id: 'customers', label: 'Customer Directory', icon: Users },
    { id: 'offline-sales', label: 'Offline Sales', icon: Receipt },
    { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
    { id: 'reward-settings', label: 'Reward Coins System', icon: Coins },
    { id: 'home-mgmt', label: 'Banner & Carousel', icon: Image },
    { id: 'testimonials', label: 'Reviews', icon: Star },
    { id: 'contact-messages', label: 'Contact Messages', icon: Mail },
    { id: 'complaints', label: 'Customer Complaints', icon: AlertTriangle },
  ];

  // Full Superadmin items for Desktop
  const superadminDesktopItems = [
    { id: 'enterprise', label: 'Enterprise', icon: ShieldCheck },
    { id: 'revenue', label: 'Revenue Analytics', icon: IndianRupee },
    { id: 'sales-comparison', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet },
    { id: 'admin-mgmt', label: 'Admin Management', icon: Users },
    { id: 'customers', label: 'Customer Directory', icon: Users },
    { id: 'delivery-boys', label: 'Delivery Management', icon: Bike },
    { id: 'logistics', label: 'Logistics & Hubs', icon: Store },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileClock },
    { id: 'theme-builder', label: 'Theme Builder', icon: Palette },
    { id: 'platform-settings', label: 'Platform Settings', icon: Settings },
  ];

  // Mobile Bottom Nav Primary Items (5 items)
  const adminBottomItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ListOrdered },
    { id: 'products', label: 'Products', icon: ShoppingBag, isFab: true },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'offline-sales', label: 'Offline Sales', icon: Receipt },
  ];

  const superadminBottomItems = [
    { id: 'enterprise', label: 'Overview', icon: ShieldCheck },
    { id: 'revenue', label: 'Revenue Analytics', icon: IndianRupee },
    { id: 'reports', label: 'Report Analytics', icon: FileSpreadsheet, isFab: true },
    { id: 'sales-comparison', label: 'Sales Analytics', icon: TrendingUp },
    { id: 'platform-settings', label: 'Settings', icon: Settings },
  ];

  // Mobile Remaining Items for Hamburger Toggle
  const adminRemainingItems = [
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'delivery-boys', label: 'Delivery Management', icon: Bike },
    { id: 'coupons', label: 'Coupons & Discounts', icon: Tag },
    { id: 'reward-settings', label: 'Reward Coins System', icon: Coins },
    { id: 'home-mgmt', label: 'Banner & Carousel', icon: Image },
    { id: 'testimonials', label: 'Reviews & Testimonials', icon: Star },
    { id: 'contact-messages', label: 'Contact Messages', icon: Mail },
    { id: 'complaints', label: 'Customer Complaints', icon: AlertTriangle },
  ];

  const superadminRemainingItems = [
    { id: 'admin-mgmt', label: 'Admins Management', icon: Users },
    { id: 'customers', label: 'Customer Directory', icon: Users },
    { id: 'delivery-boys', label: 'Delivery Management', icon: Bike },
    { id: 'logistics', label: 'Logistics & Hubs', icon: Store },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileClock },
    { id: 'theme-builder', label: 'Theme Builder', icon: Palette },
  ];

  const desktopItems = role === 'superadmin' ? superadminDesktopItems : adminDesktopItems;
  const bottomItems = role === 'superadmin' ? superadminBottomItems : adminBottomItems;
  const remainingItems = role === 'superadmin' ? superadminRemainingItems : adminRemainingItems;

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setIsOpen(false);
    if (onRequestLogout) {
      onRequestLogout();
    } else {
      setActiveTab('logout');
    }
  };

  const rawAvatarUrl = user?.profile?.avatarUrl || (user?.profile as any)?.avatar_url || (user as any)?.avatar_url;
  const avatarUrl = rawAvatarUrl ? getImageUrl(rawAvatarUrl) : '';
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : (role === 'superadmin' ? 'S' : 'A');
  const roleLabel = role === 'superadmin' ? 'Super Admin' : 'Admin';

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          MOBILE TOP NAVBAR (Fixed, height 56px, ≤ 768px only)
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <div className="admin-mobile-topnav" role="banner" aria-label="Admin mobile navigation">
          {/* Left: Hamburger button → toggles remaining items drawer */}
          <button
            className="admin-mobile-topnav-btn"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <Menu size={22} color="#c9a84c" />
          </button>

          {/* Center: Brand logo + "CHOVIQUE" + Role Badge stacked down of branding */}
          <div
            className="admin-mobile-topnav-logo"
            onClick={() => handleTabSelect(role === 'superadmin' ? 'enterprise' : 'dashboard')}
            style={{ cursor: 'pointer' }}
          >
            <img
              src="/assets/logo.png"
              alt="Chovique Logo"
              className="admin-mobile-logo-img"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=100&q=80';
              }}
            />
            <div className="admin-mobile-brand-stack">
              <span className="admin-mobile-logo-text">CHOVIQUE</span>
              <span className="admin-mobile-brand-role">{role === 'superadmin' ? 'SUPERADMIN' : 'ADMIN'}</span>
            </div>
          </div>

          {/* Right: View Public Store button + Notification dropdown + User avatar link */}
          <div className="admin-mobile-topnav-right">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="admin-mobile-view-store-btn"
              title="View Public Store"
              aria-label="View Public Store"
            >
              <ExternalLink size={13} />
              <span>Store</span>
            </button>

            <NotificationHeaderDropdown
              onNavigateTab={handleTabSelect}
              isSuperadmin={role === 'superadmin'}
            />
            <button
              onClick={() => handleTabSelect('profile')}
              className="admin-mobile-avatar-btn"
              title="My Profile"
              aria-label="My Profile"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name || 'Admin'} referrerPolicy="no-referrer" className="admin-mobile-avatar-img" />
              ) : (
                <span>{initial}</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOBILE DRAWER BACKDROP
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <div
          className={`admin-sidebar-backdrop ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(false)}
          aria-hidden={!isOpen}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOBILE HAMBURGER DRAWER (Non-redundant Workspace Modules)
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <aside
          ref={drawerRef}
          className={`admin-mobile-drawer ${isOpen ? 'open' : ''}`}
          aria-label="Admin mobile drawer"
        >
          {/* Drawer Header */}
          <div className="admin-drawer-header">
            <div
              className="admin-drawer-user-info"
              onClick={() => handleTabSelect('profile')}
              style={{ cursor: 'pointer' }}
              title="View Profile"
            >
              <div className="admin-drawer-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.name || 'Admin'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initial
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="admin-drawer-user-name">
                  {user?.name || 'Administrator'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span className="admin-mobile-role-pill">{roleLabel}</span>
                  {user?.email && (
                    <span className="admin-drawer-user-email">
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              className="admin-drawer-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="admin-drawer-body">
            {/* Workspace Modules (Only items not already in bottom or top nav) */}
            <div className="admin-drawer-section">
              <div className="admin-drawer-section-title">
                <span>MODULES</span>
                <span className="admin-drawer-badge">{remainingItems.length}</span>
              </div>
              <div className="admin-drawer-items-list">
                {remainingItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabSelect(item.id)}
                      className={`admin-drawer-item ${isActive ? 'active' : ''}`}
                    >
                      <div className="admin-drawer-item-icon">
                        <Icon size={18} />
                      </div>
                      <span className="admin-drawer-item-label">{item.label}</span>
                      {isActive && <div className="admin-drawer-item-dot" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Drawer Footer: Logout */}
          <div className="admin-drawer-footer">
            <button
              onClick={handleLogout}
              className="admin-drawer-logout-btn"
            >
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </aside>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MOBILE FIXED BOTTOM NAVBAR (Height 64px, ≤ 768px only)
          ══════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <nav className="admin-mobile-bottom-nav" aria-label="Admin mobile bottom navigation">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (item.isFab) {
              return (
                <button
                  key={item.id}
                  className={`admin-mobile-bottom-btn admin-mobile-bottom-btn--fab ${isActive ? 'active' : ''}`}
                  onClick={() => handleTabSelect(item.id)}
                  aria-label={item.label}
                >
                  <div className="admin-fab-wrapper">
                    <Icon size={24} />
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                className={`admin-mobile-bottom-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTabSelect(item.id)}
                aria-label={item.label}
              >
                <Icon size={21} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP STATIONARY SIDEBAR (> 768px only)
          ══════════════════════════════════════════════════════════════ */}
      <aside
        className="admin-desktop-sidebar"
        style={{
          width: '260px',
          height: '100vh',
          background: 'var(--dark-chocolate)',
          borderRight: '1px solid var(--glass-border)',
          position: 'fixed',
          top: 0,
          left: 0,
          display: isMobile ? 'none' : 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '24px 16px',
          zIndex: 110,
          fontFamily: 'var(--font-body)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflow: 'hidden' }}>
          {/* Brand Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingLeft: '8px',
            }}
          >
            <div
              onClick={() => navigate('/')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
              }}
            >
              <img
                src="/assets/logo.png"
                alt="Chovique Logo"
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid var(--gold)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=100&q=80';
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: '1.2rem',
                  letterSpacing: '1.5px',
                  background: 'var(--gradient-gold-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                CHOVIQUE
              </span>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 600,
                paddingLeft: '10px',
                marginBottom: '6px',
              }}
            >
              {role} Workspace
            </span>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
              {desktopItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      color: isActive ? 'var(--dark-chocolate)' : 'var(--beige)',
                      background: isActive ? 'var(--gradient-gold)' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                    }}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;

