import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Mail, Lock, Link as LinkIcon, AlertTriangle, ArrowRight } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setTenantSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(tenantName, tenantSlug, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Try a different tenant slug or email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left panel ── */}
      <div className="auth-layout__left" aria-hidden="true">
        {/* Wordmark */}
        <div
          className="font-display"
          style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--fg)' }}
        >
          LINK<span style={{ color: 'var(--accent)' }}>SCOPE</span>
        </div>

        {/* Hero statement */}
        <div>
          <div
            className="font-display"
            style={{
              fontSize: 'clamp(3.5rem, 7vw, 6rem)',
              fontWeight: 900,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: 'var(--fg)',
              marginBottom: '24px',
            }}
          >
            Your team.<br />
            <span style={{ color: 'var(--border)' }}>Your links.</span>
          </div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--muted-fg)', maxWidth: '320px', lineHeight: 1.7 }}>
            Each workspace is fully isolated. Your links, analytics, and members stay completely separate from other tenants.
          </p>
        </div>

        {/* Bottom label */}
        <div
          className="font-mono"
          style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--border)', textTransform: 'uppercase' }}
        >
          Row-level isolation · Role-based access · Real-time analytics
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="auth-layout__right">
        <div className="auth-form animate-fade-in">
          <h1 className="auth-form__title">Create workspace.</h1>
          <p className="auth-form__sub">Register your organization as a new tenant.</p>

          {/* Error banner */}
          {error && (
            <div className="error-banner" role="alert" style={{ marginBottom: '20px' }}>
              <AlertTriangle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form__fields" noValidate>
            {/* Company name */}
            <div>
              <label className="form-label" htmlFor="reg-tenant-name">Company / Org Name</label>
              <div className="form-input-icon-wrap">
                <Building2 size={15} strokeWidth={1.5} className="form-input-icon" aria-hidden="true" />
                <input
                  id="reg-tenant-name"
                  type="text"
                  required
                  className="form-input"
                  placeholder="Acme Corp"
                  autoComplete="organization"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                />
              </div>
            </div>

            {/* Tenant slug */}
            <div>
              <label className="form-label" htmlFor="reg-tenant-slug">Workspace Slug</label>
              <div className="form-input-icon-wrap">
                <LinkIcon size={15} strokeWidth={1.5} className="form-input-icon" aria-hidden="true" />
                <input
                  id="reg-tenant-slug"
                  type="text"
                  required
                  className="form-input"
                  placeholder="acme-corp"
                  autoComplete="off"
                  value={tenantSlug}
                  onChange={handleSlugChange}
                />
              </div>
              <p className="form-hint">Lowercase letters, numbers and hyphens only.</p>
            </div>

            {/* Email */}
            <div>
              <label className="form-label" htmlFor="reg-email">Administrator Email</label>
              <div className="form-input-icon-wrap">
                <Mail size={15} strokeWidth={1.5} className="form-input-icon" aria-hidden="true" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="admin@acme.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="reg-password">Administrator Password</label>
              <div className="form-input-icon-wrap">
                <Lock size={15} strokeWidth={1.5} className="form-input-icon" aria-hidden="true" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={8}
                  className="form-input"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="btn-register-submit"
              type="submit"
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', height: '48px' }}
            >
              {isSubmitting ? (
                <Spinner size={16} />
              ) : (
                <>
                  Create Workspace <ArrowRight size={15} strokeWidth={1.5} />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="auth-form__footer">
            <span>Already have a workspace?</span>
            <Link to="/login" className="btn-ghost" style={{ padding: '0' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
