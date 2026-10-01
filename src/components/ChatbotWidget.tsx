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
import { chatService, type ChatMessage, type ChatAction } from '../services/chatService';
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
} from 'lucide-react';
import '../styles/chatbot.css';

// ─── Robot AI Chatbot Icon Component ─────────────────────────────

export const RobotChatbotIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 34,
  className = '',
}) => {
  const instanceId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const goldGradId = `chvGold-${instanceId}`;
  const eyeGradId = `chvEye-${instanceId}`;
  const glowId = `chvGlow-${instanceId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={goldGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF4B8" />
          <stop offset="50%" stopColor="#E2BD44" />
          <stop offset="100%" stopColor="#A87B28" />
        </linearGradient>
        <radialGradient id={eyeGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="60%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0891B2" />
        </radialGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Antenna stalk */}
      <line x1="18" y1="3.5" x2="18" y2="8" stroke={`url(#${goldGradId})`} strokeWidth="2.4" strokeLinecap="round" />

      {/* Antenna glowing beacon sphere */}
      <circle cx="18" cy="3" r="2.5" fill={`url(#${goldGradId})`} />

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

      {/* Left Eye (Expressive Glowing AI Cyan) */}
      <rect x="11" y="14.5" width="4.5" height="5" rx="1.5" fill={`url(#${eyeGradId})`} filter={`url(#${glowId})`} />
      <circle cx="12.2" cy="15.7" r="0.8" fill="#FFFFFF" />

      {/* Right Eye (Expressive Glowing AI Cyan) */}
      <rect x="20.5" y="14.5" width="4.5" height="5" rx="1.5" fill={`url(#${eyeGradId})`} filter={`url(#${glowId})`} />
      <circle cx="21.7" cy="15.7" r="0.8" fill="#FFFFFF" />

      {/* Friendly Robot Smile */}
      <path
        d="M13.5 21.8 C15.5 23.5 20.5 23.5 22.5 21.8"
        stroke={`url(#${goldGradId})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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
  if (iconType === 'shop' || url.startsWith('/shop')) {
    return <ShoppingBag size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'product' || url.startsWith('/product')) {
    return <Sparkles size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'package' || url.includes('orders')) {
    return <Package size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'coins' || url.includes('rewards')) {
    return <Coins size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'tag' || url.includes('coupons')) {
    return <Tag size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'help' || url.includes('help') || url.startsWith('/contact') || url.includes('complaints')) {
    return <HelpCircle size={14} className="chv-chat-action-icon" />;
  }
  if (iconType === 'cart' || url.startsWith('/cart')) {
    return <ShoppingCart size={14} className="chv-chat-action-icon" />;
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
  if (msg.actions && msg.actions.length > 0) {
    return msg.actions;
  }
  if (msg.role !== 'assistant') return [];

  const text = msg.content.toLowerCase();
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

// ─── Component ────────────────────────────────────────────────────

export const ChatbotWidget: React.FC = () => {
  // ALL hooks first — never after a conditional return
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useApp();

  const handleActionClick = (url: string) => {
    navigate(url);
    // User requirement: automatically close chatbot when redirecting to another page
    setIsOpen(false);
  };

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [hasDismissedTeaser, setHasDismissedTeaser] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  // Authenticated user detection
  const displayName = user?.name?.trim() || '';
  const firstName = displayName ? displayName.split(' ')[0] : '';
  const isLoggedIn = Boolean(user && (user.id || user.name));

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
            <RobotChatbotIcon size={54} />
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

          {/* Robot AI Chatbot Avatar */}
          <div className="chv-chat-avatar" aria-hidden="true">
            <div className="chv-chat-header-robot-wrap">
              <RobotChatbotIcon size={30} />
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
                    <RobotChatbotIcon size={54} />
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

          {/* Typing indicator */}
          {isLoading && (
            <div className="chv-chat-typing" aria-label="Coco is thinking">
              <div className="chv-chat-msg-avatar" aria-hidden="true">
                <div className="chv-chat-bubble-robot-wrap">
                  <RobotChatbotIcon size={22} />
                </div>
              </div>
              <div className="chv-chat-typing-bubble">
                <span className="chv-chat-typing-dot" />
                <span className="chv-chat-typing-dot" />
                <span className="chv-chat-typing-dot" />
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
                <Loader2 size={17} className="chv-chat-send-spinner" />
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

export default ChatbotWidget;
