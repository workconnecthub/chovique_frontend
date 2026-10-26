import React from 'react';
import '../styles/footer.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Headphones,
  Heart,
  Sparkles,
  Gift,
  ShieldCheck,
  Truck,
  Award,
  Leaf,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../app/providers';
import { DEFAULT_FOOTER_CONFIG } from '../types';
import { getImageUrl } from '../utils/imageUrl';

export const renderSocialIcon = (platform: string, size = 16) => {
  const p = (platform || '').toLowerCase().trim();
  if (p === 'instagram') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    );
  }
  if (p === 'facebook') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    );
  }
  if (p === 'youtube') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" />
        <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
      </svg>
    );
  }
  if (p === 'pinterest') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
      </svg>
    );
  }
  if (p === 'twitter' || p === 'x') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  if (p === 'linkedin') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  if (p === 'whatsapp') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    );
  }
  if (p === 'tiktok') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.55 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.52a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3 15.33a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.58a8.28 8.28 0 0 0 3.91 1.63V6.69z" />
      </svg>
    );
  }
  // Generic / Custom link icon
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
};

export const renderBenefitIcon = (iconName: string) => {
  const i = (iconName || '').toLowerCase().trim();
  if (i === 'heart') return <Heart size={20} />;
  if (i === 'sparkles') return <Sparkles size={20} />;
  if (i === 'gift') return <Gift size={20} />;
  if (i === 'shield' || i === 'shieldcheck') return <ShieldCheck size={20} />;
  if (i === 'truck') return <Truck size={20} />;
  if (i === 'award') return <Award size={20} />;
  if (i === 'leaf') return <Leaf size={20} />;
  if (i === 'clock') return <Clock size={20} />;
  return <Sparkles size={20} />;
};

export const Footer: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { footerConfig } = useApp();

  const cfg = footerConfig || DEFAULT_FOOTER_CONFIG;
  const brandLogo = cfg.brand_logo_url || DEFAULT_FOOTER_CONFIG.brand_logo_url;
  const brandDescription = cfg.brand_description || DEFAULT_FOOTER_CONFIG.brand_description;
  const activeSocialLinks = (cfg.social_links || DEFAULT_FOOTER_CONFIG.social_links).filter((s) => s.is_active !== false);
  const navColumns = cfg.nav_columns && cfg.nav_columns.length > 0 ? cfg.nav_columns : DEFAULT_FOOTER_CONFIG.nav_columns;
  const concierge = cfg.concierge || DEFAULT_FOOTER_CONFIG.concierge;
  const benefits = cfg.benefits && cfg.benefits.length > 0 ? cfg.benefits : DEFAULT_FOOTER_CONFIG.benefits;
  const copyrightText = cfg.copyright_text || DEFAULT_FOOTER_CONFIG.copyright_text;
  const tagline = cfg.tagline || DEFAULT_FOOTER_CONFIG.tagline;
  const legalLinks = cfg.legal_links && cfg.legal_links.length > 0 ? cfg.legal_links : DEFAULT_FOOTER_CONFIG.legal_links;
  const paymentBadgesLabel = cfg.payment_badges_label || DEFAULT_FOOTER_CONFIG.payment_badges_label;
  const activePaymentBadges = (cfg.payment_badges || DEFAULT_FOOTER_CONFIG.payment_badges).filter((b) => b.is_active !== false);

  const handleSectionNav = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      navigate('/', { state: { scrollTo: sectionId } });
    }
  };

  const renderNavLink = (link: { id: string; label: string; url: string; is_external?: boolean }) => {
    const rawUrl = (link.url || '').trim();
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || link.is_external) {
      return (
        <a href={rawUrl} target="_blank" rel="noreferrer">
          {link.label} <ChevronRight size={13} className="nav-chevron" />
        </a>
      );
    }
    if (rawUrl.startsWith('/#') || rawUrl.startsWith('#')) {
      const targetId = rawUrl.replace(/^\/?#/, '');
      return (
        <a href={rawUrl} onClick={(e) => handleSectionNav(targetId, e)}>
          {link.label} <ChevronRight size={13} className="nav-chevron" />
        </a>
      );
    }
    return (
      <Link to={rawUrl || '/'}>
        {link.label} <ChevronRight size={13} className="nav-chevron" />
      </Link>
    );
  };

  return (
    <footer className="chovique-footer">
      <div className="chovique-footer-container">
        {/* ─── MAIN FOOTER GRID ─── */}
        <div className="footer-main-grid">
          {/* BRAND COLUMN */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand-header">
              <img 
                src={getImageUrl(brandLogo || '/assets/logo.png')} 
                alt="Chovique Logo" 
                className="footer-main-logo" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/logo.png';
                }}
              />
            </Link>

            <p className="footer-brand-description">
              {brandDescription}
            </p>

            {activeSocialLinks.length > 0 && (
              <div className="footer-social-row">
                {activeSocialLinks.map((social) => (
                  <a
                    key={social.id}
                    href={social.url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.name || social.platform}
                    title={social.name || social.platform}
                    className="footer-social-btn"
                  >
                    {renderSocialIcon(social.platform, 16)}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="footer-col-divider" />

          {/* DYNAMIC NAVIGATION COLUMNS */}
          {navColumns.map((col) => (
            <div key={col.id} className="footer-nav-col">
              <h3 className="footer-col-title">{col.title}</h3>
              <ul className="footer-nav-links">
                {(col.links || []).map((link) => (
                  <li key={link.id}>
                    {renderNavLink(link)}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* RIGHT — NEED HELP / CONCIERGE CARD */}
          {concierge.is_enabled !== false && (
            <div className="footer-concierge-card">
              <div className="concierge-icon-circle">
                <Headphones size={22} className="concierge-headphone-icon" />
              </div>

              <h4 className="concierge-title">{concierge.title || 'Need Help?'}</h4>
              <p className="concierge-subtitle">{concierge.subtitle || 'Our chocolate concierge is here for you.'}</p>

              <button
                type="button"
                className="concierge-contact-btn"
                onClick={() => {
                  const target = (concierge.button_link || '/contact#send-us-a-message').trim();
                  if (target.startsWith('http')) {
                    window.open(target, '_blank', 'noreferrer');
                  } else if (target.startsWith('#') || target.startsWith('/#')) {
                    const sec = target.replace(/^\/?#/, '');
                    if (location.pathname === '/') {
                      document.getElementById(sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      navigate('/', { state: { scrollTo: sec } });
                    }
                  } else {
                    navigate(target);
                  }
                }}
              >
                <span>{concierge.button_text || 'CONTACT CONCIERGE'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ─── FOOTER BENEFITS STRIP (Middle section) ─── */}
        {benefits.length > 0 && (
          <div className="footer-benefits-strip">
            {benefits.map((box, idx) => (
              <React.Fragment key={box.id}>
                {idx > 0 && <div className="benefit-divider" />}
                <div className="footer-benefit-box">
                  <div className="benefit-icon-circle">
                    {renderBenefitIcon(box.icon)}
                  </div>
                  <div className="benefit-text">
                    <h4 className="benefit-title">{box.title}</h4>
                    <p className="benefit-desc">{box.desc}</p>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* ─── BOTTOM LEGAL & PAYMENT BAR ─── */}
        <div className="footer-bottom-bar">
          <div className="footer-bottom-left">
            <p className="copyright-text">{copyrightText}</p>
            {tagline && <span className="footer-italic-tagline">{tagline}</span>}
          </div>

          {legalLinks.length > 0 && (
            <div className="footer-bottom-center">
              {legalLinks.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 && <span className="legal-pipe">|</span>}
                  {item.url?.startsWith('http') ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.url || '#'}>{item.label}</Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {activePaymentBadges.length > 0 && (
            <div className="footer-bottom-right">
              {paymentBadgesLabel && <span className="secure-payments-label">{paymentBadgesLabel}</span>}
              <div className="payment-badges-row">
                {activePaymentBadges.map((badge) => (
                  <div key={badge.id} className="payment-badge-pill" title={badge.name}>
                    {badge.image_url ? (
                      <img
                        src={getImageUrl(badge.image_url)}
                        alt={badge.name}
                        className={`payment-badge-logo-img ${badge.id === 'pay-3' || badge.name.toLowerCase().includes('upi') ? 'payment-badge-upi' : ''}`}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                          const fallback = (e.target as HTMLElement).nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'inline-block';
                        }}
                      />
                    ) : null}
                    <span
                      style={{
                        display: badge.image_url ? 'none' : 'inline-block',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#333',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                      }}
                    >
                      {badge.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
