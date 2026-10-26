import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../app/providers';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  /** The wrapped route component */
  children: React.ReactNode;
  /** Minimum required role(s). Order: customer < admin < superadmin */
  allowedRoles: UserRole[];
  /** Where to redirect unauthenticated users (default: /login) */
  redirectTo?: string;
}

/**
 * ProtectedRoute — enforces authentication and role-based access control.
 *
 * Usage:
 *   <Route path="/dashboard" element={
 *     <ProtectedRoute allowedRoles={['customer', 'admin', 'superadmin']}>
 *       <CustomerDashboard />
 *     </ProtectedRoute>
 *   } />
 *
 * Behavior:
 *   - Guest (unauthenticated) → redirects to /login, preserving attempted path in location state
 *   - Wrong role → redirects to / (home)
 *   - isAuthLoading → renders null while checking token (prevents flash of wrong content)
 *   - Authenticated + correct role → renders children
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/login',
}) => {
  const { role, isAuthLoading } = useApp();
  const location = useLocation();

  // While the app is rehydrating auth state (checking stored token), render nothing
  // This prevents a flash of the login page for users with valid stored tokens
  if (isAuthLoading) {
    return null;
  }

  // Guest → redirect to login, preserving the attempted route for post-login redirect
  if (role === 'guest') {
    return (
      <Navigate
        to={redirectTo}
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  // Authenticated but wrong role → redirect to home
  const userRoleStr = String(role);
  const normalizedUserRole = userRoleStr === 'super_admin' ? 'superadmin' : userRoleStr === 'delivery_person' ? 'delivery_boy' : userRoleStr;
  const isAllowed = allowedRoles.some((r) => {
    const rStr = String(r);
    const normalizedR = rStr === 'super_admin' ? 'superadmin' : rStr === 'delivery_person' ? 'delivery_boy' : rStr;
    return rStr === userRoleStr || normalizedR === normalizedUserRole;
  });

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
