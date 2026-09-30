import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Heart,
  User,
  LogOut,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  Bell,
  Home,
  Package,
  Coins,
  Tag,
  MapPin,
  Settings,
  HelpCircle,
  Sparkles,
  Mail,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react';
import { useApp } from '../app/providers';
import { Button } from './ui/Button';
import { getImageUrl } from '../utils/imageUrl';
import { NotificationHeaderDropdown } from './NotificationHeaderDropdown';

export const Navbar: React.FC = () => {
  const { role, cart, wishlist, logout, user, wallet, notifications, removeNotification } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shopExpanded, setShopExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileHovered, setIsProfileHovered] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const handleCustomerNav = (tab: string) => {
    setMobileMenuOpen(false);
    navigate('/dashboard', { state: { tab, timestamp: Date.now() } });
    window.dispatchEvent(new CustomEvent('chovique:switch-dashboard-tab', { detail: tab }));
  };

  const rawAvatar = user?.profile?.avatarUrl || (user?.profile as any)?.avatar_url || (user as any)?.avatar_url;
  useEffect(() => {
    setAvatarError(false);
  }, [rawAvatar]);

  const avatarSrc = rawAvatar ? getImageUrl(rawAvatar) : '';

  // Close notifications and mobile menu on page/section navigation
  useEffect(() => {
    setShowNotifications(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search, location.state, location.key]);

  // Close notification popover on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Navbar background change on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Total cart count
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const megaMenuCollections = [
    { name: 'Dark Chocolate', link: '/shop?category=dark' },
    { name: 'Milk Chocolate', link: '/shop?category=milk' },
    { name: 'Truffles', link: '/shop?category=dark&type=truffle' },
    { name: 'Pralines', link: '/shop?category=dark&type=praline' },
    { name: 'Gift Boxes', link: '/shop?category=gift' },
  ];

  const megaMenuSpecialty = [
    { name: 'Chocolate Bars', link: '/shop?type=bar' },
    { name: 'Specialty', link: '/shop?filter=premium' },
    { name: 'Corporate Gifts', link: '/shop?category=gift&type=corporate' },
    { name: '✨ New Arrivals', link: '/shop?filter=new', highlight: true },
  ];

  const featuredProducts = [
    {
      name: 'Royal Dark Truffle Collection',
      shortName: 'Dark Truffles',
      price: 2500,
      originalPrice: 3249,
      discount: 23,
      image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=500&q=80',
      hoverImage: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=500&q=80',
      link: '/shop',
    },
    {
      name: 'Belgian Milk Chocolate Pralines',
      shortName: 'Pralines',
      price: 2000,
      image: 'https://images.unsplash.com/photo-1542841791-1925b02a2bcd?auto=format&fit=crop&w=500&q=80',
      hoverImage: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80',
      link: '/shop',
    },
    {
      name: 'Signature Gold Leaf Pralines',
      shortName: 'Gold Pralines',
      price: 1649,
      originalPrice: 2199,
      discount: 25,
      image: 'https://images.unsplash.com/photo-1526081347589-7fa3cb36b312?auto=format&fit=crop&w=500&q=80',
      hoverImage: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=500&q=80',
      link: '/shop',
    },
  ];

  const handleNavScroll = (elementId: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: elementId } });
    } else {
      const el = document.getElementById(elementId);
      if (el) {
        window.scrollTo({
          top: el.offsetTop - 70,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <img src="/assets/logo.png" alt="Chovique Logo" onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=100&q=80';
          }} />
          <span className="nav-logo-text">CHOVIQUE</span>
        </Link>

        {/* Desktop Menu links - Public Website Nav */}
        <ul className="nav-menu">
          <li className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>Home</li>
          <li className={`nav-item ${location.pathname.startsWith('/shop') || location.pathname.startsWith('/product') ? 'active' : ''}`} onClick={() => navigate('/shop')}>
            Shop
          </li>
          <li className={`nav-item ${location.pathname === '/our-story' ? 'active' : ''}`} onClick={() => navigate('/our-story')}>Our Story</li>
          <li className={`nav-item ${location.pathname === '/contact' ? 'active' : ''}`} onClick={() => navigate('/contact')}>Contact</li>
        </ul>

        {/* Action Buttons Right */}
        <div className="nav-actions">
          {role === 'guest' ? (
            <>
              <Button variant="text" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="gold" size="sm" onClick={() => navigate('/register')} glow>
                Register
              </Button>
            </>
          ) : role === 'customer' ? (
            <>
              {/* Customer icons (Wishlist, Cart, Notifications, Account) */}
              <Link to="/wishlist" className="nav-icon-btn" aria-label="Wishlist">
                <Heart size={20} />
                {wishlist.length > 0 && <span className="nav-badge">{wishlist.length}</span>}
              </Link>
              <Link to="/cart" className="nav-icon-btn" aria-label="Cart">
                <ShoppingBag size={20} />
                {cartCount > 0 && <span className="nav-badge">{cartCount}</span>}
              </Link>

              {/* Notifications Bell */}
              <NotificationHeaderDropdown
                onNavigateTab={(tab) => navigate('/dashboard', { state: { tab } })}
                isCustomer={true}
                isSuperadmin={false}
              />

              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setIsProfileHovered(true)}
                onMouseLeave={() => setIsProfileHovered(false)}
              >
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="nav-icon-btn nav-profile-avatar-btn"
                  aria-label="Customer Dashboard"
                  title={`${user?.name || 'Account'} - Click for Customer Dashboard`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {avatarSrc && !avatarError ? (
                    <img
                      src={avatarSrc}
                      alt={user?.name || 'User'}
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarError(true)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1.5px solid #c9a84c',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                        color: '#0f0c0a',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 10px rgba(201, 168, 76, 0.3)',
                      }}
                    >
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                    </div>
                  )}
                </button>

                {/* Desktop Hover Tooltip — Full Name & Email ONLY */}
                <AnimatePresence>
                  {isProfileHovered && user && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        background: 'rgba(18, 14, 11, 0.96)',
                        border: '1px solid rgba(201, 168, 76, 0.35)',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <span
                        style={{
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          lineHeight: 1.2,
                        }}
                      >
                        {user.name}
                      </span>
                      <span
                        style={{
                          color: 'rgba(255, 255, 255, 0.6)',
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          lineHeight: 1.2,
                        }}
                      >
                        {user.email}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              {/* Admin or Superadmin — Back to Dashboard button */}
              <button
                onClick={() => navigate(role === 'admin' ? '/admin' : '/superadmin')}
                className="nav-back-to-dashboard-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--dark-chocolate)',
                  background: 'var(--gradient-gold)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 12px rgba(201, 168, 76, 0.3)',
                }}
              >
                <span className="hide-on-mobile">← Back to {role === 'admin' ? 'Admin' : 'Superadmin'} Dashboard</span>
                <span className="show-on-mobile">← Dashboard</span>
              </button>

              <button onClick={logout} className="nav-icon-btn" aria-label="Log out" title="Log Out">
                <LogOut size={20} />
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button — Always available on mobile screens */}
          <button
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Modern Luxury Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mobile-drawer-sheet"
          >
            {/* 1. Logged-in Customer Profile Banner */}
            {role === 'customer' && user && (
              <div className="mobile-drawer-profile-card">
                <div className="mobile-drawer-avatar">
                  {avatarSrc && !avatarError ? (
                    <img
                      src={avatarSrc}
                      alt={user.name || 'User'}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <span>{user.name ? user.name.charAt(0).toUpperCase() : <User size={18} />}</span>
                  )}
                </div>
                <div className="mobile-drawer-profile-info">
                  <div className="mobile-drawer-profile-name">{user.name}</div>
                  <div className="mobile-drawer-profile-email">{user.email}</div>
                  {wallet && (
                    <div className="mobile-drawer-coins-badge">
                      <Coins size={12} />
                      <span>{wallet.coin_balance} Chovique Coins</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. Quick Action Buttons Row (Cart, Wishlist, Dashboard) */}
            {user && (
              <div className="mobile-drawer-quick-bar">
                <Link
                  to="/cart"
                  className="mobile-drawer-quick-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingBag size={18} />
                  <span>Cart ({cartCount})</span>
                </Link>

                <Link
                  to="/wishlist"
                  className="mobile-drawer-quick-btn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Heart size={18} />
                  <span>Wishlist ({wishlist.length})</span>
                </Link>

                {role === 'customer' && (
                  <button
                    type="button"
                    className="mobile-drawer-quick-btn gold"
                    onClick={() => handleCustomerNav('overview')}
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </button>
                )}
              </div>
            )}

            {/* 3. Primary Store Navigation Links */}
            <div className="mobile-drawer-nav-section">
              <div className="mobile-drawer-nav-title">STORE NAVIGATION</div>
              <div className="mobile-drawer-links-list">
                <Link
                  to="/"
                  className={`mobile-drawer-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="mobile-drawer-nav-link-left">
                    <Home size={18} />
                    <span>Home</span>
                  </div>
                </Link>

                {/* Shop All with interactive collection accordion */}
                <div className="mobile-drawer-shop-group">
                  <div
                    className={`mobile-drawer-nav-link shop-header ${location.pathname.startsWith('/shop') ? 'active' : ''}`}
                    onClick={() => setShopExpanded(!shopExpanded)}
                  >
                    <div className="mobile-drawer-nav-link-left">
                      <Package size={18} />
                      <span>Shop Chocolates</span>
                    </div>
                    {shopExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>

                  <AnimatePresence>
                    {shopExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mobile-drawer-sublinks-box"
                      >
                        <Link
                          to="/shop"
                          className="mobile-drawer-sublink highlight"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          ✦ Browse All Chocolates
                        </Link>
                        {megaMenuCollections.map((cat) => (
                          <Link
                            key={cat.name}
                            to={cat.link}
                            className="mobile-drawer-sublink"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {cat.name}
                          </Link>
                        ))}
                        {megaMenuSpecialty.map((item) => (
                          <Link
                            key={item.name}
                            to={item.link}
                            className={`mobile-drawer-sublink ${item.highlight ? 'gold-highlight' : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {item.name}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  to="/our-story"
                  className={`mobile-drawer-nav-link ${location.pathname === '/our-story' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="mobile-drawer-nav-link-left">
                    <BookOpen size={18} />
                    <span>Our Story</span>
                  </div>
                </Link>

                <Link
                  to="/contact"
                  className={`mobile-drawer-nav-link ${location.pathname === '/contact' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="mobile-drawer-nav-link-left">
                    <Mail size={18} />
                    <span>Contact Us</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* 4. Customer Account & Dashboard Quick Grid (When Customer Logged In) */}
            {role === 'customer' && (
              <div className="mobile-drawer-nav-section">
                <div className="mobile-drawer-nav-title">MY ACCOUNT & ORDERS</div>
                <div className="mobile-drawer-account-grid">
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('overview')}
                  >
                    <LayoutDashboard size={17} />
                    <span>Overview</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('orders')}
                  >
                    <ShoppingBag size={17} />
                    <span>My Orders</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('profile')}
                  >
                    <User size={17} />
                    <span>My Profile</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('addresses')}
                  >
                    <MapPin size={17} />
                    <span>Addresses</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('coupons')}
                  >
                    <Tag size={17} />
                    <span>Coupons</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('rewards')}
                  >
                    <Coins size={17} />
                    <span>Rewards</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('settings')}
                  >
                    <Settings size={17} />
                    <span>Settings</span>
                  </button>
                  <button
                    type="button"
                    className="mobile-drawer-grid-item"
                    onClick={() => handleCustomerNav('help')}
                  >
                    <HelpCircle size={17} />
                    <span>Help</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. Guest Sign In / Register OR Log Out Button */}
            <div className="mobile-drawer-footer-actions">
              {role === 'guest' ? (
                <div className="mobile-drawer-guest-auth">
                  <Link
                    to="/login"
                    className="mobile-drawer-auth-btn signin"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="mobile-drawer-auth-btn register"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  className="mobile-drawer-logout-btn"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut size={18} />
                  <span>Log Out of Account</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
