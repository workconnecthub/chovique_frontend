import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Star,
  ChevronLeft,
  ChevronRight,
  Gift,
  Leaf,
  FlameKindling,
  Gem,
  ShoppingBag,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../app/providers';
import { getImageUrl } from '../../utils/imageUrl';
import { Button } from '../../components/ui/Button';
import { fadeInUp, slideInLeft, slideInRight } from '../../lib/framer';
import { DEFAULT_LANDING_SECTIONS } from '../../types';

/* ─────────────────────── Icon set for bullets ─────────────────────────── */
const BULLET_ICONS = [Gem, Leaf, FlameKindling, Gift];

/* ─────────────────────── Stable sparkle dot config ─────────────────────── */
const SPARKLE_DOTS = [
  { id: 0,  left: '8%',   top: '12%', size: 3.5, duration: 5.2, delay: 0.3,  opacity: 0.3  },
  { id: 1,  left: '22%',  top: '72%', size: 2.0, duration: 7.1, delay: 1.1,  opacity: 0.2  },
  { id: 2,  left: '41%',  top: '5%',  size: 4.0, duration: 4.8, delay: 0.7,  opacity: 0.25 },
  { id: 3,  left: '58%',  top: '88%', size: 2.5, duration: 6.3, delay: 2.0,  opacity: 0.18 },
  { id: 4,  left: '73%',  top: '30%', size: 3.0, duration: 5.5, delay: 0.5,  opacity: 0.28 },
  { id: 5,  left: '87%',  top: '65%', size: 2.0, duration: 8.0, delay: 1.8,  opacity: 0.15 },
  { id: 6,  left: '15%',  top: '43%', size: 2.8, duration: 6.0, delay: 0.9,  opacity: 0.22 },
  { id: 7,  left: '92%',  top: '18%', size: 3.2, duration: 4.5, delay: 1.5,  opacity: 0.32 },
  { id: 8,  left: '33%',  top: '58%', size: 1.8, duration: 7.5, delay: 2.3,  opacity: 0.2  },
  { id: 9,  left: '65%',  top: '8%',  size: 3.8, duration: 5.0, delay: 0.4,  opacity: 0.27 },
  { id: 10, left: '78%',  top: '50%', size: 2.4, duration: 6.8, delay: 1.2,  opacity: 0.19 },
  { id: 11, left: '4%',   top: '80%', size: 3.0, duration: 5.7, delay: 0.8,  opacity: 0.23 },
  { id: 12, left: '48%',  top: '35%', size: 2.2, duration: 7.2, delay: 1.6,  opacity: 0.21 },
  { id: 13, left: '96%',  top: '90%', size: 4.2, duration: 4.3, delay: 0.2,  opacity: 0.35 },
];

export const TasteSample: React.FC = () => {
  const { products, landingSections, addToCart } = useApp();
  const navigate = useNavigate();

  // Dynamic CMS config from backend (with elegant defaults)
  const config = landingSections?.tasteSample || DEFAULT_LANDING_SECTIONS.tasteSample;

  // Curate sample products showcase:
  // 1. All products marked as sample (isSample / is_sample) added by admin are automatically included
  // 2. Plus any specifically selected products from CMS without duplicates
  // 3. Fallback to first available products from catalog
  const showcase = useMemo(() => {
    const sampleFlagged = products.filter((p) => Boolean(p.isSample || (p as any).is_sample));

    if (config?.selectedProductIds && config.selectedProductIds.length > 0) {
      const selected = products.filter((p) => config.selectedProductIds?.includes(p.id));
      const combined = [...sampleFlagged];
      selected.forEach((p) => {
        if (!combined.some((item) => item.id === p.id)) {
          combined.push(p);
        }
      });
      if (combined.length > 0) return combined;
    }

    if (sampleFlagged.length > 0) return sampleFlagged;
    return products.slice(0, 6);
  }, [products, config]);

  // Dynamic why bullets with cycling icons
  const bullets = useMemo(() => {
    const rawList = config?.whyBullets && config.whyBullets.length > 0
      ? config.whyBullets
      : DEFAULT_LANDING_SECTIONS.tasteSample.whyBullets;
    return rawList.map((b, i) => ({
      ...b,
      icon: BULLET_ICONS[i % BULLET_ICONS.length],
    }));
  }, [config?.whyBullets]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [activeBullet, setActiveBullet] = useState(0);

  /* Auto-cycle the card every 4.5 s */
  useEffect(() => {
    if (showcase.length === 0) return;
    const t = setInterval(() => {
      setActiveIdx((p) => (p + 1) % showcase.length);
    }, 4500);
    return () => clearInterval(t);
  }, [showcase.length]);

  /* Auto-cycle bullets on mobile for readability */
  useEffect(() => {
    if (bullets.length === 0) return;
    const t = setInterval(() => {
      setActiveBullet((p) => (p + 1) % bullets.length);
    }, 3800);
    return () => clearInterval(t);
  }, [bullets.length]);

  const totalSlides = Math.max(showcase.length, 1);
  const prev = () => setActiveIdx((p) => (p - 1 + totalSlides) % totalSlides);
  const next = () => setActiveIdx((p) => (p + 1) % totalSlides);

  const activeProduct = showcase[activeIdx];

  return (
    <section
      id="taste-sample"
      style={{
        position: 'relative',
        padding: 'var(--section-padding) 0',
        background: 'linear-gradient(160deg, #0D090A 0%, #1A0D00 45%, #2C1503 100%)',
        overflow: 'hidden',
      }}
    >
      {/* Ambient radial glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 55% at 20% 50%, rgba(201,168,76,0.07) 0%, transparent 70%),' +
            'radial-gradient(ellipse 50% 40% at 80% 20%, rgba(92,51,23,0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Floating sparkle dots */}
      {SPARKLE_DOTS.map((dot) => (
        <motion.div
          key={dot.id}
          style={{
            position: 'absolute',
            left: dot.left,
            top: dot.top,
            width: dot.size,
            height: dot.size,
            borderRadius: '50%',
            background: 'var(--gold)',
            opacity: dot.opacity,
            zIndex: 0,
            pointerEvents: 'none',
          }}
          animate={{ scale: [1, 1.6, 1], opacity: [dot.opacity, dot.opacity * 2, dot.opacity] }}
          transition={{ duration: dot.duration, delay: dot.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
        {/* Section header */}
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-80px' }}
          variants={fadeInUp}
          style={{ textAlign: 'center', marginBottom: 'clamp(28px,4vw,44px)' }}
        >
          <span className="section-label" style={{ justifyContent: 'center' }}>
            <Sparkles size={12} />
            {config.badge || 'Taste Our Collection'}
          </span>
          <h2 className="section-title">
            {config.titleMain || 'Try a'}{' '}
            <span className="gold">{config.titleHighlight || 'Sample Piece'}</span>
            {config.titleSuffix ? ` ${config.titleSuffix}` : ''}
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto', textAlign: 'center' }}>
            {config.subtitle ||
              'Before you fall in love with an entire box, let one perfect piece do the talking — available across every chocolate variety in our store.'}
          </p>
        </motion.div>

        {/* Main two-column layout */}
        <div className="taste-sample-grid">
          {/* LEFT — Animated sample product card */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={slideInLeft}
            className="taste-card-wrapper"
          >
            {/* Card glow ring */}
            <div className="taste-card-glow" />

            <div className="taste-sample-card">
              {/* Floating badge */}
              <div className="taste-badge">
                <Sparkles size={10} />
                {config.cardBadgeText || 'Sample Piece'}
              </div>

              {/* Product image with animated transition */}
              <div className="taste-img-zone">
                <AnimatePresence mode="wait">
                  {activeProduct ? (
                    <motion.img
                      key={activeProduct.id}
                      src={getImageUrl(activeProduct.image)}
                      alt={activeProduct.name}
                      initial={{ opacity: 0, scale: 1.08 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '12px',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <motion.img
                      key="fallback"
                      src="https://images.unsplash.com/photo-1549007953-2f2dc0b24019?auto=format&fit=crop&w=600&q=80"
                      alt="Chocolate sample"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
                    />
                  )}
                </AnimatePresence>

                {/* Overlay gradient */}
                <div className="taste-img-overlay" />

                {/* Star rating pill */}
                <div className="taste-rating-pill">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={10}
                      fill={s <= Math.round(activeProduct?.rating || 5) ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}
                      color="var(--gold)"
                    />
                  ))}
                  <span>{activeProduct?.rating ? activeProduct.rating.toFixed(1) : '5.0'}</span>
                </div>
              </div>

              {/* Product info */}
              <div className="taste-card-info">
                <AnimatePresence mode="wait">
                  {activeProduct && (
                    <motion.div
                      key={activeProduct.id + '-info'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.35 }}
                    >
                      <p className="taste-card-category">
                        {activeProduct.category || 'Artisanal Chocolate'}
                      </p>
                      <h3 className="taste-card-name">{activeProduct.name}</h3>
                      {activeProduct.description && (
                        <p className="taste-card-desc">
                          {activeProduct.description.length > 90
                            ? activeProduct.description.slice(0, 90) + '\u2026'
                            : activeProduct.description}
                        </p>
                      )}

                      <div className="taste-card-footer">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            {(() => {
                              const tastingPrice = activeProduct.samplePrice ?? (activeProduct as any).sample_price;
                              return (
                                <>
                                  <span className="taste-card-price">
                                    {tastingPrice ? `₹${tastingPrice}` : (activeProduct.price ? `₹${activeProduct.price}` : 'Sample Piece')}
                                  </span>
                                  {tastingPrice && activeProduct.price && activeProduct.price > tastingPrice && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--beige)', textDecoration: 'line-through', opacity: 0.65 }}>
                                      ₹{activeProduct.price}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--gold)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            {(activeProduct.samplePrice ?? (activeProduct as any).sample_price) ? 'Sample Piece' : (activeProduct.weight || 'Single Piece')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() => {
                              if (activeProduct.id) {
                                navigate(`/product/${activeProduct.id}`);
                              } else {
                                navigate('/shop');
                              }
                            }}
                            style={{ padding: '8px 16px', fontSize: '0.78rem', letterSpacing: '0.5px' }}
                          >
                            Taste Now <ArrowRight size={12} />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Carousel navigation dots */}
              {showcase.length > 1 && (
                <div className="taste-dots-row">
                  <button className="taste-arrow-btn" onClick={prev} aria-label="Previous sample">
                    <ChevronLeft size={14} />
                  </button>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {showcase.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        aria-label={`Sample ${i + 1}`}
                        style={{
                          width: i === activeIdx ? '22px' : '7px',
                          height: '7px',
                          borderRadius: '4px',
                          background: i === activeIdx ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>

                  <button className="taste-arrow-btn" onClick={next} aria-label="Next sample">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT — Why section */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={slideInRight}
            className="taste-why-wrapper"
          >
            {/* Eyebrow tag */}
            <span className="taste-why-tag">
              <Gem size={11} /> {config.whyTitle || 'Why We Offer A Sample Piece'}
            </span>

            <h3 className="taste-why-heading">
              One Piece,{' '}
              <em
                style={{
                  fontFamily: 'var(--font-elegant)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  background: 'var(--gradient-gold-text)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Infinite Story
              </em>
            </h3>

            <p className="taste-why-intro">
              {config.whySubtitle ||
                "At Chovique, we believe extraordinary chocolate deserves an extraordinary introduction. That's why we make a single sample piece available for every variety in our store — so your first bite is never a leap of faith."}
            </p>

            {/* Bullet list — desktop: all visible; mobile: animated carousel */}
            <ul className="taste-bullets-desktop">
              {bullets.map((b, i) => {
                const Icon = b.icon;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.1 }}
                    className="taste-bullet-item"
                  >
                    <span className="taste-bullet-icon">
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="taste-bullet-title">{b.title}</p>
                      <p className="taste-bullet-desc">{b.desc}</p>
                    </div>
                  </motion.li>
                );
              })}
            </ul>

            {/* Mobile version — animated sliding bullets */}
            <div className="taste-bullets-mobile">
              <AnimatePresence mode="wait">
                {(() => {
                  const b = bullets[activeBullet] || bullets[0];
                  if (!b) return null;
                  const Icon = b.icon;
                  return (
                    <motion.div
                      key={activeBullet}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.4 }}
                      className="taste-bullet-item taste-bullet-item--mobile"
                    >
                      <span className="taste-bullet-icon">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="taste-bullet-title">{b.title}</p>
                        <p className="taste-bullet-desc">{b.desc}</p>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              {/* Bullet progress dots */}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '14px' }}>
                {bullets.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveBullet(i)}
                    aria-label={`Bullet ${i + 1}`}
                    style={{
                      width: i === activeBullet ? '20px' : '7px',
                      height: '7px',
                      borderRadius: '4px',
                      background: i === activeBullet ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* CTA strip */}
            <div className="taste-cta-strip">
              <Button
                variant="gold"
                size="md"
                glow
                onClick={() => navigate(config.ctaLink || '/shop')}
                style={{ flex: '1 1 auto', minWidth: 0 }}
              >
                {config.ctaText || 'Explore All Varieties'} <ArrowRight size={15} />
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate(config.secondaryCtaLink || '/our-story')}
                style={{ flex: '1 1 auto', minWidth: 0 }}
              >
                {config.secondaryCtaText || 'Our Story'}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scoped CSS */}
      <style>{`
        .taste-sample-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(24px, 4vw, 56px);
          align-items: center;
        }

        @media (max-width: 860px) {
          .taste-sample-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        .taste-card-wrapper {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .taste-card-glow {
          position: absolute;
          inset: -24px;
          border-radius: 32px;
          background: radial-gradient(ellipse at 50% 60%, rgba(201,168,76,0.18) 0%, transparent 70%);
          filter: blur(24px);
          pointer-events: none;
          z-index: 0;
        }

        .taste-sample-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          background: rgba(20, 10, 4, 0.78);
          border: 1px solid rgba(201,168,76,0.22);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,168,76,0.08) inset;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
        }

        .taste-sample-card:hover {
          border-color: rgba(201,168,76,0.45);
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(201,168,76,0.12);
        }

        @media (max-width: 860px) {
          .taste-sample-card {
            max-width: 100%;
          }
        }

        .taste-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 10;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--gold), var(--gold-light));
          color: var(--dark-chocolate);
          font-family: var(--font-body);
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          box-shadow: 0 4px 14px rgba(201,168,76,0.4);
        }

        .taste-img-zone {
          position: relative;
          width: 100%;
          height: clamp(200px, 32vw, 280px);
          overflow: hidden;
        }

        @media (max-width: 860px) {
          .taste-img-zone {
            height: clamp(200px, 50vw, 300px);
          }
        }

        .taste-img-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 55%;
          background: linear-gradient(to top, rgba(20,10,4,0.95) 0%, transparent 100%);
          pointer-events: none;
        }

        .taste-rating-pill {
          position: absolute;
          bottom: 12px;
          right: 12px;
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(20,10,4,0.75);
          border: 1px solid rgba(201,168,76,0.3);
          backdrop-filter: blur(8px);
          font-size: 0.72rem;
          color: var(--gold-light);
          font-weight: 600;
        }

        .taste-card-info {
          padding: 16px 18px 6px;
          min-height: 130px;
        }

        .taste-card-category {
          font-family: var(--font-body);
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 4px;
        }

        .taste-card-name {
          font-family: var(--font-display);
          font-size: clamp(1.05rem, 2.2vw, 1.25rem);
          font-weight: 700;
          color: var(--cream);
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .taste-card-desc {
          font-family: var(--font-elegant);
          font-size: 0.88rem;
          color: var(--grey-light);
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .taste-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-bottom: 4px;
        }

        .taste-card-price {
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--gold);
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 4px;
          padding: 4px 10px;
        }

        .taste-dots-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 18px 14px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .taste-arrow-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.25);
          color: var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
          flex-shrink: 0;
        }

        .taste-arrow-btn:hover {
          background: rgba(201,168,76,0.22);
          border-color: var(--gold);
        }

        .taste-why-wrapper {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .taste-why-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-body);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--gold);
        }

        .taste-why-heading {
          font-family: var(--font-display);
          font-size: clamp(1.7rem, 3.5vw, 2.6rem);
          font-weight: 800;
          color: var(--cream);
          line-height: 1.2;
          margin: 0;
        }

        .taste-why-intro {
          font-family: var(--font-elegant);
          font-size: clamp(0.95rem, 1.4vw, 1.1rem);
          color: var(--grey-light);
          line-height: 1.7;
          margin: 0;
        }

        .taste-bullets-desktop {
          display: flex;
          flex-direction: column;
          gap: 14px;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .taste-bullets-mobile {
          display: none;
        }

        @media (max-width: 860px) {
          .taste-bullets-desktop {
            display: none;
          }
          .taste-bullets-mobile {
            display: block;
          }
        }

        .taste-bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.06);
          transition: background 0.25s, border-color 0.25s;
        }

        .taste-bullet-item:hover {
          background: rgba(201,168,76,0.06);
          border-color: rgba(201,168,76,0.18);
        }

        .taste-bullet-item--mobile {
          width: 100%;
        }

        .taste-bullet-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gold);
          flex-shrink: 0;
        }

        .taste-bullet-title {
          font-family: var(--font-body);
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--cream);
          margin-bottom: 3px;
          letter-spacing: 0.2px;
        }

        .taste-bullet-desc {
          font-family: var(--font-elegant);
          font-size: 0.85rem;
          color: var(--grey-light);
          line-height: 1.55;
          margin: 0;
        }

        .taste-cta-strip {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        @media (max-width: 480px) {
          .taste-cta-strip {
            flex-direction: column;
          }
          .taste-cta-strip > * {
            width: 100% !important;
          }
        }
      `}</style>
    </section>
  );
};

export default TasteSample;
