import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { homeService } from '../../services/homeService';
import type { HomeStats } from '../../types';

interface CounterProps {
  target: number;
  suffix?: string;
}

const Counter: React.FC<CounterProps> = ({ target, suffix = '+' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(start + (target - start) * ease);

      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [isInView, target]);

  return (
    <span
      ref={ref}
      className="gold font-number stat-number counter"
      data-number="true"
      style={{
        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
        fontWeight: 800,
        fontFamily: 'var(--font-number, var(--font-body))',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {count.toLocaleString()}{suffix}
    </span>
  );
};

/** Default fallback stats while loading */
const DEFAULT_STATS = [
  { target: 50000, suffix: '+', label: 'Happy Customers' },
  { target: 120, suffix: '+', label: 'Products Available' },
  { target: 1500, suffix: '+', label: 'Orders Delivered' },
  { target: 98, suffix: '%', label: 'Customer Rating %' },
];

export const Stats: React.FC = () => {
  const [stats, setStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    homeService.getStats()
      .then((data: HomeStats) => {
        setStats([
          { target: data.happy_customers ?? 50000, suffix: '+', label: 'Happy Customers' },
          { target: data.products_available ?? data.unique_flavors ?? 120, suffix: '+', label: 'Products Available' },
          { target: data.orders_delivered ?? data.countries_shipped ?? 1500, suffix: '+', label: 'Orders Delivered' },
          { target: data.customer_rating_percent ?? data.five_star_reviews_percent ?? 98, suffix: '%', label: 'Customer Rating %' },
        ]);
      })
      .catch(() => {
        // Keep default stats on error — non-critical display content
      });
  }, []);

  return (
    <section
      style={{
        padding: '32px 0',
        background: 'var(--gradient-section-1)',
        borderTop: '1px solid var(--glass-border)',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '40px',
            textAlign: 'center',
          }}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Counter target={stat.target} suffix={stat.suffix} />
              <span
                style={{
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--beige)',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                }}
              >
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Stats;
