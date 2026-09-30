import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Minus, Plus } from 'lucide-react';
import { Product } from '../../types';
import { useApp } from '../../app/providers';
import { hoverLift } from '../../lib/framer';
import { getImageUrl } from '../../utils/imageUrl';

interface CardProps {
  product: Product;
}

export const Card: React.FC<CardProps> = ({ product }) => {
  const { role, addToCart, updateCartQuantity, removeFromCart, toggleWishlist, wishlist, cart } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const isLiked = wishlist.some((p) => p.id === product.id);
  const cartItem = cart.find((item) => item.product.id === product.id);
  const stockQty = product.stock ?? 0;
  const isOutOfStock = (product.is_available === false) || stockQty <= 0;

  const primaryImg = getImageUrl(product.image);
  const hoverImg = product.hoverImage ? getImageUrl(product.hoverImage) : null;

  const [imgSrc, setImgSrc] = useState(primaryImg);
  const [hasHover, setHasHover] = useState(() => Boolean(hoverImg && hoverImg !== primaryImg));

  React.useEffect(() => {
    const pImg = getImageUrl(product.image);
    const hImg = product.hoverImage ? getImageUrl(product.hoverImage) : null;
    setImgSrc(pImg);
    setHasHover(Boolean(hImg && hImg !== pImg));
  }, [product.image, product.hoverImage]);

  const handleMainImgError = () => {
    const hImg = product.hoverImage ? getImageUrl(product.hoverImage) : null;
    const fallbackUrl = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=600&q=80';
    if (hImg && imgSrc !== hImg) {
      setImgSrc(hImg);
      setHasHover(false);
    } else if (imgSrc !== fallbackUrl) {
      setImgSrc(fallbackUrl);
      setHasHover(false);
    }
  };

  const handleCardClick = () => {
    if (role === 'guest') {
      navigate('/login');
    } else {
      navigate(`/product/${product.id}`);
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (role === 'guest') {
      navigate('/login');
    } else {
      toggleWishlist(product);
    }
  };

  return (
    <motion.div
      variants={hoverLift}
      whileHover="whileHover"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="glass-panel popular-card"
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        border: '1px solid var(--glass-border)',
      }}
    >
      {/* Product Image Container */}
      <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '1.05/1', background: 'radial-gradient(circle at center, rgba(35, 20, 10, 0.45) 0%, rgba(10, 5, 2, 0.85) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', boxSizing: 'border-box' }}>
        <img
          src={imgSrc}
          alt={product.name}
          onError={handleMainImgError}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            objectPosition: 'center center',
            transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease',
            opacity: isHovered && hasHover && !isOutOfStock ? 0 : 1,
            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
            filter: isOutOfStock ? 'brightness(0.7)' : 'none',
          }}
          className="product-card-img-element"
        />
        {hasHover && hoverImg && !isOutOfStock && (
          <img
            src={hoverImg}
            alt={`${product.name} alternate view`}
            onError={() => setHasHover(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              padding: '10px',
              boxSizing: 'border-box',
              transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease',
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'scale(1.06)' : 'scale(1)',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* OUT OF STOCK OVERLAY */}
        {isOutOfStock && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
            }}
          >
            <span
              style={{
                background: 'rgba(217, 83, 79, 0.95)',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                padding: '6px 14px',
                borderRadius: '3px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
              }}
            >
              OUT OF STOCK
            </span>
          </div>
        )}
        
        {/* Overlay Action Buttons */}
        <div
          className="product-card-actions"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 4,
          }}
        >
          <button
            onClick={handleWishlistClick}
            aria-label="Add to Wishlist"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: isLiked ? 'var(--rose-gold)' : 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isLiked ? '#fff' : 'var(--cream)',
              transition: 'background 0.3s, color 0.3s',
            }}
          >
            <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Product Badge */}
        {product.badge && (
          <span
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'var(--gold)',
              color: 'var(--dark-chocolate)',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '4px 10px',
              borderRadius: '2px',
              zIndex: 4,
            }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Product Info */}
      <div
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--gold)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: 'var(--font-body)',
              display: 'block',
              marginBottom: '4px',
            }}
          >
            {product.category} Collection
          </span>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'var(--cream)',
              marginBottom: '4px',
              lineHeight: 1.3,
            }}
          >
            {product.name}
          </h3>
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--grey-light)',
              fontFamily: 'var(--font-elegant)',
              lineHeight: 1.4,
              marginBottom: '10px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.description}
          </p>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--cream)' }}>
                ₹{product.price.toLocaleString()}
              </span>
              {product.originalPrice && (
                <span
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--grey-light)',
                    textDecoration: 'line-through',
                  }}
                >
                  ₹{product.originalPrice.toLocaleString()}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--gold)' }}>★</span>
              <span style={{ color: 'var(--cream)', fontWeight: 600 }}>
                {product.rating ? Number(product.rating).toFixed(1) : '4.8'}
              </span>
            </div>
          </div>

        <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
          {isOutOfStock ? (
            <button
              disabled
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '8px 0',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                cursor: 'not-allowed',
              }}
            >
              <ShoppingBag size={14} />
              OUT OF STOCK
            </button>
          ) : cartItem ? (
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--gold)',
                borderRadius: '4px',
                padding: '4px 8px',
                background: 'rgba(212, 175, 55, 0.1)',
                transition: 'background 0.3s',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (cartItem.quantity <= 1) {
                    removeFromCart(product.id);
                  } else {
                    updateCartQuantity(product.id, cartItem.quantity - 1);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--gold)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={16} />
              </button>
              <span style={{ color: 'var(--cream)', fontWeight: 600, fontSize: '0.9rem' }}>
                {cartItem.quantity}
              </span>
              <button
                disabled={cartItem.quantity >= stockQty}
                onClick={(e) => {
                  e.stopPropagation();
                  if (cartItem.quantity < stockQty) {
                    updateCartQuantity(product.id, cartItem.quantity + 1);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: cartItem.quantity >= stockQty ? 'rgba(255,255,255,0.3)' : 'var(--gold)',
                  cursor: cartItem.quantity >= stockQty ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (role === 'guest') navigate('/login');
                else addToCart(product, 1);
              }}
              style={{
                width: '100%',
                padding: '8px 0',
                background: 'transparent',
                color: 'var(--gold)',
                border: '1px solid var(--gold)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                transition: 'background 0.3s, color 0.3s',
              }}
              className="product-card-cart-btn"
            >
              <ShoppingBag size={14} />
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  </motion.div>
  );
};
