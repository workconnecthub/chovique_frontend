import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Quote, MessageSquarePlus, X, CheckCircle, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../app/providers';
import { homeService } from '../../services/homeService';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { Testimonial } from '../../types';



export const Reviews: React.FC = () => {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textTestimonials, setTextTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Modal State for submitting a testimonial
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [formData, setFormData] = useState({
    author: '',
    title: 'Chocolate Lover',
    rating: 5,
    text: '',
  });

  const handleOpenModal = () => {
    if (!user || role === 'guest') {
      navigate('/login');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      author: (user as any).full_name || user.name || prev.author,
    }));
    setShowModal(true);
  };

  const fetchApprovedTestimonials = () => {
    setLoading(true);
    homeService
      .getTestimonials()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTextTestimonials(data);
        } else {
          setTextTestimonials([]);
        }
      })
      .catch(() => {
        setTextTestimonials([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchApprovedTestimonials();
  }, []);

  const handleTestimonialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author || !formData.text) return;
    setIsSubmitting(true);
    try {
      await homeService.submitTestimonial(formData);
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        setShowModal(false);
        setFormData({ author: '', title: 'Chocolate Lover', rating: 5, text: '' });
      }, 2500);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit testimonial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || textTestimonials.length === 0) {
    return null;
  }

  return (
    <section
      id="reviews"
      style={{
        padding: 'var(--section-padding) 0',
        background: 'var(--gradient-section-5)',
      }}
    >
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span className="section-label" style={{ justifyContent: 'center' }}>
            Customer Love
          </span>
          <h2 className="section-title">
            What Our <span className="gold">Chocolate Lovers</span> Say
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto 24px auto' }}>
            Real stories from real people who've experienced the magic of Chovique chocolates.
          </p>

          <Button
            variant="gold"
            glow
            onClick={handleOpenModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
          >
            <MessageSquarePlus size={16} /> Share Your Experience
          </Button>
        </div>

        {/* Inline CSS to hide scrollbars & responsive */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @media (max-width: 768px) {
            .reviews-carousel-wrapper {
              padding: 0 42px !important;
            }
          }
          @media (max-width: 480px) {
            .reviews-carousel-wrapper {
              padding: 0 36px !important;
            }
          }
        `}</style>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--beige)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--gold)' }} />
            <span>Loading authentic customer reviews...</span>
          </div>
        ) : textTestimonials.length === 0 ? (
          /* Elegant Empty State Card when no testimonials are in DB */
          <div
            className="glass-panel"
            style={{
              textAlign: 'center',
              padding: '44px 28px',
              maxWidth: '560px',
              margin: '0 auto',
              borderRadius: '16px',
              border: '1px solid rgba(var(--gold-rgb), 0.22)',
              background: 'rgba(14, 10, 7, 0.32)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <Quote size={38} style={{ color: 'var(--gold)', margin: '0 auto 12px auto', opacity: 0.45, display: 'block' }} />
            <h4 style={{ color: 'var(--cream)', fontSize: '1.2rem', fontFamily: 'var(--font-display, serif)', marginBottom: '8px', fontWeight: 600 }}>
              No Customer Reviews Yet
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6, margin: 0 }}>
              Be the first to share your experience with Chovique chocolates. Every review helps us craft artisanal perfection!
            </p>
          </div>
        ) : (
          /* Slider Container Wrapper */
          <div className="reviews-carousel-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '100%', padding: '0 clamp(24px, 4vw, 50px)', boxSizing: 'border-box' }}>
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
              {textTestimonials.map((test, index) => {
                const starsCount = test.rating || test.stars || 5;
                return (
                  <motion.div
                    key={(test.id || test.author) + index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="glass-panel reviews-card-item"
                    style={{
                      flex: '0 0 clamp(270px, 300px, 320px)',
                      width: 'clamp(270px, 300px, 320px)',
                      maxWidth: '320px',
                      scrollSnapAlign: 'start',
                      padding: 'clamp(20px, 3vw, 30px)',
                      border: '1px solid var(--glass-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      borderRadius: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <Quote
                      size={40}
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        color: 'var(--gold)',
                        opacity: 0.1,
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', gap: '4px', color: 'var(--gold)', marginBottom: '15px' }}>
                        {Array.from({ length: starsCount }).map((_, i) => (
                          <Star key={i} size={14} fill="currentColor" />
                        ))}
                      </div>
                      <p
                        style={{
                          color: 'var(--cream)',
                          fontSize: '0.95rem',
                          lineHeight: 1.6,
                          fontStyle: 'italic',
                          fontFamily: 'var(--font-elegant)',
                          marginBottom: '24px',
                        }}
                      >
                        "{test.text}"
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--chocolate-brown)',
                          color: 'var(--gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          border: '1px solid var(--gold)',
                          flexShrink: 0,
                        }}
                      >
                        {test.initials || (test.author ? test.author.substring(0, 2).toUpperCase() : 'CL')}
                      </div>
                      <div>
                        <h5 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cream)', margin: 0 }}>
                          {test.author}
                        </h5>
                        <p style={{ fontSize: '0.75rem', color: 'var(--grey-light)', margin: 0 }}>{test.title || 'Chocolate Enthusiast'}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--cream)',
                zIndex: 10,
                boxShadow: 'var(--glass-shadow)',
                backdropFilter: 'blur(5px)',
                transition: 'background 0.3s, color 0.3s, border-color 0.3s',
                cursor: 'pointer',
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
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Customer Testimonial Submission Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              background: 'var(--dark-chocolate)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                color: 'var(--beige)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.4rem',
                color: 'var(--gold)',
                marginBottom: '16px',
              }}
            >
              Share Your Experience
            </h3>

            {submittedSuccess ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#6fbf6f' }}>
                <CheckCircle size={48} style={{ margin: '0 auto 16px auto' }} />
                <h4 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--cream)' }}>
                  Thank You for Your Feedback!
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--beige)', opacity: 0.8 }}>
                  Your testimonial has been submitted and is pending admin review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTestimonialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Input
                  label="Your Name *"
                  placeholder="e.g. Ananya Sharma"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  required
                />
                <Input
                  label="Title / Role (Optional)"
                  placeholder="e.g. Verified Buyer, Foodie"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--beige)', display: 'block', marginBottom: '8px' }}>
                    Rating *
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setFormData({ ...formData, rating: star })}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: star <= formData.rating ? 'var(--gold)' : 'var(--glass-border)',
                          padding: '4px',
                        }}
                      >
                        <Star size={24} fill={star <= formData.rating ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: 'var(--beige)', display: 'block', marginBottom: '6px' }}>
                    Your Testimonial *
                  </label>
                  <textarea
                    placeholder="Tell us about your experience with Chovique chocolates..."
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    rows={4}
                    required
                    style={{
                      width: '100%',
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '4px',
                      color: 'var(--cream)',
                      padding: '12px',
                      fontSize: '0.9rem',
                      fontFamily: 'var(--font-body)',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <Button variant="gold" glow type="submit" disabled={isSubmitting} style={{ marginTop: '8px' }}>
                  {isSubmitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Submit Testimonial'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default Reviews;
