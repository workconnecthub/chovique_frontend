import React from 'react';
import { motion } from 'framer-motion';
import { buttonHover } from '../../lib/framer';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'glass' | 'text' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  glow = false,
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--button-bg, var(--chocolate-brown))',
          color: 'var(--button-text, #FFFFFF)',
          border: '1px solid var(--button-bg, var(--chocolate-brown))',
        };
      case 'secondary':
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--button-secondary, var(--gold))',
          border: '1px solid var(--button-secondary, var(--gold))',
        };
      case 'gold':
        return {
          background: 'var(--gradient-gold)',
          color: 'var(--dark-chocolate)',
          border: '1px solid var(--gold)',
          fontWeight: 700,
        };
      case 'glass':
        return {
          background: 'rgba(var(--dark-chocolate-rgb), 0.4)',
          color: 'var(--cream)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(8px)',
        };
      case 'text':
        return {
          background: 'transparent',
          color: 'var(--gold)',
          border: 'none',
          padding: '0',
        };
      default:
        return {};
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { padding: '8px 16px', fontSize: '0.85rem' };
      case 'lg':
        return { padding: '16px 36px', fontSize: '1.1rem' };
      case 'md':
      default:
        return { padding: '12px 24px', fontSize: '0.95rem' };
    }
  };

  const combinedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '4px',
    fontFamily: 'var(--font-body)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    cursor: 'pointer',
    width: fullWidth ? '100%' : 'auto',
    transition: 'box-shadow 0.3s ease, background 0.3s ease',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...(props.style || {}),
  };

  return (
    <motion.button
      whileHover={{
        ...buttonHover.whileHover,
        boxShadow: glow ? '0 0 15px rgba(201, 168, 76, 0.6)' : undefined,
      }}
      whileTap={buttonHover.whileTap}
      {...(props as any)}
      style={combinedStyle}
      className={`luxury-btn ${className}`}
    >
      {children}
    </motion.button>
  );
};
