import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Play, Pause, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { fadeInUp } from '../../lib/framer';
import { homeService } from '../../services/homeService';

interface Reel {
  id: string;
  videoUrl?: string;
  instagramUrl?: string;
  accountName?: string;
}

// Inline Instagram SVG Icon
const InstagramGradientIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export const InstagramReels: React.FC = () => {
  const [hoveredReelId, setHoveredReelId] = useState<string | null>(null);
  const [playingMap, setPlayingMap] = useState<{ [key: string]: boolean }>({});
  const [mutedMap, setMutedMap] = useState<{ [key: string]: boolean }>({});
  const [isSectionInView, setIsSectionInView] = useState<boolean>(false);

  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  const DEFAULT_REELS: Reel[] = [
    {
      id: 'r1',
      videoUrl: 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4',
      instagramUrl: 'https://www.instagram.com/reel/DdQYj55v0dr/',
      accountName: '@choviqueofficial',
    },
    {
      id: 'r2',
      videoUrl: 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4',
      instagramUrl: 'https://www.instagram.com/chovique',
      accountName: '@choviqueofficial',
    },
    {
      id: 'r3',
      videoUrl: 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4',
      instagramUrl: 'https://www.instagram.com/chovique',
      accountName: '@choviqueofficial',
    },
    {
      id: 'r4',
      videoUrl: 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4',
      instagramUrl: 'https://www.instagram.com/chovique',
      accountName: '@choviqueofficial',
    },
  ];

  const [reelsData, setReelsData] = useState<Reel[]>(DEFAULT_REELS);

  // Resolves a playable direct video URL from reel data
  const resolvePlayableVideo = (rawVideoUrl?: string, rawInstagramUrl?: string): string => {
    if (rawVideoUrl && !rawVideoUrl.includes('mixkit') && (rawVideoUrl.endsWith('.mp4') || rawVideoUrl.includes('cloudinary') || rawVideoUrl.includes('fbcdn') || rawVideoUrl.includes('storageapi.dev'))) {
      return rawVideoUrl;
    }
    // If rawVideoUrl was an Instagram reel URL, check if it's the known shortcode or fallback
    if (rawVideoUrl && rawVideoUrl.includes('DdQYj55v0dr')) {
      return 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4';
    }
    if (rawInstagramUrl && rawInstagramUrl.includes('DdQYj55v0dr')) {
      return 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4';
    }
    return 'https://res.cloudinary.com/aiqm7f7b/video/upload/v1790396266/chocolate-world/reels/ig_DdQYj55v0dr.mp4';
  };

  useEffect(() => {
    homeService
      .getReels()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((r: any) => {
            const rawVid = r.videoUrl || r.video_url || '';
            const rawIg = r.instagramUrl || r.instagram_url || rawVid || '';
            const playable = resolvePlayableVideo(rawVid, rawIg);
            return {
              id: String(r.id),
              videoUrl: playable,
              instagramUrl: rawIg.startsWith('http') ? rawIg : `https://www.instagram.com/reel/${r.id}/`,
              accountName: r.accountName || r.account_name || '@choviqueofficial',
            };
          });
          setReelsData(mapped);
        }
      })
      .catch(() => {
        // Keep default reels
      });
  }, []);

  // Section visibility observer to pause when outside viewport
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsSectionInView(entry.isIntersecting);
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause all videos when section scrolls out of view
  useEffect(() => {
    if (!isSectionInView) {
      Object.entries(videoRefs.current).forEach(([id, vid]) => {
        if (vid && !vid.paused) {
          vid.pause();
        }
      });
      setPlayingMap({});
      setHoveredReelId(null);
    }
  }, [isSectionInView]);

  // Hover Play / Leave Pause
  const handleReelMouseEnter = (id: string) => {
    if (!isSectionInView) return;
    setHoveredReelId(id);

    // Pause all other videos
    Object.entries(videoRefs.current).forEach(([reelId, vid]) => {
      if (reelId !== id && vid && !vid.paused) {
        vid.pause();
        setPlayingMap((prev) => ({ ...prev, [reelId]: false }));
      }
    });

    const vid = videoRefs.current[id];
    if (vid) {
      const isMuted = mutedMap[id] ?? true;
      vid.muted = isMuted;
      vid.play().then(() => {
        setPlayingMap((prev) => ({ ...prev, [id]: true }));
      }).catch(() => {
        // Autoplay policy fallback: mute and retry
        vid.muted = true;
        setMutedMap((prev) => ({ ...prev, [id]: true }));
        vid.play().then(() => {
          setPlayingMap((prev) => ({ ...prev, [id]: true }));
        }).catch(() => {});
      });
    }
  };

  const handleReelMouseLeave = (id: string) => {
    setHoveredReelId(null);
    const vid = videoRefs.current[id];
    if (vid && !vid.paused) {
      vid.pause();
      setPlayingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Click to Play / Pause Toggle
  const handleTogglePlayPause = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRefs.current[id];
    if (!vid) return;

    if (vid.paused) {
      // Pause all other videos
      Object.entries(videoRefs.current).forEach(([reelId, otherVid]) => {
        if (reelId !== id && otherVid && !otherVid.paused) {
          otherVid.pause();
          setPlayingMap((prev) => ({ ...prev, [reelId]: false }));
        }
      });
      const isMuted = mutedMap[id] ?? true;
      vid.muted = isMuted;
      vid.play().then(() => {
        setPlayingMap((prev) => ({ ...prev, [id]: true }));
      }).catch(() => {
        vid.muted = true;
        setMutedMap((prev) => ({ ...prev, [id]: true }));
        vid.play().then(() => {
          setPlayingMap((prev) => ({ ...prev, [id]: true }));
        }).catch(() => {});
      });
    } else {
      vid.pause();
      setPlayingMap((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Mute / Unmute Toggle
  const handleToggleMute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRefs.current[id];
    const currentlyMuted = mutedMap[id] ?? true;
    const newMuted = !currentlyMuted;

    setMutedMap((prev) => ({ ...prev, [id]: newMuted }));
    if (vid) {
      vid.muted = newMuted;
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = Math.max(300, clientWidth * 0.75);
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="instagram-reels"
      style={{
        padding: 'var(--section-padding) 0',
        background: 'var(--gradient-section-7)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container">
        {/* Section Header */}
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
            marginBottom: '40px',
          }}
        >
          <span className="section-label" style={{ justifyContent: 'center' }}>
            Social Buzz
          </span>
          <h2 className="section-title">
            Trending on <span className="gold">Instagram</span>
          </h2>
          <p className="section-subtitle">
            Hover to play our artisanal crafting process and delicious chocolate stories.
          </p>
        </motion.div>

        {/* Global Reel Styles */}
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          @media (max-width: 768px) {
            .reels-carousel-wrapper {
              padding: 0 42px !important;
            }
          }
          @media (max-width: 480px) {
            .reels-carousel-wrapper {
              padding: 0 36px !important;
            }
          }
          .reels-card-item {
            transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease, border-color 0.3s ease;
          }
          .reels-card-item:hover {
            transform: translateY(-6px);
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 25px rgba(201, 168, 76, 0.25) !important;
            border-color: rgba(201, 168, 76, 0.45) !important;
          }
          .watch-reel-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(220, 39, 67, 0.6) !important;
            filter: brightness(1.1);
          }
          .reel-sound-wave {
            display: flex;
            align-items: flex-end;
            gap: 2px;
            height: 12px;
          }
          .reel-sound-bar {
            width: 2px;
            background: #2ecc71;
            border-radius: 1px;
            animation: soundWave 0.8s ease-in-out infinite alternate;
          }
          .reel-sound-bar:nth-child(1) { height: 6px; animation-delay: 0.1s; }
          .reel-sound-bar:nth-child(2) { height: 12px; animation-delay: 0.3s; }
          .reel-sound-bar:nth-child(3) { height: 8px; animation-delay: 0.2s; }
          @keyframes soundWave {
            0% { transform: scaleY(0.4); }
            100% { transform: scaleY(1); }
          }
        `}</style>

        {/* Carousel Slider Wrapper */}
        <div className="reels-carousel-wrapper" style={{ position: 'relative', width: '100%', maxWidth: '100%', padding: '0 clamp(24px, 4vw, 50px)', boxSizing: 'border-box' }}>
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

          {/* Horizontal Reel Slider */}
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
            {reelsData.map((reel) => {
              const isHovered = hoveredReelId === reel.id;
              const isPlaying = !!playingMap[reel.id];
              const isMuted = mutedMap[reel.id] ?? true;
              const directInstagramUrl = reel.instagramUrl || reel.videoUrl || 'https://instagram.com';
              const accountHandle = reel.accountName || '@choviqueofficial';
              const profileUrl = `https://www.instagram.com/${accountHandle.replace(/^@/, '')}/`;

              return (
                <motion.div
                  key={reel.id}
                  layout
                  className="reels-card-item"
                  style={{
                    flex: '0 0 clamp(260px, 280px, 300px)',
                    width: 'clamp(260px, 280px, 300px)',
                    maxWidth: '300px',
                    height: 'clamp(460px, 60vh, 520px)',
                    scrollSnapAlign: 'start',
                    position: 'relative',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    background: '#0a0a0a',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => handleReelMouseEnter(reel.id)}
                  onMouseLeave={() => handleReelMouseLeave(reel.id)}
                  onClick={(e) => handleTogglePlayPause(reel.id, e)}
                >
                  {/* HTML5 Video Container */}
                  <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden', background: '#000' }}>
                    <video
                      ref={(el) => {
                        videoRefs.current[reel.id] = el;
                      }}
                      src={reel.videoUrl}
                      loop
                      muted={isMuted}
                      playsInline
                      preload="auto"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />

                    {/* Gradient overlay for aesthetic depth */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.05) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.75) 100%)',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Center Play / Pause Indicator */}
                    {!isPlaying && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(15, 10, 5, 0.75)',
                          backdropFilter: 'blur(10px)',
                          WebkitBackdropFilter: 'blur(10px)',
                          border: '1.5px solid var(--gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--gold-light)',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px rgba(201, 168, 76, 0.3)',
                          pointerEvents: 'none',
                          transition: 'transform 0.2s ease, opacity 0.2s ease',
                        }}
                      >
                        <Play size={24} fill="currentColor" style={{ marginLeft: '3px' }} />
                      </div>
                    )}

                    {isPlaying && isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '16px',
                          right: '16px',
                          background: 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(6px)',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          pointerEvents: 'none',
                        }}
                      >
                        <Pause size={12} color="var(--gold)" />
                        <span style={{ fontSize: '0.7rem', color: 'var(--cream)', fontWeight: 600 }}>Playing</span>
                      </div>
                    )}
                  </div>

                  {/* Top Bar: Account Holder Details & Mute/Unmute Toggle */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      right: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      zIndex: 4,
                      pointerEvents: 'none',
                    }}
                  >
                    {/* Account Handle Badge */}
                    <a
                      href={profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(10, 10, 10, 0.85)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        padding: '6px 12px',
                        borderRadius: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
                        pointerEvents: 'auto',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gold)';
                        e.currentTarget.style.transform = 'scale(1.03)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title={`Visit ${accountHandle} on Instagram`}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(220, 39, 67, 0.4)',
                        }}
                      >
                        <InstagramGradientIcon size={13} />
                      </div>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--cream)',
                          letterSpacing: '0.2px',
                          maxWidth: '140px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {accountHandle}
                      </span>
                    </a>

                    {/* Mute / Unmute Button */}
                    <button
                      onClick={(e) => handleToggleMute(reel.id, e)}
                      aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                      title={isMuted ? 'Click to Unmute' : 'Click to Mute'}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isMuted ? 'rgba(0, 0, 0, 0.75)' : 'rgba(46, 204, 113, 0.2)',
                        border: isMuted ? '1px solid rgba(255, 255, 255, 0.25)' : '1.5px solid #2ecc71',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isMuted ? '#ffffff' : '#2ecc71',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                        transition: 'all 0.2s ease',
                        pointerEvents: 'auto',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {isMuted ? (
                        <VolumeX size={16} />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Volume2 size={16} />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Bottom Redirect Button */}
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(12, 10, 8, 0.95)',
                      borderTop: '1px solid var(--glass-border)',
                      zIndex: 3,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={directInstagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="watch-reel-cta"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.86rem',
                        textDecoration: 'none',
                        boxShadow: '0 4px 16px rgba(220, 39, 67, 0.45)',
                        transition: 'all 0.25s ease',
                        boxSizing: 'border-box',
                      }}
                    >
                      <InstagramGradientIcon size={16} />
                      <span>Watch on Instagram</span>
                      <ExternalLink size={14} />
                    </a>
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

export default InstagramReels;
