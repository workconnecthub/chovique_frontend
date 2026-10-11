import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'gold';
  children?: React.ReactNode;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
  variant = 'danger',
  children,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="chovique-delete-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2500,
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        className={`chovique-delete-modal-card ${isDanger ? 'blocked-border' : 'safe-border'}`}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(180deg, #100804 0%, #060302 100%)',
          borderRadius: '16px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.98), 0 0 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          padding: '24px',
          fontFamily: 'var(--font-body)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: isDanger ? 'rgba(220, 53, 69, 0.15)' : 'rgba(201, 168, 76, 0.15)',
              border: isDanger ? '1px solid rgba(220, 53, 69, 0.45)' : '1px solid rgba(201, 168, 76, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={24} style={{ color: isDanger ? '#ff6b6b' : 'var(--gold)' }} />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.3rem',
              color: 'var(--cream)',
              margin: 0,
              fontWeight: 700,
            }}
          >
            {title}
          </h3>
        </div>

        <p style={{ color: 'var(--beige)', fontSize: '0.92rem', lineHeight: 1.55, margin: 0 }}>
          {message}
        </p>

        {children}

        <div
          className="chovique-delete-modal-footer"
          style={{
            padding: '16px 0 0 0',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '8px',
          }}
        >
          <div className="chovique-delete-modal-footer-actions" style={{ width: '100%' }}>
            <Button
              variant="text"
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              style={{
                color: 'var(--cream)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                height: '42px',
              }}
            >
              {cancelText}
            </Button>

            <Button
              variant={isDanger ? 'secondary' : 'gold'}
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
              style={{
                justifyContent: 'center',
                height: '42px',
                ...(isDanger
                  ? {
                      background: 'rgba(220, 53, 69, 0.25)',
                      border: '1px solid rgba(220, 53, 69, 0.5)',
                      color: '#ff8a93',
                    }
                  : {}),
              }}
            >
              {isConfirming ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing...
                </span>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
