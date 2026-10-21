import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Truck,
  RotateCcw,
  Gift,
  Gem,
  Headphones,
  Phone,
  MessageSquare,
  Mail,
  Clock,
  ShieldCheck,
  Sprout,
  Heart,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Footer } from '../../components/Footer';
import { slideInLeft, slideInRight } from '../../lib/framer';
import { apiPost } from '../../lib/api';

import { homeService } from '../../services/homeService';
import { adminService } from '../../services/adminService';
import { ContactPageConfig, DEFAULT_CONTACT_PAGE_CONFIG } from '../../types';

export const ContactPage: React.FC = () => {
  const location = useLocation();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    reason: '',
    orderNumber: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedWhatsappUrl, setSubmittedWhatsappUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState('');

  const [contactConfig, setContactConfig] = useState<ContactPageConfig>(DEFAULT_CONTACT_PAGE_CONFIG);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  const [contactInfo, setContactInfo] = useState({
    phone: DEFAULT_CONTACT_PAGE_CONFIG.phone,
    whatsapp: DEFAULT_CONTACT_PAGE_CONFIG.whatsapp,
    email: DEFAULT_CONTACT_PAGE_CONFIG.email,
    support_hours: DEFAULT_CONTACT_PAGE_CONFIG.support_hours,
    address: DEFAULT_CONTACT_PAGE_CONFIG.address,
  });

  useEffect(() => {
    homeService.getContactPageConfig()
      .then((res) => {
        if (res && typeof res === 'object' && Object.keys(res).length > 0) {
          setContactConfig((prev) => ({ ...prev, ...res }));
          setContactInfo({
            phone: res.phone || DEFAULT_CONTACT_PAGE_CONFIG.phone,
            whatsapp: res.whatsapp || res.phone || DEFAULT_CONTACT_PAGE_CONFIG.whatsapp,
            email: res.email || DEFAULT_CONTACT_PAGE_CONFIG.email,
            support_hours: res.support_hours || DEFAULT_CONTACT_PAGE_CONFIG.support_hours,
            address: res.address || DEFAULT_CONTACT_PAGE_CONFIG.address,
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await apiPost<{ message: string; whatsapp_url?: string }>('/contact', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.reason || 'General Support',
        message: `${formData.orderNumber ? `[Order #${formData.orderNumber}] ` : ''}${formData.message}`,
      });

      const cleanPhone = (contactInfo.whatsapp || '+91 83098 54870').replace(/\D/g, '');
      const defaultWaUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            `🍫 *New Customer Inquiry - CHOVIQUE*\n\n👤 *From:* ${formData.firstName} ${formData.lastName}\n✉️ *Email:* ${formData.email}\n📞 *Phone:* ${formData.phone || 'Not provided'}\n📋 *Subject:* ${formData.reason || 'General Inquiry'}\n\n💬 *Message:*\n${formData.message}`
          )}`
        : null;

      setSubmittedWhatsappUrl(res.whatsapp_url || defaultWaUrl);
      setSubmitted(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        reason: '',
        orderNumber: '',
        message: '',
      });
      setTimeout(() => setSubmitted(false), 20000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const reasonOptions = [
    { value: '', label: 'Select a reason' },
    { value: 'Order Inquiry', label: 'Order Inquiry' },
    { value: 'Shipping & Delivery', label: 'Shipping & Delivery' },
    { value: 'Returns & Refunds', label: 'Returns & Refunds' },
    { value: 'Corporate & Bulk Gifting', label: 'Corporate & Bulk Gifting' },
    { value: 'Product Information', label: 'Product Information' },
    { value: 'Feedback / Other', label: 'Feedback / Other' },
  ];

  const helpCards = [
    {
      icon: Package,
      title: 'Track Your Order',
      desc: 'Check your order status',
    },
    {
      icon: Truck,
      title: 'Shipping Info',
      desc: 'Delivery timelines & locations',
    },
    {
      icon: RotateCcw,
      title: 'Returns & Refunds',
      desc: 'Easy returns & refund policy',
    },
    {
      icon: Gift,
      title: 'Corporate Gifting',
      desc: 'Bulk orders for businesses',
    },
    {
      icon: Gem,
      title: 'Product Enquiry',
      desc: 'Questions about our chocolates',
    },
    {
      icon: Headphones,
      title: 'General Support',
      desc: 'Any other assistance',
    },
  ];

  return (
    <div style={{ background: 'var(--black)', color: 'var(--cream)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* HERO SECTION */}
      <section
        className="contact-hero-section"
        style={{
          position: 'relative',
          padding: '95px 0 36px 0',
          background: 'linear-gradient(to bottom, rgba(20, 10, 5, 0.95), rgba(10, 10, 10, 1))',
        }}
      >
        <div className="container">
          <div className="contact-hero-grid">
            {/* Left Content */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '3px',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '12px',
                }}
              >
                {contactConfig.hero_badge || 'CONTACT US'}
              </span>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.2rem, 5vw, 4rem)',
                  color: 'var(--cream)',
                  margin: '0 0 16px 0',
                  lineHeight: 1.15,
                  fontWeight: 700,
                }}
              >
                {contactConfig.hero_title || "We're Here to Help!"}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold)', marginBottom: '20px' }}>
                <Heart size={16} fill="currentColor" />
              </div>
              <p
                style={{
                  color: 'var(--beige)',
                  fontSize: '1.05rem',
                  lineHeight: 1.6,
                  maxWidth: '540px',
                  marginBottom: '35px',
                }}
              >
                {contactConfig.hero_subtitle}
              </p>

              {/* 3 Pill Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.88rem',
                    color: 'var(--cream)',
                  }}
                >
                  <Clock size={16} style={{ color: 'var(--gold)' }} />
                  <span>{contactConfig.badge_1 || 'Replies within 24 Hours'}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.88rem',
                    color: 'var(--cream)',
                  }}
                >
                  <Headphones size={16} style={{ color: 'var(--gold)' }} />
                  <span>{contactConfig.badge_2 || 'Dedicated Support'}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--glass-border)',
                    fontSize: '0.88rem',
                    color: 'var(--cream)',
                  }}
                >
                  <ShieldCheck size={16} style={{ color: 'var(--gold)' }} />
                  <span>{contactConfig.badge_3 || 'Reliable & Quick Assistance'}</span>
                </div>
              </div>
            </motion.div>

            {/* Right Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: 'var(--glass-shadow)',
                border: '1px solid var(--glass-border)',
                height: '340px',
                position: 'relative',
              }}
            >
              <img
                src={contactConfig.hero_image || '/assets/contact-hero.png'}
                alt="Chovique Luxury Chocolates Gift Box"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/popular-bg.jpg';
                }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* HOW CAN WE HELP YOU GRID */}
      <section style={{ padding: '36px 0', background: 'var(--black)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span
              style={{
                fontSize: '0.85rem',
                letterSpacing: '3px',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              HOW CAN WE HELP YOU?
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
            }}
          >
            {helpCards.map((card, idx) => {
              const IconComp = card.icon;
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(201, 168, 76, 0.2)',
                    borderRadius: '10px',
                    padding: '24px 18px',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                  className="glass-panel-hover"
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '8px',
                      background: 'rgba(201, 168, 76, 0.1)',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                    }}
                  >
                    <IconComp size={22} />
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cream)', margin: '0 0 6px 0' }}>
                    {card.title}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--beige)', margin: 0, lineHeight: 1.4 }}>{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MAIN 2-COLUMN SPLIT: FORM & SUPPORT CHANNELS */}
      <section id="send-us-a-message" style={{ padding: '36px 0 50px 0', background: 'var(--black)' }}>
        <div className="container">
          <div className="contact-split-grid">
            {/* LEFT COLUMN: SEND US A MESSAGE FORM */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={slideInLeft}
              className="contact-card-box"
            >
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  letterSpacing: '1px',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  margin: '0 0 24px 0',
                }}
              >
                SEND US A MESSAGE
              </h3>

              <form onSubmit={handleSubmit}>
                <div className="contact-form-row">
                  <Input
                    label="First Name *"
                    placeholder="First Name *"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                  <Input
                    label="Last Name *"
                    placeholder="Last Name *"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>

                <div className="contact-form-row">
                  <Input
                    label="Email Address *"
                    type="email"
                    placeholder="Email Address *"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <Select
                  label="Reason for Contact *"
                  options={reasonOptions}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />

                <Input
                  label="Order Number (Optional)"
                  placeholder="Order Number (Optional)"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                />

                <Textarea
                  label="Your Message *"
                  placeholder="Type your message here..."
                  required
                  rows={5}
                  maxLength={1000}
                  charCount={formData.message.length}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />

                {submitError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: 'rgba(231, 76, 60, 0.15)',
                      border: '1px solid rgba(231, 76, 60, 0.4)',
                      borderRadius: '4px',
                      color: '#e74c3c',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      fontSize: '0.88rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '16px 0' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: 'rgba(46, 204, 113, 0.15)',
                        border: '1px solid #2ecc71',
                        borderRadius: '6px',
                        color: '#2ecc71',
                        padding: '14px 16px',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                      }}
                    >
                      <CheckCircle size={20} />
                      <span>Message Sent Successfully! We'll reply within 24 hours.</span>
                    </div>

                    {submittedWhatsappUrl && (
                      <a
                        href={submittedWhatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          background: '#25D366',
                          color: '#ffffff',
                          borderRadius: '6px',
                          padding: '14px 18px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
                          transition: 'all 0.2s ease',
                          fontSize: '0.95rem',
                          letterSpacing: '0.5px',
                        }}
                      >
                        <MessageSquare size={18} />
                        <span>Notify Owner on WhatsApp</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <Button variant="gold" fullWidth type="submit" disabled={submitting} glow>
                    {submitting ? 'Sending...' : 'SEND MESSAGE'} <ArrowRight size={16} style={{ marginLeft: '6px' }} />
                  </Button>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--beige)',
                    marginTop: '16px',
                  }}
                >
                  <Lock size={12} />
                  <span>Your information is safe with us. We never share your details.</span>
                </div>
              </form>
            </motion.div>

            {/* RIGHT COLUMN: CUSTOMER SUPPORT CHANNELS */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={slideInRight}
              className="contact-card-box"
            >
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  letterSpacing: '1px',
                  color: 'var(--gold)',
                  textTransform: 'uppercase',
                  margin: '0 0 6px 0',
                }}
              >
                CUSTOMER SUPPORT
              </h3>
              <p style={{ color: 'var(--beige)', fontSize: '0.9rem', marginBottom: '30px' }}>
                We're available to help you on the channels below.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Call Us */}
                <a
                  href={`tel:${contactInfo.phone.replace(/[^\d+]/g, '')}`}
                  style={{ display: 'flex', gap: '16px', alignItems: 'center', textDecoration: 'none' }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(201, 168, 76, 0.15)',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Phone size={20} />
                  </div>
                  <div>
                    <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 2px 0' }}>
                      Call Us
                    </h5>
                    <p style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 2px 0' }}>
                      {contactInfo.phone}
                    </p>
                    <p style={{ color: 'var(--grey-light)', fontSize: '0.8rem', margin: 0 }}>
                      {contactInfo.support_hours}
                    </p>
                  </div>
                </a>

                {/* WhatsApp Us */}
                <a
                  href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hello Chovique, I would like to inquire about your luxury chocolates.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', gap: '16px', alignItems: 'center', textDecoration: 'none' }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(46, 204, 113, 0.15)',
                      color: '#2ecc71',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      WhatsApp Us <span style={{ fontSize: '0.72rem', background: 'rgba(46, 204, 113, 0.2)', color: '#2ecc71', padding: '2px 8px', borderRadius: '20px' }}>Chat Now</span>
                    </h5>
                    <p style={{ color: '#2ecc71', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 2px 0' }}>
                      {contactInfo.whatsapp}
                    </p>
                    <p style={{ color: 'var(--grey-light)', fontSize: '0.8rem', margin: 0 }}>
                      {contactInfo.support_hours}
                    </p>
                  </div>
                </a>

                {/* Email Us */}
                <a
                  href={`mailto:${contactInfo.email}`}
                  style={{ display: 'flex', gap: '16px', alignItems: 'center', textDecoration: 'none' }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(201, 168, 76, 0.15)',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={20} />
                  </div>
                  <div>
                    <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 2px 0' }}>
                      Email Us
                    </h5>
                    <p style={{ color: 'var(--gold)', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 2px 0' }}>
                      {contactInfo.email}
                    </p>
                    <p style={{ color: 'var(--grey-light)', fontSize: '0.8rem', margin: 0 }}>Replies within 24 hours</p>
                  </div>
                </a>

                {/* Support Hours */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(201, 168, 76, 0.15)',
                      color: 'var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={20} />
                  </div>
                  <div>
                    <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 2px 0' }}>
                      Support Hours
                    </h5>
                    <p style={{ color: 'var(--beige)', fontSize: '0.85rem', margin: '0 0 2px 0' }}>
                      {contactInfo.support_hours}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
