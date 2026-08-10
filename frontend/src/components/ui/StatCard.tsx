import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  /** Single-character or short string displayed as ghost backdrop */
  ghost?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, subtitle, ghost }) => (
  <div className="stat-card">
    <div className="stat-card__accent-bar" aria-hidden="true" />
    <p className="stat-card__label">{label}</p>
    <p className="stat-card__value">{value}</p>
    {subtitle && (
      <p style={{ fontSize: '0.75rem', color: 'var(--muted-fg)', marginTop: '8px', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>
        {subtitle}
      </p>
    )}
    {ghost && (
      <span className="stat-card__ghost" aria-hidden="true">
        {ghost}
      </span>
    )}
  </div>
);

