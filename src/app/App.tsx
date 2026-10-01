import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './providers';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ChatbotWidget } from '../components/ChatbotWidget';
import {
  Home,
  ShoppingBag,
  ShoppingCart,
  Heart,
  User,
  Package,
  Coins,
  Menu,
  Bell,
  Tag,
  AlertTriangle,
  Settings,
  BookOpen,
  Mail,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

// Pages
import { LandingPage, OurStoryPage, ContactPage } from '../features/landing';
import { ShopPage } from '../features/shop/ShopPage';
import { ProductDetails } from '../features/shop/ProductDetails';
import { CartPage } from '../features/cart/CartPage';
import { CheckoutPage } from '../features/checkout/CheckoutPage';
import { WishlistPage } from '../features/wishlist/WishlistPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { SetPasswordPage } from '../features/auth/SetPasswordPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { CustomerDashboard } from '../features/dashboard/CustomerDashboard';
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { SuperadminDashboard } from '../features/superadmin/SuperadminDashboard';
import { DeliveryDashboard } from '../features/delivery';
import { NotFoundPage } from '../features/error/NotFoundPage';
import { PrivacyPolicyPage, TermsPage, RefundPolicyPage } from '../features/legal';

// Styles
import '../styles/global.css';
import '../styles/animations.css';
import '../styles/navbar.css';
import '../styles/shop.css';
import '../styles/products.css';
import '../styles/forms.css';
import '../styles/dashboards.css';
import '../styles/admin.css';
import '../styles/delivery.css';
import '../styles/chatbot.css';

// Scroll Restoration helper
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/**
 * SuperadminRedirect - If a superadmin lands on /admin, redirect them to /superadmin.
 */
const SuperadminRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useApp();
  if (role === 'superadmin') {
    return <Navigate to="/superadmin" replace />;
  }
  return <>{children}</>;
};

/**
 * CustomerMobileNav — Fixed top + bottom navigation bars shown ONLY for:
 *   - role === 'customer'
 *   - viewport width ≤ 768px
 *   - not on auth or admin routes
 *
 * This component is rendered globally in AppContent so that the bars
 * persist across every customer-facing page (shop, cart, wishlist, dashboard, etc.).
 * It does NOT affect desktop, admin, or super-admin views.
 */
const CustomerMobileNav: React.FC = () => {
  const { role, cart, wallet, user, notifications, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = notifications.filter(n => !n.read && !n.is_read).length;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);  // Render on mobile for all non-admin routes (customer landing page, shop, dashboard, etc.)
  const isAuthRoute = ['/login', '/register', '/set-password', '/forgot-password'].includes(location.pathname);
  const isAdminRoute = ['/admin', '/superadmin'].includes(location.pathname);

  if (!isMobile || isAuthRoute || isAdminRoute) {
    return null;
  }

  const cartCount = (cart || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const coinBalance = wallet?.coin_balance ?? 0;

  // Determine active bottom tab based on current route
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const section = new URLSearchParams(location.search).get('section') || '';

  const isHome = pathname === '/';
  const isOrders = pathname === '/dashboard' && ['orders', 'order-history', 'track'].includes(section.toLowerCase());
  const isShop = pathname === '/shop' || pathname.startsWith('/product');
  const isWishlist = pathname === '/wishlist';
  const isAccount = pathname === '/dashboard' && (section.toLowerCase() === 'account' || section.toLowerCase() === 'my-account' || (!isOrders && !['notifications', 'coupons', 'help', 'rewards', 'overview'].includes(section.toLowerCase())));

  return (
    <>
      {/* ════════════════════════════════════════════════
          CUSTOMER MOBILE TOP NAVBAR  (fixed, z=200)
          ════════════════════════════════════════════════ */}
      <div className="cust-mobile-topnav" role="banner" aria-label="Customer mobile navigation">
        {/* Left: Hamburger → opens dropdown */}
        <div style={{ position: 'relative' }} ref={mobileMenuRef}>
          <button
            className="cust-mobile-topnav-btn"
            onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Open mobile menu"
            style={{ position: 'relative' }}
          >
            {<Menu size={22} />}
            {!isMobileMenuOpen && role === 'customer' && unreadCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, background: '#D6A848', color: '#000', fontSize: '9px', fontWeight: 'bold', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount}
              </span>
            )}
          </button>
          
          {isMobileMenuOpen && (
            <div 
              style={{ 
                position: 'absolute', 
                top: '48px', 
                left: '0', 
                background: 'rgba(10, 7, 5, 0.98)', 
                border: '1px solid rgba(201, 168, 76, 0.25)', 
                borderRadius: '8px', 
                width: '210px', 
                display: 'flex', 
                flexDirection: 'column', 
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
                zIndex: 300,
                overflow: 'hidden'
              }}
            >
              {(role === 'admin' || role === 'superadmin') && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate(role === 'superadmin' ? '/superadmin' : '/admin');
                  }}
                  style={{ padding: '12px 16px', background: 'rgba(201, 168, 76, 0.15)', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.25)', color: '#e5c875', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '0.85rem' }}
                >
                  <ShieldCheck size={18} color="#c9a84c" />
                  <span>Return to {role === 'superadmin' ? 'Superadmin' : 'Admin'}</span>
                </button>
              )}
              {role === 'customer' ? (
                <>
                  {/* Logged in customer: notifications, coupons, help/complaints, about, contact, logout */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/dashboard?section=notifications');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <div style={{ position: 'relative', display: 'flex' }}>
                      <Bell size={16} />
                      {unreadCount > 0 && (
                        <span style={{ position: 'absolute', top: -6, right: -6, background: '#D6A848', color: '#000', fontSize: '9px', fontWeight: 'bold', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    Notifications
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/dashboard?section=coupons');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <Tag size={16} /> Coupons
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/dashboard?section=help');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <AlertTriangle size={16} /> Help & Support
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/our-story');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <BookOpen size={16} /> About Us
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/contact');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <Mail size={16} /> Contact Us
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                      navigate('/');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', color: '#e74c3c', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}
                  >
                    <LogOut size={16} /> Log Out
                  </button>
                </>
              ) : (
                <>
                  {/* Guest before login: About Us, Contact Us, Sign In / Register */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/our-story');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <BookOpen size={16} /> About Us
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/contact');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', color: '#f5efe6', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <Mail size={16} /> Contact Us
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    style={{ padding: '12px 16px', background: 'transparent', border: 'none', color: '#c9a84c', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 600 }}
                  >
                    <User size={16} /> Sign In / Register
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center: Company logo image and text */}
        <button
          className="cust-mobile-topnav-logo"
          onClick={() => navigate('/')}
          aria-label="Go to home"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <img
            src="/assets/logo.png"
            alt="Chovique"
            className="cust-mobile-logo-img"
            onError={(e) => {
              // Fallback to text if image fails
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="cust-mobile-logo-text">CHOVIQUE</span>
        </button>

        {/* Right: Cart with badge + Coins balance pill (coins displayed ONLY after login) */}
        <div className="cust-mobile-topnav-right">
          <button
            className="cust-mobile-topnav-btn cust-mobile-topnav-btn--badge-wrap"
            onClick={() => navigate('/cart')}
            aria-label={`Cart, ${cartCount} items`}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="cust-mobile-topnav-badge">{cartCount > 99 ? '99+' : cartCount}</span>
            )}
          </button>
          {role === 'customer' && (
            <button
              className="cust-mobile-coins-pill"
              aria-label={`${coinBalance} reward coins`}
              onClick={() => navigate('/dashboard?section=rewards')}
              style={{ cursor: 'pointer', background: 'rgba(201, 168, 76, 0.12)', border: '1px solid rgba(201, 168, 76, 0.35)' }}
            >
              <Coins size={13} />
              <span>{wallet?.coin_balance ?? 0}</span>
            </button>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          CUSTOMER MOBILE BOTTOM NAVBAR  (fixed, z=200)
          ════════════════════════════════════════════════ */}
      <nav className="cust-mobile-bottom-nav" aria-label="Customer mobile bottom navigation">
        {/* 1. Home → landing page */}
        <button
          className={`cust-mobile-bottom-btn ${isHome ? 'active' : ''}`}
          onClick={() => navigate('/')}
          aria-label="Home"
        >
          <Home size={21} />
          <span>Home</span>
        </button>

        {/* 2. Orders → dashboard orders section */}
        <button
          className={`cust-mobile-bottom-btn ${isOrders ? 'active' : ''}`}
          onClick={() => {
            if (role === 'customer') {
              navigate('/dashboard?section=orders');
            } else {
              navigate('/login', { state: { from: '/dashboard?section=orders' } });
            }
          }}
          aria-label="My Orders"
        >
          <Package size={21} />
          <span>Orders</span>
        </button>

        {/* 3. Shop - shop page */}
        <button
          className={`cust-mobile-bottom-btn cust-mobile-bottom-btn--shop ${isShop ? 'active' : ''}`}
          onClick={() => navigate('/shop')}
          aria-label="Shop"
        >
          <div className="shop-icon-wrapper">
            <ShoppingBag size={24} />
          </div>
          <span>Shop</span>
        </button>

        {/* 4. Wishlist → wishlist page */}
        <button
          className={`cust-mobile-bottom-btn ${isWishlist ? 'active' : ''}`}
          onClick={() => navigate('/wishlist')}
          aria-label="Wishlist"
        >
          <Heart size={21} />
          <span>Wishlist</span>
        </button>

        {/* 5. My Account → dashboard account tab, or return to admin if admin */}
        <button
          className={`cust-mobile-bottom-btn ${isAccount ? 'active' : ''}`}
          onClick={() => {
            if (role === 'admin' || role === 'superadmin') {
              navigate(role === 'superadmin' ? '/superadmin' : '/admin');
            } else if (role === 'customer') {
              navigate('/dashboard?section=account');
            } else {
              navigate('/login', { state: { from: '/dashboard?section=account' } });
            }
          }}
          aria-label={role === 'admin' || role === 'superadmin' ? 'Admin Panel' : 'My Account'}
        >
          {role === 'admin' || role === 'superadmin' ? (
            <>
              <ShieldCheck size={21} color="#c9a84c" />
              <span style={{ color: '#c9a84c' }}>Admin</span>
            </>
          ) : role === 'customer' && user?.profile?.avatarUrl ? (
            <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: isAccount ? '2px solid #c9a84c' : '1px solid rgba(255,255,255,0.4)', marginBottom: 2 }}>
              <img src={getImageUrl(user.profile.avatarUrl)} alt={user.name || 'Account'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <User size={21} />
          )}
          {!(role === 'admin' || role === 'superadmin') && <span>{role === 'customer' ? 'My Account' : 'Account'}</span>}
        </button>
      </nav>
    </>
  );
};


const AppContent: React.FC = () => {
  const location = useLocation();
  const { role } = useApp();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Route conditionals
  const isAuthRoute = ['/login', '/register', '/set-password', '/forgot-password'].includes(location.pathname);
  const isAdminDashboard = ['/admin', '/superadmin'].includes(location.pathname);
  const isDeliveryRoute = location.pathname.startsWith('/delivery');
  const isCustomerDashboard = location.pathname === '/dashboard';

  // Mobile customer view: active on mobile for all store/public pages regardless of admin login
  const isCustomerMobile = isMobile && !isAuthRoute && !isAdminDashboard && !isDeliveryRoute;

  const showNavbar = !isAuthRoute && !isAdminDashboard && !isDeliveryRoute && !isCustomerMobile;

  // Footer: hidden on auth, admin, delivery, customer dashboard, AND all customer mobile pages
  const showFooter = !isAuthRoute && !isAdminDashboard && !isDeliveryRoute && !isCustomerDashboard && !isCustomerMobile;

  // Add bottom-padding class to <body> for customer mobile so fixed bottom nav doesn't overlap content
  useEffect(() => {
    if (isCustomerMobile) {
      document.body.classList.add('customer-mobile-active');
    } else {
      document.body.classList.remove('customer-mobile-active');
    }
    return () => {
      document.body.classList.remove('customer-mobile-active');
    };
  }, [isCustomerMobile]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <ScrollToTop />
      {showNavbar && <Navbar />}

      {/* Customer mobile nav — persists across all customer pages on mobile */}
      <CustomerMobileNav />

      <main style={{ flexGrow: 1 }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/our-story" element={<OurStoryPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Legal and Compliance Routes */}
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />

          {/* Guest-accessible but redirects to login at checkout */}
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />

          {/* Protected: Customer */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'superadmin']}>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'superadmin']}>
                <ErrorBoundary>
                  <CustomerDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/set-password"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin', 'superadmin']}>
                <SetPasswordPage />
              </ProtectedRoute>
            }
          />

          {/* Protected: Admin only (superadmin redirected to /superadmin) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <ErrorBoundary>
                  {/* If superadmin visits /admin, redirect them to /superadmin */}
                  <SuperadminRedirect>
                    <AdminDashboard />
                  </SuperadminRedirect>
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Protected: Superadmin only */}
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <ErrorBoundary>
                  <SuperadminDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          {/* Protected: Delivery Boy & Admin Delivery Panel */}
          <Route
            path="/delivery"
            element={
              <ProtectedRoute allowedRoles={['delivery_boy', 'admin', 'superadmin']}>
                <ErrorBoundary>
                  <DeliveryDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>

      </main>

      {showFooter && <Footer />}

      {/* Chovique AI Assistant — Coco (available for customers, delivery partners, and guests) */}
      {!isAdminDashboard && <ChatbotWidget />}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;

