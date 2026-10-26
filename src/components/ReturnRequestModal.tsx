import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CreditCard,
  MapPin,
  Package,
  FileImage,
  Trash2,
} from 'lucide-react';
import type { Order } from '../types';
import { orderService } from '../services/orderService';

export const RETURN_REASONS = [
  'Damaged product',
  'Melted chocolate',
  'Wrong product delivered',
  'Missing item',
  'Packaging issue',
  'Other issue',
] as const;

export type ReturnReason = (typeof RETURN_REASONS)[number];

interface ReturnRequestModalProps {
  isOpen: boolean;
  order: Order | null;
  photoRequired?: boolean;
  onClose: () => void;
  onSuccess: (updatedOrder: Order) => void;
}

export const ReturnRequestModal: React.FC<ReturnRequestModalProps> = ({
  isOpen,
  order,
  photoRequired,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    reason?: string;
    description?: string;
    photo?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setDescription('');
      setPhotoFile(null);
      setPhotoPreview(null);
      setErrorMessage(null);
      setValidationErrors({});
    }
  }, [isOpen, order]);

  // Handle Photo selection with preview and client-side validation
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setValidationErrors((prev) => ({
        ...prev,
        photo: 'Only JPG, PNG, and WebP image formats are supported.',
      }));
      return;
    }

    // Validate size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setValidationErrors((prev) => ({
        ...prev,
        photo: 'Photo size exceeds 5MB limit. Please upload a smaller image.',
      }));
      return;
    }

    setValidationErrors((prev) => ({ ...prev, photo: undefined }));
    setPhotoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isPhotoRequired = Boolean(photoRequired ?? order?.return_photo_required);

  const validateForm = (): boolean => {
    const errors: { reason?: string; description?: string; photo?: string } = {};

    if (!reason) {
      errors.reason = 'Please select a reason for the return.';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = 'Please explain the issue with your order.';
    } else if (trimmedDesc.length < 5) {
      errors.description = 'Description must be at least 5 characters long.';
    }

    if (isPhotoRequired && !photoFile) {
      errors.photo = 'Photo evidence is required to submit a return request.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('reason', reason);
      formData.append('description', description.trim());
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const updatedOrder = await orderService.submitReturnRequest(order.id, formData);
      onSuccess(updatedOrder);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit return request:', err);
      const detail =
        err?.response?.data?.detail ||
        err?.detail ||
        err?.message ||
        'Failed to submit return request. Please try again.';
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !order) return null;

  // Format delivery date
  const deliveryDateFormatted = order.delivered_at
    ? new Date(order.delivered_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : order.date || 'Recently Delivered';

  // Format delivery address string
  const addr = order.shippingAddress || order.shipping_address;
  const addressText = addr
    ? [
        addr.name,
        addr.house_number || addr.houseNumber,
        addr.street,
        addr.area,
        addr.landmark,
        addr.city,
        addr.district,
        addr.state,
        addr.zip || addr.pincode,
      ]
        .filter(Boolean)
        .join(', ')
    : 'Registered delivery address';

  const paymentMethodLabel =
    order.payment_method || order.paymentMethod || 'Online Payment';

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'linear-gradient(145deg, #1A0D00 0%, #120A03 50%, #0A0A0A 100%)',
            border: '1px solid rgba(201, 168, 76, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(201, 168, 76, 0.12)',
            borderRadius: '16px',
            overflow: 'hidden',
            color: '#F5E6D3',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(201, 168, 76, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(59, 30, 8, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(201, 168, 76, 0.15)',
                  border: '1px solid rgba(201, 168, 76, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#E8D48B',
                }}
              >
                <RotateCcw size={20} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    fontFamily: "'Playfair Display', serif",
                    color: '#E8D48B',
                    letterSpacing: '0.02em',
                  }}
                >
                  Return Request
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#DBC8A9', opacity: 0.8 }}>
                  Delivered Order • 30-Minute Return Window
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#DBC8A9',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div
            style={{
              padding: '24px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Error Banner */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(231, 76, 60, 0.15)',
                  border: '1px solid rgba(231, 76, 60, 0.5)',
                  color: '#ff6b6b',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Read-Only Auto-Populated Order Summary Card */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(201, 168, 76, 0.2)',
                borderRadius: '12px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#DBC8A9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Order ID
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', wordBreak: 'break-all' }}>
                  #{order.id}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#DBC8A9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Order Amount
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#C9A84C' }}>
                  ₹{(order.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#DBC8A9', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={12} /> Payment Method
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem', fontWeight: 600, color: '#F5E6D3' }}>
                  {paymentMethodLabel}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#DBC8A9', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> Delivery Date & Time
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '0.88rem', fontWeight: 600, color: '#F5E6D3' }}>
                  {deliveryDateFormatted}
                </p>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.75rem', color: '#DBC8A9', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={12} /> Delivery Address
                </span>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#F5E6D3', lineHeight: 1.4 }}>
                  {addressText}
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Field 1: Reason for Return */}
              <div>
                <label
                  htmlFor="return-reason"
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#E8D48B',
                    marginBottom: '8px',
                  }}
                >
                  Reason for Return <span style={{ color: '#e74c3c' }}>*</span>
                </label>

                <select
                  id="return-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value as ReturnReason);
                    if (validationErrors.reason) {
                      setValidationErrors((prev) => ({ ...prev, reason: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#0D090A',
                    border: validationErrors.reason
                      ? '1px solid #e74c3c'
                      : '1px solid rgba(201, 168, 76, 0.4)',
                    color: reason ? '#F5E6D3' : '#999',
                    fontSize: '0.92rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="" disabled>
                    -- Select a return reason --
                  </option>
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r} style={{ background: '#1A0D00', color: '#F5E6D3' }}>
                      {r}
                    </option>
                  ))}
                </select>

                {validationErrors.reason && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#ff6b6b' }}>
                    {validationErrors.reason}
                  </p>
                )}
              </div>

              {/* Field 2: Description */}
              <div>
                <label
                  htmlFor="return-description"
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#E8D48B',
                    marginBottom: '8px',
                  }}
                >
                  Description <span style={{ color: '#e74c3c' }}>*</span>
                </label>

                <textarea
                  id="return-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (validationErrors.description) {
                      setValidationErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }}
                  disabled={isSubmitting}
                  rows={4}
                  placeholder="Explain the issue with the delivered item (e.g. chocolate was completely melted upon arrival)..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: '#0D090A',
                    border: validationErrors.description
                      ? '1px solid #e74c3c'
                      : '1px solid rgba(201, 168, 76, 0.4)',
                    color: '#F5E6D3',
                    fontSize: '0.92rem',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  {validationErrors.description ? (
                    <span style={{ fontSize: '0.8rem', color: '#ff6b6b' }}>{validationErrors.description}</span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#9395A1' }}>Minimum 5 characters required</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#9395A1' }}>{description.length} chars</span>
                </div>
              </div>

              {/* Field 3: Upload Photo */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#E8D48B',
                    marginBottom: '8px',
                  }}
                >
                  Upload Photo{' '}
                  {isPhotoRequired ? (
                    <span style={{ color: '#e74c3c' }}>* (Required evidence)</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#DBC8A9' }}>(Optional supporting evidence)</span>
                  )}
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handlePhotoChange}
                  disabled={isSubmitting}
                  style={{ display: 'none' }}
                  id="return-photo-upload"
                />

                {!photoPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed rgba(201, 168, 76, 0.35)',
                      borderRadius: '10px',
                      padding: '24px',
                      textAlign: 'center',
                      background: 'rgba(0, 0, 0, 0.3)',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Upload size={28} style={{ color: '#C9A84C', margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: '#F5E6D3' }}>
                      Click to upload photo of issue
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#9395A1' }}>
                      PNG, JPG, JPEG, or WebP (Max 5MB)
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: 'rgba(0, 0, 0, 0.45)',
                      border: '1px solid rgba(201, 168, 76, 0.3)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                    }}
                  >
                    <img
                      src={photoPreview}
                      alt="Upload Preview"
                      style={{
                        width: '56px',
                        height: '56px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid rgba(201, 168, 76, 0.4)',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {photoFile?.name}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#C9A84C' }}>
                        {photoFile ? `${(photoFile.size / 1024).toFixed(1)} KB` : ''}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={removePhoto}
                      disabled={isSubmitting}
                      style={{
                        background: 'rgba(231, 76, 60, 0.15)',
                        border: '1px solid rgba(231, 76, 60, 0.4)',
                        color: '#ff6b6b',
                        borderRadius: '8px',
                        padding: '8px',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Remove Photo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {validationErrors.photo && (
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#ff6b6b' }}>
                    {validationErrors.photo}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  marginTop: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(201, 168, 76, 0.2)',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 22px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(219, 200, 169, 0.35)',
                    color: '#DBC8A9',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 26px',
                    borderRadius: '8px',
                    background: isSubmitting
                      ? '#666'
                      : 'linear-gradient(135deg, #C9A84C 0%, #E8D48B 50%, #C9A84C 100%)',
                    border: 'none',
                    color: '#1A0D00',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(201, 168, 76, 0.3)',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw size={16} className="animate-spin" /> Submitting Request...
                    </>
                  ) : (
                    'Submit Return Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
