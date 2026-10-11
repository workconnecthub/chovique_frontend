import React from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, Sparkles, Truck, Gift, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { scaleUp } from '../../lib/framer';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  popular: boolean;
  desc: string;
  features: string[];
}

export const SubscriptionPlans: React.FC = () => {
  const plans: Plan[] = [
    {
      id: 'p_sub1',
      name: 'The Connoisseur',
      price: '₹1,499',
      period: 'month',
      popular: false,
      desc: 'Perfect for chocolate enthusiasts eager to explore single-origin origins.',
      features: [
        '4 curated single-origin chocolate bars',
        'Detailed chocolatier tasting notes',
        'Free standard shipping',
        'Cancel or pause anytime',
      ],
    },
    {
      id: 'p_sub2',
      name: 'The Atelier Selection',
      price: '₹2,499',
      period: 'month',
      popular: true,
      desc: 'Our signature collection of handcrafted truffles and gourmet pralines.',
      features: [
        '16 hand-painted signature truffles',
        'Seasonal & limited edition flavors',
        'Chocolatier pairing guide',
        'Free express temperature-controlled shipping',
        '10% off any store orders',
      ],
    },
    {
      id: 'p_sub3',
      name: 'The Grand Cru Circle',
      price: '₹4,499',
      period: 'month',
      popular: false,
      desc: 'The ultimate bespoke luxury collection for the true chocolate gourmet.',
      features: [
        'Grand selection box (truffles + bars + specialty)',
        'Exclusive direct access to limited reserves',
        'Complimentary private virtual tasting slot',
        'Free priority delivery',
        'VIP access to new collections',
        '15% off any store orders',
      ],
    },
  ];

  return (
    <section
      style={{
        padding: 'var(--section-padding) 0',
        background: 'var(--gradient-section-1)',
        position: 'relative',
      }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span className="section-label" style={{ justifyContent: 'center' }}>The Chovique Club</span>
          <h2 className="section-title">
            Curated Chocolate <span className="gold">Subscriptions</span>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            Elevate your senses with fresh, hand-tempered chocolates delivered directly to your doorstep every month.
          </p>
        </div>

        {/* Subscription Plan Tiers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            alignItems: 'stretch',
            marginBottom: '60px',
          }}
        >
          {plans.map((plan, idx) => (
            <motion.div
              key={plan.id}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={scaleUp}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
               className="glass-panel"
              style={{
                position: 'relative',
                padding: '30px 24px',
                background: plan.popular ? 'rgba(var(--primary-rgb), 0.45)' : 'rgba(var(--dark-chocolate-rgb), 0.3)',
                border: plan.popular ? '2px solid var(--gold)' : '1px solid var(--glass-border)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: plan.popular ? '0 16px 48px rgba(201, 168, 76, 0.15)' : 'var(--glass-shadow)',
              }}
            >
              {/* Popular Tag */}
              {plan.popular && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--gradient-gold)',
                    color: 'var(--dark-chocolate)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 15px rgba(201, 168, 76, 0.4)',
                    textTransform: 'uppercase',
                  }}
                >
                  Atelier Choice
                </span>
              )}

              {/* Card Content Top */}
              <div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--cream)', marginBottom: '6px' }}>
                  {plan.name}
                </h4>
                <p style={{ color: 'var(--grey-light)', fontSize: '0.85rem', marginBottom: '16px', minHeight: '32px', lineHeight: 1.4 }}>
                  {plan.desc}
                </p>

                {/* Price */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '16px' }}>
                  <span
                    className="font-number"
                    data-number="true"
                    style={{
                      fontSize: '2.2rem',
                      fontWeight: 800,
                      color: 'var(--gold)',
                      fontFamily: 'var(--font-number, var(--font-body))',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {plan.price}
                  </span>
                  <span style={{ color: 'var(--grey-light)', fontSize: '0.85rem' }}>
                    / {plan.period}
                  </span>
                </div>

                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />

                {/* Features List */}
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: 0, margin: '0 0 24px 0' }}>
                  {plan.features.map((feat, fidx) => (
                    <li key={fidx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: 'var(--beige)', lineHeight: 1.3 }}>
                      <Check size={14} className="gold" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Call to action */}
              <Button
                variant={plan.popular ? 'gold' : 'secondary'}
                fullWidth
                glow={plan.popular}
                onClick={() => alert(`Thank you for choosing ${plan.name} subscription! Payment integrations will launch soon.`)}
              >
                Subscribe Now
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Club Perks info footer */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '30px',
            textAlign: 'center',
            background: 'rgba(var(--dark-chocolate-rgb), 0.25)',
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Truck className="gold" size={24} />
            <h5 style={{ color: 'var(--cream)', fontSize: '0.95rem', fontWeight: 600 }}>Cold Chain Shipping</h5>
            <p style={{ color: 'var(--grey-light)', fontSize: '0.8rem', margin: 0 }}>Insulated packaging and dry ice ensure zero melt.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Calendar className="gold" size={24} />
            <h5 style={{ color: 'var(--cream)', fontSize: '0.95rem', fontWeight: 600 }}>Flexible Schedules</h5>
            <p style={{ color: 'var(--grey-light)', fontSize: '0.8rem', margin: 0 }}>Pause, skip a month, or cancel anytime from dashboard.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Gift className="gold" size={24} />
            <h5 style={{ color: 'var(--cream)', fontSize: '0.95rem', fontWeight: 600 }}>Exclusive Surprises</h5>
            <p style={{ color: 'var(--grey-light)', fontSize: '0.8rem', margin: 0 }}>Get early prototype chocolates in your box.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubscriptionPlans;
