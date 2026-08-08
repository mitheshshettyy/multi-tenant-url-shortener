import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { Link2, BarChart3, LogOut, Shield, User as UserIcon } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* Sidebar */}
      <aside className="glass-panel" style={{
        width: '260px',
        borderRadius: '0 20px 20px 0',
        borderLeft: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        zIndex: 10
      }}>
        {/* Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', marginBottom: '32px' }}>
          <div style={{
            background: 'var(--primary)',
            padding: '8px',
            borderRadius: '8px',
            boxShadow: '0 0 10px var(--primary-glow)',
            color: '#fff',
            display: 'flex'
          }}>
            <Link2 size={20} />
          </div>
          <span style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            LinkScope
          </span>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              color: isActive ? '#fff' : 'var(--text-muted)',
              background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              border: isActive ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'
            })}
          >
            <Link2 size={18} />
            <span>Short Links</span>
          </NavLink>

          <NavLink
            to="/analytics"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              color: isActive ? '#fff' : 'var(--text-muted)',
              background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.2s ease',
              border: isActive ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'
            })}
          >
            <BarChart3 size={18} />
            <span>Analytics</span>
          </NavLink>
        </nav>

        {/* User Card & Logout */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '8px',
              borderRadius: '50%',
              display: 'flex',
              color: 'var(--text-muted)'
            }}>
              <UserIcon size={16} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user?.role === 'TENANT_ADMIN' ? (
                  <>
                    <Shield size={10} style={{ color: 'var(--primary)' }} /> Admin
                  </>
                ) : 'Member'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'var(--text-error)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248, 113, 113, 0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flexGrow: 1, marginLeft: '260px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{
          height: '70px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '0 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          background: 'rgba(11, 12, 21, 0.2)',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            fontSize: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            color: 'var(--primary)',
            padding: '6px 12px',
            borderRadius: '100px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Tenant Environment Active
          </div>
        </header>

        <main style={{ flexGrow: 1, padding: '40px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
