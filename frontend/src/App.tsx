import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { LinksPage } from './pages/LinksPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminTenantsPage } from './pages/admin/AdminTenantsPage';
import { AdminTenantDetailPage } from './pages/admin/AdminTenantDetailPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminLinksPage } from './pages/admin/AdminLinksPage';

// ── Route guards ─────────────────────────────────────────────────────────────

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '100px' }}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '100px' }}>Loading…</div>;
  }

  if (isAuthenticated) {
    // Super admins land on /admin, everyone else on /
    return <Navigate to={user?.role === 'SUPER_ADMIN' ? '/admin' : '/'} replace />;
  }

  return <>{children}</>;
};

/** Allows only SUPER_ADMIN users. Authenticated non-admins are redirected to /. */
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <div style={{ color: 'var(--muted-fg)', textAlign: 'center', padding: '100px' }}>Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// ── App ───────────────────────────────────────────────────────────────────────

export function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />

          {/* Protected Tenant Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<LinksPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
          </Route>

          {/* Platform Admin Routes (SUPER_ADMIN only) */}
          <Route
            path="/admin"
            element={
              <SuperAdminRoute>
                <AdminLayout />
              </SuperAdminRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="tenants" element={<AdminTenantsPage />} />
            <Route path="tenants/:id" element={<AdminTenantDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="links" element={<AdminLinksPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
