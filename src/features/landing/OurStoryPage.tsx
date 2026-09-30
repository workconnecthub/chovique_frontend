import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, Heart, Target, Star, Leaf, Award, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { slideInLeft, slideInRight, fadeIn } from '../../lib/framer';
import { adminService } from '../../services/adminService';
import { Footer } from '../../components/Footer';
import { Reviews } from './Reviews';

export const OurStoryPage: React.FC = () => {
  const location = useLocation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoUrl, setVideoUrl] = useState('https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.hash]);

  useEffect(() => {
    adminService.getStoryVideo()
      .then((res) => {
        if (res && res.video_url) {
          setVideoUrl(res.video_url);
        }
      })
      .catch(() => {});
  }, []);

  // IntersectionObserver for video auto-play when visible, and auto-pause when scrolled away
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          // Play automatically (starts muted for browser autoplay compatibility)
          video.muted = isMuted;
          video
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              // If playback fails due to autoplay restrictions, enforce muted and retry
              video.muted = true;
              setIsMuted(true);
              video
                .play()
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(() => {});
            });
        } else {
          // Pause automatically when outside viewport
          if (!video.paused) {
            video.pause();
            setIsPlaying(false);
          }
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isMuted, videoUrl]);

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

  const coreValues = [
    {
      icon: <Leaf className="gold" size={32} />,
      title: 'Sustainable Sourcing',
      desc: 'We partner directly with family-owned farms, ensuring fair wages, ethical labor, and ecological preservation.',
    },
    {
      icon: <Award className="gold" size={32} />,
      title: 'Artisanal Mastery',
      desc: 'Our chocolates are tempered and decorated by hand in small batches by master chocolatiers.',
    },
    {
      icon: <Star className="gold" size={32} />,
      title: 'Pure Ingredients',
      desc: 'Zero artificial preservatives, emulsifiers, or palm oil. Only pure cocoa butter, organic sugars, and natural infusions.',
    },
  ];

  return (
    <div style={{ background: 'var(--black)', color: 'var(--cream)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Hero Header */}
      <section
        style={{
          position: 'relative',
          padding: '105px 0 45px 0',
          background: 'linear-gradient(rgba(var(--dark-chocolate-rgb), 0.75), rgba(10, 10, 10, 1)), url("https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=1600&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="section-label" style={{ justifyContent: 'center' }}>Heritage & Passion</span>
            <h1 className="section-title" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', marginBottom: '16px' }}>
              The Chovique <span className="gold">Story</span>
            </h1>
            <p style={{ fontFamily: 'var(--font-elegant)', fontSize: '1.4rem', color: 'var(--beige)', maxWidth: '700px', margin: '0 auto', lineHeight: 1.6 }}>
              Crafting sensory journeys through the purity of cacao since 2020.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story Content */}
      <section style={{ padding: '40px 0', background: 'var(--gradient-section-1)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            {/* Left: Proper Making Process Video */}
            <motion.div
              ref={videoContainerRef}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={slideInLeft}
              style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--glass-shadow)',
                border: '1px solid var(--glass-border)',
                aspectRatio: '16/10',
                background: '#0a0a0a',
                cursor: 'pointer',
              }}
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (isPlaying) {
                  video.pause();
                  setIsPlaying(false);
                } else {
                  video.play().catch(err => console.log(err));
                  setIsPlaying(true);
                }
              }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                loop
                muted={isMuted}
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              
              {/* Play Overlay */}
              {!isPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(var(--dark-chocolate-rgb), 0.45)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div
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
                    <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />
                  </div>
                  <span style={{ color: 'var(--cream)', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                    Watch Crafting Process
                  </span>
                </div>
              )}

              {/* Mute/Unmute Control overlay */}
              {isPlaying && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '15px',
                    right: '15px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.6)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    zIndex: 10,
                  }}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              )}
            </motion.div>

            {/* Right: Narrative */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={slideInRight}
            >
              <span className="section-label">Our Beginnings</span>
              <h2 className="section-title">
                Born from a Love of <span className="gold">Pure Cacao</span>
              </h2>
              <div className="gold-divider" style={{ margin: '15px 0 25px 0', width: '60px', height: '2px', background: 'var(--gradient-gold)' }} />
              <p style={{ color: 'var(--beige)', marginBottom: '20px', lineHeight: 1.8, fontSize: '1.05rem' }}>
                Chovique was founded on a simple realization: chocolate should be an experience, not just a sweet. Frustrated by highly processed, sugar-laden confectionery, our founders set out on a global quest to source authentic, single-origin cacao.
              </p>
              <p style={{ color: 'var(--grey-light)', marginBottom: '25px', lineHeight: 1.8 }}>
                We believe that the best chocolate is a partnership between nature and the chocolatier. By respecting the unique flavor profiles of beans from Madagascar, Ghana, and Ecuador, we celebrate the true heritage of cocoa.
              </p>
              <div style={{ display: 'flex', gap: '20px', marginTop: '30px' }}>
                <div style={{ flex: 1, borderLeft: '3px solid var(--gold)', paddingLeft: '15px' }}>
                  <h4 style={{ color: 'var(--cream)', fontSize: '1.1rem', marginBottom: '6px' }}>100% Traceable</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--grey-light)' }}>Direct relationship with farmers to ensure equity.</p>
                </div>
                <div style={{ flex: 1, borderLeft: '3px solid var(--gold)', paddingLeft: '15px' }}>
                  <h4 style={{ color: 'var(--cream)', fontSize: '1.1rem', marginBottom: '6px' }}>Micro-Batch Production</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--grey-light)' }}>Ensuring unmatched precision and quality control.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Vision & Our Mission Section */}
      <section style={{ padding: '100px 0', background: 'var(--gradient-section-3)' }}>
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '40px',
            }}
          >
            {/* Vision Panel */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={slideInLeft}
              className="glass-panel"
              style={{
                padding: '50px 40px',
                background: 'rgba(var(--dark-chocolate-rgb), 0.4)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(201, 168, 76, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
                <Eye size={30} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cream)' }}>
                Our <span className="gold">Vision</span>
              </h3>
              <p style={{ color: 'var(--beige)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                To establish a global standard for luxury chocolate that elevates the growers, honors the Earth, and transforms chocolate consumption into an art form. We envision a future where chocolate is valued as deeply as fine wine, celebrated for its complex terroir and therapeutic purity.
              </p>
            </motion.div>

            {/* Mission Panel */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={slideInRight}
              className="glass-panel"
              style={{
                padding: '50px 40px',
                background: 'rgba(var(--dark-chocolate-rgb), 0.4)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(201, 168, 76, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>
                <Target size={30} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--cream)' }}>
                Our <span className="gold">Mission</span>
              </h3>
              <p style={{ color: 'var(--beige)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                To curate extraordinary bean-to-bar masterpieces through sustainable direct-trade partnerships, hand-tempered craftsmanship, and transparent sourcing. We dedicate ourselves to continuous culinary innovation, ensuring that every box of Chovique delivers unmatched premium luxury.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Artisanal Process */}
      <section id="the-bean-to-bar-process" style={{ padding: '40px 0', background: 'var(--gradient-section-5)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span className="section-label" style={{ justifyContent: 'center' }}>Step-By-Step</span>
            <h2 className="section-title">The Bean-To-Bar <span className="gold">Process</span></h2>
            <div className="gold-divider" style={{ margin: '15px auto', width: '80px', height: '2px', background: 'var(--gradient-gold)' }} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '30px',
            }}
          >
            {steps.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.6 }}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  padding: '30px 24px',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    fontSize: '2rem',
                    fontWeight: 800,
                    color: 'rgba(201, 168, 76, 0.15)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {step.num}
                </span>
                <h4 style={{ color: 'var(--cream)', fontSize: '1.15rem', fontWeight: 600, marginBottom: '12px' }}>
                  {step.title}
                </h4>
                <p style={{ color: 'var(--grey-light)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section style={{ padding: '80px 0', background: 'var(--gradient-section-7)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span className="section-label" style={{ justifyContent: 'center' }}>What Guides Us</span>
            <h2 className="section-title">Our Core <span className="gold">Values</span></h2>
            <div className="gold-divider" style={{ margin: '15px auto', width: '80px', height: '2px', background: 'var(--gradient-gold)' }} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '30px',
            }}
          >
            {coreValues.map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="glass-panel"
                style={{
                  padding: '40px 30px',
                  background: 'rgba(var(--dark-chocolate-rgb), 0.25)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <div style={{ marginBottom: '10px' }}>{value.icon}</div>
                <h4 style={{ color: 'var(--cream)', fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  {value.title}
                </h4>
                <p style={{ color: 'var(--grey-light)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Synchronized Approved Testimonials */}
      <Reviews />
    </div>
  );
};


export default OurStoryPage;
