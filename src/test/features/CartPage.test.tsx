import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CartPage } from '../../features/cart/CartPage';

// Mock useApp
const mockUseApp = vi.fn();
vi.mock('../../app/providers', () => ({
  useApp: () => mockUseApp(),
}));

// Mock cartService
vi.mock('../../services/cartService', () => ({
  cartService: {
    getAvailableCoupons: vi.fn().mockResolvedValue([]),
    validateCoupon: vi.fn().mockResolvedValue({ valid: false }),
  },
}));

describe('CartPage Product Redirection', () => {
  const sampleCartItem = {
    product: {
      id: 'prod-truffle-dark',
      name: 'Dark Truffle Noir',
      price: 750,
      weight: '250g',
      category: 'Truffles',
      image: '/images/truffle.jpg',
    },
    quantity: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cart item image and title as links to the product detail page for a guest', () => {
    mockUseApp.mockReturnValue({
      cart: [sampleCartItem],
      updateCartQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      role: 'guest',
      storeConfig: { free_shipping_min_order: 500, standard_shipping_charge: 50, gst_rate: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/product/:id" element={<div data-testid="product-detail-page">Product Details Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify title is rendered
    const titleElement = screen.getByText('Dark Truffle Noir');
    expect(titleElement).toBeInTheDocument();

    // Check that title link points to /product/prod-truffle-dark
    const titleLink = screen.getByRole('heading', { level: 3, name: 'Dark Truffle Noir' }).closest('a');
    expect(titleLink).toHaveAttribute('href', '/product/prod-truffle-dark');

    // Check that image link points to /product/prod-truffle-dark
    const imageLink = screen.getByLabelText('View details for Dark Truffle Noir');
    expect(imageLink).toHaveAttribute('href', '/product/prod-truffle-dark');
  });

  it('navigates to the specific product page when customer clicks on the item title', () => {
    mockUseApp.mockReturnValue({
      cart: [sampleCartItem],
      updateCartQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      role: 'customer',
      storeConfig: { free_shipping_min_order: 500, standard_shipping_charge: 50, gst_rate: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/product/:id" element={<div data-testid="product-detail-page">Product Details Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const titleElement = screen.getByText('Dark Truffle Noir');
    fireEvent.click(titleElement);

    // Should redirect to product detail page
    expect(screen.getByTestId('product-detail-page')).toBeInTheDocument();
  });

  it('navigates to the specific product page when guest clicks on the item image', () => {
    mockUseApp.mockReturnValue({
      cart: [sampleCartItem],
      updateCartQuantity: vi.fn(),
      removeFromCart: vi.fn(),
      role: 'guest',
      storeConfig: { free_shipping_min_order: 500, standard_shipping_charge: 50, gst_rate: 0 },
    });

    render(
      <MemoryRouter initialEntries={['/cart']}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/product/:id" element={<div data-testid="product-detail-page">Product Details Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const imageLink = screen.getByLabelText('View details for Dark Truffle Noir');
    fireEvent.click(imageLink);

    // Should redirect to product detail page
    expect(screen.getByTestId('product-detail-page')).toBeInTheDocument();
  });
});
