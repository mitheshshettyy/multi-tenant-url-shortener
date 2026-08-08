import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* ── Left panel: typographic statement ── */}
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
            Short links.<br />
            <span style={{ color: 'var(--border)' }}>Big reach.</span>
          </div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--muted-fg)', maxWidth: '320px', lineHeight: 1.7 }}>
            A multi-tenant URL shortener built for teams that care about analytics, access control, and speed.
          </p>
        </div>

        {/* Bottom decoration */}
        <div
          className="font-mono"
          style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--border)', textTransform: 'uppercase' }}
        >
          Tenant-isolated · JWT secured · Analytics-first
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="auth-layout__right">
        <div className="auth-form animate-fade-in">
          <h1 className="auth-form__title">Welcome back.</h1>
          <p className="auth-form__sub">Sign in to your tenant workspace.</p>

          {/* Error banner */}
          {error && (
            <div className="error-banner" role="alert" style={{ marginBottom: '24px' }}>
              <AlertTriangle size={16} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form__fields" noValidate>
            {/* Email */}
            <div>
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <div className="form-input-icon-wrap">
                <Mail size={15} strokeWidth={1.5} className="form-input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="form-input"
                  placeholder="you@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div className="form-input-icon-wrap">
                <KeyRound size={15} strokeWidth={1.5} className="form-input-icon" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  required
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isSubmitting}
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '8px', height: '48px' }}
            >
              {isSubmitting ? (
                <Spinner size={16} />
              ) : (
                <>
                  Sign In <ArrowRight size={15} strokeWidth={1.5} />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <div className="auth-form__footer">
            <span>New to LinkScope?</span>
            <Link to="/register" className="btn-ghost" style={{ padding: '0' }}>
              Create a workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
