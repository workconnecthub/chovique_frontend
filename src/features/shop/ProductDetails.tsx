import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Star,
  Heart,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Camera,
  Video as VideoIcon,
  CheckCircle2,
  MessageSquarePlus,
  AlertCircle,
  Sparkles,
  Filter,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../app/providers';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { pageTransition } from '../../lib/framer';
import { productService } from '../../services/productService';
import { getImageUrl } from '../../utils/imageUrl';

type TabType = 'description' | 'ingredients' | 'reviews';

export const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, cart, addToCart, updateCartQuantity, removeFromCart, wishlist, toggleWishlist, role, user } = useApp();

  const [product, setProduct] = useState(products.find((p) => p.id === id));
  const [activeTab, setActiveTab] = useState<TabType>('description');
  const [activeImage, setActiveImage] = useState('');
  const [addedToCartAlert, setAddedToCartAlert] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  // --- Zoom logic ---
  const [zoomOrigin, setZoomOrigin] = useState('center center');
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setProduct(prod);
      const primary = prod.image || (prod.images && prod.images[0]) || '';
      setActiveImage(getImageUrl(primary));
      setActiveTab('description');
    } else {
      navigate('/404');
    }
  }, [id, products, navigate]);


  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  useEffect(() => {
    if (product) {
      import('../../services/productService').then(({ productService }) => {
        productService.getRelatedProducts(product.id, 4).then(setRelatedProducts);
      });
    }
  }, [product]);

  if (!product) return null;

  const isLiked = wishlist.some((p) => p.id === product.id);
  const cartItem = cart.find((item) => item.product.id === product.id);
  const inCart = !!cartItem;
  
  const displayQuantity = inCart ? cartItem.quantity : 0;

  // Handlers for quantity
  const handleIncrement = () => {
    if (inCart) {
      updateCartQuantity(product.id, cartItem.quantity + 1);
    } else {
      if (role === 'guest') {
        navigate('/login', { state: { from: location.pathname } });
      } else {
        addToCart(product, 1);
        setAddedToCartAlert(true);
        setTimeout(() => setAddedToCartAlert(false), 2500);
      }
    }
  };
  const handleDecrement = () => {
    if (inCart) {
      if (cartItem.quantity > 1) {
        updateCartQuantity(product.id, cartItem.quantity - 1);
      } else {
        removeFromCart(product.id);
      }
    }
  };

  // Add to cart trigger
  const handleAddToCart = () => {
    if (role === 'guest') {
      navigate('/login', { state: { from: location.pathname } });
    } else {
      addToCart(product, 1);
      setAddedToCartAlert(true);
      setTimeout(() => setAddedToCartAlert(false), 2500);
    }
  };

  // Buy now trigger — adds product with selected quantity to cart and navigates to existing checkout flow
  const handleBuyNow = async () => {
    if (role === 'guest') {
      navigate('/login', { state: { from: location.pathname } });
    } else {
      if (!inCart) {
        await addToCart(product, 1);
      }
      navigate('/checkout');
    }
  };

  const handleWishlistClick = () => {
    if (role === 'guest') {
      navigate('/login', { state: { from: location.pathname } });
    } else {
      toggleWishlist(product);
    }
  };

  // Magnifier coordinates calculator
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };


  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="details-page"
    >
      <div className="container">
        {/* Back Link */}
        <Link to="/shop" className="details-back-link">
          <ArrowLeft size={16} />
          Back to Shop
        </Link>

        {/* Core Layout Grid */}
        <div className="details-grid">
          {/* Gallery Column (Interactive multi-image view) */}
          <div className="gallery-container" style={{ position: 'relative' }}>
            {(() => {
              const rawImages = (
                product.images && product.images.length > 0
                  ? (product.image && !product.images.includes(product.image)
                      ? [product.image, ...product.images]
                      : product.images)
                  : (product.image ? [product.image] : [])
              );
              const allImages = rawImages.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
              const currentIndex = Math.max(0, allImages.findIndex(img => getImageUrl(img) === activeImage));
              const currentActiveUrl = activeImage || (allImages.length > 0 ? getImageUrl(allImages[0]) : '');

              const handlePrev = (e: React.MouseEvent) => {
                e.stopPropagation();
                const prevIdx = (currentIndex - 1 + allImages.length) % allImages.length;
                setActiveImage(getImageUrl(allImages[prevIdx]));
              };

              const handleNext = (e: React.MouseEvent) => {
                e.stopPropagation();
                const nextIdx = (currentIndex + 1) % allImages.length;
                setActiveImage(getImageUrl(allImages[nextIdx]));
              };

              return (
                <>
                  <div
                    className="main-image-wrapper"
                    onMouseMove={handleMouseMove}
                    onMouseEnter={() => setIsZoomed(true)}
                    onMouseLeave={() => setIsZoomed(false)}
                    onClick={() => setShowLightbox(true)}
                    title="Click to view full resolution"
                    style={{ position: 'relative', cursor: 'zoom-in' }}
                  >
                    <img
                      src={currentActiveUrl}
                      alt={product.name}
                      className="zoom-image"
                      style={{
                        transform: isZoomed ? 'scale(2)' : 'scale(1)',
                        transformOrigin: zoomOrigin,
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=800&q=80';
                      }}
                    />

                    {/* Image Counter Badge */}
                    {allImages.length > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '14px',
                          left: '14px',
                          background: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(6px)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '0.74rem',
                          color: 'var(--cream)',
                          fontWeight: 600,
                          pointerEvents: 'none',
                          zIndex: 5,
                        }}
                      >
                        {currentIndex + 1} / {allImages.length}
                      </div>
                    )}

                    {/* Expand/Lightbox Icon */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowLightbox(true);
                      }}
                      title="Inspect Full Image"
                      style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        background: 'rgba(0,0,0,0.6)',
                        border: '1px solid var(--gold)',
                        borderRadius: '50%',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--gold)',
                        cursor: 'pointer',
                        zIndex: 5,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Maximize2 size={16} />
                    </button>

                    {/* Navigation Arrows for Carousel */}
                    {allImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={handlePrev}
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.65)',
                            border: '1px solid var(--gold)',
                            borderRadius: '50%',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: 'var(--gold)',
                            cursor: 'pointer',
                            zIndex: 10,
                            transition: 'all 0.2s',
                          }}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.65)',
                            border: '1px solid var(--gold)',
                            borderRadius: '50%',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            color: 'var(--gold)',
                            cursor: 'pointer',
                            zIndex: 10,
                            transition: 'all 0.2s',
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Interactive Thumbnails Row */}
                  {allImages.length > 1 && (
                    <div className="thumbnail-row">
                      {allImages.map((img, idx) => {
                        const resolvedUrl = getImageUrl(img);
                        const isSelected = currentActiveUrl === resolvedUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImage(resolvedUrl)}
                            onMouseEnter={() => setActiveImage(resolvedUrl)}
                            className={`thumbnail-btn ${isSelected ? 'active' : ''}`}
                            title={`View image ${idx + 1}`}
                          >
                            <img
                              src={resolvedUrl}
                              alt={`${product.name} view ${idx + 1}`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* FULLSCREEN LIGHTBOX MODAL */}
                  {showLightbox && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.92)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '20px',
                        boxSizing: 'border-box',
                      }}
                      onClick={() => setShowLightbox(false)}
                    >
                      {/* Close button */}
                      <button
                        type="button"
                        onClick={() => setShowLightbox(false)}
                        style={{
                          position: 'absolute',
                          top: '20px',
                          right: '20px',
                          background: 'rgba(231,76,60,0.2)',
                          border: '1px solid #e74c3c',
                          color: '#e74c3c',
                          borderRadius: '50%',
                          width: '42px',
                          height: '42px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10000,
                        }}
                      >
                        <X size={22} />
                      </button>

                      {/* Main Lightbox Image View */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'relative',
                          maxWidth: '90vw',
                          maxHeight: '75vh',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={currentActiveUrl}
                          alt={product.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '75vh',
                            objectFit: 'contain',
                            borderRadius: '10px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
                            border: '1px solid rgba(201,168,76,0.3)',
                          }}
                        />

                        {allImages.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={handlePrev}
                              style={{
                                position: 'absolute',
                                left: '-50px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0,0,0,0.7)',
                                border: '1px solid var(--gold)',
                                color: 'var(--gold)',
                                borderRadius: '50%',
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <ChevronLeft size={24} />
                            </button>
                            <button
                              type="button"
                              onClick={handleNext}
                              style={{
                                position: 'absolute',
                                right: '-50px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(0,0,0,0.7)',
                                border: '1px solid var(--gold)',
                                color: 'var(--gold)',
                                borderRadius: '50%',
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <ChevronRight size={24} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Thumbnails row in Lightbox */}
                      {allImages.length > 1 && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            marginTop: '20px',
                            overflowX: 'auto',
                            maxWidth: '90vw',
                            padding: '6px',
                          }}
                        >
                          {allImages.map((img, idx) => {
                            const resUrl = getImageUrl(img);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveImage(resUrl)}
                                style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '6px',
                                  padding: '4px',
                                  background: 'rgba(20,10,5,0.8)',
                                  border: currentActiveUrl === resUrl ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.2)',
                                  cursor: 'pointer',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <img
                                  src={resUrl}
                                  alt={`Thumb ${idx + 1}`}
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Info Details Column */}
          <div className="details-info-column">
            <div>
              {product.badge && (
                <span
                  style={{
                    background: 'var(--gold)',
                    color: 'var(--dark-chocolate)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    padding: '4px 10px',
                    borderRadius: '2px',
                    display: 'inline-block',
                    marginBottom: '10px',
                  }}
                >
                  {product.badge}
                </span>
              )}
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.5rem',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  lineHeight: 1.15,
                  marginBottom: '10px',
                }}
              >
                {product.name}
              </h1>
              <div className="details-meta-row" style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gold)' }}>
                  <Star size={16} fill="currentColor" />
                  <span style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.95rem' }}>
                    {product.rating ? Number(product.rating).toFixed(1) : '4.8'}
                  </span>
                </div>
                <span style={{ color: 'var(--glass-border)' }}>|</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {product.weight}
                </span>
              </div>

              <div className="details-price-row" style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--cream)' }}>
                  ₹{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span
                    style={{
                      fontSize: '1.2rem',
                      color: 'var(--grey-light)',
                      textDecoration: 'line-through',
                    }}
                  >
                    ₹{product.originalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              <p className="details-description">
                {product.description}
              </p>
            </div>

            {/* Quantity Selector & Wishlist */}
            <div className="details-actions-row">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  height: '48px',
                }}
              >
                <button
                  onClick={handleDecrement}
                  style={{ padding: '0 16px', color: 'var(--beige)', transition: 'color 0.3s' }}
                >
                  <Minus size={16} />
                </button>
                <span style={{ width: '40px', textAlign: 'center', fontWeight: 600, color: 'var(--cream)' }}>
                  {displayQuantity}
                </span>
                <button
                  onClick={handleIncrement}
                  style={{ padding: '0 16px', color: 'var(--beige)', transition: 'color 0.3s' }}
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                onClick={handleWishlistClick}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  border: '1px solid var(--glass-border)',
                  background: isLiked ? 'var(--rose-gold)' : 'rgba(255, 255, 255, 0.03)',
                  color: isLiked ? 'white' : 'var(--cream)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.3s',
                }}
              >
                <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="details-action-buttons">
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <Button 
                  variant="gold" 
                  size="lg" 
                  style={{ flex: '1 1 200px' }}
                  disabled={product?.is_available === false || (product?.stock ?? 0) <= 0}
                  onClick={() => handleAddToCart()} 
                  glow={product?.is_available !== false && (product?.stock ?? 0) > 0}
                >
                  <ShoppingBag size={18} />
                  {product?.is_available === false || (product?.stock ?? 0) <= 0 ? 'OUT OF STOCK' : 'Add to Cart'}
                </Button>
                <Button 
                  variant="glass" 
                  size="lg" 
                  style={{ flex: '1 1 200px' }}
                  disabled={product?.is_available === false || (product?.stock ?? 0) <= 0}
                  onClick={handleBuyNow}
                >
                  {product?.is_available === false || (product?.stock ?? 0) <= 0 ? 'UNAVAILABLE' : 'Buy Now'}
                </Button>
              </div>

              {addedToCartAlert && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: 'rgba(201, 168, 76, 0.1)',
                    border: '1px solid var(--gold)',
                    color: 'var(--gold-light)',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  <Check size={16} />
                  <span>Successfully added to your shopping cart!</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Collapsible Tabs details */}
        <div>
          <div className="details-tabs-header">
            {(['description', 'ingredients', 'reviews'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`details-tab-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ minHeight: '160px', paddingBottom: '40px', borderBottom: '1px solid var(--glass-border)' }}>
            {activeTab === 'description' && (
              <p style={{ color: 'var(--beige)', lineHeight: 1.7, fontSize: '0.98rem' }}>
                {product.description} Made with carefully selected cocoa beans from trusted farms, ensuring a rich and consistent taste. Slowly crafted to give you that perfect smooth texture and satisfying snap.
              </p>
            )}

            {activeTab === 'ingredients' && (
              <p style={{ color: 'var(--beige)', lineHeight: 1.7, fontSize: '0.98rem' }}>
                {product.ingredients}
              </p>
            )}



            {activeTab === 'reviews' && (
              <ReviewsTabSection
                productId={product.id}
                user={user}
                role={role}
                onReviewAdded={() => {}}
                productRating={product.rating}
              />
            )}
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '50px' }}>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                color: 'var(--cream)',
                marginBottom: '30px',
              }}
            >
              Related Products
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px' }}>
              {relatedProducts.map((prod) => (
                <Card key={prod.id} product={prod} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
export default ProductDetails;

/* =============================================================
   REVIEWS TAB SECTION COMPONENT
   ============================================================= */

/* =============================================================
   REVIEWS TAB SECTION COMPONENT
   ============================================================= */

interface ReviewsTabSectionProps {
  productId: string;
  user: any;
  role: string;
  onReviewAdded: () => void;
  productRating?: number;
}

const ReviewsTabSection: React.FC<ReviewsTabSectionProps> = ({ productId, user, role, onReviewAdded, productRating = 0 }) => {
  const navigate = useNavigate();
  const [reviewsData, setReviewsData] = useState<{
    reviews: any[];
    average_rating: number;
    total_reviews: number;
    star_breakdown: { [key: number]: number };
  }>({
    reviews: [],
    average_rating: 0,
    total_reviews: 0,
    star_breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Review Form State
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [selectedVideoFiles, setSelectedVideoFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = useState<{ url: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Media Modal & Filter State
  const [mediaFilter, setMediaFilter] = useState<'all' | 'media' | number>('all');
  const [activeMediaModal, setActiveMediaModal] = useState<{
    type: 'image' | 'video';
    url: string;
    author: string;
    title?: string;
    text?: string;
    rating: number;
    is_verified?: boolean;
    date?: string;
  } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const reviewFormRef = useRef<HTMLFormElement>(null);
  const writeReviewButtonRef = useRef<HTMLDivElement>(null);

  // Auto-close review form when clicking anywhere outside on the screen or pressing Escape
  useEffect(() => {
    if (!showForm) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      // If clicked inside the review form or file pickers, keep open
      if (reviewFormRef.current && reviewFormRef.current.contains(target)) {
        return;
      }

      // If clicked on the toggle button container, let its onClick handle toggle
      if (writeReviewButtonRef.current && writeReviewButtonRef.current.contains(target)) {
        return;
      }

      // Clicked anywhere else on the screen -> automatically close the review card
      setShowForm(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowForm(false);
      }
    };

    // Listen on mousedown and touchstart to capture clicks immediately
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showForm]);

  const loadReviews = () => {
    setLoading(true);
    productService
      .getProductReviewsWithSummary(productId)
      .then((data) => {
        if (data && Array.isArray(data.reviews)) {
          setReviewsData(data);
        }
      })
      .catch((err) => console.error('Failed to load reviews:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReviews();
  }, [productId]);

  // Handle Photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = files.filter(f => f.type.startsWith('image/'));
    const previews = valid.map(f => URL.createObjectURL(f));
    setSelectedImageFiles(prev => [...prev, ...valid].slice(0, 5));
    setImagePreviewUrls(prev => [...prev, ...previews].slice(0, 5));
  };

  // Handle Video selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const valid = files.filter(f => f.type.startsWith('video/'));
    const previews = valid.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    setSelectedVideoFiles(prev => [...prev, ...valid].slice(0, 2));
    setVideoPreviewUrls(prev => [...prev, ...previews].slice(0, 2));
  };

  const handleRemoveImage = (idx: number) => {
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveVideo = (idx: number) => {
    setSelectedVideoFiles(prev => prev.filter((_, i) => i !== idx));
    setVideoPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    if (role === 'guest') {
      navigate('/login');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('rating', String(rating));
      formData.append('text', reviewText.trim());
      if (reviewTitle.trim()) {
        formData.append('title', reviewTitle.trim());
      }
      formData.append('author', user?.name || user?.full_name || 'Verified Customer');

      selectedImageFiles.forEach((file) => {
        formData.append('images', file);
      });
      selectedVideoFiles.forEach((file) => {
        formData.append('videos', file);
      });

      await productService.createProductReview(productId, formData);
      setSuccessMessage('Thank you! Your review has been submitted and sent to the admin team for approval before appearing on the product page.');
      setReviewTitle('');
      setReviewText('');
      setSelectedImageFiles([]);
      setSelectedVideoFiles([]);
      setImagePreviewUrls([]);
      setVideoPreviewUrls([]);
      setShowForm(false);
      loadReviews();
      onReviewAdded();
    } catch (err: any) {
      setErrorMessage(
        err?.detail || err?.message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const { average_rating, total_reviews, star_breakdown, reviews } = reviewsData;

  // Collect all customer uploaded media across reviews for the media strip
  const allCustomerMedia = reviews.flatMap((r) => {
    const items: Array<{
      type: 'image' | 'video';
      url: string;
      review: any;
    }> = [];
    (r.images || []).forEach((imgUrl: string) => {
      if (imgUrl) items.push({ type: 'image', url: imgUrl, review: r });
    });
    (r.videos || []).forEach((vidUrl: string) => {
      if (vidUrl) items.push({ type: 'video', url: vidUrl, review: r });
    });
    return items;
  });

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    if (mediaFilter === 'all') return true;
    if (mediaFilter === 'media') {
      return (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0);
    }
    return Math.round(r.rating) === mediaFilter;
  });

  const ratingDescriptions: Record<number, string> = {
    5: '5.0 ★ Excellent — Highest Quality & Taste',
    4: '4.0 ★ Very Good — Exceeded expectations',
    3: '3.0 ★ Good — Pleasant experience',
    2: '2.0 ★ Fair — Average chocolate',
    1: '1.0 ★ Poor — Unsatisfied with purchase',
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {/* ── Rating Summary Banner ── */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          marginBottom: '32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '28px',
          alignItems: 'center',
          background: 'radial-gradient(circle at center, rgba(30,16,8,0.5) 0%, rgba(10,5,2,0.9) 100%)',
        }}
      >
        {/* Big Rating Score */}
        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)', paddingRight: '20px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '3.4rem', fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>
            {total_reviews > 0 ? average_rating.toFixed(1) : (productRating ? Number(productRating).toFixed(1) : '4.8')}
          </span>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', color: 'var(--gold)', margin: '10px 0' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                fill={s <= Math.round(total_reviews > 0 ? average_rating : (productRating || 4.8)) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span style={{ fontSize: '0.88rem', color: 'var(--beige)' }}>
            {total_reviews > 0 ? `Based on ${total_reviews} verified customer review${total_reviews > 1 ? 's' : ''}` : 'Customer Rating'}
          </span>
        </div>

        {/* Star Rating Breakdown Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = star_breakdown?.[star] || 0;
            const pct = total_reviews > 0 ? Math.round((count / total_reviews) * 100) : (star === 5 ? 85 : star === 4 ? 15 : 0);
            return (
              <div
                key={star}
                onClick={() => setMediaFilter(mediaFilter === star ? 'all' : star)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.82rem',
                  color: mediaFilter === star ? 'var(--gold)' : 'var(--beige)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: mediaFilter === star ? 'rgba(201,168,76,0.1)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ width: '34px', textAlign: 'right', fontWeight: 600 }}>{star} ★</span>
                <div style={{ flex: 1, height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #d4af37, #f3e5ab)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ width: '40px', color: 'var(--grey-light)', fontSize: '0.78rem', textAlign: 'right' }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Write Review Trigger */}
        <div ref={writeReviewButtonRef} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Button
            variant="gold"
            glow
            onClick={() => {
              if (role === 'guest') navigate('/login', { state: { from: location.pathname } });
              else setShowForm(!showForm);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', padding: '12px 22px', fontWeight: 600 }}
          >
            <MessageSquarePlus size={18} />
            <span>{showForm ? 'Cancel Review' : 'Write a Customer Review'}</span>
          </Button>
          <span style={{ fontSize: '0.76rem', color: 'var(--beige)', opacity: 0.8 }}>
            Share your chocolate experience & photos with other connoisseurs
          </span>
        </div>
      </div>

      {/* ── Customer Reviews Media Reel ── */}
      {allCustomerMedia.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--cream)', margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} style={{ color: 'var(--gold)' }} />
              Customer Photos &amp; Videos ({allCustomerMedia.length})
            </h4>
            <span style={{ fontSize: '0.78rem', color: 'var(--gold)', cursor: 'pointer' }} onClick={() => setMediaFilter('media')}>
              View all media reviews
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {allCustomerMedia.map((m, idx) => (
              <div
                key={idx}
                onClick={() =>
                  setActiveMediaModal({
                    type: m.type,
                    url: m.url,
                    author: m.review.author,
                    title: m.review.title,
                    text: m.review.text,
                    rating: m.review.rating,
                    is_verified: m.review.is_verified_purchase,
                    date: m.review.date,
                  })
                }
                style={{
                  position: 'relative',
                  width: '90px',
                  height: '90px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  cursor: 'pointer',
                  border: '1.5px solid var(--glass-border)',
                  background: '#000',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = 'var(--gold)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                }}
              >
                {m.type === 'video' ? (
                  <>
                    <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Play size={20} fill="#fff" />
                    </div>
                  </>
                ) : (
                  <img src={m.url} alt="Customer upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error or Success Alert */}
      {errorMessage && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', color: '#e74c3c', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}
      {successMessage && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', background: 'rgba(46,204,113,0.12)', border: '1px solid rgba(46,204,113,0.3)', color: '#2ecc71', fontSize: '0.85rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}

      {/* ── Customer Review Form ── */}
      {showForm && (
        <form
          ref={reviewFormRef}
          onSubmit={handleSubmitReview}
          className="glass-panel"
          style={{
            padding: '28px',
            border: '1px solid var(--gold)',
            borderRadius: '12px',
            marginBottom: '36px',
            background: 'linear-gradient(135deg, rgba(25,15,8,0.95) 0%, rgba(15,8,4,0.95) 100%)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--cream)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--gold)' }} />
              Create Review
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--beige)', opacity: 0.8 }}>
                Posting as <strong>{user?.name || user?.full_name || 'Verified Customer'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                title="Close review form"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--cream)',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '12px',
                  transition: 'all 0.15s ease',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* 1. Overall Rating */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--beige)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Overall Rating <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setRating(s)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: s <= rating ? 'var(--gold)' : 'rgba(255,255,255,0.2)', transition: 'transform 0.15s ease' }}
                  >
                    <Star size={28} fill={s <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gold)' }}>
                {ratingDescriptions[rating] || `${rating}.0 ★`}
              </span>
            </div>
          </div>

          {/* 2. Review Headline / Title */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="review-headline-input" style={{ fontSize: '0.82rem', color: 'var(--beige)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Add a Headline
            </label>
            <input
              id="review-headline-input"
              type="text"
              placeholder="What's most important to know? (e.g., Amazing taste!)"
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--cream)',
                padding: '12px 14px',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 3. Written Review */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="review-body-textarea" style={{ fontSize: '0.82rem', color: 'var(--beige)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
              Add a Written Review <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <textarea
              id="review-body-textarea"
              placeholder="What did you like or dislike? How was the mouthfeel, aroma, sweetness, packaging, or pairing?"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              required
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--glass-border)',
                borderRadius: '6px',
                color: 'var(--cream)',
                padding: '12px 14px',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-body)',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 4. Add Photos & Videos */}
          <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(201,168,76,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--cream)', fontWeight: 600, display: 'block' }}>
                  Add Photos and Videos
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--beige)', opacity: 0.8 }}>
                  Shoppers find images and videos more helpful than text alone (Max 5 photos, 2 videos).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  multiple
                  ref={imageInputRef}
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', border: '1px solid var(--gold)', color: 'var(--gold)' }}
                >
                  <Camera size={14} /> Add Photos
                </Button>

                <input
                  type="file"
                  accept="video/mp4, video/webm, video/quicktime"
                  multiple
                  ref={videoInputRef}
                  onChange={handleVideoSelect}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', border: '1px solid var(--gold)', color: 'var(--gold)' }}
                >
                  <VideoIcon size={14} /> Add Video
                </Button>
              </div>
            </div>

            {/* Media Upload Previews */}
            {(imagePreviewUrls.length > 0 || videoPreviewUrls.length > 0) && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                {imagePreviewUrls.map((url, idx) => (
                  <div key={`img-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--gold)', background: '#000' }}>
                    <img src={url} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ✕
                    </button>
                    <span style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.7)', color: 'var(--cream)', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px' }}>Photo</span>
                  </div>
                ))}

                {videoPreviewUrls.map((vid, idx) => (
                  <div key={`vid-${idx}`} style={{ position: 'relative', width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--gold)', background: '#000' }}>
                    <video src={vid.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(idx)}
                      style={{ position: 'absolute', top: '2px', right: '2px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    >
                      ✕
                    </button>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <Play size={16} fill="#fff" color="#fff" />
                    </div>
                    <span style={{ position: 'absolute', bottom: '2px', left: '2px', background: 'rgba(0,0,0,0.7)', color: 'var(--cream)', fontSize: '0.65rem', padding: '1px 4px', borderRadius: '3px' }}>Video</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="gold" type="submit" glow disabled={isSubmitting} style={{ minWidth: '160px', fontWeight: 600 }}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading &amp; Submitting...</span>
                </>
              ) : (
                'Submit Customer Review'
              )}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Filter Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--beige)', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
          <Filter size={14} /> Filter reviews:
        </span>
        {(['all', 'media', 5, 4, 3, 2, 1] as const).map((f) => {
          const isSelected = mediaFilter === f;
          const label = f === 'all' ? 'All' : f === 'media' ? 'With Photos / Videos' : `${f} Stars`;
          return (
            <button
              key={String(f)}
              type="button"
              onClick={() => setMediaFilter(f)}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.76rem',
                fontWeight: 600,
                border: isSelected ? '1px solid var(--gold)' : '1px solid rgba(255,255,255,0.12)',
                background: isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.03)',
                color: isSelected ? 'var(--dark-chocolate)' : 'var(--cream)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Reviews List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gold)' }}>
          <Loader2 size={32} className="animate-spin" />
        </div>
      ) : filteredReviews.length === 0 ? (
        <p style={{ color: 'var(--grey-light)', fontStyle: 'italic', textAlign: 'center', padding: '30px' }}>
          {mediaFilter !== 'all' ? 'No reviews match this filter.' : 'No customer reviews yet. Be the first to review this chocolate!'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="review-item"
              style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px',
              }}
            >
              {/* Header: Customer Profile */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'radial-gradient(circle, #3d2314 0%, #1a0e07 100%)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', border: '1px solid var(--gold)' }}>
                    {rev.avatar || rev.author?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h5 style={{ color: 'var(--cream)', margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                        {rev.author}
                      </h5>
                      {rev.is_verified_purchase && (
                        <span style={{ fontSize: '0.72rem', color: '#c49a45', background: 'rgba(201,168,76,0.15)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(201,168,76,0.3)', fontWeight: 600 }}>
                          ✓ Verified Purchase
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--grey-light)' }}>
                      Reviewed in India on {rev.date}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', color: 'var(--gold)', gap: '3px' }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < Math.round(rev.rating) ? 'currentColor' : 'none'}
                      color="var(--gold)"
                    />
                  ))}
                </div>
              </div>

              {/* Review Title */}
              {rev.title && (
                <h5 style={{ color: 'var(--cream)', fontSize: '0.96rem', fontWeight: 700, margin: '6px 0 8px 0', lineHeight: 1.3 }}>
                  {rev.title}
                </h5>
              )}

              {/* Review Text */}
              <p style={{ color: 'var(--beige)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                {rev.text}
              </p>

              {/* Customer Photos & Videos attached to this review */}
              {((rev.images && rev.images.length > 0) || (rev.videos && rev.videos.length > 0)) && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {(rev.images || []).map((imgUrl: string, idx: number) => (
                    <div
                      key={`r-img-${idx}`}
                      onClick={() =>
                        setActiveMediaModal({
                          type: 'image',
                          url: imgUrl,
                          author: rev.author,
                          title: rev.title,
                          text: rev.text,
                          rating: rev.rating,
                          is_verified: rev.is_verified_purchase,
                          date: rev.date,
                        })
                      }
                      style={{
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid rgba(201,168,76,0.3)',
                        background: '#000',
                      }}
                    >
                      <img src={imgUrl} alt="Review attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}

                  {(rev.videos || []).map((vidUrl: string, idx: number) => (
                    <div
                      key={`r-vid-${idx}`}
                      onClick={() =>
                        setActiveMediaModal({
                          type: 'video',
                          url: vidUrl,
                          author: rev.author,
                          title: rev.title,
                          text: rev.text,
                          rating: rev.rating,
                          is_verified: rev.is_verified_purchase,
                          date: rev.date,
                        })
                      }
                      style={{
                        position: 'relative',
                        width: '80px',
                        height: '80px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid rgba(201,168,76,0.3)',
                        background: '#000',
                      }}
                    >
                      <video src={vidUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Play size={20} fill="#fff" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CUSTOMER MEDIA VIEWER MODAL ── */}
      {activeMediaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box',
          }}
          onClick={() => setActiveMediaModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '850px',
              width: '100%',
              background: 'linear-gradient(135deg, rgba(20,10,5,0.98) 0%, rgba(10,5,2,0.98) 100%)',
              border: '1px solid var(--gold)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
              display: 'flex',
              flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
              maxHeight: '90vh',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveMediaModal(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(231,76,60,0.2)',
                border: '1px solid #e74c3c',
                color: '#e74c3c',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10001,
              }}
            >
              <X size={18} />
            </button>

            {/* Media Box */}
            <div style={{ flex: '1 1 60%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
              {activeMediaModal.type === 'video' ? (
                <video
                  src={activeMediaModal.url}
                  controls
                  autoPlay
                  playsInline
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : (
                <img
                  src={activeMediaModal.url}
                  alt="Customer Review Photo"
                  style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                />
              )}
            </div>

            {/* Review Details Pane */}
            <div style={{ flex: '1 1 40%', padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'radial-gradient(circle, #3d2314 0%, #1a0e07 100%)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', border: '1px solid var(--gold)' }}>
                  {activeMediaModal.author?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h5 style={{ color: 'var(--cream)', margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>
                    {activeMediaModal.author}
                  </h5>
                  {activeMediaModal.is_verified && (
                    <span style={{ fontSize: '0.72rem', color: '#c49a45', fontWeight: 600 }}>
                      ✓ Verified Purchase
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', color: 'var(--gold)', gap: '2px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < Math.round(activeMediaModal.rating) ? 'currentColor' : 'none'}
                    color="var(--gold)"
                  />
                ))}
              </div>

              {activeMediaModal.title && (
                <h5 style={{ color: 'var(--cream)', fontSize: '1rem', fontWeight: 700, margin: '4px 0 0 0' }}>
                  {activeMediaModal.title}
                </h5>
              )}

              <p style={{ color: 'var(--beige)', fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                {activeMediaModal.text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

