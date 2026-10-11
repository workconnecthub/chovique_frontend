import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  ShoppingBag,
  AlertTriangle,
  Users,
  Tag,
  MessageSquare,
  Coins,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../app/providers';
import { adminService, AdminNotification } from '../services/adminService';
import { notificationService } from '../services/notificationService';

interface NotificationHeaderDropdownProps {
  onNavigateTab: (tab: string, entityId?: string) => void;
  isSuperadmin?: boolean;
  isCustomer?: boolean;
}

export const NotificationHeaderDropdown: React.FC<NotificationHeaderDropdownProps> = ({
  onNavigateTab,
  isSuperadmin: isSuperadminProp,
  isCustomer: isCustomerProp,
}) => {
  const { role } = useApp();
  const isSuperadmin = isSuperadminProp ?? (role === 'superadmin');
  const isCustomer = isCustomerProp ?? (role === 'customer');

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchNotifications = async () => {
    try {
      if (isSuperadmin) {
        const res = await (adminService as any).getSuperadminNotifications({ limit: 6, is_read: false });
        const unreadItems = (res.items || []).filter((n: any) => !n.is_read);
        setNotifications(res.items || []);
        setUnreadCount(res.unread_count || 0);
      } else if (isCustomer || role === 'customer') {
        const [unreadItems, countRes] = await Promise.all([
          notificationService.getNotifications({ is_read: false }),
          notificationService.getUnreadCount(),
        ]);
        setNotifications(unreadItems);
        setUnreadCount(countRes.unread_count ?? unreadItems.length);
      } else {
        const res = await adminService.getAdminNotifications({ limit: 6, is_read: false });
        const unreadItems = (res.items || []).filter((n: any) => !n.is_read);
        setNotifications(res.items || []);
        setUnreadCount(res.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notifications header dropdown:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15s
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('notification_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notification_updated', handleUpdate);
    };
  }, [isSuperadmin, isCustomer, role]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isSuperadmin) {
        await (adminService as any).markAllSuperadminNotificationsAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
      } else if (isCustomer || role === 'customer') {
        await notificationService.markAllAsRead();
        setNotifications([]);
      } else {
        await adminService.markAllNotificationsAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
      }
      setUnreadCount(0);
      window.dispatchEvent(new CustomEvent('notification_updated'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    const isUnread = notif.is_read === false || notif.read === false;
    if (isUnread) {
      try {
        if (isSuperadmin) {
          await (adminService as any).markSuperadminNotificationAsRead(notif.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read: true } : n))
          );
        } else if (isCustomer || role === 'customer') {
          await notificationService.markAsRead(notif.id);
          setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        } else {
          await adminService.markNotificationAsRead(notif.id);
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read: true } : n))
          );
        }
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new CustomEvent('notification_updated'));
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }
    setIsOpen(false);

    if (isSuperadmin) {
      // Superadmin routing
      switch (notif.category) {
        case 'ADMIN_MANAGEMENT':
          onNavigateTab('admin-mgmt', notif.related_entity_id || undefined);
          break;
        case 'PLATFORM_SYSTEM':
          onNavigateTab('platform-settings', notif.related_entity_id || undefined);
          break;
        case 'SECURITY':
          onNavigateTab('notifications', notif.id);
          break;
        case 'BUSINESS':
          onNavigateTab('revenue', notif.related_entity_id || undefined);
          break;
        default:
          onNavigateTab('notifications');
          break;
      }
    } else if (isCustomer || role === 'customer') {
      // Customer routing
      switch (notif.type) {
        case 'order':
          onNavigateTab('orders', notif.reference_id || notif.referenceId || notif.related_entity_id);
          break;
        case 'support':
          onNavigateTab('help', notif.reference_id || notif.referenceId || notif.related_entity_id);
          break;
        case 'reward':
          onNavigateTab('rewards');
          break;
        case 'coupon':
          onNavigateTab('coupons');
          break;
        default:
          onNavigateTab('notifications');
          break;
      }
    } else {
      // Route navigation mapping for standard Admin
      switch (notif.type) {
        case 'new_order':
        case 'payment_failure':
          onNavigateTab('orders', notif.related_entity_id || undefined);
          break;
        case 'low_stock':
          onNavigateTab('products', notif.related_entity_id || undefined);
          break;
        case 'new_customer':
          onNavigateTab('customers', notif.related_entity_id || undefined);
          break;
        case 'coupon_usage':
          onNavigateTab('coupons', notif.related_entity_id || undefined);
          break;
        case 'support_message':
          onNavigateTab('contact-messages', notif.related_entity_id || undefined);
          break;
        case 'reward_adjustment':
          onNavigateTab('reward-settings', notif.related_entity_id || undefined);
          break;
        default:
          onNavigateTab('notifications');
          break;
      }
    }
  };

  const getNotificationIcon = (notif: any) => {
    if (isSuperadmin) {
      switch (notif.category) {
        case 'SECURITY':
          return <AlertCircle size={16} color="#e74c3c" />;
        case 'ADMIN_MANAGEMENT':
          return <Users size={16} color="#c9a84c" />;
        case 'PLATFORM_SYSTEM':
          return <AlertTriangle size={16} color="#e5c875" />;
        case 'BUSINESS':
          return <ShoppingBag size={16} color="#2ecc71" />;
        default:
          return <Bell size={16} color="#c9a84c" />;
      }
    }

    if (isCustomer || role === 'customer') {
      switch (notif.type) {
        case 'order':
          return <ShoppingBag size={16} color="#c9a84c" />;
        case 'support':
          return <MessageSquare size={16} color="#c9a84c" />;
        case 'reward':
          return <Coins size={16} color="#c9a84c" />;
        case 'coupon':
          return <Tag size={16} color="#c9a84c" />;
        default:
          return <Bell size={16} color="#c9a84c" />;
      }
    }

    switch (notif.type) {
      case 'new_order':
        return <ShoppingBag size={16} color="#c9a84c" />;
      case 'low_stock':
        return <AlertTriangle size={16} color="#e5c875" />;
      case 'new_customer':
        return <Users size={16} color="#c9a84c" />;
      case 'payment_failure':
        return <AlertCircle size={16} color="#e74c3c" />;
      case 'coupon_usage':
        return <Tag size={16} color="#c9a84c" />;
      case 'support_message':
        return <MessageSquare size={16} color="#c9a84c" />;
      case 'reward_adjustment':
        return <Coins size={16} color="#c9a84c" />;
      default:
        return <Bell size={16} color="#c9a84c" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: isOpen ? 'var(--surface-color)' : 'transparent',
          border: isOpen ? '1px solid rgba(var(--gold-rgb), 0.25)' : '1px solid transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#f5efe6',
          position: 'relative',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
        }}
        aria-label="Notifications"
      >
        <Bell size={20} color={isOpen ? '#c9a84c' : '#f5efe6'} />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#e74c3c',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 8px rgba(231, 76, 60, 0.6)',
              border: '2px solid #0f0c0a',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Mobile Backdrop to cleanly close on tap outside */}
          {isMobile && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(3px)',
                zIndex: 9998,
              }}
            />
          )}

          <div
            className="chovique-notification-dropdown-card"
            style={{
              position: isMobile ? 'fixed' : 'absolute',
              top: isMobile ? '60px' : 'calc(100% + 12px)',
              left: isMobile ? '10px' : 'auto',
              right: isMobile ? '10px' : 0,
              width: isMobile ? 'auto' : '360px',
              maxWidth: isMobile ? 'calc(100vw - 20px)' : '360px',
              maxHeight: isMobile ? 'calc(100vh - 120px)' : 'auto',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(20, 16, 13, 0.98) 0%, rgba(12, 9, 7, 0.98) 100%)',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              borderRadius: '14px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
              backdropFilter: 'blur(16px)',
              zIndex: 9999,
              overflow: 'hidden',
            }}
          >
            {/* Dropdown Header */}
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(201, 168, 76, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              {/* Left: Title + unread badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4
                  style={{
                    fontFamily: 'var(--font-display, serif)',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#f5efe6',
                    margin: 0,
                  }}
                >
                  Notifications
                </h4>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: 'rgba(201, 168, 76, 0.15)',
                      color: '#c9a84c',
                      fontSize: '0.72rem',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* Right: Clear All button — always visible when there are notifications */}
              {notifications.length > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Clear all notifications"
                  style={{
                    background: 'rgba(231, 76, 60, 0.08)',
                    border: '1px solid rgba(231, 76, 60, 0.25)',
                    borderRadius: '8px',
                    color: '#e74c3c',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.18s ease',
                    letterSpacing: '0.3px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(231, 76, 60, 0.18)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(231, 76, 60, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(231, 76, 60, 0.08)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(231, 76, 60, 0.25)';
                  }}
                >
                  <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>×</span>
                  Clear All
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div style={{ maxHeight: isMobile ? 'calc(100vh - 210px)' : '340px', overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                  No notifications found.
                </div>
              ) : (
                notifications.map((notif) => {
                  const notifTitle = notif.title || (notif.type ? notif.type.replace('_', ' ').toUpperCase() : 'Notification');
                  const notifMsg = notif.message || notif.text || '';
                  const isUnread = notif.is_read === false || notif.read === false;
                  const notifDate = notif.created_at ? formatTimeAgo(notif.created_at) : (notif.date || '');

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: isUnread ? 'rgba(201, 168, 76, 0.06)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(201, 168, 76, 0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isUnread ? 'rgba(201, 168, 76, 0.06)' : 'transparent';
                      }}
                    >
                      {/* Icon Circle */}
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(201, 168, 76, 0.12)',
                          border: '1px solid rgba(201, 168, 76, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {getNotificationIcon(notif)}
                      </div>

                      {/* Body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: isUnread ? 700 : 500, color: '#f5efe6' }}>
                            {notifTitle}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', flexShrink: 0, marginLeft: '8px' }}>
                            {notifDate}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.4 }}>
                          {notifMsg}
                        </p>
                      </div>

                      {/* Unread Indicator Dot */}
                      {isUnread && (
                        <div
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: '#c9a84c',
                            marginTop: '6px',
                            flexShrink: 0,
                            boxShadow: '0 0 6px rgba(201, 168, 76, 0.8)',
                          }}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Link */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(201, 168, 76, 0.15)',
                textAlign: 'center',
                background: 'rgba(10, 8, 6, 0.6)',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateTab('notifications');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#c9a84c',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                View All Notifications →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationHeaderDropdown;
