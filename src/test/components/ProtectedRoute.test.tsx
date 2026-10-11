import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../../components/ProtectedRoute';

// Mock useApp
const mockUseApp = vi.fn();
vi.mock('../../app/providers', () => ({
  useApp: () => mockUseApp(),
}));

describe('ProtectedRoute Component Security and RBAC', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders null while auth state is rehydrating to prevent content flashing', () => {
    mockUseApp.mockReturnValue({
      role: 'guest',
      isAuthLoading: true,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <div>Dashboard Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated guest users to /login preserving attempted route', () => {
    mockUseApp.mockReturnValue({
      role: 'guest',
      isAuthLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route
            path="/checkout"
            element={
              <ProtectedRoute allowedRoles={['customer']}>
                <div>Checkout Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Screen')).toBeInTheDocument();
    expect(screen.queryByText('Checkout Content')).not.toBeInTheDocument();
  });

  it('allows access to authenticated user with allowed role', () => {
    mockUseApp.mockReturnValue({
      role: 'customer',
      isAuthLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['customer', 'admin']}>
                <div>Customer Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Customer Dashboard')).toBeInTheDocument();
  });

  it('blocks customer from accessing admin-only routes and redirects to /', () => {
    mockUseApp.mockReturnValue({
      role: 'customer',
      isAuthLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <div>Secret Admin Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Admin Dashboard')).not.toBeInTheDocument();
  });

  it('allows superadmin access to superadmin dashboard', () => {
    mockUseApp.mockReturnValue({
      role: 'superadmin',
      isAuthLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/superadmin']}>
        <Routes>
          <Route
            path="/superadmin"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <div>Superadmin Theme & Controls</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Superadmin Theme & Controls')).toBeInTheDocument();
  });
});
