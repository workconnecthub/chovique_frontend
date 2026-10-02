import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Eye, Loader2 } from 'lucide-react';
import { useApp } from '../../app/providers';
import { Button } from '../../components/ui/Button';
import { pageTransition, hoverLift } from '../../lib/framer';
import type { Product } from '../../types';
import { getImageUrl } from '../../utils/imageUrl';

interface WishlistPageProps {
  isEmbedded?: boolean;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ isEmbedded = false }) => {
  const { wishlist, moveToCart, toggleWishlist, role } = useApp();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleRemoveFromWishlist = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.id || processingId === product.id) return;
    try {
      setProcessingId(product.id);
      await toggleWishlist(product);
    } catch (err) {
      console.error('Failed to remove item from wishlist:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddToCart = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.id || processingId === product.id) return;
    try {
      setProcessingId(product.id);
      await moveToCart(product);
    } catch (err) {
      console.error('Failed to move item to cart:', err);
    } finally {
      setProcessingId(null);
    }
  };

  if (role === 'guest') {
    return (
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          paddingTop: isEmbedded ? '20px' : '85px',
          minHeight: isEmbedded ? '400px' : '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: isEmbedded ? 'transparent' : 'var(--gradient-hero)',
        }}
      >
        <Heart size={64} style={{ color: 'var(--rose-gold)', marginBottom: '24px' }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--cream)', marginBottom: '10px' }}>
          Please Log In
        </h2>
        <p style={{ color: 'var(--beige)', marginBottom: '30px', maxWidth: '400px' }}>
          You must be logged in to view and manage your wishlist.
        </p>
        <Link to="/login">
          <Button variant="gold" size="lg" glow>
            Log In to Continue
          </Button>
        </Link>
      </motion.div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <motion.div
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          paddingTop: isEmbedded ? '20px' : '85px',
          minHeight: isEmbedded ? '400px' : '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: isEmbedded ? 'transparent' : 'var(--gradient-hero)',
        }}
      >
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'rgba(201, 168, 76, 0.1)',
            border: '1px solid rgba(201, 168, 76, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 0 25px rgba(201, 168, 76, 0.2)',
          }}
        >
          <Heart size={44} style={{ color: '#c9a84c' }} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: '#f5efe6', marginBottom: '10px', fontWeight: 700 }}>
          Your Wishlist is Empty
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.65)', marginBottom: '32px', maxWidth: '440px', fontSize: '0.95rem', lineHeight: 1.6 }}>
          Discover our handmade chocolates and save your favorites to buy later.
        </p>
        <Button variant="gold" size="lg" glow onClick={() => navigate('/shop')}>
          Start Exploring
        </Button>
      </motion.div>
    );
  }

  const content = (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(201, 168, 76, 0.25)',
          paddingBottom: '16px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: isEmbedded ? '1.8rem' : '2.5rem',
              fontWeight: 700,
              color: '#f5efe6',
              margin: '0 0 6px 0',
            }}
          >
            My Wishlist
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: 0 }}>
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved in your private collection
          </p>
        </div>
      </div>

      {/* Wishlist Grid */}
      <motion.div
        layout
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '28px',
        }}
      >
        <AnimatePresence mode="popLayout">
          {wishlist.map((product) => {
            const inStock = (product.is_available !== false) && ((product.stock ?? 0) > 0);
            const shortDesc = product.description
              ? product.description.length > 80
                ? `${product.description.slice(0, 80)}...`
                : product.description
              : 'Handmade Belgian chocolate.';

            return (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                variants={hoverLift}
                whileHover="whileHover"
                style={{
                  background: 'rgba(18, 14, 11, 0.95)',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                }}
              >
                {/* Product image container */}
                <div
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{ position: 'relative', aspectRatio: '1/1', cursor: 'pointer', overflow: 'hidden', background: '#000' }}
                >
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=400&q=80';
                    }}
                  />

                  {/* Stock Availability Pill Top-Left */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      background: inStock ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)',
                      color: '#ffffff',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                    }}
                  >
                    {inStock ? 'In Stock' : 'Out of Stock'}
                  </span>

                  {/* Remove Heart Button Top-Right */}
                  <button
                    type="button"
                    disabled={processingId === product.id}
                    onClick={(e) => handleRemoveFromWishlist(product, e)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: '1px solid rgba(201, 168, 76, 0.5)',
                      color: '#c9a84c',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: processingId === product.id ? 'not-allowed' : 'pointer',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                      transition: 'all 0.2s ease',
                    }}
                    title="Remove from Wishlist"
                  >
                    {processingId === product.id ? (
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Heart size={18} fill="#c9a84c" style={{ color: '#c9a84c' }} />
                    )}
                  </button>
                </div>

                {/* Details */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h3
                      onClick={() => navigate(`/product/${product.id}`)}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        color: '#f5efe6',
                        margin: '0 0 6px 0',
                        cursor: 'pointer',
                        lineHeight: 1.3,
                      }}
                    >
                      {product.name}
                    </h3>

                    <p style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                      {shortDesc}
                    </p>

                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#c9a84c', marginBottom: '18px' }}>
                      ₹{product.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/product/${product.id}`)}
                      style={{
                        width: '40px',
                        height: '38px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid rgba(201, 168, 76, 0.4)',
                        color: '#c9a84c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="View Product Details"
                    >
                      <Eye size={16} />
                    </button>

                    <Button
                      variant="gold"
                      size="sm"
                      fullWidth
                      disabled={!inStock || processingId === product.id}
                      onClick={(e) => handleAddToCart(product, e)}
                    >
                      {processingId === product.id ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          <ShoppingBag size={14} /> {inStock ? 'Add to Cart' : 'OUT OF STOCK'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        paddingTop: '85px',
        minHeight: '80vh',
        background: 'var(--gradient-hero)',
      }}
    >
      <div className="container">{content}</div>
    </motion.div>
  );
};

export default WishlistPage;
