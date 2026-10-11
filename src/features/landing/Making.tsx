import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { slideInLeft, slideInRight } from '../../lib/framer';

export const Making: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Sourcing & Selection',
      desc: 'Single-origin cocoa beans hand-selected from sustainable farms for their exceptional flavor profiles.',
    },
    {
      num: '02',
      title: 'Roasting & Grinding',
      desc: 'Slow-roasted at precise temperatures to unlock deep, complex flavors and ground into silky smooth cocoa liquor.',
    },
    {
      num: '03',
      title: 'Tempering & Molding',
      desc: 'Hand-tempered for that perfect snap and glossy finish, then molded into our signature creations.',
    },
    {
      num: '04',
      title: 'Finishing & Packaging',
      desc: 'Each piece is inspected, adorned with premium toppings, and nestled into our signature luxury packaging.',
    },
  ];

  return (
    <section
      id="making"
      style={{
        padding: 'var(--section-padding) 0',
        background: 'var(--gradient-section-3)',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '50px',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Image/Video Player Mock */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={slideInLeft}
            style={{
              position: 'relative',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: 'var(--glass-shadow)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <img
              src="/assets/making.jpg"
              alt="Chocolate Sourcing and Tempering Process"
              style={{ width: '100%', display: 'block', filter: 'brightness(0.7)' }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=800&q=80';
              }}
            />
            {/* Play Button Overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(var(--dark-chocolate-rgb), 0.2)',
              }}
            >
              <motion.button
                whileHover={{ scale: 1.15, boxShadow: '0 0 25px var(--gold)' }}
                whileTap={{ scale: 0.95 }}
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  background: 'var(--gradient-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--dark-chocolate)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
                }}
              >
                <Play size={26} fill="currentColor" style={{ marginLeft: '4px' }} />
              </motion.button>
            </div>
          </motion.div>

          {/* Right Column: Process details */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={slideInRight}
          >
            <span className="section-label">Bean to Bar</span>
            <h2 className="section-title">
              The Art Behind <span className="gold">Every Piece</span>
            </h2>
            <div className="gold-divider" />
            <p style={{ color: 'var(--beige)', marginBottom: '20px', lineHeight: 1.7 }}>
              At Chovique, every chocolate tells a story. Our master chocolatiers follow a meticulous bean-to-bar process that has been refined over generations, combining time-honored traditions with modern techniques to create flavors that captivate the senses.
            </p>
            <p style={{ color: 'var(--grey-light)', marginBottom: '40px', fontSize: '0.95rem' }}>
              We source our cocoa beans directly from sustainable farms across Ghana, Ecuador, and Madagascar — ensuring every bite carries the distinct terroir of its origin.
            </p>

            {/* Step list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {steps.map((step) => (
                <div key={step.num} style={{ display: 'flex', gap: '20px' }}>
                  <span
                    className="font-number"
                    data-number="true"
                    style={{
                      fontFamily: 'var(--font-number, var(--font-body))',
                      fontSize: '1.8rem',
                      fontWeight: 700,
                      color: 'var(--gold)',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {step.num}
                  </span>
                  <div>
                    <h4
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: 'var(--cream)',
                        marginBottom: '4px',
                      }}
                    >
                      {step.title}
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--grey-light)', lineHeight: 1.5 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
