import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Snowflake, ShieldAlert, ArrowLeft, Clock, CheckCircle2, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pageTransition, fadeIn } from '../../lib/framer';

export const RefundPolicyPage: React.FC = () => {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        paddingTop: '110px',
        paddingBottom: '80px',
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 10%, rgba(90, 56, 37, 0.4) 0%, rgba(13, 9, 10, 0.98) 70%), #0d090a',
        color: 'var(--cream)',
      }}
    >
      <div className="container" style={{ maxWidth: '920px', margin: '0 auto', padding: '0 20px' }}>
        {/* Back navigation */}
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--gold)',
            fontSize: '0.88rem',
            textDecoration: 'none',
            marginBottom: '28px',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Back to Shop
        </Link>

        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '45px' }}>
          <span
            style={{
              textTransform: 'uppercase',
              letterSpacing: '3px',
              fontSize: '0.8rem',
              color: 'var(--gold)',
              fontWeight: 600,
              display: 'block',
              marginBottom: '10px',
            }}
          >
            Chovique Confectionery
          </span>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              color: 'var(--cream)',
              marginBottom: '14px',
              fontWeight: 700,
            }}
          >
            Refund & Replacement Policy
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
            Our Melt-Free & Quality Guarantee &bull; Effective: January 2026
          </p>
        </div>

        {/* Highlight cards */}
        <motion.div
          variants={fadeIn}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <Snowflake size={24} color="var(--gold)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1rem', marginBottom: '6px' }}>Melt-Free Guarantee</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              If your chocolates arrive melted or damaged during transit, we replace or refund with zero hassle.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <Clock size={24} color="var(--gold)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1rem', marginBottom: '6px' }}>48-Hour Reporting Window</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Simply share photos of your delivered parcel within 48 hours for expedited support.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <RefreshCw size={24} color="var(--gold)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1rem', marginBottom: '6px' }}>Razorpay Direct Reversal</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Funds return directly to your original UPI, Google Pay, or Card account within 5-7 business days.
            </p>
          </div>
        </motion.div>

        {/* Main Content Body */}
        <div
          style={{
            background: 'rgba(26, 17, 16, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            borderRadius: '16px',
            padding: 'clamp(24px, 5vw, 48px)',
            lineHeight: 1.8,
            fontSize: '0.96rem',
            color: 'var(--cream)',
          }}
        >
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              1. Our Confectionery Promise
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              At <strong>Chovique</strong>, every truffle, praline, and chocolate tablet is handcrafted with absolute devotion to taste, texture, and visual elegance. Because our creations are temperature-sensitive culinary perishables, they require special handling. We have established this comprehensive policy to ensure you shop with absolute confidence.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              2. Perishable Food Nature & Returns Policy
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              In accordance with international food safety and hygiene protocols (FSSAI guidelines), <strong>we do not accept physical returns of opened or delivered edible confectionery products</strong>. Once a parcel has left our temperature-controlled kitchen and been delivered, it cannot be safely reintroduced into inventory.
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              However, if your experience falls short of our luxury standard due to courier mishandling, transit heat damage, or shipping errors, we will immediately make it right via <strong>free priority replacement</strong> or <strong>full refund</strong>.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              3. Melt-Free & Transit Damage Protection
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              We ship our chocolates inside multi-layered thermal pouches packed with reusable gel ice packs. You are fully eligible for a replacement or refund under the following conditions:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)' }}>
              <li><strong>Transit Melting:</strong> The chocolates have melted, lost temper, or fused together despite proper delivery receipt.</li>
              <li><strong>Physical Transit Damage:</strong> The packaging or presentation box arrived crushed, punctured, or significantly torn by the courier service.</li>
              <li><strong>Incorrect or Missing Items:</strong> You received an incorrect flavor box or an item was omitted from your consignment.</li>
              <li><strong>Expired or Defective Product:</strong> The seal was breached prior to delivery or product freshness was compromised.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              4. How to Claim a Replacement or Refund
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              To ensure prompt resolution, please follow these simple steps within <strong>48 hours</strong> of receiving the consignment:
            </p>
            <ol style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)', marginBottom: '16px' }}>
              <li>Take 2 to 3 clear photos or a short video of the damaged chocolates and external courier box with shipping label visible.</li>
              <li>Email our concierge at <span style={{ color: 'var(--gold)' }}>support@chovique.com</span> or message our WhatsApp helpline at <strong>+91 83098 54870</strong>.</li>
              <li>Include your <strong>Order ID</strong> (e.g. #CHOV-1024) and a brief description of the issue.</li>
            </ol>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              Our team reviews claims within <strong>4 to 6 business hours</strong>. Upon verification, we will dispatch an express replacement box at zero extra cost or initiate an immediate refund through Razorpay.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              5. Order Cancellations
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              You may cancel your order for a <strong>100% full refund</strong> provided the cancellation request is received <strong>before the order has been dispatched or custom-tempered</strong>.
            </p>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)' }}>
              <li><strong>Pre-Dispatch Cancellation:</strong> Instant processing; funds are unlocked immediately through Razorpay.</li>
              <li><strong>Post-Dispatch:</strong> Once our insulated courier has picked up the chocolates, cancellation is not possible due to perishability.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              6. Razorpay Refund Processing & Timelines
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              All refunds are securely credited back to the original payment source utilized during checkout:
            </p>
            <div
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(212, 175, 55, 0.15)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <p style={{ marginBottom: '6px' }}>&bull; <strong>UPI / Google Pay / PhonePe:</strong> Credited within 24 to 48 banking hours.</p>
              <p style={{ marginBottom: '6px' }}>&bull; <strong>Credit & Debit Cards (Visa / Mastercard / RuPay):</strong> 5 to 7 business days (dependent on issuing bank).</p>
              <p>&bull; <strong>Net Banking:</strong> 3 to 5 business days.</p>
            </div>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              Once initiated, Razorpay will send a notification SMS / Email containing the Refund Reference (RRN) number for transparent tracking with your bank.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              7. Need Concierge Assistance?
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              We are dedicated to delighting every guest. If you ever have questions or need assistance with an order, please do not hesitate to contact us:
            </p>
            <div
              style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(212, 175, 55, 0.1)',
                fontSize: '0.9rem',
              }}
            >
              <p><strong>Chovique Customer Care & Concierge</strong></p>
              <p>Email: <span style={{ color: 'var(--gold)' }}>support@chovique.com</span></p>
              <p>WhatsApp / Call: +91 83098 54870 (Mon &ndash; Sat, 9:00 AM &ndash; 8:00 PM IST)</p>
              <p>Store Studio: Jubilee Hills, Hyderabad, Telangana, India</p>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};
