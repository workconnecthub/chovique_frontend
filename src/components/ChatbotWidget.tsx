/**
 * ChatbotWidget — Chovique AI Assistant "Coco"
 *
 * Uses actual Chovique brand assets:
 *  - /assets/logo-badge.jpg  → FAB button + message avatar
 *  - /assets/logo.png        → Welcome screen hero image
 *  - /assets/popular-bg.jpg  → Header background texture
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../app/providers';
import { productService } from '../services/productService';
import { shippingService } from '../services/shippingService';
import { orderService } from '../services/orderService';
import { chatService, type ChatMessage, type ChatAction } from '../services/chatService';
import { getBrowserCoordinates, reverseGeocodeCoordinates } from '../lib/googleMaps';
import type { Product, CustomerAddress, ShippingCalculateResponse, OrderPayload } from '../types';
import {
  ShoppingBag,
  Package,
  Coins,
  Tag,
  HelpCircle,
  ArrowUpRight,
  ShoppingCart,
  Heart,
  User,
  Sparkles,
  Warehouse,
  Receipt,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  Loader2,
  Route,
  Navigation,
  Award,
  MapPin,
  CheckCircle2,
  CreditCard,
  Banknote,
  X,
} from 'lucide-react';
import '../styles/chatbot.css';

// Re-export BotAvatar from Libraries.dev package
export { BotAvatar } from 'bot-avatars';

// ─── Robot AI Chatbot Icon Component (Living BotAvatar Rig) ───────

export interface RobotChatbotIconProps {
  size?: number;
  className?: string;
  state?: 'default' | 'working' | 'sleeping';
  interactive?: boolean;
  animated?: boolean;
  onClick?: () => void;
}

export const RobotChatbotIcon: React.FC<RobotChatbotIconProps> = ({
  size = 34,
  className = '',
  state = 'default',
  interactive = true,
  animated = true,
  onClick,
}) => {
  const instanceId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const goldGradId = `chvGold-${instanceId}`;
  const eyeGradId = `chvEye-${instanceId}`;
  const glowId = `chvGlow-${instanceId}`;

  const [isBlinking, setIsBlinking] = useState(false);
  const [lookOffset, setLookOffset] = useState({ x: 0, y: 0 });
  const [jumpPhase, setJumpPhase] = useState<'idle' | 'squash' | 'rise' | 'land'>('idle');
  const [spinDeg, setSpinDeg] = useState(0);

  // Natural eye blinking loop (every 3.8s to 5.5s)
  useEffect(() => {
    if (!animated || state === 'sleeping') return;
    let timer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 3500 + Math.random() * 2500;
      timer = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 140);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(timer);
  }, [animated, state]);

  // Natural idle glance loop
  useEffect(() => {
    if (!animated || state !== 'default') return;
    const interval = setInterval(() => {
      // Pick random glance direction (-1.5px to +1.5px)
      const glanceX = (Math.random() - 0.5) * 3;
      const glanceY = (Math.random() - 0.5) * 2;
      setLookOffset({ x: glanceX, y: glanceY });
      // Reset back to center after 1.8s
      setTimeout(() => {
        setLookOffset({ x: 0, y: 0 });
      }, 1800);
    }, 4800);
    return () => clearInterval(interval);
  }, [animated, state]);

  // Idle jump loop every 9s during default state
  useEffect(() => {
    if (!animated || state !== 'default') return;
    const interval = setInterval(() => {
      triggerHop(false);
    }, 9000);
    return () => clearInterval(interval);
  }, [animated, state]);

  // Physics-based jump with squash and stretch
  const triggerHop = (withSpin = true) => {
    if (jumpPhase !== 'idle') return;
    // 1. Crouch / Squash
    setJumpPhase('squash');
    setTimeout(() => {
      // 2. Rise & Stretch in air
      setJumpPhase('rise');
      if (withSpin) setSpinDeg((prev) => prev + 360);
      setTimeout(() => {
        // 3. Touch-down & Landing Squash
        setJumpPhase('land');
        setTimeout(() => {
          // 4. Settle back to rest
          setJumpPhase('idle');
        }, 160);
      }, 340);
    }, 90);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !animated || state === 'sleeping') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = Math.max(-1, Math.min(1, (e.clientX - centerX) / (rect.width / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - centerY) / (rect.height / 2)));
    setLookOffset({ x: dx * 1.8, y: dy * 1.4 });
  };

  const handlePointerLeave = () => {
    if (!interactive || !animated) return;
    setLookOffset({ x: 0, y: 0 });
  };

  const handleClick = (e: React.MouseEvent) => {
    if (interactive && animated) {
      triggerHop(true);
    }
    onClick?.();
  };

  // Jump transform calculations
  let transformStr = animated ? `rotate(${spinDeg}deg)` : '';
  if (animated && jumpPhase === 'squash') {
    transformStr += ' scale(1.15, 0.82) translateY(2px)';
  } else if (animated && jumpPhase === 'rise') {
    transformStr += ' scale(0.88, 1.18) translateY(-10px)';
  } else if (animated && jumpPhase === 'land') {
    transformStr += ' scale(1.18, 0.85) translateY(1px)';
  }

  const isWorking = state === 'working';
  const isSleeping = state === 'sleeping';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`chv-robot-avatar chv-robot-avatar--${state} ${isWorking ? 'chv-robot-working' : ''} ${className}`}
      aria-hidden="true"
      style={{
        overflow: 'visible',
        cursor: interactive ? 'pointer' : 'default',
        transform: transformStr,
        transformOrigin: '50% 85%',
        transition: jumpPhase === 'idle' ? 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.12s ease-out',
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4B8" />
          <stop offset="50%" stopColor="#E2BD44" />
          <stop offset="100%" stopColor="#A87B28" />
        </linearGradient>
        <radialGradient id={eyeGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isWorking ? '#FFFFFF' : '#A5F3FC'} />
          <stop offset="50%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </radialGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={isWorking ? 1.5 : 0.8} result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Antenna glowing energy pulse waves when working */}
      {isWorking && (
        <circle
          cx="18"
          cy="3"
          r="5"
          fill="none"
          stroke="#FFF4B8"
          strokeWidth="0.8"
          className="chv-antenna-beacon-wave"
        />
      )}

      {/* Antenna stalk */}
      <line
        x1="18"
        y1="3.5"
        x2="18"
        y2="8"
        stroke={`url(#${goldGradId})`}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Antenna glowing beacon sphere */}
      <circle
        cx="18"
        cy="3"
        r={isWorking ? 3.2 : 2.5}
        fill={`url(#${goldGradId})`}
        filter={`url(#${glowId})`}
        style={{
          transition: 'r 0.3s ease',
        }}
      />

      {/* Robot Side Ears / Sensors */}
      <rect x="2" y="14" width="3" height="7" rx="1.5" fill={`url(#${goldGradId})`} />
      <rect x="31" y="14" width="3" height="7" rx="1.5" fill={`url(#${goldGradId})`} />

      {/* Robot Head Body */}
      <rect
        x="5"
        y="8"
        width="26"
        height="21"
        rx="6"
        fill="#26170E"
        stroke={`url(#${goldGradId})`}
        strokeWidth="2.2"
      />

      {/* Visor Screen */}
      <rect
        x="8"
        y="11.5"
        width="20"
        height="13.5"
        rx="4"
        fill="#0E0805"
        stroke="#E2BD44"
        strokeOpacity="0.6"
        strokeWidth="1.2"
      />

      {/* Dynamic Eyes Group (Smooth Pupil Glance & Tracking) */}
      <g
        transform={`translate(${lookOffset.x}, ${lookOffset.y})`}
        style={{
          transition: 'transform 0.18s cubic-bezier(0.2, 0.8, 0.4, 1)',
        }}
      >
        {isSleeping ? (
          // Sleeping shut lids
          <>
            <path d="M11 17 Q13.2 19 15.5 17" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M20.5 17 Q22.7 19 25 17" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Left Eye (Expressive Glowing AI Cyan) */}
            <rect
              x="11"
              y={isBlinking ? 16.5 : 14.5}
              width="4.5"
              height={isBlinking ? 1 : 5}
              rx={isBlinking ? 0.5 : 1.5}
              fill={`url(#${eyeGradId})`}
              filter={`url(#${glowId})`}
              style={{ transition: 'height 0.08s, y 0.08s' }}
            />
            {!isBlinking && <circle cx="12.2" cy="15.7" r="0.8" fill="#FFFFFF" />}

            {/* Right Eye (Expressive Glowing AI Cyan) */}
            <rect
              x="20.5"
              y={isBlinking ? 16.5 : 14.5}
              width="4.5"
              height={isBlinking ? 1 : 5}
              rx={isBlinking ? 0.5 : 1.5}
              fill={`url(#${eyeGradId})`}
              filter={`url(#${glowId})`}
              style={{ transition: 'height 0.08s, y 0.08s' }}
            />
            {!isBlinking && <circle cx="21.7" cy="15.7" r="0.8" fill="#FFFFFF" />}
          </>
        )}
      </g>

      {/* Friendly Robot Smile */}
      <path
        d={isWorking ? "M13 21 C15.5 24.2 20.5 24.2 23 21" : "M13.5 21.8 C15.5 23.5 20.5 23.5 22.5 21.8"}
        stroke={`url(#${goldGradId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ─── Golden Orbit Orb Component (100% crash-proof GPU CSS — 60fps golden orbit) ───

export const GoldenOrbitOrb: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => {
  return (
    <div
      className={`chv-golden-orbit-orb ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      aria-hidden="true"
    >
      <div className="chv-orbit-ring chv-orbit-ring--1" />
      <div className="chv-orbit-ring chv-orbit-ring--2" />
      <div className="chv-orbit-core" />
      <div className="chv-orbit-satellite" />
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

// ─── Quick suggestion chips by Role ───────────────────────────────

const GUEST_SUGGESTIONS = [
  '🍫 What chocolates do you sell?',
  '🎁 Gift hamper options',
  '🚚 Delivery info',
  '💳 Payment methods',
  '↩️ Return policy',
];

const CUSTOMER_SUGGESTIONS = [
  '📦 Track my recent order',
  '🍫 How many chocolates do you sell?',
  '✨ Best chocolates for me',
  '🪙 My rewards & coins',
  '🏷️ Available coupons',
];

const ADMIN_SUGGESTIONS = [
  '📊 What are the stocks in the present inventory?',
  '➕ What are the steps to add a new product?',
  '⚠️ Are there any low stock products?',
  '📦 Store orders status',
];

const SUPERADMIN_SUGGESTIONS = [
  '💰 Total sales & revenue analytics',
  '📅 What was today\'s sale?',
  '📆 What was on September 14th sale?',
  '📈 This month\'s revenue report',
];

const DELIVERY_SUGGESTIONS = [
  '📦 Show my assigned queue',
  '⚡ Next nearest delivery stop',
  '📜 My delivery history',
  '🔑 OTP verification help',
  '📍 Route map & navigation',
  '🏢 Central Hub details',
];

// ─── Hidden routes (only login/auth pages) ─────────────────────────

const HIDDEN_ON_PATHS = [
  '/login', '/register', '/set-password', '/forgot-password',
];

// ─── Asset paths (served from /public) ───────────────────────────

const LOGO_BADGE = '/assets/logo-badge.jpg'; // wolf medallion — brand seal

// ─── Helpers ──────────────────────────────────────────────────────

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

const uid = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Helper to get matching icon for an action
const getActionIcon = (url: string, iconType?: string) => {
  // Superadmin
  if (iconType === 'revenue' || url.includes('section=revenue')) {
    return <TrendingUp size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'sales' || url.includes('sales')) {
    return <BarChart3 size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'reports' || url.includes('reports')) {
    return <FileSpreadsheet size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'enterprise' || url.includes('enterprise') || iconType === 'shield') {
    return <ShieldCheck size={14} className="chv-chat-action-icon" />;
  }

  // Admin
  if (iconType === 'warehouse' || url.includes('products') || url.includes('inventory')) {
    return <Warehouse size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'receipt' || url.includes('offline')) {
    return <Receipt size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'dashboard' || url === '/admin' || url === '/superadmin') {
    return <LayoutDashboard size={14} className="chv-chat-action-icon" />;
  }

  // Delivery Partner
  if (url.startsWith('/delivery')) {
    if (url.includes('tab=queue') || iconType === 'package') {
      return <Package size={14} className="chv-chat-action-icon" />;
    }
    if (url.includes('tab=route') || iconType === 'route') {
      return <Route size={14} className="chv-chat-action-icon" />;
    }
    if (url.includes('tab=history') || iconType === 'award') {
      return <Award size={14} className="chv-chat-action-icon" />;
    }
    if (url.includes('tab=profile') || iconType === 'user') {
      return <User size={14} className="chv-chat-action-icon" />;
    }
    return <Navigation size={14} className="chv-chat-action-icon" />;
  }

  // Customer & Common
  if (url.includes('select-product') || url.includes('browse-more') || url.includes('start-order') || iconType === 'shop' || url.startsWith('/shop')) {
    return <ShoppingBag size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('add-cart') || iconType === 'cart' || url.startsWith('/cart')) {
    return <ShoppingCart size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('start-checkout') || iconType === 'package' || url.includes('orders')) {
    return <Package size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('use-location')) {
    return <MapPin size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('use-saved-address') || url.includes('enter-address')) {
    return <User size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('apply-coins') || url.includes('skip-coins') || iconType === 'coins' || url.includes('rewards')) {
    return <Coins size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('pay-cod')) {
    return <Banknote size={14} className="chv-chat-action-icon" />;
  }
  if (url.includes('pay-online')) {
    return <CreditCard size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'product' || url.startsWith('/product')) {
    return <Sparkles size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'tag' || url.includes('coupons')) {
    return <Tag size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'help' || url.includes('help') || url.startsWith('/contact') || url.includes('complaints')) {
    return <HelpCircle size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'heart' || url.startsWith('/wishlist')) {
    return <Heart size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'user' || url.includes('profile') || url.includes('customers')) {
    return <User size={14} className="chv-chat-action-icon" />;
  }
  return <ArrowUpRight size={14} className="chv-chat-action-icon" />;
};

// Fallback action resolver ensuring action redirect buttons are always displayed
const resolveMessageActions = (msg: DisplayMessage): ChatAction[] => {
  if (msg.role !== 'assistant') return [];
  const text = msg.content.toLowerCase();

  // 1. PAYMENT SELECTION STEP: When Coco asks how customer wants to pay, or provides delivery charges / total
  const isPaymentStep =
    text.includes('how would you like to pay') ||
    text.includes('pay for your order') ||
    text.includes('payment method') ||
    text.includes('cash on delivery or') ||
    text.includes('upi / online') ||
    text.includes('upi or online') ||
    text.includes('choose how to pay') ||
    text.includes('delivery fee of') ||
    text.includes('standard delivery fee') ||
    text.includes('bringing your total to') ||
    text.includes('courier charges');

  if (isPaymentStep) {
    return [
      { label: '💵 Cash on Delivery (COD)', url: 'action:pay-cod', icon: 'receipt' },
      { label: '💳 UPI / Online Payment', url: 'action:pay-online', icon: 'credit-card' },
    ];
  }

  // 2. ADDRESS SELECTION STEP: When Coco asks for delivery address
  const isAddressStep =
    text.includes('saved delivery address') ||
    text.includes('deliver to this address') ||
    text.includes('delivery details') ||
    text.includes('provide your delivery');

  if (isAddressStep) {
    return [
      { label: '📍 Deliver to Saved Address', url: 'action:use-saved-address', icon: 'user' },
      { label: '📍 Use Current Location', url: 'action:use-location', icon: 'user' },
      { label: '✏️ Enter New Address', url: 'action:enter-address', icon: 'user' },
    ];
  }

  if (msg.actions && msg.actions.length > 0) {
    return msg.actions;
  }

  const fallbackActions: ChatAction[] = [];

  if (
    text.includes('chocolate') ||
    text.includes('product') ||
    text.includes('hamper') ||
    text.includes('truffle') ||
    text.includes('collection') ||
    text.includes('shop') ||
    text.includes('flavour') ||
    text.includes('flavor')
  ) {
    fallbackActions.push({ label: 'Visit Shop Page', url: '/shop', icon: 'shop' });
  }

  if (
    text.includes('order') ||
    text.includes('track') ||
    text.includes('shipment') ||
    text.includes('delivery') ||
    text.includes('purchase')
  ) {
    fallbackActions.push({ label: 'Track Orders in Dashboard', url: '/dashboard?section=orders', icon: 'package' });
  }

  if (text.includes('coin') || text.includes('wallet') || text.includes('reward')) {
    fallbackActions.push({ label: 'View Rewards & Coins', url: '/dashboard?section=rewards', icon: 'coins' });
  }

  if (text.includes('coupon') || text.includes('discount') || text.includes('promo')) {
    fallbackActions.push({ label: 'View Available Coupons', url: '/dashboard?section=coupons', icon: 'tag' });
  }

  if (text.includes('help') || text.includes('support') || text.includes('contact') || text.includes('refund')) {
    fallbackActions.push({ label: 'Help & Support', url: '/dashboard?section=help', icon: 'help' });
  }

  return fallbackActions;
};

// Rich message renderer: parses markdown images ![alt](url), markdown links [text](url), **bold**, and bullet points
const renderTextSegments = (text: string, keyPrefix: string, onNavigate?: (url: string) => void) => {
  const lines = text.split('\n');
  return (
    <span key={keyPrefix}>
      {lines.map((rawLine, lIdx) => {
        let line = rawLine;
        let isBullet = false;
        if (/^\s*[*•-]\s+/.test(line)) {
          isBullet = true;
          line = line.replace(/^\s*[*•-]\s+/, '');
        }

        // Split by bold (**...**) and markdown links ([text](url))
        const segments = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
        return (
          <React.Fragment key={`${keyPrefix}-l-${lIdx}`}>
            {lIdx > 0 && <br />}
            {isBullet && <span style={{ color: '#C9A84C', marginRight: '6px' }}>•</span>}
            {segments.map((seg, sIdx) => {
              if (seg.startsWith('**') && seg.endsWith('**')) {
                return (
                  <strong key={sIdx} style={{ color: '#E8D48B', fontWeight: 600 }}>
                    {seg.slice(2, -2)}
                  </strong>
                );
              }
              const linkMatch = seg.match(/^\[(.*?)\]\((.*?)\)$/);
              if (linkMatch) {
                const linkText = linkMatch[1];
                const linkUrl = linkMatch[2];
                return (
                  <button
                    key={sIdx}
                    type="button"
                    className="chv-chat-inline-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate?.(linkUrl);
                    }}
                  >
                    {linkText}
                  </button>
                );
              }
              return seg;
            })}
          </React.Fragment>
        );
      })}
    </span>
  );
};

const renderFormattedContent = (content: string, onNavigate?: (url: string) => void) => {
  // Robust markdown image regex matching across spaces/newlines
  const imageRegex = /!\[([^\]]*)\]\(\s*([^\s)]+)\s*\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(renderTextSegments(textBefore, `pre-${lastIndex}`, onNavigate));
    }
    const alt = match[1]?.trim() || 'Chovique Chocolate';
    const src = match[2]?.trim();
    parts.push(
      <div
        key={`c-img-${match.index}`}
        className="chv-chat-product-card"
        onClick={() => onNavigate?.('/shop')}
        title="Click to view in Shop"
        role="button"
        tabIndex={0}
      >
        <img
          src={src}
          alt={alt}
          className="chv-chat-product-img"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />
        <div className="chv-chat-product-caption">
          <div className="chv-chat-product-title">{alt}</div>
          <span className="chv-chat-product-action-hint">Explore in Shop &rarr;</span>
        </div>
      </div>
    );
    lastIndex = match.index + match[0].length;
  }

  const textAfter = content.substring(lastIndex);
  if (textAfter) {
    parts.push(renderTextSegments(textAfter, `post-${lastIndex}`, onNavigate));
  }

  return parts.length > 0 ? parts : content;
};

// ─── Send SVG Icon ────────────────────────────────────────────────

const SendIcon: React.FC<{ active?: boolean }> = ({ active = false }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={active ? '1.5' : '2.2'}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: 'translateX(1px)' }}
    aria-hidden="true"
  >
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
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

// ─── Component ────────────────────────────────────────────────────

const ChatbotWidgetInner: React.FC = () => {
  // ALL hooks first — never after a conditional return
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    role,
    cart,
    addToCart,
    clearCart,
    addresses,
    wallet,
    refreshWallet,
    placeOrderLocal,
  } = useApp();

  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.price || item.product?.price || 0) * (item.quantity || 1),
    0
  );

  const userPhone = (user as any)?.phone || user?.profile?.phone || '';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [hasDismissedTeaser, setHasDismissedTeaser] = useState(false);

  // Conversational Ordering state
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderAddress, setOrderAddress] = useState<CustomerAddress | null>(null);
  const [shippingQuote, setShippingQuote] = useState<ShippingCalculateResponse | null>(null);
  const [coinsToRedeem, setCoinsToRedeem] = useState<number>(0);
  const [showAddressForm, setShowAddressForm] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [orderCompleted, setOrderCompleted] = useState<boolean>(false);

  // Address form fields
  const [addressForm, setAddressForm] = useState({
    name: user?.name || '',
    phone: userPhone,
    house_number: '',
    street: '',
    area: '',
    city: 'Hyderabad',
    state: 'Telangana',
    zip: '500033',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Authenticated user detection
  const displayName = user?.name?.trim() || '';
  const firstName = displayName ? displayName.split(' ')[0] : '';
  const isLoggedIn = Boolean(user && (user.id || user.name));

  // Load products catalog for in-chat ordering on mount
  useEffect(() => {
    productService
      .getProducts({ per_page: 30 })
      .then((res) => {
        if (res && res.items) setProductsCatalog(res.items);
      })
      .catch((err) => console.warn('Could not load products catalog for chatbot:', err));
  }, []);

  // Sync user details to address form
  useEffect(() => {
    if (user) {
      setAddressForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || userPhone,
      }));
    }
  }, [user, userPhone]);

  // Order Placement Execution
  const executeOrderPlacement = async (paymentMethod = 'Cash on Delivery') => {
    setIsPlacingOrder(true);
    setIsLoading(true);

    const userMsg: DisplayMessage = {
      id: uid(),
      role: 'user',
      content: paymentMethod,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const activeAddress =
        orderAddress ||
        addresses.find((a) => a.isDefault) ||
        addresses[0];

      const nameClean = (activeAddress?.name || user?.name || 'Customer').trim();
      const streetClean = (
        (activeAddress?.house_number ? activeAddress.house_number + ', ' : '') +
        (activeAddress?.street || 'Central Jubilee Hills')
      ).trim();
      const cityClean = (activeAddress?.city || 'Hyderabad').trim();
      const stateClean = (activeAddress?.state || 'Telangana').trim();
      const zipDigits =
        (activeAddress?.zip || activeAddress?.pincode || '500033')
          .toString()
          .replace(/\D/g, '')
          .slice(0, 6) || '500033';
      const phoneDigits =
        (activeAddress?.phone || userPhone || '9876543210')
          .toString()
          .replace(/\D/g, '')
          .slice(-10) || '9876543210';

      let itemsToOrder = cart.map((it) => ({
        product_id: it.product?.id || it.id || '',
        quantity: it.quantity || 1,
      }));

      if (itemsToOrder.length === 0 && selectedProduct) {
        itemsToOrder = [
          {
            product_id: selectedProduct.id,
            quantity: 1,
          },
        ];
      }

      const deliveryOption =
        shippingQuote?.fulfillment_type === 'LOCAL'
          ? 'Local Express Delivery'
          : 'Standard Delivery';

      const payload: OrderPayload = {
        items: itemsToOrder,
        shipping_address: {
          name: nameClean,
          street: streetClean,
          city: cityClean,
          state: stateClean,
          zip: zipDigits,
          phone: phoneDigits,
        },
        delivery_option: deliveryOption,
        payment_method: 'Cash on Delivery',
        coins_to_use: coinsToRedeem > 0 ? coinsToRedeem : undefined,
      };

      const placedOrder = await orderService.placeOrder(payload);

      // Successfully placed! Update app state
      try {
        await clearCart();
      } catch (e) {
        console.warn('Error clearing cart:', e);
      }
      try {
        await refreshWallet();
      } catch (e) {
        console.warn('Error refreshing wallet:', e);
      }
      if (placedOrder) {
        placeOrderLocal(placedOrder);
      }
      setOrderCompleted(true);
      setCoinsToRedeem(0);

      const orderRef = placedOrder.id
        ? placedOrder.id.slice(-6).toUpperCase()
        : 'ORD-' + Math.floor(1000 + Math.random() * 9000);

      const itemsDesc =
        cart.length > 0
          ? cart.map((i) => `• **${i.name}** x${i.quantity}`).join('\n')
          : `• **${selectedProduct?.name || 'Artisan Chocolate'}** x1`;

      const finalTotal = placedOrder.total || cartTotal || 600;

      const confirmationText =
        `🎉 **Order Placed Successfully!**\n\n` +
        `Order Reference: **#CHV-${orderRef}**\n\n` +
        `📦 **Order Summary**:\n` +
        `${itemsDesc}\n` +
        `• Delivery Mode: **${deliveryOption}** (${shippingQuote?.estimated_delivery || 'Within 2 hours'})\n` +
        `• Delivery Address: 📍 ${streetClean}, ${cityClean} - ${zipDigits}\n` +
        `• Payment Method: **Cash on Delivery (COD)**\n` +
        `• Total Amount to Pay on Arrival: **₹${finalTotal.toLocaleString('en-IN')}**\n\n` +
        `Thank you for ordering, **${firstName || displayName || 'Valued Customer'}**! 🍫✨ Our master chocolatier has received your order and is handcrafting your package with temperature-safe luxury packaging. You can track live dispatch milestones right in your dashboard!`;

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: confirmationText,
          timestamp: new Date(),
          actions: [
            {
              label: 'Track Orders in Dashboard',
              url: '/dashboard?section=orders',
              icon: 'package',
            },
            {
              label: 'Visit Shop Page',
              url: '/shop',
              icon: 'shop',
            },
          ],
        },
      ]);
    } catch (orderErr: unknown) {
      console.error('Order placement failed:', orderErr);
      const errMsg =
        orderErr instanceof Error
          ? orderErr.message
          : 'Unable to place order at this moment. Please check your delivery address and try again.';
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'error',
          content: `Order placement notice: ${errMsg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsPlacingOrder(false);
      setIsLoading(false);
    }
  };

  // Online Payment (Razorpay) Execution
  const executeOnlinePayment = async () => {
    setIsPlacingOrder(true);
    setIsLoading(true);

    const userMsg: DisplayMessage = {
      id: uid(),
      role: 'user',
      content: '💳 UPI / Online Payment',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const activeAddress =
        orderAddress ||
        addresses.find((a) => a.isDefault) ||
        addresses[0];

      const nameClean = (activeAddress?.name || user?.name || 'Customer').trim();
      const streetClean = (
        (activeAddress?.house_number ? activeAddress.house_number + ', ' : '') +
        (activeAddress?.street || 'Central Jubilee Hills')
      ).trim();
      const cityClean = (activeAddress?.city || 'Hyderabad').trim();
      const stateClean = (activeAddress?.state || 'Telangana').trim();
      const zipDigits =
        (activeAddress?.zip || activeAddress?.pincode || '500033')
          .toString()
          .replace(/\D/g, '')
          .slice(0, 6) || '500033';
      const phoneDigits =
        (activeAddress?.phone || userPhone || '9876543210')
          .toString()
          .replace(/\D/g, '')
          .slice(-10) || '9876543210';

      let itemsToOrder = cart.map((it) => ({
        product_id: it.product?.id || it.id || '',
        quantity: it.quantity || 1,
      }));

      if (itemsToOrder.length === 0 && selectedProduct) {
        itemsToOrder = [
          {
            product_id: selectedProduct.id,
            quantity: 1,
          },
        ];
      }

      const deliveryOption =
        shippingQuote?.fulfillment_type === 'LOCAL'
          ? 'Local Express Delivery'
          : 'Standard Delivery';

      const payload: OrderPayload = {
        items: itemsToOrder,
        shipping_address: {
          name: nameClean,
          street: streetClean,
          city: cityClean,
          state: stateClean,
          zip: zipDigits,
          phone: phoneDigits,
        },
        delivery_option: deliveryOption,
        payment_method: 'Online Payment',
        coins_to_use: coinsToRedeem > 0 ? coinsToRedeem : undefined,
      };

      const initData = await orderService.initiateCheckout(payload);
      if (!initData || !initData.razorpay_order_id) {
        throw new Error('Could not initiate online payment session with Razorpay.');
      }

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !(window as any).Razorpay) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      const razorpayKey =
        initData.key_id ||
        ((import.meta as any).env?.VITE_RAZORPAY_KEY_ID as string | undefined)?.trim();

      if (!razorpayKey) {
        throw new Error('Payment gateway configuration is temporarily unavailable. Please choose Cash on Delivery.');
      }

      const options = {
        key: razorpayKey,
        amount: initData.amount,
        currency: initData.currency || 'INR',
        name: 'CHOVIQUE',
        description: `Order #${initData.order_id}`,
        image: '/assets/logo-badge.jpg',
        order_id: initData.razorpay_order_id,
        prefill: {
          name: nameClean,
          contact: phoneDigits,
          email: user?.email || '',
        },
        theme: {
          color: '#1a100c',
        },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          setIsPlacingOrder(true);
          setIsLoading(true);
          try {
            const verifyRes = await orderService.verifyPayment({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              order_id: initData.order_id,
            });

            if (!verifyRes.success) {
              throw new Error(verifyRes.message || 'Payment verification failed.');
            }

            const confirmedOrder = await orderService.getOrder(initData.order_id);
            try {
              await clearCart();
            } catch (e) {
              console.warn('Error clearing cart:', e);
            }
            try {
              await refreshWallet();
            } catch (e) {
              console.warn('Error refreshing wallet:', e);
            }
            if (confirmedOrder) {
              placeOrderLocal(confirmedOrder);
            }
            setOrderCompleted(true);
            setCoinsToRedeem(0);

            const orderRef = confirmedOrder.id
              ? confirmedOrder.id.slice(-6).toUpperCase()
              : 'ORD-' + Math.floor(1000 + Math.random() * 9000);

            const itemsDesc =
              cart.length > 0
                ? cart.map((i) => `• **${i.name}** x${i.quantity}`).join('\n')
                : `• **${selectedProduct?.name || 'Artisan Chocolate'}** x1`;

            const finalTotal = confirmedOrder.total || cartTotal || 600;

            const confirmationText =
              `🎉 **Payment Verified & Order Placed Successfully!**\n\n` +
              `Order Reference: **#CHV-${orderRef}**\n` +
              `Razorpay Payment ID: **${resp.razorpay_payment_id}**\n\n` +
              `📦 **Order Summary**:\n` +
              `${itemsDesc}\n` +
              `• Delivery Mode: **${deliveryOption}** (${shippingQuote?.estimated_delivery || 'Within 2 hours'})\n` +
              `• Delivery Address: 📍 ${streetClean}, ${cityClean} - ${zipDigits}\n` +
              `• Payment Method: **Online Payment (Verified via Razorpay)**\n` +
              `• Total Amount Paid: **₹${finalTotal.toLocaleString('en-IN')}**\n\n` +
              `Thank you for ordering, **${firstName || displayName || 'Valued Customer'}**! 🍫✨ Our master chocolatier has received your order and is handcrafting your package with temperature-safe luxury packaging. You can track live dispatch milestones right in your dashboard!`;

            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: 'assistant',
                content: confirmationText,
                timestamp: new Date(),
                actions: [
                  {
                    label: 'Track Orders in Dashboard',
                    url: '/dashboard?section=orders',
                    icon: 'package',
                  },
                  {
                    label: 'Visit Shop Page',
                    url: '/shop',
                    icon: 'shop',
                  },
                ],
              },
            ]);
          } catch (vErr: unknown) {
            console.error('Payment verification failed:', vErr);
            const msg = vErr instanceof Error ? vErr.message : 'Payment verification error.';
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: 'error',
                content: `Payment verification notice: ${msg}. If money was deducted, our store concierge will verify and dispatch your order promptly.`,
                timestamp: new Date(),
              },
            ]);
          } finally {
            setIsPlacingOrder(false);
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPlacingOrder(false);
            setIsLoading(false);
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: 'assistant',
                content:
                  'The online payment window was closed before completion. Would you like to retry or proceed with Cash on Delivery (COD)? 🍫',
                timestamp: new Date(),
                actions: [
                  {
                    label: '💳 Retry Online Payment',
                    url: 'action:pay-online',
                    icon: 'arrow',
                  },
                  {
                    label: '💵 Cash on Delivery (COD)',
                    url: 'action:pay-cod',
                    icon: 'receipt',
                  },
                ],
              },
            ]);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (payErr: unknown) {
      console.error('Online checkout failed:', payErr);
      const msg = payErr instanceof Error ? payErr.message : 'Could not initiate online payment.';
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'error',
          content: `Online payment notice: ${msg}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsPlacingOrder(false);
      setIsLoading(false);
    }
  };

  // Conversational action dispatcher
  const handleOrderingAction = async (actionUrl: string) => {
    const parts = actionUrl.split(':');
    const actionType = parts[1];
    const arg1 = parts[2];
    const arg2 = parts[3];

    // 1. Start order inquiry
    if (actionType === 'start-order') {
      setOrderCompleted(false);
      sendMessage('Can you place an order for me?');
      return;
    }

    // 2. Select product
    if (actionType === 'select-product') {
      setOrderCompleted(false);
      const prod =
        productsCatalog.find(
          (p) =>
            p.id === arg1 ||
            p.name.toLowerCase().includes((arg1 || '').replace(/-/g, ' ').toLowerCase())
        ) || productsCatalog[0];

      if (prod) {
        setSelectedProduct(prod);
        sendMessage(`I would like to order ${prod.name}`);
      } else {
        sendMessage(`I would like to order chocolate`);
      }
      return;
    }

    // 3. Add to cart
    if (actionType === 'add-cart') {
      setOrderCompleted(false);
      const qty = parseInt(arg2 || '1', 10) || 1;
      const prod =
        productsCatalog.find(
          (p) =>
            p.id === arg1 ||
            p.name.toLowerCase().includes((arg1 || '').replace(/-/g, ' ').toLowerCase())
        ) || selectedProduct || productsCatalog[0];

      if (prod) {
        try {
          await addToCart(prod, qty);
        } catch (err) {
          console.warn('Failed to add to cart:', err);
        }
        sendMessage(`Please add ${qty} box of ${prod.name} to my cart`);
      } else {
        sendMessage(`Please add ${qty} item to my cart`);
      }
      return;
    }

    // 4. Browse more chocolates
    if (actionType === 'browse-more') {
      setOrderCompleted(false);
      sendMessage('What other chocolates do you have?');
      return;
    }

    // 5. Start checkout
    if (actionType === 'start-checkout') {
      setOrderCompleted(false);
      sendMessage('Can you place the order for me?');
      return;
    }

    // 6. Use saved address
    if (actionType === 'use-saved-address') {
      const defAddr = addresses.find((a) => a.isDefault) || addresses[0];
      if (defAddr) {
        setOrderAddress(defAddr);
        try {
          const quote = await shippingService.calculateShipping({
            pincode: defAddr.zip || defAddr.pincode || '500033',
            subtotal: cartTotal || 600,
          });
          setShippingQuote(quote);
        } catch (e) {
          console.warn('Shipping calculation error:', e);
        }
        const fullAddrStr = `${defAddr.house_number ? defAddr.house_number + ', ' : ''}${defAddr.street}, ${defAddr.city}, ${defAddr.state} - ${defAddr.zip}`;
        sendMessage(`Please use my default saved address: ${fullAddrStr}`);
      } else {
        setShowAddressForm(true);
        sendMessage(`I don't have a saved address yet. Let me enter my delivery address.`);
      }
      return;
    }

    // 7. Use current location button in chat
    if (actionType === 'use-location') {
      setIsLocating(true);
      try {
        const coords = await getBrowserCoordinates();
        const parsed = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);
        const newAddr: CustomerAddress = {
          id: 'loc-' + Date.now(),
          title: 'Current Location',
          name: user?.name || 'Customer',
          house_number: parsed.house_number || 'Door / Flat',
          street: parsed.street || 'Current GPS Location',
          area: parsed.area || '',
          city: parsed.city || 'Hyderabad',
          district: parsed.district || parsed.city || 'Hyderabad',
          state: parsed.state || 'Telangana',
          zip: parsed.pincode || '500033',
          phone: userPhone || '9876543210',
          latitude: coords.latitude,
          longitude: coords.longitude,
          isDefault: false,
        };
        setOrderAddress(newAddr);
        try {
          const quote = await shippingService.calculateShipping({
            pincode: newAddr.zip,
            subtotal: cartTotal || 600,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          setShippingQuote(quote);
        } catch (e) {
          console.warn('Shipping calculation error:', e);
        }
        const fullAddrStr = `${newAddr.house_number ? newAddr.house_number + ', ' : ''}${newAddr.street}, ${newAddr.city}, ${newAddr.state} - ${newAddr.zip}`;
        sendMessage(`📍 Use my current GPS location: ${fullAddrStr}`);
      } catch (locErr) {
        console.warn('Geolocation failed:', locErr);
        setShowAddressForm(true);
        sendMessage('Please let me enter my address details manually.');
      } finally {
        setIsLocating(false);
      }
      return;
    }

    // 8. Enter address manually
    if (actionType === 'enter-address') {
      setShowAddressForm(true);
      return;
    }

    // 9. Apply loyalty coins
    if (actionType === 'apply-coins') {
      const availCoins = wallet?.coin_balance || 500;
      setCoinsToRedeem(availCoins);
      sendMessage(`Yes, please use my ${availCoins} loyalty coins for an instant discount.`);
      return;
    }

    // 10. Skip loyalty coins
    if (actionType === 'skip-coins') {
      setCoinsToRedeem(0);
      sendMessage(`No, proceed without using loyalty coins.`);
      return;
    }

    // 11. Pay Cash on Delivery
    if (actionType === 'pay-cod') {
      await executeOrderPlacement('Cash on Delivery');
      return;
    }

    // 12. Pay Online (Razorpay)
    if (actionType === 'pay-online') {
      await executeOnlinePayment();
      return;
    }
  };

  const handleConfirmAddressForm = async () => {
    if (!addressForm.house_number.trim() || !addressForm.street.trim()) {
      alert('Please enter your house/flat number and street.');
      return;
    }
    if (addressForm.zip.length !== 6) {
      alert('Please enter a valid 6-digit PIN code.');
      return;
    }
    const newAddr: CustomerAddress = {
      id: 'addr-' + Date.now(),
      title: 'Delivery Address',
      name: addressForm.name || user?.name || 'Customer',
      house_number: addressForm.house_number,
      street: addressForm.street,
      area: addressForm.area,
      city: addressForm.city || 'Hyderabad',
      state: addressForm.state || 'Telangana',
      zip: addressForm.zip,
      phone: addressForm.phone || userPhone || '9876543210',
      isDefault: false,
    };
    setOrderAddress(newAddr);
    setShowAddressForm(false);

    try {
      const quote = await shippingService.calculateShipping({
        pincode: newAddr.zip,
        subtotal: cartTotal || 600,
      });
      setShippingQuote(quote);
    } catch (e) {
      console.warn('Shipping calc error:', e);
    }

    const addrStr = `${newAddr.house_number}, ${newAddr.street}${newAddr.area ? ', ' + newAddr.area : ''}, ${newAddr.city}, ${newAddr.state} - ${newAddr.zip}`;
    sendMessage(`My delivery address is: ${addrStr}. Phone: ${newAddr.phone}`);
  };

  const handleActionClick = async (url: string) => {
    if (url.startsWith('action:')) {
      await handleOrderingAction(url);
      return;
    }
    navigate(url);
    // User requirement: automatically close chatbot when redirecting to another page
    setIsOpen(false);
  };

  // Automatically close chatbot on route change or navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // User requirement: Close chatbot when clicking anywhere outside on the page
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      // If clicking inside the chat panel or the FAB toggle button, keep open
      if (
        panelRef.current?.contains(target) ||
        fabRef.current?.contains(target)
      ) {
        return;
      }
      // Clicked on any other page element, button, link, or background -> close chatbot!
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // ─── Show teaser bubble on reload / first visit ──────────────
  useEffect(() => {
    // Show teaser after 1.2s delay if chat is not open
    const timer = setTimeout(() => {
      setShowTeaser(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Dismiss teaser if chat panel opens
  useEffect(() => {
    if (isOpen) {
      setShowTeaser(false);
    }
  }, [isOpen]);

  // ─── Visibility guard (after hooks) ───────────────────────────
  const shouldHide = HIDDEN_ON_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/')
  );

  // ─── Scroll to bottom ─────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && (messages.length > 0 || isLoading)) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, scrollToBottom]);

  // ─── Focus on open ────────────────────────────────────────────
  useLayoutEffect(() => {
    if (isOpen && !shouldHide && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 380);
      return () => clearTimeout(t);
    }
  }, [isOpen, shouldHide]);

  // ─── Conditional render (AFTER all hooks) ─────────────────────
  if (shouldHide) return null;

  // ─── Textarea auto-resize ─────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  const resetInput = () => {
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = '24px';
      inputRef.current.focus();
    }
  };

  // ─── Send message ─────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const lowerText = trimmed.toLowerCase();
    if (
      (lowerText === 'cash on delivery' || lowerText === 'cod' || lowerText === 'pay cash on delivery') &&
      (cart.length > 0 || selectedProduct)
    ) {
      await executeOrderPlacement('Cash on Delivery');
      return;
    }

    if (
      (lowerText === 'online payment' ||
        lowerText === 'upi' ||
        lowerText === 'pay online' ||
        lowerText === 'upi / online payment' ||
        lowerText === 'pay with upi' ||
        lowerText === 'razorpay') &&
      (cart.length > 0 || selectedProduct)
    ) {
      await executeOnlinePayment();
      return;
    }

    const userMsg: DisplayMessage = { id: uid(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    resetInput();
    setIsLoading(true);

    // Keep input field always focused and ready for next typing
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    try {
      const history: ChatMessage[] = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // Pass user role to the API for role-based database intelligence
      const res = await chatService.sendMessage(trimmed, history, displayName, role);

      setMessages((prev) => [...prev, {
        id: uid(),
        role: 'assistant',
        content: res.reply,
        timestamp: new Date(),
        actions: res.actions,
      }]);
      if (!isOpen) setHasUnread(true);
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message
        : 'Coco is temporarily unavailable. Please try again or visit our website.';
      setMessages((prev) => [...prev, { id: uid(), role: 'error', content: detail, timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
      // Ensure input field is immediately active & focused after message sends
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        sendMessage(input);
      }
    }
  };

  const togglePanel = () => { setIsOpen((p) => !p); if (!isOpen) setHasUnread(false); };

  const handleChip = (chip: string) => {
    const text = chip.replace(/^[\p{Emoji}\s]+/u, '').trim();
    sendMessage(text);
  };

  const canSend = input.trim().length > 0 && !isLoading;
  const isDelivery = role === 'delivery_boy' || (role as string) === 'delivery' || location.pathname.startsWith('/delivery');

  const currentSuggestions =
    role === 'superadmin'
      ? SUPERADMIN_SUGGESTIONS
      : role === 'admin'
        ? ADMIN_SUGGESTIONS
        : isDelivery
          ? DELIVERY_SUGGESTIONS
          : isLoggedIn
            ? CUSTOMER_SUGGESTIONS
            : GUEST_SUGGESTIONS;

  const teaserTitle =
    role === 'superadmin'
      ? `Welcome, Superadmin ${firstName || displayName}! 📊`
      : role === 'admin'
        ? `Welcome, Admin ${firstName || displayName}! ⚙️`
        : isDelivery
          ? `Welcome, Delivery Partner ${firstName || displayName}! 🛵`
          : isLoggedIn
            ? `Welcome back, ${firstName || displayName}! 👋`
            : "Hi, I'm Coco Chatbot! 👋";

  const teaserSub =
    role === 'superadmin'
      ? "Review today's sales, revenue analytics, or executive reports ✨"
      : role === 'admin'
        ? "Check live inventory, stock levels, or manage products ✨"
        : isDelivery
          ? "Check your assigned queue, route stops, or OTP handoff ✨"
          : isLoggedIn
            ? "Looking for chocolates or checking your orders? Chat with me ✨"
            : "Looking for chocolates or need help? Click to chat with me ✨";

  const headerTitle =
    role === 'superadmin'
      ? 'Coco · Superadmin Analytics'
      : role === 'admin'
        ? 'Coco · Admin Assistant'
        : isDelivery
          ? 'Coco · Delivery Assistant'
          : 'Coco · Chovique AI';

  const headerStatus = isLoading
    ? 'Thinking…'
    : role === 'superadmin'
      ? `Online · Executive Insights for ${firstName || 'you'} 📊`
      : role === 'admin'
        ? `Online · Store Operations for ${firstName || 'you'} ⚙️`
        : isDelivery
          ? `Online · Dispatch Assistant for ${firstName || 'you'} 🛵`
          : isLoggedIn
            ? `Online · Helping ${firstName || 'you'} ✨`
            : 'Online · Here to help ✨';

  const welcomeHeroBubble =
    role === 'superadmin'
      ? `Welcome, Superadmin ${firstName || displayName}! 📊`
      : role === 'admin'
        ? `Welcome, Admin ${firstName || displayName}! ⚙️`
        : isDelivery
          ? `Welcome, Delivery Partner ${firstName || displayName}! 🛵`
          : isLoggedIn
            ? `Welcome back, ${firstName || displayName}! 👋`
            : "Welcome to Chovique! 👋";

  const welcomeHeroSub =
    role === 'superadmin'
      ? "I'm Coco, your executive analytics assistant. Ask me about today's sales, specific date reports (e.g. September 14th sales), or revenue trends directly from the database ✨"
      : role === 'admin'
        ? "I'm Coco, your store operations assistant. Ask me about live inventory stocks, low-stock alerts, or steps to add new products ✨"
        : isDelivery
          ? "I'm Coco, your delivery fulfillment assistant. Ask me about your assigned queue, route stops, delivery history, or OTP handoff instructions ✨"
          : isLoggedIn
            ? "I'm Coco, your personal chocolate assistant. Ask me anything about our chocolates, your orders, or gift hampers ✨"
            : "I'm Coco, your personal Chovique chocolate assistant. Ask me anything about our products, orders, or gifts ✨";

  const fabTitle =
    role === 'superadmin'
      ? `Chat with Coco · Superadmin Analytics (${firstName})`
      : role === 'admin'
        ? `Chat with Coco · Admin Operations (${firstName})`
        : isDelivery
          ? `Chat with Coco · Delivery Assistant (${firstName})`
          : isLoggedIn
            ? `Chat with Coco · Welcome ${firstName}`
            : 'Chat with Coco — Chovique AI Chatbot';

  // ─── Render ───────────────────────────────────────────────────
  return (
    <>
      {/* ════════════════════════════════════════
          FLOATING GREETING TEASER POPUP
          Shown on reload / visit to announce Coco Chatbot
          ════════════════════════════════════════ */}
      {showTeaser && !isOpen && !hasDismissedTeaser && (
        <div
          id="chv-chatbot-teaser"
          className="chv-chat-teaser"
          onClick={() => { setIsOpen(true); setShowTeaser(false); }}
          role="complementary"
          aria-label="Coco AI Chatbot Greeting"
        >
          <button
            className="chv-chat-teaser-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTeaser(false);
              setHasDismissedTeaser(true);
            }}
            aria-label="Dismiss greeting"
            title="Dismiss"
          >
            <CloseIcon />
          </button>

          <div className="chv-chat-teaser-badge-row">
            <span className="chv-chat-teaser-dot" />
            <span className="chv-chat-teaser-badge">Coco · AI Chatbot</span>
          </div>

          <div className="chv-chat-teaser-body">
            <div className="chv-chat-teaser-title">{teaserTitle}</div>
            <div className="chv-chat-teaser-sub">{teaserSub}</div>
          </div>

          <div className="chv-chat-teaser-tail" aria-hidden="true" />
        </div>
      )}

      {/* ════════════════════════════════════════
          FLOATING ACTION BUTTON
          Modern Recognizable Robot AI Chatbot Icon
          ════════════════════════════════════════ */}
      <button
        ref={fabRef}
        id="chv-chatbot-toggle"
        className={`chv-chat-fab${isOpen ? ' open' : ''}`}
        onClick={togglePanel}
        aria-label={isOpen ? 'Close Chovique AI Assistant' : 'Chat with Coco — Chovique AI Chatbot'}
        aria-expanded={isOpen}
        aria-controls="chv-chat-panel"
        title={fabTitle}
      >
        {/* Robot AI Chatbot Icon — shown when closed (pure robot icon without outer circle) */}
        <span className="chv-chat-fab-icon chv-chat-fab-icon--robot" aria-hidden="true">
          <div className="chv-chat-fab-robot-wrap">
            <RobotChatbotIcon size={54} state={isLoading ? 'working' : 'default'} />
          </div>
        </span>

        {/* Close X — shown when open on desktop */}
        <span className="chv-chat-fab-icon chv-chat-fab-icon--close" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>

        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span className="chv-chat-fab-badge" aria-label="New message">1</span>
        )}
      </button>

      {/* ════════════════════════════════════════
          CHAT PANEL
          ════════════════════════════════════════ */}
      <div
        ref={panelRef}
        id="chv-chat-panel"
        className={`chv-chat-panel${isOpen ? ' open' : ''}`}
        role="dialog"
        aria-label="Chovique AI Assistant — Coco"
        aria-modal="true"
        aria-hidden={!isOpen}
      >

        {/* ── Header ── */}
        <div className="chv-chat-header">
          <div className="chv-chat-header-overlay" aria-hidden="true" />

          {/* Avatar — Clean Robot Logo icon in header: stationary & calm, no jumping or moving */}
          <div className="chv-chat-avatar" aria-hidden="true">
            <div className="chv-chat-header-robot-wrap">
              <RobotChatbotIcon size={30} state="default" animated={false} interactive={false} />
            </div>
            <span className="chv-chat-avatar-dot" />
          </div>

          <div className="chv-chat-header-info">
            <div className="chv-chat-header-name">{headerTitle}</div>
            <div className="chv-chat-header-status">{headerStatus}</div>
          </div>

          <button className="chv-chat-header-close" onClick={togglePanel} aria-label="Close chat">
            <CloseIcon />
          </button>
        </div>

        {/* ── Messages ── */}
        <div className="chv-chat-messages" role="log" aria-live="polite" aria-label="Chat messages">

          {/* Welcome screen — shown only before first message */}
          {messages.length === 0 && (
            <div className="chv-chat-welcome">

              {/* Mascot + floating speech bubble — dynamic greeting */}
              <div className="chv-chat-welcome-hero">
                <div className="chv-chat-welcome-bubble">{welcomeHeroBubble}</div>
                <div className="chv-chat-welcome-mascot">
                  <div className="chv-chat-welcome-robot-wrap">
                    <RobotChatbotIcon size={54} state={isLoading ? 'working' : 'default'} />
                  </div>
                </div>
              </div>

              <div className="chv-chat-welcome-sub">{welcomeHeroSub}</div>

              {/* Date divider */}
              <div className="chv-chat-divider" style={{ width: '100%' }}>
                <div className="chv-chat-divider-line" />
                <span className="chv-chat-divider-text">
                  {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
                <div className="chv-chat-divider-line" />
              </div>

              {/* Quick suggestion chips */}
              <div className="chv-chat-suggestions" role="group" aria-label="Quick questions">
                {currentSuggestions.map((chip) => (
                  <button
                    key={chip}
                    className="chv-chat-chip"
                    onClick={() => handleChip(chip)}
                    disabled={isLoading}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => {
            if (msg.role === 'error') {
              return (
                <div key={msg.id} className="chv-chat-error" role="alert">
                  <span aria-hidden="true">⚠️</span>
                  <span>{msg.content}</span>
                </div>
              );
            }
            return (
              <div key={msg.id} className={`chv-chat-msg chv-chat-msg--${msg.role}`}>

                {/* Avatar — Robot Chatbot Icon for assistant */}
                {msg.role === 'assistant' && (
                  <div className="chv-chat-msg-avatar" aria-hidden="true">
                    <div className="chv-chat-bubble-robot-wrap">
                      <RobotChatbotIcon size={22} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '4px', width: '100%' }}>
                  <div className={`chv-chat-bubble chv-chat-bubble--${msg.role}`}>
                    {renderFormattedContent(msg.content, handleActionClick)}
                  </div>

                  {/* Interactive Action Redirect Buttons */}
                  {msg.role === 'assistant' && resolveMessageActions(msg).length > 0 && (
                    <div className="chv-chat-action-tray" role="group" aria-label="Quick Actions">
                      {resolveMessageActions(msg).map((act, actIdx) => (
                        <button
                          key={actIdx}
                          type="button"
                          className="chv-chat-action-btn"
                          onClick={() => handleActionClick(act.url)}
                          title={`Navigate to ${act.label}`}
                        >
                          <span className="chv-chat-action-icon-wrap" aria-hidden="true">
                            {getActionIcon(act.url, act.icon)}
                          </span>
                          <span className="chv-chat-action-label">{act.label}</span>
                          <ArrowUpRight size={13} className="chv-chat-action-arrow" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="chv-chat-msg-time">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          })}

          {/* GPS Locating Banner */}
          {isLocating && (
            <div className="chv-chat-locating-banner" role="status">
              <Loader2 size={15} className="animate-spin" />
              <span>📍 Detecting your GPS location and checking delivery zone...</span>
            </div>
          )}

          {/* Order Placement Processing Banner */}
          {isPlacingOrder && (
            <div className="chv-chat-locating-banner" role="status" style={{ borderColor: '#E8D48B', background: 'rgba(30, 20, 10, 0.98)' }}>
              <Loader2 size={15} className="animate-spin" style={{ color: '#E8D48B' }} />
              <span>🍫 Placing your Cash on Delivery order with the store...</span>
            </div>
          )}

          {/* Interactive Delivery Address Entry Card */}
          {showAddressForm && (
            <div className="chv-chat-address-card" role="region" aria-label="Enter Delivery Address">
              <div className="chv-chat-address-header">
                <div className="chv-chat-address-title">
                  <MapPin size={16} /> Enter Delivery Address
                </div>
                <button
                  type="button"
                  className="chv-chat-address-close"
                  onClick={() => setShowAddressForm(false)}
                  aria-label="Close address form"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="chv-chat-address-grid">
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="Full Name *"
                  value={addressForm.name}
                  onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                />
                <input
                  type="tel"
                  className="chv-chat-address-input"
                  placeholder="10-digit Phone *"
                  maxLength={10}
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value.replace(/\D/g, '') })}
                />
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="Flat / House / Door No. *"
                  value={addressForm.house_number}
                  onChange={(e) => setAddressForm({ ...addressForm, house_number: e.target.value })}
                />
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="Road No. / Street *"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                />
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="Area / Landmark"
                  value={addressForm.area}
                  onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                />
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="City *"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                />
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="State *"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                />
                <input
                  type="text"
                  className="chv-chat-address-input"
                  placeholder="6-digit PIN code *"
                  maxLength={6}
                  value={addressForm.zip}
                  onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div className="chv-chat-address-actions">
                <button
                  type="button"
                  className="chv-chat-loc-btn"
                  onClick={() => handleOrderingAction('action:use-location')}
                  disabled={isLocating}
                >
                  <MapPin size={13} /> {isLocating ? 'Locating...' : 'Use Current Location'}
                </button>

                <button
                  type="button"
                  className="chv-chat-submit-btn"
                  onClick={handleConfirmAddressForm}
                >
                  <CheckCircle2 size={14} /> Confirm Address
                </button>
              </div>
            </div>
          )}

          {/* Interactive Loyalty Points Usage Checkbox — Shown ONLY during checkout before order is placed */}
          {wallet && wallet.coin_balance > 0 && orderAddress && !orderCompleted && !isPlacingOrder && (cart.length > 0 || selectedProduct) && (
            <div
              style={{
                margin: '6px 0',
                padding: '8px 12px',
                background: 'rgba(28, 18, 11, 0.95)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.76rem',
                color: '#F5E6D3',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={coinsToRedeem > 0}
                  onChange={(e) => {
                    const useThem = e.target.checked;
                    const amt = useThem ? wallet.coin_balance : 0;
                    setCoinsToRedeem(amt);
                    sendMessage(
                      useThem
                        ? `Yes, please apply my ${wallet.coin_balance} loyalty points for a discount.`
                        : `Proceed without using loyalty points.`
                    );
                  }}
                  style={{ accentColor: '#C9A84C', width: '15px', height: '15px' }}
                />
                <span>
                  Redeem <strong style={{ color: '#E8D48B' }}>{wallet.coin_balance} Coins</strong> (Save ₹{wallet.coin_balance})
                </span>
              </label>
              <span style={{ color: '#C9A84C', fontSize: '0.7rem' }}>
                Balance: {wallet.coin_balance} 🪙
              </span>
            </div>
          )}

          {/* Typing indicator — Robot avatar on left, with rotating orb beside "Thinking..." in the chat box */}
          {isLoading && (
            <div className="chv-chat-typing" aria-label="Coco is thinking">
              <div className="chv-chat-msg-avatar" aria-hidden="true">
                <div className="chv-chat-bubble-robot-wrap">
                  <RobotChatbotIcon size={22} state="working" />
                </div>
              </div>
              <div className="chv-chat-typing-bubble">
                <GoldenOrbitOrb size={18} />
                <span className="chv-chat-thinking-text">
                  Thinking
                  <span className="chv-chat-thinking-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ── */}
        <div className="chv-chat-input-area">
          <div className="chv-chat-input-row">
            <textarea
              ref={inputRef}
              id="chv-chat-input"
              className="chv-chat-input"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask Coco anything…"
              rows={1}
              maxLength={2000}
              aria-label="Type your message"
            />
            <button
              id="chv-chat-send"
              type="button"
              className={`chv-chat-send${canSend ? ' active' : ''}${isLoading ? ' loading' : ''}`}
              onClick={() => sendMessage(input)}
              disabled={!canSend && !isLoading}
              aria-label={isLoading ? 'Coco is thinking…' : canSend ? 'Send message' : 'Type a message to send'}
              title={isLoading ? 'Coco is thinking…' : canSend ? 'Send (Enter)' : 'Type a message first'}
            >
              {isLoading ? (
                <GoldenOrbitOrb size={18} />
              ) : (
                <SendIcon active={canSend} />
              )}
            </button>
          </div>
          <p className="chv-chat-powered">
            <img src={LOGO_BADGE} alt="" className="chv-chat-powered-badge" aria-hidden="true" />
            Powered by Chovique AI · Press Enter to send
          </p>
        </div>
      </div>
    </>
  );
};

// ─── Error Boundary to ensure page never blanks out ─────────────────
class ChatbotErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown, info: unknown) {
    console.warn('Chatbot recovered from unexpected render issue:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export const ChatbotWidget: React.FC = () => {
  return (
    <ChatbotErrorBoundary>
      <ChatbotWidgetInner />
    </ChatbotErrorBoundary>
  );
};

export default ChatbotWidget;
