import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet, Link } from 'react-router-dom';
import { Link2, BarChart3, LogOut, Shield, ShieldCheck } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__wordmark">
            LINK<span>SCOPE</span>
          </div>
          <div className="sidebar__tagline">Multi-tenant URL platform</div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" aria-label="Dashboard navigation">
          <NavLink
            to="/"
            end
            id="nav-links"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <Link2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Short Links
          </NavLink>

          <NavLink
            to="/analytics"
            id="nav-analytics"
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <BarChart3 size={16} strokeWidth={1.5} aria-hidden="true" />
            Analytics
          </NavLink>

          {/* Platform admin link — visible only to SUPER_ADMIN */}
          {user?.role === 'SUPER_ADMIN' && (
            <Link
              to="/admin"
              id="nav-admin"
              className="sidebar__nav-item"
              style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '16px' }}
            >
              <ShieldCheck size={16} strokeWidth={1.5} aria-hidden="true" />
              Platform Admin
            </Link>
          )}
        </nav>

        {/* User + Logout */}
        <div className="sidebar__footer">
          <div
            style={{ marginBottom: '4px' }}
            aria-label={`Logged in as ${user?.email}`}
          >
            <div className="sidebar__user-email">{user?.email}</div>
            <div
              className="sidebar__user-role"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {user?.role === 'TENANT_ADMIN' ? (
                <>
                  <Shield size={10} style={{ color: 'var(--accent)' }} aria-hidden="true" />
                  <Badge variant="role">Admin</Badge>
                </>
              ) : (
                <Badge variant="role">Member</Badge>
              )}
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={handleLogout}
            className="btn-ghost"
            style={{ marginTop: '12px', width: '100%', justifyContent: 'flex-start' }}
            aria-label="Log out of LinkScope"
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
