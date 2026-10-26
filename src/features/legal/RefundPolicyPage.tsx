import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Snowflake,
  ShieldCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileText,
  CreditCard,
  Banknote,
  PackageCheck,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Flame,
  PackageX,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { pageTransition, fadeIn } from '../../lib/framer';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const RefundPolicyPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<string | null>('faq-1');

  const toggleFaq = (id: string) => {
    setOpenFaq((prev) => (prev === id ? null : id));
  };

  const returnReasons = [
    {
      title: 'Damaged product',
      desc: 'Box crushed, broken truffles, or physical courier transit damage.',
      icon: <PackageX size={20} color="var(--gold)" />,
    },
    {
      title: 'Melted chocolate',
      desc: 'Chocolates melted, lost temper, or fused together due to ambient heat.',
      icon: <Flame size={20} color="var(--gold)" />,
    },
    {
      title: 'Wrong product delivered',
      desc: 'Received a different flavor, size, or assortment than what was ordered.',
      icon: <RefreshCw size={20} color="var(--gold)" />,
    },
    {
      title: 'Missing item',
      desc: 'One or more boxes, pieces, or complimentary gifts omitted from consignment.',
      icon: <AlertCircle size={20} color="var(--gold)" />,
    },
    {
      title: 'Packaging issue',
      desc: 'Broken tamper seals, punctured thermal pouch, or torn gift packaging.',
      icon: <ShieldCheck size={20} color="var(--gold)" />,
    },
    {
      title: 'Other issue',
      desc: 'Any other verified confectionery freshness, defect, or quality concern.',
      icon: <HelpCircle size={20} color="var(--gold)" />,
    },
  ];

  const processSteps = [
    {
      num: '1',
      title: 'My Orders',
      desc: 'Sign into your Chovique account and open the My Orders tab in your dashboard.',
    },
    {
      num: '2',
      title: 'Open Delivered Order',
      desc: 'Select the specific order that has been confirmed as Delivered by our courier.',
    },
    {
      num: '3',
      title: 'Click Return',
      desc: 'The Return button is enabled exclusively within 30 minutes of delivery timestamp.',
    },
    {
      num: '4',
      title: 'Select Reason',
      desc: 'Choose one of the 6 supported issue categories that best matches the problem.',
    },
    {
      num: '5',
      title: 'Add Description & Photo',
      desc: 'Provide an issue explanation and upload photos of the chocolates and packaging label.',
    },
    {
      num: '6',
      title: 'Submit Request',
      desc: 'Order ID, amount, payment method, and address are verified and populated from the database.',
    },
    {
      num: '7',
      title: 'Support Team Review',
      desc: 'Our concierge reviews the evidence and updates your return status with an appropriate resolution.',
    },
  ];

  const faqs: FaqItem[] = [
    {
      id: 'faq-1',
      question: 'Why does Chovique have a 30-minute return reporting window?',
      answer:
        'Chovique chocolates are fresh, artisanal, temperature-sensitive culinary perishables handcrafted without artificial stabilizers. Our 30-minute window from the courier delivery timestamp allows our kitchen and support team to evaluate packaging and temperature logs swiftly, ensuring rapid replacement dispatch while maintaining strict food hygiene protocols.',
    },
    {
      id: 'faq-2',
      question: 'Do I need to physically ship the melted or damaged chocolates back?',
      answer:
        'No. Under FSSAI and standard food-safety guidelines, perishable food items that have been delivered or opened cannot be reintroduced into our kitchens or logistics chain. Clear photos and your description uploaded via the Return Request form serve as full evidence for our concierge team.',
    },
    {
      id: 'faq-3',
      question: 'What happens if I submit a return request for Cash on Delivery (COD)?',
      answer:
        'For COD orders, physical cash cannot be refunded at the doorstep. Once your return request is approved by our support team, our concierge will coordinate a direct NEFT/IMPS bank transfer to your verified account or issue instant Chovique store wallet credits, according to your preference. Chovique will never ask for your card details, CVV, or UPI PIN.',
    },
    {
      id: 'faq-4',
      question: 'How do I track the status of my return request?',
      answer:
        'You can view real-time updates directly on your delivered order details card in My Orders. Your request will progress from Pending → Under Review → Approved / Rejected. You will also receive email notifications whenever our team updates the status.',
    },
  ];

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="legal-page"
      style={{
        paddingBottom: '90px',
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 5%, rgba(90, 56, 37, 0.45) 0%, rgba(13, 9, 10, 0.98) 60%), #0d090a',
        color: 'var(--cream)',
      }}
    >
      <div className="container" style={{ maxWidth: '980px', margin: '0 auto', padding: '0 24px' }}>
        {/* Navigation Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingTop: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--gold)',
              fontSize: '0.92rem',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'opacity 0.2s',
            }}
          >
            <ArrowLeft size={16} /> Back to Shop
          </Link>

          <Link
            to="/dashboard?tab=orders"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--cream)',
              background: 'rgba(212, 175, 55, 0.12)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.86rem',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ShoppingBag size={14} color="var(--gold)" /> My Orders & Returns
          </Link>
        </div>

        {/* Page Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              padding: '6px 16px',
              borderRadius: '30px',
              marginBottom: '16px',
            }}
          >
            <Sparkles size={14} color="var(--gold)" />
            <span
              style={{
                textTransform: 'uppercase',
                letterSpacing: '2.5px',
                fontSize: '0.78rem',
                color: 'var(--gold)',
                fontWeight: 700,
              }}
            >
              Chovique Confectionery &bull; Artisan Quality
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              color: 'var(--cream)',
              marginBottom: '14px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
            }}
          >
            Refund & Replacement Policy
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.02rem', maxWidth: '640px', margin: '0 auto' }}>
            Our Melt-Free Assurance, Return Reporting Guidelines & Consumer Protection Commitment &bull; Effective 2026
          </p>
        </div>

        {/* 1. PROMINENT 30-MINUTE REPORTING NOTICE */}
        <motion.div
          variants={fadeIn}
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.18) 0%, rgba(35, 20, 16, 0.95) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.45)',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
            borderRadius: '16px',
            padding: 'clamp(20px, 3.5vw, 32px)',
            marginBottom: '36px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '18px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'rgba(212, 175, 55, 0.2)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={26} color="var(--gold)" />
            </div>

            <div style={{ flex: '1 1 300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span
                  style={{
                    background: '#C9A84C',
                    color: '#0D090A',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Time-Sensitive
                </span>
                <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                  30-Minute Delivery Window
                </span>
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  color: 'var(--gold-light, #F5E6D3)',
                  fontSize: 'clamp(1.25rem, 2.8vw, 1.6rem)',
                  fontWeight: 700,
                  marginBottom: '10px',
                  lineHeight: 1.3,
                }}
              >
                Report damaged, melted, incorrect, or missing items within 30 minutes of delivery.
              </h2>

              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.88)',
                  fontSize: '0.98rem',
                  lineHeight: 1.7,
                  marginBottom: '14px',
                }}
              >
                Because artisan chocolate is a temperature-sensitive, culinary perishable, any return or issue request
                must be submitted through <strong>My Orders</strong> within <strong>30 minutes of the actual delivery timestamp</strong> recorded by our logistics partner. Calculating the deadline against the official delivery timestamp ensures prompt evaluation while maintaining food safety integrity.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(212, 175, 55, 0.18)',
                }}
              >
                <p style={{ color: 'var(--beige)', fontSize: '0.84rem', margin: 0, fontStyle: 'italic', maxWidth: '620px' }}>
                  * This 30-minute reporting window is the store&apos;s standard procedure for expedited in-app resolution, without prejudice to any applicable consumer-protection requirements.
                </p>

                <Link
                  to="/dashboard?tab=orders"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--gold)',
                    color: '#0D090A',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(201, 168, 76, 0.35)',
                  }}
                >
                  View My Orders <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={fadeIn}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '18px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              background: 'rgba(26, 17, 16, 0.8)',
              border: '1px solid rgba(212, 175, 55, 0.22)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <Snowflake size={26} color="var(--gold)" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: 'var(--cream)', fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>
              Melt-Free Guarantee
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              All chocolates are shipped in multi-layer insulated thermal packaging with gel ice packs. If courier heat breaches our standard, we replace or refund with zero hassle.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(26, 17, 16, 0.8)',
              border: '1px solid rgba(212, 175, 55, 0.22)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <Clock size={26} color="var(--gold)" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: 'var(--cream)', fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>
              30-Minute Reporting
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Submit your return request directly on the delivered order details screen. The Return button is active for 30 minutes following confirmed courier delivery.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(26, 17, 16, 0.8)',
              border: '1px solid rgba(212, 175, 55, 0.22)',
              borderRadius: '14px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            <RefreshCw size={26} color="var(--gold)" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: 'var(--cream)', fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>
              Transparent Resolutions
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              Online payments reversed directly to your original UPI/Card through Razorpay. Cash on Delivery orders refunded via direct bank transfer or store credits upon review.
            </p>
          </div>
        </motion.div>

        {/* Main Content Body Container */}
        <div
          style={{
            background: 'rgba(26, 17, 16, 0.78)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(212, 175, 55, 0.18)',
            borderRadius: '18px',
            padding: 'clamp(24px, 5vw, 48px)',
            lineHeight: 1.85,
            fontSize: '1.02rem',
            color: 'var(--cream)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* SECTION 1: PERISHABLE NATURE & CONFECTIONERY PROMISE */}
          <section style={{ marginBottom: '44px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Sparkles size={20} color="var(--gold)" /> 1. Confectionery Promise & Food Safety Standards
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
              At <strong>Chovique</strong>, each praline, truffle, and chocolate tablet is handcrafted with single-origin cacao and tempered to delicate perfection. Because our creations are temperature-sensitive perishable food items, they require specialized cold-chain transit.
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
              In adherence to international food safety protocols (FSSAI guidelines), <strong>we do not accept physical returns of opened or delivered edible confections for subjective reasons such as change of mind</strong>. Once a parcel has been delivered, it cannot be safely reintroduced into kitchen inventory.
            </p>
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.08)',
                borderLeft: '4px solid var(--gold)',
                padding: '14px 18px',
                borderRadius: '0 8px 8px 0',
                color: 'var(--cream)',
                fontSize: '0.96rem',
              }}
            >
              <strong>Your Quality Guarantee:</strong> While change-of-mind food returns are prohibited, you are <strong>100% protected and entitled to full remedy</strong> (free express replacement or refund) for any transit melting, courier crushing, packaging breaches, incorrect items, or missing items reported in accordance with this policy and consumer protection requirements.
            </div>
          </section>

          {/* SECTION 2: RETURN ELIGIBILITY REASONS (6 CATEGORIES) */}
          <section style={{ marginBottom: '44px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <CheckCircle2 size={20} color="var(--gold)" /> 2. Return Eligibility Reasons
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '18px' }}>
              Customers can submit a return request for delivered orders by selecting one of the <strong>6 supported issue categories</strong>:
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
                marginBottom: '20px',
              }}
            >
              {returnReasons.map((reason, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(212, 175, 55, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {reason.icon}
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                      {idx + 1}. {reason.title}
                    </h4>
                    <p style={{ color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.5, margin: 0 }}>
                      {reason.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Evidence Requirements Box */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}
            >
              <Camera size={24} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ color: 'var(--gold)', fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>
                  Supporting Evidence Requirements
                </h4>
                <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                  To ensure fast review and prevent fraudulent submissions, customers must provide a <strong>detailed written description</strong> (minimum 5 characters) explaining the issue and upload <strong>supporting photo evidence</strong> (JPG, PNG, or WebP up to 5MB) clearly displaying the damaged chocolate and the outer shipping label.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 3: STEP-BY-STEP RETURN REQUEST PROCESS */}
          <section style={{ marginBottom: '44px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <PackageCheck size={20} color="var(--gold)" /> 3. Step-by-Step Return Request Process
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '20px' }}>
              Submitting a return request is simple, transparent, and completed entirely within your Chovique account:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {processSteps.map((step, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(212, 175, 55, 0.15)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--gold)',
                      color: '#0D090A',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--gold-light, #F5E6D3)', fontSize: '0.98rem', fontWeight: 600, marginBottom: '2px' }}>
                      {step.title}
                    </h4>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Authoritative Data & Button Rules Callout */}
            <div
              style={{
                background: 'rgba(212, 175, 55, 0.07)',
                border: '1px solid rgba(212, 175, 55, 0.28)',
                borderRadius: '12px',
                padding: '18px 20px',
              }}
            >
              <h4 style={{ color: 'var(--gold)', fontSize: '0.98rem', fontWeight: 700, marginBottom: '8px' }}>
                Important Technical & Security Rules:
              </h4>
              <ul style={{ paddingLeft: '20px', margin: 0, color: 'rgba(255, 255, 255, 0.82)', fontSize: '0.92rem' }}>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Authoritative Order Details:</strong> Your Order ID, total amount, payment method, delivery address, and delivery timestamp are automatically verified from our secure database, rather than client-submitted data.
                </li>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Button Availability:</strong> The Return button is enabled exclusively when the order status is <strong>Delivered</strong> and the current time is within <strong>30 minutes</strong> of the actual delivery timestamp.
                </li>
                <li>
                  <strong>Expired Window:</strong> If 30 minutes have elapsed since delivery, the Return button is automatically disabled and displays: <em>&ldquo;The return request window has expired.&rdquo;</em> This deadline is strictly enforced on the backend as well as the frontend.
                </li>
              </ul>
            </div>
          </section>

          {/* SECTION 4: REFUND & REPLACEMENT DECISIONS */}
          <section style={{ marginBottom: '44px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <RefreshCw size={20} color="var(--gold)" /> 4. Refund & Replacement Decisions
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '14px' }}>
              Submitting a return request initiates a formal review by our support team; it does <strong>not</strong> trigger an instantaneous automatic refund or duplicate order.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <CheckCircle2 size={20} color="#4CAF50" />
                  <h4 style={{ color: 'var(--cream)', fontSize: '1.05rem', fontWeight: 600 }}>Approved Resolution</h4>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  If the claim and photo evidence confirm courier transit damage, melting, or fulfillment errors, our team approves the request. You will be provided either a <strong>free priority replacement consignment</strong> dispatched in fresh thermal packaging or a <strong>full/partial refund</strong>. Order status changes to <em>Returned</em>.
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertTriangle size={20} color="#F44336" />
                  <h4 style={{ color: 'var(--cream)', fontSize: '1.05rem', fontWeight: 600 }}>Rejected Claim</h4>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  If the request falls outside the 30-minute window, lacks valid evidence, or reflects post-delivery improper storage, the request is closed with administrator review notes. The order remains in <em>Delivered</em> status.
                </p>
              </div>
            </div>

            {/* Payment Method Details */}
            <h3 style={{ color: 'var(--gold)', fontSize: '1.18rem', fontWeight: 600, marginBottom: '12px' }}>
              Refund Timelines by Payment Method
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '16px',
              }}
            >
              {/* Online Payment (Razorpay) */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <CreditCard size={20} color="var(--gold)" />
                  <h4 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600 }}>
                    Online Payments (Razorpay)
                  </h4>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '0.88rem', marginBottom: '10px' }}>
                  Refunds are credited directly to the original bank, UPI, or card account used at checkout:
                </p>
                <ul style={{ paddingLeft: '18px', margin: 0, color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <li><strong>UPI / Google Pay / PhonePe:</strong> 24 to 48 banking hours.</li>
                  <li><strong>Credit / Debit Cards:</strong> 5 to 7 business days (dependent on issuing bank).</li>
                  <li><strong>Net Banking:</strong> 3 to 5 business days.</li>
                  <li>An official Refund Reference Number (RRN) is provided for tracking.</li>
                </ul>
              </div>

              {/* Cash on Delivery (COD) */}
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(212, 175, 55, 0.2)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <Banknote size={20} color="var(--gold)" />
                  <h4 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 600 }}>
                    Cash on Delivery (COD)
                  </h4>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '0.88rem', marginBottom: '10px' }}>
                  Cash collected at delivery cannot be physically returned at the doorstep:
                </p>
                <ul style={{ paddingLeft: '18px', margin: 0, color: 'var(--muted)', fontSize: '0.86rem', lineHeight: 1.6 }}>
                  <li>Upon approval, our concierge coordinates a secure <strong>NEFT / IMPS bank transfer</strong> to your verified account.</li>
                  <li>Alternatively, receive immediate <strong>Chovique Wallet Credits</strong> for instant re-ordering.</li>
                  <li>Chovique will <strong>never</strong> ask for card CVVs, online passwords, or UPI PINs.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* SECTION 5: ORDER CANCELLATIONS */}
          <section style={{ marginBottom: '44px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Clock size={20} color="var(--gold)" /> 5. Order Cancellation Policy
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '12px' }}>
              Orders may be cancelled for a <strong>100% full refund</strong> provided the cancellation request is submitted before the order enters preparation:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'rgba(255, 255, 255, 0.82)', marginBottom: '12px' }}>
              <li>
                <strong>Pre-Dispatch Cancellation:</strong> Eligible if cancelled through the dashboard before the package is handed over to the courier partner or custom-tempered. Razorpay refunds are initiated immediately.
              </li>
              <li>
                <strong>Post-Dispatch:</strong> Once our insulated courier partner has collected the consignment, cancellation is not possible due to temperature sensitivity and perishability.
              </li>
            </ul>
          </section>

          {/* SECTION 6: FAQS ACCORDION */}
          <section style={{ marginBottom: '44px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <HelpCircle size={20} color="var(--gold)" /> 6. Frequently Asked Questions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {faqs.map((faq) => {
                const isOpen = openFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: `1px solid ${isOpen ? 'rgba(212, 175, 55, 0.4)' : 'rgba(212, 175, 55, 0.15)'}`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(faq.id)}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        background: 'transparent',
                        border: 'none',
                        color: isOpen ? 'var(--gold)' : 'var(--cream)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 600,
                      }}
                    >
                      <span>{faq.question}</span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={18} color="var(--gold)" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div
                            style={{
                              padding: '0 20px 16px 20px',
                              color: 'rgba(255, 255, 255, 0.82)',
                              fontSize: '0.94rem',
                              lineHeight: 1.7,
                              borderTop: '1px solid rgba(212, 175, 55, 0.1)',
                            }}
                          >
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SECTION 7: CONCIERGE & VERIFIED CONTACTS */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--gold)',
                fontSize: '1.5rem',
                marginBottom: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Phone size={20} color="var(--gold)" /> 7. Need Dedicated Concierge Assistance?
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.85)', marginBottom: '16px' }}>
              We are committed to delighting every guest. If you ever have a question regarding a delivered order or require bespoke assistance with your return request, our concierge team is at your service:
            </p>

            <div
              style={{
                padding: '22px',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                fontSize: '0.94rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Mail size={16} color="var(--gold)" />
                  <strong style={{ color: 'var(--gold)' }}>Email Support:</strong>
                </div>
                <a
                  href="mailto:support@chovique.com"
                  style={{ color: 'var(--cream)', textDecoration: 'none', marginLeft: '24px', display: 'block' }}
                >
                  support@chovique.com
                </a>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Phone size={16} color="var(--gold)" />
                  <strong style={{ color: 'var(--gold)' }}>Concierge Helpline / WhatsApp:</strong>
                </div>
                <p style={{ color: 'var(--cream)', margin: '0 0 0 24px' }}>
                  +91 83098 54870 (Mon &ndash; Sat, 9:00 AM &ndash; 8:00 PM IST)
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <MapPin size={16} color="var(--gold)" />
                  <strong style={{ color: 'var(--gold)' }}>Artisan Studio:</strong>
                </div>
                <p style={{ color: 'var(--cream)', margin: '0 0 0 24px' }}>
                  Jubilee Hills, Hyderabad, Telangana, India
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
};
