import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Users2,
  Link2,
  LogOut,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Admin Sidebar ── */}
      <aside className="sidebar" style={{ borderRight: '1px solid var(--accent)' }}>
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__wordmark">
            LINK<span>SCOPE</span>
          </div>
          <div
            className="font-mono"
            style={{
              fontSize: '0.6rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ShieldCheck size={10} aria-hidden="true" />
            Platform Admin
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" aria-label="Admin navigation">
          <NavLink
            to="/admin"
            end
            id="admin-nav-overview"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <LayoutDashboard size={16} strokeWidth={1.5} aria-hidden="true" />
            Overview
          </NavLink>

          <NavLink
            to="/admin/analytics"
            id="admin-nav-analytics"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <BarChart3 size={16} strokeWidth={1.5} aria-hidden="true" />
            Analytics
          </NavLink>

          <NavLink
            to="/admin/tenants"
            id="admin-nav-tenants"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <Building2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Tenants
          </NavLink>

          <NavLink
            to="/admin/users"
            id="admin-nav-users"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <Users2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Users
          </NavLink>

          <NavLink
            to="/admin/links"
            id="admin-nav-links"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <Link2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Links
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="sidebar__footer">
          <Link
            to="/"
            className="btn-ghost"
            style={{ marginBottom: '12px', width: '100%', justifyContent: 'flex-start' }}
            aria-label="Back to tenant dashboard"
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
            Tenant Dashboard
          </Link>

          <div style={{ marginBottom: '4px' }}>
            <div className="sidebar__user-email">{user?.email}</div>
            <div
              className="font-mono"
              style={{ fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: '2px' }}
            >
              Super Admin
            </div>
          </div>

          <button
            id="btn-admin-logout"
            onClick={handleLogout}
            className="btn-ghost"
            style={{ marginTop: '12px', width: '100%', justifyContent: 'flex-start' }}
            aria-label="Log out"
          >
            <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content" role="main">
        <Outlet />
      </main>
    </div>
  );
};
