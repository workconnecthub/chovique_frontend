import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Heart,
  Loader2,
  X,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import { useApp } from '../../app/providers';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Product } from '../../types';
import { pageTransition, hoverLift } from '../../lib/framer';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { getImageUrl } from '../../utils/imageUrl';

export const ShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, addToCart, updateCartQuantity, removeFromCart, toggleWishlist, wishlist } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Product Data State ---
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // --- Filter states ---
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoriesList, setCategoriesList] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Categories' },
  ]);

  const [sortOption, setSortOption] = useState<string>('featured');
  const [isGridView, setIsGridView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic Category Loading from Backend
  useEffect(() => {
    categoryService.getCategories()
      .then((cats) => {
        setCategoriesList([
          { value: 'all', label: 'All Categories' },
          ...(Array.isArray(cats) ? cats.map((c) => ({ value: c.slug, label: c.name })) : []),
        ]);
      })
      .catch((err) => console.error('Failed to fetch categories:', err));
  }, []);

  // Sync state with URL params on mount / URL change
  useEffect(() => {
    const catParam = searchParams.get('category');
    const searchParam = searchParams.get('search');
    const filterParam = searchParams.get('filter');

    if (catParam) setSelectedCategory(catParam);
    else setSelectedCategory('all');

    if (searchParam) setSearchQuery(searchParam);

    if (filterParam === 'new') setSortOption('newest');
    else if (filterParam === 'premium') setSortOption('rating');
    else if (filterParam === 'popular') setSortOption('popularity');

    setCurrentPage(1);
  }, [searchParams]);

  // Map sort option to API parameter
  const getApiSortValue = (opt: string) => {
    switch (opt) {
      case 'popularity': return 'popularity';
      case 'price_asc': return 'price_asc';
      case 'price_desc': return 'price_desc';
      case 'newest': return 'newest';
      case 'rating': return 'rating';
      case 'featured':
      default: return 'featured';
    }
  };

  // --- Fetch products from backend ---
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await productService.getProducts({
        search: searchQuery || undefined,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        sort: getApiSortValue(sortOption),
        page: currentPage,
        per_page: itemsPerPage,
      });

      setProducts(result.items || []);
      setTotalProducts(result.total || (result.items || []).length);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, sortOption, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / itemsPerPage));

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return selectedCategory !== 'all' || searchQuery.trim() !== '' || sortOption !== 'featured';
  }, [selectedCategory, searchQuery, sortOption]);

  // Reset all filters handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortOption('featured');
    setSearchParams({});
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const indexOfFirstItem = totalProducts > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalProducts);

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="shop-page"
    >
      <div className="container">
        {/* HERO / TITLE & SEARCH HEADER */}
        <div className="shop-hero-header">
          <div className="shop-hero-content">
            <div className="shop-title-area">
              <span className="shop-breadcrumb">
                HOME / SHOP
              </span>
              <h1 className="shop-title">
                Our Chocolate Shop
              </h1>
            </div>

            {/* Top Search Bar */}
            <div className="shop-search-wrapper">
              <input
                type="text"
                placeholder="Search chocolates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="shop-search-input"
                aria-label="Search chocolates"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="shop-search-clear-btn"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              ) : (
                <Search size={16} className="shop-search-icon" />
              )}
            </div>
          </div>
        </div>

        {/* TOP CONTROLS TOOLBAR (Category Filter, Sorting, Count, View Mode) */}
        <div className="shop-toolbar">
          {/* Controls: Category Dropdown & Sort Dropdown */}
          <div className="shop-toolbar-filters">
            {/* Category Dropdown */}
            <div className="shop-control-group">
              <label htmlFor="shop-category-select" className="shop-control-label">Category:</label>
              <div className="shop-select-container">
                <select
                  id="shop-category-select"
                  value={selectedCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCategory(val);
                    setSearchParams(val === 'all' ? {} : { category: val });
                    setCurrentPage(1);
                  }}
                  className="shop-select-field"
                  aria-label="Filter by category"
                >
                  {categoriesList.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="shop-control-group">
              <label htmlFor="shop-sort-select" className="shop-control-label">Sort by:</label>
              <div className="shop-select-container">
                <select
                  id="shop-sort-select"
                  value={sortOption}
                  onChange={(e) => {
                    setSortOption(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="shop-select-field"
                  aria-label="Sort chocolates"
                >
                  <option value="featured">Default</option>
                  <option value="popularity">Popularity</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>
          </div>

          {/* Meta & View Mode Row */}
          <div className="shop-toolbar-meta">
            {/* Products Count Indicator & Reset Button */}
            <div className="shop-meta-left">
              <span className="shop-product-count">
                {isLoading ? (
                  <Loader2 size={15} className="shop-spinner" />
                ) : (
                  <>
                    Showing <strong>{indexOfFirstItem} - {indexOfLastItem}</strong> of{' '}
                    <strong>{totalProducts}</strong> products
                  </>
                )}
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="shop-reset-btn"
                  title="Reset all filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Grid / List view toggle */}
            <div className="shop-view-toggles" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setIsGridView(true)}
                className={`shop-view-btn ${isGridView ? 'active' : ''}`}
                title="Grid View"
                aria-label="Grid View"
              >
                <Grid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsGridView(false)}
                className={`shop-view-btn ${!isGridView ? 'active' : ''}`}
                title="List View"
                aria-label="List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN PRODUCT LISTING AREA */}
        <div className="shop-container">
          <main style={{ width: '100%' }}>
            {/* PRODUCT DISPLAY GRID / LIST */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--gold)' }}>
                <Loader2 size={42} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Loading chocolates...</p>
              </div>
            ) : products.length === 0 ? (
              /* EMPTY STATE */
              <div
                style={{
                  padding: '60px 30px',
                  textAlign: 'center',
                  background: 'rgba(18, 14, 11, 0.85)',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                  borderRadius: '12px',
                }}
              >
                <ShoppingBag size={48} color="var(--gold)" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--cream)', marginBottom: '8px' }}>
                  No chocolates found
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px auto' }}>
                  Try adjusting your active filters or search keywords to find what you are looking for.
                </p>
                <Button variant="gold" onClick={handleResetFilters} glow>
                  RESET FILTERS
                </Button>
              </div>
            ) : isGridView ? (
              /* GRID VIEW */
              <div className="shop-product-grid">
                {products.map((prod) => (
                  <Card key={prod.id} product={prod} />
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="shop-list-layout" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {products.map((prod) => {
                  const inWish = wishlist.some((p) => p.id === prod.id);
                  const stockQty = prod.stock ?? 0;
                  const isOut = (prod.is_available === false) || stockQty <= 0;
                  const cartItem = cart.find((item) => item.product.id === prod.id);
                  return (
                    <motion.div
                      key={prod.id}
                      variants={hoverLift}
                      whileHover="whileHover"
                      className="list-card"
                      onClick={() => navigate(`/product/${prod.id}`)}
                    >
                      {/* Left: Product Image */}
                      <div className="list-card-media">
                        <img
                          src={getImageUrl(prod.image)}
                          alt={prod.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isOut ? 'brightness(0.7)' : 'none' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1548907040-4d42b52115ca?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        {isOut && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0,0,0,0.55)',
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
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                padding: '4px 10px',
                                borderRadius: '3px',
                              }}
                            >
                              OUT OF STOCK
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Product Info & Actions */}
                      <div className="list-card-body">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                              <span className="list-card-collection">
                                {prod.category} Collection
                              </span>
                              <h3 className="list-card-title">
                                {prod.name}
                              </h3>
                            </div>
                            {prod.badge && (
                              <span className="list-card-badge">
                                {prod.badge}
                              </span>
                            )}
                          </div>
                          <p className="list-card-desc">
                            {prod.description}
                          </p>
                        </div>

                        <div className="list-card-footer">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="list-price">
                              ₹{prod.price.toLocaleString()}
                            </span>
                            <span className="list-rating">
                              ★ {prod.rating ? Number(prod.rating).toFixed(1) : '4.8'}
                            </span>
                          </div>

                          <div className="list-card-actions">
                            <button
                              type="button"
                              className="list-card-wish-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleWishlist(prod);
                              }}
                              style={{
                                background: inWish ? '#e74c3c' : 'rgba(20, 16, 13, 0.8)',
                                color: inWish ? '#fff' : '#f5efe6',
                              }}
                              title="Wishlist"
                              aria-label="Wishlist"
                            >
                              <Heart size={16} fill={inWish ? 'currentColor' : 'none'} />
                            </button>

                            {isOut ? (
                              <button
                                disabled
                                onClick={(e) => e.stopPropagation()}
                                className="list-card-cart-btn"
                                style={{
                                  background: 'rgba(255, 255, 255, 0.05)',
                                  color: 'rgba(255, 255, 255, 0.4)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  cursor: 'not-allowed',
                                  boxShadow: 'none',
                                }}
                              >
                                <ShoppingBag size={14} />
                                <span>OUT OF STOCK</span>
                              </button>
                            ) : cartItem ? (
                              <div
                                className="list-card-qty-stepper"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cartItem.quantity <= 1) {
                                      removeFromCart(prod.id);
                                    } else {
                                      updateCartQuantity(prod.id, cartItem.quantity - 1);
                                    }
                                  }}
                                  title="Decrease quantity"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={14} />
                                </button>
                                <span>{cartItem.quantity}</span>
                                <button
                                  type="button"
                                  disabled={cartItem.quantity >= stockQty}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (cartItem.quantity < stockQty) {
                                      updateCartQuantity(prod.id, cartItem.quantity + 1);
                                    }
                                  }}
                                  title="Increase quantity"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="list-card-cart-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(prod, 1);
                                }}
                              >
                                <ShoppingBag size={14} />
                                <span>Add to Cart</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            {!isLoading && totalProducts > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '40px',
                  paddingTop: '24px',
                  borderTop: '1px solid rgba(201, 168, 76, 0.2)',
                }}
              >
                {/* Showing Count Info */}
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                  Showing <strong style={{ color: 'var(--gold)' }}>{indexOfFirstItem}</strong> to{' '}
                  <strong style={{ color: 'var(--gold)' }}>{indexOfLastItem}</strong> of{' '}
                  <strong style={{ color: 'var(--gold)' }}>{totalProducts}</strong> products
                </div>

                {/* Page Number Buttons */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(201, 168, 76, 0.3)',
                        background: currentPage === 1 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(20, 16, 13, 0.9)',
                        color: currentPage === 1 ? 'rgba(255,255,255,0.25)' : '#f5efe6',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ChevronLeft size={16} />
                      Prev
                    </button>

                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNum = idx + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          type="button"
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            background: isActive
                              ? 'var(--gradient-gold)'
                              : 'rgba(20, 16, 13, 0.9)',
                            color: isActive ? '#0f0c0a' : '#f5efe6',
                            border: isActive ? 'none' : '1px solid rgba(201, 168, 76, 0.3)',
                            boxShadow: isActive ? '0 4px 12px rgba(201, 168, 76, 0.35)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(201, 168, 76, 0.3)',
                        background: currentPage === totalPages ? 'rgba(255, 255, 255, 0.02)' : 'rgba(20, 16, 13, 0.9)',
                        color: currentPage === totalPages ? 'rgba(255,255,255,0.25)' : '#f5efe6',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}

                {/* Per Page Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  <span>Show per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '6px',
                      background: 'rgba(20, 16, 13, 0.9)',
                      border: '1px solid rgba(201, 168, 76, 0.4)',
                      color: 'var(--cream)',
                      fontSize: '0.82rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={36}>36</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </motion.div>
  );
};

export default ShopPage;
