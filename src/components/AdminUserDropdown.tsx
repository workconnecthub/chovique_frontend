import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  KeyRound,
  FileClock,
  LogOut,
  ChevronDown,
  Store,
} from 'lucide-react';

import { useApp } from '../app/providers';
import { getImageUrl } from '../utils/imageUrl';

interface AdminUserDropdownProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminUserDropdown: React.FC<AdminUserDropdownProps> = ({ onNavigateTab }) => {
  const navigate = useNavigate();
  const { user, role, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  const rawAvatar = user?.profile?.avatarUrl || (user?.profile as any)?.avatar_url || (user as any)?.avatar_url;
  const avatarUrl = rawAvatar ? getImageUrl(rawAvatar) : '';
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleLabel = role === 'superadmin' ? 'Super Admin' : 'Admin';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* User Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 14px 6px 6px',
          borderRadius: '24px',
          background: 'rgba(20, 16, 13, 0.9)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          color: '#f5efe6',
          transition: 'all 0.2s ease',
        }}
        aria-label="Admin Menu"
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
            color: '#0f0c0a',
            fontWeight: 800,
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={user?.name || 'Admin'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initial
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: 0 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f5efe6', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '130px' }}>
            {user?.name || 'Admin'}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'rgba(201, 168, 76, 0.85)', fontWeight: 600 }}>
            {roleLabel}
          </span>
        </div>
        <ChevronDown size={14} color="#c9a84c" style={{ marginLeft: '4px', opacity: 0.8 }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 10px)',
            width: '230px',
            background: 'linear-gradient(135deg, rgba(20, 16, 13, 0.98) 0%, rgba(12, 9, 7, 0.98) 100%)',
            border: '1px solid rgba(201, 168, 76, 0.35)',
            borderRadius: '12px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.85)',
            backdropFilter: 'blur(16px)',
            zIndex: 1000,
            overflow: 'hidden',
            padding: '8px 0',
          }}
        >
          {/* My Account */}
          <button
            onClick={() => handleSelect(() => onNavigateTab('profile'))}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              color: '#f5efe6',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 168, 76, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <UserIcon size={18} color="#c9a84c" />
            <span>My Account</span>
          </button>

          {/* Live Customer Store */}
          <button
            onClick={() => handleSelect(() => navigate('/'))}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              color: '#f5efe6',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 168, 76, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Store size={18} color="#c9a84c" />
            <span>Live Customer Store</span>
          </button>

          {/* Activity Log — Admin only (Super Admin uses dedicated Audit Logs sidebar page) */}
          {role !== 'superadmin' && (
            <button
              onClick={() => handleSelect(() => onNavigateTab('activity-logs'))}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                color: '#f5efe6',
                fontSize: '0.88rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201, 168, 76, 0.12)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <FileClock size={18} color="#c9a84c" />
              <span>Activity Log</span>
            </button>
          )}

          <div style={{ height: '1px', background: 'rgba(201, 168, 76, 0.15)', margin: '6px 0' }} />

          {/* Logout */}
          <button
            onClick={() => handleSelect(() => onNavigateTab('logout'))}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              color: '#e74c3c',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(231, 76, 60, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={18} color="#e74c3c" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUserDropdown;
