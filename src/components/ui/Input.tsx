import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  containerStyle?: React.CSSProperties;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  fullWidth = true,
  className = '',
  id,
  type = 'text',
  style,
  containerStyle,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: fullWidth ? '100%' : 'auto',
        marginBottom: '15px',
        fontFamily: 'var(--font-body)',
        ...containerStyle,
      }}
    >
      {label && (() => {
        const hasAsterisk = label.includes('*') || props.required;
        const cleanLabel = label.replace(/\s*\*+\s*$/, '');
        return (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.8rem',
              color: 'var(--beige)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 500,
            }}
          >
            {cleanLabel}
            {hasAsterisk && <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 600 }}>*</span>}
          </label>
        );
      })()}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          id={inputId}
          type={resolvedType}
          style={{
            width: '100%',
            padding: isPassword ? '12px 44px 12px 16px' : '12px 16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: error ? '1px solid var(--rose-gold)' : '1px solid var(--gold)',
            borderRadius: '4px',
            color: 'var(--cream)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            boxSizing: 'border-box',
            boxShadow: '0 0 8px rgba(201, 168, 76, 0.25)',
            ...style,
          }}
          className={`luxury-input ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--rose-gold)',
            marginTop: '2px',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  fullWidth = true,
  className = '',
  id,
  options,
  style,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: fullWidth ? '100%' : 'auto',
        marginBottom: '15px',
        fontFamily: 'var(--font-body)',
      }}
    >
      {label && (() => {
        const hasAsterisk = label.includes('*') || props.required;
        const cleanLabel = label.replace(/\s*\*+\s*$/, '');
        return (
          <label
            htmlFor={selectId}
            style={{
              fontSize: '0.8rem',
              color: 'var(--beige)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 500,
            }}
          >
            {cleanLabel}
            {hasAsterisk && <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 600 }}>*</span>}
          </label>
        );
      })()}
      <select
        id={selectId}
        style={{
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: error ? '1px solid var(--rose-gold)' : '1px solid var(--gold)',
          borderRadius: '4px',
          color: 'var(--cream)',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          boxSizing: 'border-box',
          boxShadow: '0 0 8px rgba(201, 168, 76, 0.25)',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23C9A84C%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          ...style,
        }}
        className={`luxury-select ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{ background: 'var(--dark-chocolate)', color: 'var(--cream)' }}
          >
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--rose-gold)',
            marginTop: '2px',
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
};

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  charCount?: number;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  fullWidth = true,
  className = '',
  id,
  charCount,
  maxLength,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: fullWidth ? '100%' : 'auto',
        marginBottom: '15px',
        fontFamily: 'var(--font-body)',
      }}
    >
      {label && (() => {
        const hasAsterisk = label.includes('*') || props.required;
        const cleanLabel = label.replace(/\s*\*+\s*$/, '');
        return (
          <label
            htmlFor={textareaId}
            style={{
              fontSize: '0.8rem',
              color: 'var(--beige)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 500,
            }}
          >
            {cleanLabel}
            {hasAsterisk && <span style={{ color: '#e74c3c', marginLeft: '4px', fontWeight: 600 }}>*</span>}
          </label>
        );
      })()}
      <textarea
        id={textareaId}
        maxLength={maxLength}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: error ? '1px solid var(--rose-gold)' : isFocused ? '1px solid var(--gold)' : '1px solid var(--gold)',
          borderRadius: '4px',
          color: 'var(--cream)',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          outline: 'none',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          boxSizing: 'border-box',
          boxShadow: isFocused ? '0 0 12px rgba(201, 168, 76, 0.45)' : '0 0 8px rgba(201, 168, 76, 0.25)',
          resize: 'vertical',
          ...style,
        }}
        className={`luxury-input ${className}`}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {error ? (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--rose-gold)',
              marginTop: '2px',
            }}
          >
            {error}
          </span>
        ) : (
          <span />
        )}
        {maxLength !== undefined && charCount !== undefined && (
          <span style={{ fontSize: '0.75rem', color: 'var(--grey-light)', textAlign: 'right' }}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
};
