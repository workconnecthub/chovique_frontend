import React from 'react';
import { motion } from 'framer-motion';
import { Lock, CreditCard, Truck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pageTransition, fadeIn } from '../../lib/framer';

export const PrivacyPolicyPage: React.FC = () => {
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
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--beige)', fontSize: '0.98rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
            Your privacy is as precious as the cacao we source. Learn how Chovique safeguards your personal and transactional information.
          </p>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginTop: '12px' }}>
            Last Updated: September 2026
          </span>
        </div>

        {/* Highlight trust badges */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <Lock size={28} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--cream)' }}>256-Bit SSL Encrypted</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--beige)' }}>Bank-grade encryption on every page</p>
            </div>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <CreditCard size={28} style={{ color: '#3395FF', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--cream)' }}>Razorpay PCI-DSS Level 1</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--beige)' }}>Zero raw card data stored on our servers</p>
            </div>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <Truck size={28} style={{ color: '#2ecc71', flexShrink: 0 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--cream)' }}>Discrete Delivery Privacy</h4>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--beige)' }}>Address details shared strictly for shipping</p>
            </div>
          </div>
        </div>

        {/* Content sections in Luxury Glass Card */}
        <motion.div
          variants={fadeIn}
          className="glass-panel"
          style={{
            padding: 'clamp(24px, 5vw, 42px)',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(26, 16, 12, 0.65)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
            lineHeight: 1.75,
            fontSize: '0.95rem',
            color: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              1. Introduction & Overview
            </h2>
            <p>
              Welcome to <strong>CHOVIQUE</strong> (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We operate the online chocolate store 
              accessible at chovique.in dedicated to creating and delivering bespoke, temperature-controlled, 
              handcrafted chocolates across India.
            </p>
            <p>
              This Privacy Policy explains how we collect, use, protect, and handle your information when you browse our collections, create an account, 
              place orders, or communicate with our customer support team.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              2. Information We Collect
            </h2>
            <p>To fulfill your chocolate gifting and indulgence orders, we collect the following types of information:</p>
            <ul style={{ paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>
                <strong style={{ color: 'var(--cream)' }}>Contact & Delivery Details:</strong> Full name, telephone/mobile number, email address, and complete shipping address with PIN code.
              </li>
              <li>
                <strong style={{ color: 'var(--cream)' }}>Order & Preference Details:</strong> Cart items, bespoke gift box selections, custom message notes, coupon applications, and Chovique rewards coin history.
              </li>
              <li>
                <strong style={{ color: 'var(--cream)' }}>Device & Usage Data:</strong> IP address, device type, browser settings, and interaction telemetry to ensure fast, responsive chocolate browsing.
              </li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              3. Payment Security & Razorpay Integration
            </h2>
            <p>
              We prioritize the highest security for your transactions. All online payments on Chovique — including Credit Cards, 
              Debit Cards, Net Banking, and UPI (Google Pay, PhonePe, Paytm) — are processed exclusively through 
              <strong> Razorpay Software Private Limited</strong>, an RBI-authorized Payment Aggregator complying with the 
              Payment Card Industry Data Security Standard (<strong>PCI-DSS Level 1</strong>).
            </p>
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '6px',
                background: 'rgba(201, 168, 76, 0.08)',
                borderLeft: '3px solid var(--gold)',
                margin: '14px 0',
              }}
            >
              <strong style={{ color: 'var(--gold)' }}>Notice:</strong> Chovique servers never see, collect, or store your 
              complete credit/debit card numbers, CVV, or banking OTPs. All payment credentials are transmitted via 
              bank-grade TLS encryption directly into Razorpay&rsquo;s audited tokenized vault.
            </div>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              4. How We Use Your Information
            </h2>
            <p>We use your data strictly for legitimate confectionery commerce purposes:</p>
            <ul style={{ paddingLeft: '22px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Crafting, packing, and dispatching your artisanal chocolate orders in insulated temperature-regulated packages.</li>
              <li>Sending live delivery tracking updates, dispatch confirmations, and digital invoices.</li>
              <li>Providing responsive support via our Chocolate Concierge for gifting inquiries and custom orders.</li>
              <li>Managing Chovique Reward Coins and promotional discount loyalty benefits.</li>
              <li>Preventing unauthorized transactions, fake orders, and protecting the storefront against fraud.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              5. Cold-Chain Logistics & Third-Party Disclosure
            </h2>
            <p>
              Because chocolates are delicate and temperature-sensitive, we collaborate with reputable express 
              logistics partners. We only share essential shipping information (recipient name, address, and phone number) strictly for delivery 
              coordination. We never sell, rent, or trade your personal information to third-party advertisers.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              6. Your Rights & Data Choices
            </h2>
            <p>
              You have the right to review, update, or request deletion of your saved addresses and profile details at any time via the 
              <strong> Customer Dashboard</strong>. You may also request deletion of your account records by reaching out to our 
              concierge desk.
            </p>
          </section>

          <section style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', color: 'var(--gold)', marginBottom: '10px' }}>
              7. Contact Our Privacy Concierge
            </h2>
            <p>
              If you have any questions, clarifications, or requests regarding this Privacy Policy, please contact us:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--cream)', fontWeight: 500 }}>
              <span>CHOVIQUE Artisan Confectionery</span>
              <span>Email: <a href="mailto:info@chovique.in" style={{ color: 'var(--gold)', textDecoration: 'none' }}>info@chovique.in</a></span>
              <span>Grievance Desk: <a href="mailto:support@chovique.in" style={{ color: 'var(--gold)', textDecoration: 'none' }}>support@chovique.in</a></span>
            </div>
          </section>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PrivacyPolicyPage;
