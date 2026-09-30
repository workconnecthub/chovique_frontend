import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Calendar,
  Clock,
  Save,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  Camera,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react';
import { adminService, AdminProfile } from '../../services/adminService';
import { useApp } from '../../app/providers';

interface AdminProfileViewProps {
  initialSection?: 'profile' | 'security';
}

export const AdminProfileView: React.FC<AdminProfileViewProps> = ({ initialSection = 'profile' }) => {
  const { user, setUser, updateUserProfilePicture, logout } = useApp();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Avatar Upload State
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Inline Validation Error State
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
  }>({});

  // Profile Toast / Status Messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Section Navigation: 'profile' | 'security'
  const [activeSection, setActiveSection] = useState<'profile' | 'security'>(initialSection || 'profile');

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Live Password Validation Checklist Checks
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPassword);
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const isPasswordFormValid =
    currentPassword.length > 0 &&
    hasMinLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial &&
    isMatch;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!isPasswordFormValid) {
      setPasswordErrorMsg('Please ensure all password security requirements are met.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const res = await adminService.changeAdminPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPasswordSuccessMsg(res.message || 'Password changed successfully! Logging out for security...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        logout();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to change admin password:', err);
      setPasswordErrorMsg(err?.detail || err?.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await adminService.getAdminProfile();
      setProfile(data);
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
    } catch (err: any) {
      console.error('Failed to fetch admin profile:', err);
      setErrorMsg(err?.detail || err?.message || 'Failed to load profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);
    setSuccessMsg(null);
    setErrorMsg(null);

    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const fileName = file.name.toLowerCase();
    const ext = fileName.split('.').pop() || '';
    if (!allowedMimes.includes(file.type.toLowerCase()) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      setAvatarError('Invalid image format. Only JPG, JPEG, PNG, and WebP images are allowed.');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('File size exceeds maximum limit of 5 MB.');
      e.target.value = '';
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await adminService.uploadAdminAvatar(formData);
      if (res && res.avatar_url) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: res.avatar_url } : null));
        updateUserProfilePicture(res.avatar_url);
        setSuccessMsg('Profile avatar updated successfully!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to upload profile avatar:', err);
      setAvatarError(err?.detail || err?.message || 'Failed to upload avatar image.');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const rawAvatar = profile?.avatar_url || user?.profile?.avatarUrl || (user?.profile as any)?.avatar_url || (user as any)?.avatar_url;
  const initials = fullName ? fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'SA';

  // Validation functions
  const validateField = (field: string, value: string): string | undefined => {
    const val = value.trim();
    if (field === 'fullName') {
      if (!val) return 'Full Name is required.';
      if (val.length < 2) return 'Full Name must be at least 2 characters.';
    }
    if (field === 'email') {
      if (!val) return 'Email is required.';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) return 'Please enter a valid email address.';
    }
    if (field === 'phone') {
      if (!val) return 'Phone Number is required.';
      const indianPhoneRegex = /^[6-9][0-9]{9}$/;
      if (!indianPhoneRegex.test(val)) {
        return 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
      }
    }
    if (field === 'address') {
      if (!val) return 'Address is required.';
      if (val.length < 10) return 'Address must be at least 10 characters.';
    }
    return undefined;
  };

  const handleChange = (field: 'fullName' | 'email' | 'phone' | 'address', value: string) => {
    if (field === 'fullName') setFullName(value);
    if (field === 'email') setEmail(value);
    if (field === 'phone') setPhone(value);
    if (field === 'address') setAddress(value);

    // Validate in real time
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    // Validate all fields before submitting
    const nameErr = validateField('fullName', fullName);
    const emailErr = validateField('email', email);
    const phoneErr = validateField('phone', phone);
    const addressErr = validateField('address', address);

    const newErrors = {
      fullName: nameErr,
      email: emailErr,
      phone: phoneErr,
      address: addressErr,
    };

    setErrors(newErrors);

    if (nameErr || emailErr || phoneErr || addressErr) {
      setErrorMsg('Please resolve all validation errors before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await adminService.updateAdminProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });

      setProfile(updated);
      setFullName(updated.full_name || '');
      setEmail(updated.email || '');
      setPhone(updated.phone || '');
      setAddress(updated.address || '');

      if (setUser) {
        setUser((prev) => {
          if (!prev) return null;
          const newName = updated.full_name || prev.name;
          return {
            ...prev,
            name: newName,
            email: updated.email || prev.email,
            profile: {
              ...prev.profile,
              name: newName,
              email: updated.email || prev.profile?.email || prev.email,
              phone: updated.phone !== undefined ? updated.phone : prev.profile?.phone,
              avatarUrl: updated.avatar_url || prev.profile?.avatarUrl,
            },
          };
        });
      }

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to update admin profile:', err);
      setErrorMsg(err?.detail || err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="admin-profile-container">
      {/* Header Row */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ color: 'rgba(201, 168, 76, 0.85)', fontSize: '0.78rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
          — ACCOUNT &amp; SECURITY
        </span>
        <h1 className="admin-profile-title">
          My Account
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
          Manage your personal administrator profile details, credentials, and security settings
        </p>
      </div>

      {/* Account Sub-Nav Tabs */}
      <div className="admin-account-tabs" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          className={`admin-account-tab-btn ${activeSection === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSection('profile')}
        >
          <UserIcon size={16} />
          <span>Profile Information</span>
        </button>
        <button
          type="button"
          className={`admin-account-tab-btn ${activeSection === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSection('security')}
        >
          <KeyRound size={16} />
          <span>Security &amp; Password</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(46, 204, 113, 0.3)',
            background: 'rgba(46, 204, 113, 0.1)',
            color: '#2ecc71',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            background: 'rgba(231, 76, 60, 0.1)',
            color: '#e74c3c',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeSection === 'profile' && (
        isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#c9a84c' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Loading profile information...</p>
          </div>
        ) : (
          <div className="admin-profile-layout-grid">
          {/* Main Form Card */}
          <form
            onSubmit={handleSubmit}
            className="admin-profile-form-card"
          >
            <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.2rem', color: '#f5efe6', margin: '0 0 24px 0', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', paddingBottom: '12px' }}>
              Personal &amp; Contact Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                  Full Name <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      background: 'rgba(10, 8, 6, 0.8)',
                      border: errors.fullName ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <UserIcon size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {errors.fullName && (
                  <span style={{ fontSize: '0.78rem', color: '#e74c3c', marginTop: '4px', display: 'block' }}>
                    {errors.fullName}
                  </span>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                  Email Address <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      background: 'rgba(10, 8, 6, 0.8)',
                      border: errors.email ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Mail size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {errors.email && (
                  <span style={{ fontSize: '0.78rem', color: '#e74c3c', marginTop: '4px', display: 'block' }}>
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                  Phone Number <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      background: 'rgba(10, 8, 6, 0.8)',
                      border: errors.phone ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <Phone size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
                {errors.phone && (
                  <span style={{ fontSize: '0.78rem', color: '#e74c3c', marginTop: '4px', display: 'block' }}>
                    {errors.phone}
                  </span>
                )}
              </div>

              {/* Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                  Address <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Enter your street address, city, state, and zip code (min 10 characters)"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 42px',
                      background: 'rgba(10, 8, 6, 0.8)',
                      border: errors.address ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                  <MapPin size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '16px' }} />
                </div>
                {errors.address && (
                  <span style={{ fontSize: '0.78rem', color: '#e74c3c', marginTop: '4px', display: 'block' }}>
                    {errors.address}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <div className="admin-profile-btn-wrap">
                <button
                  type="submit"
                  className="admin-profile-submit-btn"
                  disabled={isSaving || !!errors.fullName || !!errors.email || !!errors.phone || !!errors.address}
                  style={{
                    opacity: isSaving || !!errors.fullName || !!errors.email || !!errors.phone || !!errors.address ? 0.6 : 1,
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Sidebar Meta Column (Avatar & Account Security) */}
          <div className="admin-profile-side-column">
            {/* Profile Avatar Card */}
            <div className="admin-profile-avatar-card">
              <h4 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.05rem', color: '#f5efe6', margin: '0 0 16px 0', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', paddingBottom: '10px', width: '100%', textAlign: 'left' }}>
                Profile Avatar
              </h4>

              {/* Avatar Circle Container */}
              <div
                style={{
                  position: 'relative',
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                  border: '2px solid #c9a84c',
                  boxShadow: '0 0 20px rgba(201, 168, 76, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0f0c0a',
                  fontWeight: 800,
                  fontSize: '1.8rem',
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
              >
                {rawAvatar ? (
                  <img src={rawAvatar} alt="Profile Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}

                {isUploadingAvatar && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#c9a84c',
                    }}
                  >
                    <Loader2 size={24} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarSelect}
                style={{ display: 'none' }}
              />

              {/* Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                style={{
                  padding: '9px 20px',
                  background: 'rgba(201, 168, 76, 0.12)',
                  border: '1px solid rgba(201, 168, 76, 0.4)',
                  borderRadius: '8px',
                  color: '#c9a84c',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                  opacity: isUploadingAvatar ? 0.6 : 1,
                }}
              >
                <Camera size={16} />
                {isUploadingAvatar ? 'Uploading...' : rawAvatar ? 'Change Image' : 'Upload Image'}
              </button>

              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '8px', display: 'block' }}>
                JPG, PNG, or WebP (Max 5 MB)
              </span>

              {avatarError && (
                <span style={{ fontSize: '0.76rem', color: '#e74c3c', marginTop: '8px', display: 'block', fontWeight: 600 }}>
                  {avatarError}
                </span>
              )}
            </div>

            {/* Account Security & Role Card */}
            <div className="admin-profile-security-card">
              <h4 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.05rem', color: '#f5efe6', margin: '0 0 16px 0', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', paddingBottom: '10px' }}>
                Account Security &amp; Role
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Role */}
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                    ADMIN ROLE
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'rgba(201, 168, 76, 0.12)',
                      border: '1px solid rgba(201, 168, 76, 0.3)',
                      borderRadius: '6px',
                      color: '#c9a84c',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <ShieldCheck size={16} />
                    <span>{profile?.role === 'superadmin' ? 'Super Admin' : 'Administrator'}</span>
                    <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'block' }}>
                    Role permissions are managed by Superadmin.
                  </span>
                </div>

                {/* Account Created Date */}
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                    ACCOUNT CREATED
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#f5efe6', fontWeight: 600 }}>
                    <Calendar size={16} color="#c9a84c" />
                    <span>{formatDate(profile?.created_at)}</span>
                  </div>
                </div>

                {/* Last Login */}
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>
                    LAST LOGIN
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#f5efe6', fontWeight: 600 }}>
                    <Clock size={16} color="#c9a84c" />
                    <span>{profile?.last_login_at ? formatDate(profile.last_login_at) : 'Active Session'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    )}

      {/* Security & Password Section */}
      {activeSection === 'security' && (
        <div>
          {/* Password Success Alert */}
          {passwordSuccessMsg && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px 20px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid rgba(46, 204, 113, 0.3)',
                background: 'rgba(46, 204, 113, 0.12)',
                color: '#2ecc71',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={20} />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {/* Password Error Alert */}
          {passwordErrorMsg && (
            <div
              style={{
                marginBottom: '24px',
                padding: '16px 20px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                background: 'rgba(231, 76, 60, 0.12)',
                color: '#e74c3c',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={20} />
              <span>{passwordErrorMsg}</span>
            </div>
          )}

          <div className="admin-profile-layout-grid">
            {/* Main Change Password Form Card */}
            <form
              onSubmit={handlePasswordSubmit}
              className="admin-profile-form-card"
            >
              <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.2rem', color: '#f5efe6', margin: '0 0 24px 0', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <KeyRound size={20} color="#c9a84c" />
                Update Password Credentials
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Current Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                    Current Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        background: 'rgba(10, 8, 6, 0.8)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#f5efe6',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Lock size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}
                      aria-label="Toggle Current Password Visibility"
                    >
                      {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                    New Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        background: 'rgba(10, 8, 6, 0.8)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#f5efe6',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Lock size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}
                      aria-label="Toggle New Password Visibility"
                    >
                      {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600, marginBottom: '8px' }}>
                    Confirm New Password <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        background: 'rgba(10, 8, 6, 0.8)',
                        border: confirmPassword && !isMatch ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        color: '#f5efe6',
                        fontSize: '0.9rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <Lock size={18} color="rgba(201, 168, 76, 0.7)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }}
                      aria-label="Toggle Confirm Password Visibility"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && !isMatch && (
                    <span style={{ fontSize: '0.78rem', color: '#e74c3c', marginTop: '4px', display: 'block' }}>
                      Passwords do not match.
                    </span>
                  )}
                </div>

                {/* Submit Button */}
                <div className="admin-profile-btn-wrap">
                  <button
                    type="submit"
                    className="admin-profile-submit-btn"
                    disabled={isSubmittingPassword || !isPasswordFormValid}
                    style={{
                      opacity: isSubmittingPassword || !isPasswordFormValid ? 0.6 : 1,
                    }}
                  >
                    {isSubmittingPassword ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Updating Password...
                      </>
                    ) : (
                      <>
                        <KeyRound size={18} /> Update Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Live Password Rules Checklist */}
            <div className="admin-profile-security-card admin-password-policy-card" style={{ height: 'fit-content' }}>
              <h4 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.05rem', color: '#f5efe6', margin: '0 0 16px 0', borderBottom: '1px solid rgba(201, 168, 76, 0.15)', paddingBottom: '10px' }}>
                Password Policy
              </h4>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: hasMinLength ? '#2ecc71' : 'rgba(255,255,255,0.5)' }}>
                  {hasMinLength ? <Check size={16} color="#2ecc71" /> : <X size={16} color="rgba(255,255,255,0.3)" />}
                  <span>At least 8 characters</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: hasUppercase ? '#2ecc71' : 'rgba(255,255,255,0.5)' }}>
                  {hasUppercase ? <Check size={16} color="#2ecc71" /> : <X size={16} color="rgba(255,255,255,0.3)" />}
                  <span>One uppercase letter (A-Z)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: hasLowercase ? '#2ecc71' : 'rgba(255,255,255,0.5)' }}>
                  {hasLowercase ? <Check size={16} color="#2ecc71" /> : <X size={16} color="rgba(255,255,255,0.3)" />}
                  <span>One lowercase letter (a-z)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: hasNumber ? '#2ecc71' : 'rgba(255,255,255,0.5)' }}>
                  {hasNumber ? <Check size={16} color="#2ecc71" /> : <X size={16} color="rgba(255,255,255,0.3)" />}
                  <span>One number (0-9)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: hasSpecial ? '#2ecc71' : 'rgba(255,255,255,0.5)' }}>
                  {hasSpecial ? <Check size={16} color="#2ecc71" /> : <X size={16} color="rgba(255,255,255,0.3)" />}
                  <span>One special character (!@#$...)</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem', color: isMatch ? '#2ecc71' : 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '4px' }}>
                  {isMatch ? <Check size={16} color="#2ecc71" /> : <X size={16} color="rgba(255,255,255,0.3)" />}
                  <span>Passwords match</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfileView;
