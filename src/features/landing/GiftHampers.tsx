import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Gift, Sparkles, Check, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/providers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { fadeInUp } from '../../lib/framer';
import { DEFAULT_LANDING_SECTIONS } from '../../types';

export const GiftHampers: React.FC = () => {
  const { products, role, landingSections } = useApp();
  const config = landingSections?.giftHampers || DEFAULT_LANDING_SECTIONS.giftHampers;
  const badge = config.badge || 'Art of Giving';
  const titleMain = config.titleMain ?? 'Luxury Gift';
  const titleHighlight = config.titleHighlight ?? 'Hampers';
  const titleSuffix = config.titleSuffix ?? '';
  const subtitle = config.subtitle || 'Celebrate life’s most exquisite moments with Chovique’s bespoke gifting packages and presentation boxes.';
  const navigate = useNavigate();
  const giftScrollRef = useRef<HTMLDivElement>(null);

  // Filter gift products strictly (by category 'gift' or badge 'Gift Hamper')
  const displayList = products.filter((p) => p.category === 'gift' || p.badge === 'Gift Hamper' || p.badge === 'Gift Hampers');

  const scroll = (direction: 'left' | 'right') => {
    if (giftScrollRef.current) {
      const { scrollLeft, clientWidth } = giftScrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      giftScrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const benefits = [
    'Handwritten custom greeting cards',
    'Luxurious gold-foiled presentation boxes',
    'Bespoke corporate customization options',
    'Temperature-controlled premium delivery',
  ];

  return (
    <section
      id="luxury-gift-hampers"
      style={{
        padding: 'var(--section-padding) 0',
        background: 'linear-gradient(135deg, #1C1C1E 0%, #2A2A2D 40%, #020100ff 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div id="gift-hampers" style={{ position: 'absolute', top: 0 }} />
      <div id="gift-collections" style={{ position: 'absolute', top: 0 }} />
      {/* Background radial highlight */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '100%',
          width: '100%',
          background: 'radial-gradient(circle at 10% 20%, rgba(201, 168, 76, 0.06) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        {/* Header */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInUp}
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          {badge && (
            <span className="section-label" style={{ justifyContent: 'center' }}>
              {badge}
            </span>
          )}
          <h2 className="section-title">
            {titleMain}{titleHighlight ? <> <span className="gold">{titleHighlight}</span></> : null}{titleSuffix ? ` ${titleSuffix}` : ''}
          </h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </motion.div>

        {/* Layout: Bespoke card on the left, products grid on the right */}
        <div className="dual-collections-container">
          {/* Bespoke Gifting Left Panel */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="collection-column"
            style={{
              background: 'rgba(10, 10, 10, 0.55)',
            }}
          >
            <div className="collection-header-group">
              <span className="collection-tag gold">Premium Service</span>
              <h3 className="collection-title">Bespoke Chocolate Hampers</h3>
              <p className="collection-desc">
                Tailored collections designed to make a statement. Perfect for corporate events, anniversaries, weddings, or festive occasions.
              </p>
            </div>

            <ul style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              {benefits.map((benefit, index) => (
                <li
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.95rem',
                    color: 'var(--cream)',
                  }}
                >
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(201, 168, 76, 0.15)',
                      border: '1px solid var(--gold)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--gold)',
                      flexShrink: 0,
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="gold"
              onClick={() => {
                if (role === 'guest') {
                  navigate('/login');
                } else {
                  navigate('/shop?category=gift');
                }
              }}
              style={{ width: 'fit-content' }}
            >
              Inquire Corporate Gifting <ArrowRight size={14} />
            </Button>
          </motion.div>

          {/* Gifting Products Right Panel */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={{
              initial: { opacity: 0, y: 40 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.2 } },
            }}
            className="collection-column"
            style={{
              background: 'rgba(10, 10, 10, 0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div className="collection-header-group" style={{ marginBottom: 0, flex: 1 }}>
                <span className="collection-tag silver">Ready to Gift</span>
                <h3 className="collection-title">Gift Collections</h3>
                <p className="collection-desc">
                  Select from our signature pre-packed truffles and custom presentation collections, ready to delight straight out of the box.
                </p>
              </div>
              {displayList.length > 2 && (
                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flexShrink: 0, marginTop: '8px' }}>
                  <button
                    onClick={() => scroll('left')}
                    aria-label="Scroll Left"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cream)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gold)';
                      e.currentTarget.style.color = 'var(--gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.color = 'var(--cream)';
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => scroll('right')}
                    aria-label="Scroll Right"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--cream)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gold)';
                      e.currentTarget.style.color = 'var(--gold)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                      e.currentTarget.style.color = 'var(--cream)';
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            <div
              ref={giftScrollRef}
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch',
                overscrollBehaviorX: 'contain',
                padding: '4px 2px 16px 2px',
                minWidth: 0,
                width: '100%',
              }}
              className="hide-scrollbar"
            >
              {displayList.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true }}
                  variants={{
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: index * 0.15 + 0.2 } },
                  }}
                  style={{
                    flex: '0 0 clamp(200px, calc(50% - 8px), 260px)',
                    minWidth: '200px',
                    maxWidth: '280px',
                    scrollSnapAlign: 'start',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                  }}
                >
                  <Card product={product} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default GiftHampers;
