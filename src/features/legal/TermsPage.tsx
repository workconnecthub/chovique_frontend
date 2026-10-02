import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Scale, ArrowLeft, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pageTransition, fadeIn } from '../../lib/framer';

export const TermsPage: React.FC = () => {
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
            Terms & Conditions of Service
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
            Effective Date: January 1, 2026 &bull; Last Revised: March 2026
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
            <Sparkles size={24} color="var(--gold)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1rem', marginBottom: '6px' }}>Artisan Standards</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Handcrafted in micro-batches with single-origin cacao and natural inclusions.
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
            <ShieldCheck size={24} color="var(--gold)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1rem', marginBottom: '6px' }}>Secure Ordering</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              All transactions are encrypted and processed through RBI-authorized Razorpay gateways.
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
            <Scale size={24} color="var(--gold)" style={{ marginBottom: '10px' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1rem', marginBottom: '6px' }}>Fair Trade & Compliance</h4>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Full adherence to Indian Consumer Protection (E-Commerce) Rules and FSSAI standards.
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
              1. Acceptance of Terms
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              Welcome to <strong>Chovique</strong> (&ldquo;Chovique Confectionery&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;). By accessing our online store, placing an order, or browsing our chocolates, you agree to be bound by these Terms and Conditions (&ldquo;Terms&rdquo;), along with our Privacy Policy and Refund Policy. If you do not agree with any portion of these Terms, please refrain from using our service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              2. Artisan Confectionery & Handcrafted Variations
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              Chovique chocolates, bonbons, truffles, and gourmet bars are lovingly hand-poured, hand-tempered, and painted in limited culinary batches. As each creation is an edible work of art:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              <li><strong>Artistic Nuances:</strong> Slight visual variations in surface marble patterning, natural cocoa luster, and 24K edible gold leaf application are natural markers of authenticity.</li>
              <li><strong>Allergen Declaration:</strong> Our confections are crafted in a culinary kitchen that processes dairy, tree nuts (almonds, pistachios, hazelnuts, walnuts), peanuts, soy lecithin, and sesame. Customers with severe food allergies must review ingredients carefully before purchasing.</li>
              <li><strong>Shelf Life & Care:</strong> Our bonbons contain fresh fruit purees and fresh cream ganache free of artificial stabilizers. For optimal flavor, enjoy within 21 days and store at a temperature between 15°C – 18°C (59°F – 64°F) in a cool, dark environment.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              3. Ordering, Pricing & Availability
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              All prices displayed on our website are stated in Indian Rupees (INR) and are inclusive of applicable Goods and Services Tax (GST). Delivery charges, if applicable based on destination pin-code and insulated courier requirements, are transparently presented at checkout before you authorize payment.
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              Due to the seasonal harvest of rare single-origin cocoa pods and micro-batch production, we reserve the right to limit order quantities or discontinue specific limited-edition boxes. In the rare event an ordered item becomes unavailable post-checkout, you will be promptly contacted with the choice of an artisanal replacement or an immediate full refund.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              4. Payment Processing & Razorpay
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              We facilitate online transactions through our authorized payment partner, <strong>Razorpay Software Private Limited</strong>. By completing payment, you agree:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)' }}>
              <li>You are legally authorized to use the chosen payment instrument (UPI ID, Google Pay, Credit Card, Debit Card, or Net Banking).</li>
              <li>Chovique never stores or accesses your raw card numbers, CVV codes, or banking credentials on our servers.</li>
              <li>All payments undergo two-factor authentication (2FA) or OTP verification as mandated by the Reserve Bank of India (RBI).</li>
              <li>In case of duplicate deductions due to network dropouts, Razorpay automatically reconciles and reverses excess amounts back to your source account within 3 to 5 business days.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              5. Climate-Controlled Shipping & Delivery Responsibilities
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              Chocolates are heat-sensitive luxury goods. To guarantee they arrive in impeccable condition:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)' }}>
              <li>We package every shipment in thermal-insulated boxes equipped with reusable gel ice packs and honeycomb padding.</li>
              <li>The customer is responsible for providing complete and accurate shipping information, including apartment/suite numbers and working contact numbers.</li>
              <li>Failed deliveries resulting from incorrect addresses or recipient unavailability during courier delivery attempts may compromise freshness and are not eligible for non-delivery claims.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              6. Intellectual Property
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              All content on this website—including recipes, packaging designs, photography, product names, logos, typography, visual layouts, and graphics—is the exclusive intellectual property of Chovique Confectionery and protected by applicable Indian and international copyright and trademark laws. Unauthorized reproduction or commercial use is strictly prohibited.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              7. Governing Law & Jurisdiction
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any disputes arising in connection with orders or these Terms shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana, India.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontSize: '1.4rem', marginBottom: '12px' }}>
              8. Contact & Legal Inquiries
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
              If you have any questions or clarifications regarding these Terms of Service, please contact our concierge team:
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
              <p><strong>Chovique Confectionery Legal & Compliance</strong></p>
              <p>Email: <span style={{ color: 'var(--gold)' }}>legal@chovique.com</span></p>
              <p>Customer Concierge: <span style={{ color: 'var(--gold)' }}>support@chovique.com</span></p>
              <p>Phone: +91 83098 54870</p>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};
