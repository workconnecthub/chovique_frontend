import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../app/providers';
import { Card } from '../../components/ui/Card';
import { fadeInUp } from '../../lib/framer';
import { DEFAULT_LANDING_SECTIONS } from '../../types';

export const PopularProducts: React.FC = () => {
  const { products, theme, landingSections } = useApp();
  const config = landingSections?.popularProducts || DEFAULT_LANDING_SECTIONS.popularProducts;
  const badge = config.badge || 'Curated Selection';
  const titleMain = config.titleMain ?? 'Our Most';
  const titleHighlight = config.titleHighlight ?? 'Loved';
  const titleSuffix = config.titleSuffix ?? 'Creations';
  const subtitle = config.subtitle || 'Handpicked favorites that our chocolate lovers keep coming back for — each piece a testament to uncompromising quality and artisanal mastery.';
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pick popular items (Bestseller or Premium badge first, followed by others, deduplicated)
  const popularList = products
    .filter((p) => p.badge === 'Bestseller' || p.badge === 'Premium')
    .concat(products.filter((p) => p.badge !== 'Bestseller' && p.badge !== 'Premium'));

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Helper to determine if a hex color is dark
  const isDarkColor = (color: string) => {
    if (!color) return true;
    const hex = color.replace('#', '');
    if (hex.length === 4) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
    }
    return true;
  };

  const isDark = isDarkColor(theme?.black);

  return (
    <section
      id="popular"
      style={{
        padding: 'var(--section-padding) 0',
        background: isDark
          ? 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url("/assets/logo-badge.jpg") no-repeat center center/350px 350px'
          : 'var(--gradient-section-1)',
        backgroundColor: isDark ? '#000000' : undefined,
      }}
    >
      <div className="container">
        {/* Header with scroll reveal animation */}
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

        {/* Inline CSS to hide scrollbars & responsive helpers */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @media (max-width: 768px) {
            .popular-carousel-wrapper {
              padding: 0 42px !important;
            }
          }
          @media (max-width: 480px) {
            .popular-carousel-wrapper {
              padding: 0 36px !important;
            }
          }
        `}</style>

        {/* Slider Container Wrapper */}
        <div className="popular-carousel-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '100%', padding: '0 clamp(24px, 4vw, 50px)', boxSizing: 'border-box' }}>
          {/* Left Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              scroll('left');
            }}
            aria-label="Scroll Left"
            style={{
              position: 'absolute',
              left: '0px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 'clamp(36px, 4vw, 44px)',
              height: 'clamp(36px, 4vw, 44px)',
              borderRadius: '50%',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cream)',
              zIndex: 10,
              boxShadow: 'var(--glass-shadow)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'background 0.3s, color 0.3s, border-color 0.3s, transform 0.2s',
              cursor: 'pointer',
              flexShrink: 0,
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
            <ChevronLeft size={20} />
          </button>

          {/* Slider content */}
          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              gap: 'clamp(14px, 2vw, 24px)',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              padding: '10px 2px 30px 2px',
              minWidth: 0,
              width: '100%',
            }}
            className="hide-scrollbar"
          >
            <AnimatePresence mode="popLayout">
              {popularList.map((product) => (
                <motion.div
                  layout
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="popular-card-item"
                  style={{
                    flex: '0 0 clamp(240px, 260px, 280px)',
                    width: 'clamp(240px, 260px, 280px)',
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
            </AnimatePresence>
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              scroll('right');
            }}
            aria-label="Scroll Right"
            style={{
              position: 'absolute',
              right: '0px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 'clamp(36px, 4vw, 44px)',
              height: 'clamp(36px, 4vw, 44px)',
              borderRadius: '50%',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--cream)',
              zIndex: 10,
              boxShadow: 'var(--glass-shadow)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'background 0.3s, color 0.3s, border-color 0.3s, transform 0.2s',
              cursor: 'pointer',
              flexShrink: 0,
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
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PopularProducts;
