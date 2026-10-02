import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Grid,
  List,
  Star,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Heart,
  Loader2,
  X,
  Info,
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
  const { addToCart, toggleWishlist, wishlist, role } = useApp();
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

  const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<string>('featured');

  const [isGridView, setIsGridView] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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
        price_min: priceRange.min > 0 ? priceRange.min : undefined,
        price_max: priceRange.max < 50000 ? priceRange.max : undefined,
        min_rating: minRating ?? undefined,
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
  }, [searchQuery, selectedCategory, priceRange.min, priceRange.max, minRating, sortOption, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.max(1, Math.ceil(totalProducts / itemsPerPage));

  // Active filter count calculation
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (searchQuery.trim() !== '') count++;
    if (priceRange.min > 0 || priceRange.max < 50000) count++;
    if (minRating !== null) count++;
    if (sortOption !== 'featured') count++;
    return count;
  }, [selectedCategory, searchQuery, priceRange.min, priceRange.max, minRating, sortOption]);

  // Reset all filters handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setPriceRange({ min: 0, max: 50000 });
    setMinRating(null);
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

  // Top category horizontal chips derived dynamically from Admin category data
  const categoryChips = useMemo(() => {
    return [
      { id: 'all', label: 'All' },
      ...categoriesList
        .filter((c) => c.value !== 'all')
        .map((c) => ({ id: c.value, label: c.label })),
    ];
  }, [categoriesList]);

  // Exact 4 Rating Options (No duplicates)
  const ratingOptions = [4.5, 4.0, 3.5, 3.0];

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="shop-page"
    >
      <div className="container">
        {/* HERO / TITLE HEADER */}
        <div className="shop-hero-header">
          <span className="shop-breadcrumb">
            HOME / SHOP
          </span>
          <h1 className="shop-title">
            Our Chocolate Shop
          </h1>

          {/* Top Search & Category Chips Row (Horizontal inline on desktop) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            {/* Top Search Input */}
            <div className="search-input-wrapper" style={{ width: '280px', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Search chocolates..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ padding: '10px 38px 10px 14px', fontSize: '0.88rem', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201, 168, 76, 0.3)' }}
              />
              <Search size={16} />
            </div>

            {/* Top Category Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-start' }}>
              <span style={{ fontSize: '0.82rem', color: '#c9a84c', fontWeight: 600 }}>
                Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCategory(val);
                  setSearchParams(val === 'all' ? {} : { category: val });
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  color: '#f5efe6',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {categoryChips.map((chip) => (
                  <option key={chip.id} value={chip.id} style={{ background: '#14100d', color: '#f5efe6' }}>
                    {chip.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* MOBILE TOOLBAR BUTTONS (Screens <= 992px) */}
        <div className="show-on-mobile-flex" style={{ display: 'none', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setMobileFiltersOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '4px',
              background: 'rgba(20, 16, 13, 0.9)',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              color: '#f5efe6',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={16} color="#c9a84c" />
            <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
              style={{
                padding: '8px 12px',
                borderRadius: '4px',
                background: 'rgba(20, 16, 13, 0.9)',
                border: '1px solid rgba(201, 168, 76, 0.4)',
                color: '#f5efe6',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              <option value="featured">Default</option>
              <option value="popularity">Popularity</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest</option>
              <option value="rating">Rating</option>
            </select>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setIsGridView(true)}
                style={{ padding: '6px', color: isGridView ? '#c9a84c' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setIsGridView(false)}
                style={{ padding: '6px', color: !isGridView ? '#c9a84c' : 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN SHOP CONTAINER */}
        <div className="shop-container">
          {/* DESKTOP FILTERS SIDEBAR */}
          <aside className="filter-sidebar-desktop">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c9a84c' }}>
                <SlidersHorizontal size={16} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>FILTERS</span>
              </div>
              <button
                onClick={handleResetFilters}
                style={{ fontSize: '0.78rem', color: '#e74c3c', textTransform: 'uppercase', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                RESET ALL
              </button>
            </div>

            {/* Filter: Search */}
            <div className="filter-group">
              <h4 className="filter-group-title">SEARCH</h4>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  placeholder="Search chocolates..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <Search size={16} />
              </div>
            </div>

            {/* Filter: Category */}
            <div className="filter-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                <h4 className="filter-group-title" style={{ margin: 0 }}>CATEGORY</h4>
                <Info size={14} color="#c9a84c" style={{ cursor: 'pointer', opacity: 0.8 }} />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSearchParams(e.target.value === 'all' ? {} : { category: e.target.value });
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  borderRadius: '4px',
                  color: '#f5efe6',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                {categoriesList.map((cat) => (
                  <option key={cat.value} value={cat.value} style={{ background: '#0f0c0a', color: '#f5efe6' }}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter: Price Range */}
            <div className="filter-group">
              <h4 className="filter-group-title">PRICE RANGE</h4>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Min (₹)</span>
                  <input
                    type="number"
                    min={0}
                    max={priceRange.max}
                    value={priceRange.min === 0 ? '' : priceRange.min}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setPriceRange((prev) => ({ ...prev, min: val }));
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(201, 168, 76, 0.3)',
                      borderRadius: '4px',
                      color: '#f5efe6',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.4)', paddingTop: '16px' }}>—</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Max (₹)</span>
                  <input
                    type="number"
                    min={priceRange.min}
                    max={50000}
                    value={priceRange.max === 50000 ? '' : priceRange.max}
                    placeholder="50,000"
                    onChange={(e) => {
                      const val = Math.min(50000, parseInt(e.target.value) || 50000);
                      setPriceRange((prev) => ({ ...prev, max: val }));
                      setCurrentPage(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(201, 168, 76, 0.3)',
                      borderRadius: '4px',
                      color: '#f5efe6',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="50000"
                step="500"
                value={priceRange.max}
                onChange={(e) => {
                  setPriceRange((prev) => ({ ...prev, max: parseInt(e.target.value) }));
                  setCurrentPage(1);
                }}
                style={{ width: '100%', accentColor: '#c9a84c', cursor: 'pointer', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
                <span>Min: ₹{priceRange.min.toLocaleString()}</span>
                <span>Max: ₹{priceRange.max.toLocaleString()}</span>
              </div>
            </div>

            {/* Filter: Rating */}
            <div className="filter-group" style={{ borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
              <div style={{ marginBottom: '8px' }}>
                <h4 className="filter-group-title" style={{ margin: '0 0 4px 0' }}>RATING</h4>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', display: 'block', marginBottom: '10px' }}>Ratings</span>
              </div>
              <div className="rating-filter-list">
                {ratingOptions.map((rating) => {
                  const isSelected = minRating === rating;
                  return (
                    <button
                      key={rating}
                      onClick={() => {
                        setMinRating(isSelected ? null : rating);
                        setCurrentPage(1);
                      }}
                      className={`rating-filter-btn ${isSelected ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.8)',
                        fontSize: '0.88rem',
                        background: isSelected ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(201, 168, 76, 0.4)' : '1px solid transparent',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Star size={15} fill="#c9a84c" color="#c9a84c" />
                      <span>{rating === 4.0 ? '4' : rating === 3.0 ? '3' : rating}★ &amp; above</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* PRODUCT LISTING AREA */}
          <main>
            {/* DESKTOP TOOLBAR */}
            <div className="shop-toolbar hide-on-mobile">
              <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.7)' }}>
                {isLoading ? (
                  <Loader2 size={16} style={{ display: 'inline', animation: 'spin 1s linear infinite', color: '#c9a84c' }} />
                ) : (
                  <>
                    Showing <strong style={{ color: '#f5efe6' }}>{indexOfFirstItem} - {indexOfLastItem}</strong> of{' '}
                    <strong style={{ color: '#f5efe6' }}>{totalProducts}</strong> products
                  </>
                )}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Grid / List view toggle */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => setIsGridView(true)}
                    style={{
                      color: isGridView ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                      padding: '6px',
                      background: 'none',
                      border: isGridView ? '1px solid #c9a84c' : '1px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="Grid View"
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setIsGridView(false)}
                    style={{
                      color: !isGridView ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                      padding: '6px',
                      background: 'none',
                      border: !isGridView ? '1px solid #c9a84c' : '1px solid transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    title="List View"
                  >
                    <List size={18} />
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#f5efe6', fontWeight: 600 }}>Sort by:</span>
                  <select
                    value={sortOption}
                    onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '4px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(201, 168, 76, 0.3)',
                      color: '#f5efe6',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="featured" style={{ background: '#0f0c0a' }}>Default</option>
                    <option value="popularity" style={{ background: '#0f0c0a' }}>Popularity</option>
                    <option value="price_asc" style={{ background: '#0f0c0a' }}>Price: Low to High</option>
                    <option value="price_desc" style={{ background: '#0f0c0a' }}>Price: High to Low</option>
                    <option value="newest" style={{ background: '#0f0c0a' }}>Newest</option>
                    <option value="rating" style={{ background: '#0f0c0a' }}>Rating</option>
                  </select>
                </div>
              </div>
            </div>

            {/* PRODUCT DISPLAY GRID / LIST */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#c9a84c' }}>
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
                <ShoppingBag size={48} color="#c9a84c" style={{ marginBottom: '16px', opacity: 0.8 }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: '#f5efe6', marginBottom: '8px' }}>
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
              /* GRID VIEW (3-col Desktop, 2-col Mobile) */
              <div className="shop-product-grid">
                {products.map((prod) => (
                  <Card key={prod.id} product={prod} />
                ))}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="shop-list-layout" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {products.map((prod) => {
                  const inWish = wishlist.some((p) => p.id === prod.id);
                  const isOut = (prod.is_available === false) || (prod.stock ?? 0) <= 0;
                  return (
                    <motion.div
                      key={prod.id}
                      variants={hoverLift}
                      whileHover="whileHover"
                      className="list-card"
                    >
                      <div style={{ overflow: 'hidden', borderRadius: '6px', position: 'relative' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: '0.72rem', color: '#c9a84c', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 700 }}>
                                {prod.category} Collection
                              </span>
                              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: '#f5efe6', margin: '4px 0 8px 0', fontWeight: 700 }}>
                                {prod.name}
                              </h3>
                            </div>
                            {prod.badge && (
                              <span style={{ background: '#c9a84c', color: '#0f0c0a', fontSize: '0.68rem', padding: '3px 8px', fontWeight: 800, textTransform: 'uppercase', borderRadius: '2px' }}>
                                {prod.badge}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, marginBottom: '14px' }}>
                            {prod.description}
                          </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f5efe6' }}>
                              ₹{prod.price.toLocaleString()}
                            </span>
                            <span style={{ color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                              ★ {prod.rating ? Number(prod.rating).toFixed(1) : '4.8'}
                            </span>
                          </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (role === 'guest') {
                                  navigate('/login', { state: { from: '/shop' } });
                                } else {
                                  toggleWishlist(prod);
                                }
                              }}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                border: '1px solid rgba(201, 168, 76, 0.3)',
                                background: inWish ? '#e74c3c' : 'rgba(20, 16, 13, 0.8)',
                                color: inWish ? '#fff' : '#f5efe6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Heart size={16} fill={inWish ? 'currentColor' : 'none'} />
                            </button>
                            <Button
                              variant="gold"
                              size="sm"
                              disabled={isOut}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (role === 'guest') {
                                  navigate('/login', { state: { from: '/shop' } });
                                } else if (!isOut) {
                                  addToCart(prod, 1);
                                }
                              }}
                            >
                              <ShoppingBag size={14} style={{ marginRight: '6px' }} />
                              {isOut ? 'OUT OF STOCK' : 'Add to Cart'}
                            </Button>
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
                  Showing <strong style={{ color: '#c9a84c' }}>{indexOfFirstItem}</strong> to{' '}
                  <strong style={{ color: '#c9a84c' }}>{indexOfLastItem}</strong> of{' '}
                  <strong style={{ color: '#c9a84c' }}>{totalProducts}</strong> products
                </div>

                {/* Page Number Buttons */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
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
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            background: isActive
                              ? 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)'
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
                      color: '#f5efe6',
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

        {/* MOBILE FILTER BOTTOM SHEET DRAWER */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mobile-filter-drawer-overlay"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="mobile-filter-drawer-content"
              >
                <div className="mobile-filter-drawer-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c9a84c' }}>
                    <SlidersHorizontal size={18} />
                    <span style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase' }}>FILTERS</span>
                  </div>
                  <button onClick={handleResetFilters} style={{ color: '#e74c3c', background: 'none', border: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
                    RESET ALL
                  </button>
                </div>

                <div className="mobile-filter-drawer-body">
                  {/* Category */}
                  <div className="filter-group">
                    <h4 className="filter-group-title">CATEGORY</h4>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#f5efe6', fontSize: '0.9rem' }}
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat.value} value={cat.value} style={{ background: '#0f0c0a', color: '#f5efe6' }}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div className="filter-group">
                    <h4 className="filter-group-title">PRICE RANGE</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Min (₹)</span>
                        <input
                          type="number"
                          min={0}
                          max={priceRange.max}
                          value={priceRange.min === 0 ? '' : priceRange.min}
                          placeholder="0"
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            setPriceRange((prev) => ({ ...prev, min: val }));
                            setCurrentPage(1);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            borderRadius: '4px',
                            color: '#f5efe6',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.4)', paddingTop: '16px' }}>—</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '4px' }}>Max (₹)</span>
                        <input
                          type="number"
                          min={priceRange.min}
                          max={50000}
                          value={priceRange.max === 50000 ? '' : priceRange.max}
                          placeholder="50,000"
                          onChange={(e) => {
                            const val = Math.min(50000, parseInt(e.target.value) || 50000);
                            setPriceRange((prev) => ({ ...prev, max: val }));
                            setCurrentPage(1);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: 'rgba(0,0,0,0.4)',
                            border: '1px solid rgba(201, 168, 76, 0.3)',
                            borderRadius: '4px',
                            color: '#f5efe6',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50000"
                      step="500"
                      value={priceRange.max}
                      onChange={(e) => {
                        setPriceRange((prev) => ({ ...prev, max: parseInt(e.target.value) }));
                        setCurrentPage(1);
                      }}
                      style={{ width: '100%', accentColor: '#c9a84c', cursor: 'pointer', marginBottom: '8px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      <span>Min: ₹{priceRange.min.toLocaleString()}</span>
                      <span>Max: ₹{priceRange.max.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="filter-group">
                    <h4 className="filter-group-title">RATING</h4>
                    <div className="rating-filter-list">
                      {ratingOptions.map((rating) => {
                        const isSelected = minRating === rating;
                        return (
                          <button
                            key={rating}
                            onClick={() => {
                              setMinRating(isSelected ? null : rating);
                              setCurrentPage(1);
                            }}
                            className={`rating-filter-btn ${isSelected ? 'active' : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.8)',
                              fontSize: '0.88rem',
                              background: isSelected ? 'rgba(201, 168, 76, 0.15)' : 'transparent',
                              border: isSelected ? '1px solid rgba(201, 168, 76, 0.4)' : '1px solid transparent',
                              borderRadius: '4px',
                              padding: '6px 10px',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <Star size={14} fill="#c9a84c" color="#c9a84c" />
                            <span>{rating === 4.0 ? '4' : rating === 3.0 ? '3' : rating}★ &amp; above</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mobile-filter-drawer-footer">
                  <Button variant="secondary" fullWidth onClick={() => { handleResetFilters(); setMobileFiltersOpen(false); }}>
                    RESET ALL
                  </Button>
                  <Button variant="gold" fullWidth onClick={() => setMobileFiltersOpen(false)} glow>
                    APPLY FILTERS {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ShopPage;
