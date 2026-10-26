import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';

// Mock useApp
const mockUseApp = vi.fn();
vi.mock('../../app/providers', () => ({
  useApp: () => mockUseApp(),
}));

describe('Sidebar Component Role-Based Navigation Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ONLY Super Admin pages and modules when role is "super_admin"', () => {
    mockUseApp.mockReturnValue({
      role: 'super_admin',
      user: { name: 'Super Admin User', email: 'superadmin@chovique.com' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar activeTab="enterprise" setActiveTab={vi.fn()} />
      </MemoryRouter>
    );

    // Super Admin specific items MUST be present
    expect(screen.getByText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Revenue Analytics')).toBeInTheDocument();
    expect(screen.getByText('Sales Analytics')).toBeInTheDocument();
    expect(screen.getByText('Reports & Analytics')).toBeInTheDocument();
    expect(screen.getByText('Admin Management')).toBeInTheDocument();
    expect(screen.getByText('Customer Directory')).toBeInTheDocument();
    expect(screen.getByText('Logistics & Hubs')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Theme Builder')).toBeInTheDocument();
    expect(screen.getByText('Platform Settings')).toBeInTheDocument();

    // Regular Admin items MUST NOT be present in Super Admin sidebar
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Products')).not.toBeInTheDocument();
    expect(screen.queryByText('Categories')).not.toBeInTheDocument();
    expect(screen.queryByText('Order Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Offline Sales')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer Complaints')).not.toBeInTheDocument();
    expect(screen.queryByText('Contact Messages')).not.toBeInTheDocument();
    expect(screen.queryByText('Reviews')).not.toBeInTheDocument();

    // Role header
    expect(screen.getByText(/Super Admin\s+Workspace/i)).toBeInTheDocument();
  });

  it('renders ONLY Admin pages and modules when role is "admin"', () => {
    mockUseApp.mockReturnValue({
      role: 'admin',
      user: { name: 'Admin User', email: 'admin@chovique.com' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Sidebar activeTab="dashboard" setActiveTab={vi.fn()} />
      </MemoryRouter>
    );

    // Admin specific items MUST be present
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Products')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Order Management')).toBeInTheDocument();
    expect(screen.getByText('Offline Sales')).toBeInTheDocument();
    expect(screen.getByText('Customer Complaints')).toBeInTheDocument();
    expect(screen.getByText('Contact Messages')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();

    // Super Admin items MUST NOT be present
    expect(screen.queryByText('Enterprise')).not.toBeInTheDocument();
    expect(screen.queryByText('Platform Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Logs')).not.toBeInTheDocument();
    expect(screen.queryByText('Theme Builder')).not.toBeInTheDocument();
    expect(screen.queryByText('Logistics & Hubs')).not.toBeInTheDocument();

    // Role header
    expect(screen.getByText(/Admin\s+Workspace/i)).toBeInTheDocument();
  });
});
