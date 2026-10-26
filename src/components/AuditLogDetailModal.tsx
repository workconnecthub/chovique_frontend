import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { SuperadminAuditLogRecord, adminService } from '../services/adminService';
import { isSuperAdminRole } from '../types';

interface AuditLogDetailModalProps {
  logId: string | null;
  initialLog?: SuperadminAuditLogRecord | null;
  onClose: () => void;
  onDelete?: (logId: string) => void;
  role?: 'superadmin' | 'admin';
}

const formatActionLabel = (action?: string | null): string => {
  if (!action) return 'Activity Event';
  const act = action.trim().toUpperCase();

  const MAPPING: Record<string, string> = {
    'LOGGED_IN': 'Logged In',
    'LOGIN': 'Logged In',
    'LOGGED_OUT': 'Logged Out',
    'LOGOUT': 'Logged Out',
    'LOGIN_FAILED': 'Login Failed',
    'CREATE_PRODUCT': 'Product Created',
    'CREATED PRODUCT': 'Product Created',
    'UPDATE_PRODUCT': 'Product Updated',
    'UPDATED PRODUCT': 'Product Updated',
    'DELETE_PRODUCT': 'Product Deleted',
    'DELETED PRODUCT': 'Product Deleted',
    'CREATE_COUPON': 'Coupon Created',
    'CREATED COUPON': 'Coupon Created',
    'UPDATE_COUPON': 'Coupon Updated',
    'UPDATED COUPON': 'Coupon Updated',
    'DELETE_COUPON': 'Coupon Deleted',
    'DELETED COUPON': 'Coupon Deleted',
    'CREATE_ADMIN': 'Admin Created',
    'UPDATE_ADMIN': 'Admin Updated',
    'DISABLE_ADMIN': 'Admin Disabled',
    'UPDATE_ORDER': 'Order Updated',
    'UPDATED ORDER STATUS': 'Order Status Updated',
    'PLACE_ORDER': 'Order Placed',
    'UPDATE_CUSTOMER': 'Customer Updated',
    'UPDATE_SETTINGS': 'Settings Updated',
    'PLATFORM_SETTINGS_UPDATED': 'Platform Settings Updated',
    'MAINTENANCE_MODE_ENABLED': 'Maintenance Mode Enabled',
    'MAINTENANCE_MODE_DISABLED': 'Maintenance Mode Disabled',
    'UPDATE_ADMIN_PROFILE': 'Admin Profile Updated',
    'UPDATED_PROFILE': 'Admin Profile Updated',
    'CHANGE_ADMIN_PASSWORD': 'Admin Password Changed',
    'CHANGED_PASSWORD': 'Admin Password Changed',
    'OFFLINE SALE RECORDED': 'Offline Sale Recorded',
  };

  if (MAPPING[act]) return MAPPING[act];

  return act
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDetailsText = (
  description?: string | null,
  details?: string | null,
  metadata?: Record<string, any> | null,
  userName?: string | null,
  action?: string | null
): string => {
  let raw = description || details;

  if (!raw && metadata && typeof metadata === 'object') {
    if (typeof metadata.details === 'string') raw = metadata.details;
    else if (typeof metadata.description === 'string') raw = metadata.description;
    else if (typeof metadata.message === 'string') raw = metadata.message;
  }

  if (raw) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.details) return String(parsed.details);
          if (parsed.description) return String(parsed.description);
          if (parsed.message) return String(parsed.message);
        }
      } catch (e) {
        // Fallback
      }
    }
    return trimmed;
  }

  const actLabel = formatActionLabel(action);
  const name = userName && userName !== 'System Process' ? userName : 'User';
  return `${name} executed ${actLabel.toLowerCase()} successfully.`;
};

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  logId,
  initialLog,
  onClose,
  onDelete,
  role = 'superadmin',
}) => {
  const [log, setLog] = useState<SuperadminAuditLogRecord | null>(initialLog || null);
  const [loading, setLoading] = useState<boolean>(!initialLog && !!logId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId) return;

    if (initialLog && initialLog.id === logId && initialLog.created_at) {
      setLog(initialLog);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchDetail = async () => {
      try {
        const detail =
          role === 'admin'
            ? await adminService.getAdminAuditLogById(logId)
            : await adminService.getSuperadminAuditLogById(logId);
        if (isMounted) {
          setLog(detail);
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Unable to load audit details. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [logId, initialLog, role]);

  if (!logId) return null;

  const getStatusColor = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SUCCESS') return { bg: 'rgba(46, 204, 113, 0.15)', text: '#2ecc71', border: 'rgba(46, 204, 113, 0.4)' };
    if (s === 'FAILURE' || s === 'FAILED') return { bg: 'rgba(231, 76, 60, 0.15)', text: '#e74c3c', border: 'rgba(231, 76, 60, 0.4)' };
    return { bg: 'rgba(241, 196, 15, 0.15)', text: '#f1c40f', border: 'rgba(241, 196, 15, 0.4)' };
  };

  const statusStyle = log ? getStatusColor(log.status) : getStatusColor('SUCCESS');
  const formattedAction = log ? formatActionLabel(log.action) : 'Activity Event';

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{
            background: '#14100d',
            border: '1px solid rgba(201, 168, 76, 0.4)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* MODAL HEADER */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  color: '#c9a84c',
                  margin: 0,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Activity size={20} /> Audit Action Detail — {formattedAction}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {log && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    border: `1px solid ${statusStyle.border}`,
                    letterSpacing: '0.5px',
                  }}
                >
                  {log.status}
                </span>
              )}
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.15s ease',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* MODAL BODY */}
          <div
            style={{
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {loading ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#c9a84c' }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
                  Fetching audit detail...
                </p>
              </div>
            ) : error ? (
              <div
                style={{
                  padding: '20px',
                  background: 'rgba(231, 76, 60, 0.12)',
                  border: '1px solid rgba(231, 76, 60, 0.3)',
                  borderRadius: '8px',
                  color: '#e74c3c',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <AlertTriangle size={24} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
              </div>
            ) : log ? (
              <>
                {/* 1. DATE & TIME */}
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                    Timestamp
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: '#f5efe6' }}>{log.created_at}</strong>
                </div>

                {/* 2. USER & 3. ROLE */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      User
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: '#f5efe6', display: 'block' }}>
                      {log.user_name && log.user_name !== 'System Process' ? log.user_name : 'Enterprise Chief'}
                    </strong>
                    {log.user_email && (
                      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)' }}>{log.user_email}</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Role
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: '#c9a84c' }}>
                      {isSuperAdminRole(log.user_role) ? 'Super Admin' : (log.user_role === 'admin' ? 'Admin' : 'Super Admin')}
                    </strong>
                  </div>
                </div>

                {/* 4. ACTION & 5. STATUS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Action
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: '#f5efe6' }}>{formattedAction}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                      Status
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: statusStyle.text }}>{log.status}</strong>
                  </div>
                </div>

                {/* 6. DETAILS */}
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
                    Details
                  </span>
                  <div
                    style={{
                      background: 'rgba(201, 168, 76, 0.06)',
                      borderLeft: '3px solid #c9a84c',
                      padding: '14px 16px',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '0.9rem',
                      color: '#f5efe6',
                      lineHeight: 1.5,
                    }}
                  >
                    {formatDetailsText(log.description, log.details, log.metadata, log.user_name, log.action)}
                  </div>
                </div>

                {onDelete && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      onClick={() => {
                        onDelete(log.id);
                        onClose();
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(231, 76, 60, 0.15)',
                        border: '1px solid rgba(231, 76, 60, 0.4)',
                        color: '#e74c3c',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Trash2 size={14} />
                      Delete Audit Record
                    </button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

