import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { slideInLeft, slideInRight } from '../../lib/framer';
import { apiPost } from '../../lib/api';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    try {
      await apiPost<{ message: string }>('/contact', {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        subject: formData.subject || undefined,
        message: formData.message,
      });

      setSubmitted(true);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    { value: 'order', label: 'Order Inquiry' },
    { value: 'custom', label: 'Custom / Bulk Orders' },
    { value: 'corporate', label: 'Corporate Gifting' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <section
      id="contact"
      style={{
        padding: 'var(--section-padding) 0',
        background: 'var(--gradient-section-7)',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '50px',
          }}
        >
          {/* Left Column: Info */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={slideInLeft}
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <span className="section-label">Get In Touch</span>
            <h2 className="section-title">
              Let's Create <span className="gold">Something Sweet</span>
            </h2>
            <div className="gold-divider" />
            <p style={{ color: 'var(--beige)', marginBottom: '40px', lineHeight: 1.7 }}>
              Whether you're looking for bespoke corporate gifts, wedding favors, or simply want to share your thoughts — we'd love to hear from you.
            </p>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                color: 'var(--cream)',
                marginBottom: '24px',
              }}
            >
              Visit Our Store
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--gold)', marginTop: '4px' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                    Chovique Flagship Store
                  </h5>
                  <p style={{ color: 'var(--grey-light)', fontSize: '0.88rem', margin: 0 }}>
                    42, MG Road, Indiranagar
                    <br />
                    Bangalore, Karnataka 560038
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--gold)', marginTop: '4px' }}>
                  <Phone size={20} />
                </div>
                <div>
                  <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                    Call Us
                  </h5>
                  <p style={{ color: 'var(--grey-light)', fontSize: '0.88rem', margin: 0 }}>
                    +91 83098 54870
                    <br />
                    Mon - Sat, 10 AM - 7 PM
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ color: 'var(--gold)', marginTop: '4px' }}>
                  <Mail size={20} />
                </div>
                <div>
                  <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, margin: '0 0 4px 0' }}>
                    Email
                  </h5>
                  <p style={{ color: 'var(--grey-light)', fontSize: '0.88rem', margin: 0 }}>
                    hello@chovique.com
                    <br />
                    orders@chovique.com
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Form */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={slideInRight}
            className="glass-panel"
            style={{
              padding: '40px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(var(--dark-chocolate-rgb), 0.4)',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                color: 'var(--cream)',
                marginBottom: '8px',
              }}
            >
              Send Us a Message
            </h3>
            <p style={{ color: 'var(--grey-light)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Fill in the form and our team will get back to you within 24 hours.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label="First Name"
                  placeholder="Your first name"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
                <Input
                  label="Last Name"
                  placeholder="Your last name"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Select
                label="Subject"
                options={subjectOptions}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginBottom: '20px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <label
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--beige)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 500,
                  }}
                >
                  Your Message
                </label>
                <textarea
                  placeholder="Tell us how we can help..."
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(var(--dark-chocolate-rgb), 0.4)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '4px',
                    color: 'var(--cream)',
                    fontFamily: 'inherit',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'none',
                    transition: 'border-color 0.3s ease',
                  }}
                />
              </div>

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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'rgba(46, 204, 113, 0.2)',
                    border: '1px solid #2ecc71',
                    borderRadius: '4px',
                    color: '#2ecc71',
                    padding: '14px',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle size={20} />
                  <span>Message Sent Successfully!</span>
                </div>
              ) : (
                <Button variant="gold" fullWidth type="submit" disabled={submitting} glow>
                  {submitting ? 'Sending...' : 'Send Message'}
                </Button>
              )}
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
export default Contact;
