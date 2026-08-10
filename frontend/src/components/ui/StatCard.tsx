import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  /** Single-character or short string displayed as ghost backdrop */
  ghost?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, ghost }) => (
  <div className="stat-card">
    <div className="stat-card__accent-bar" aria-hidden="true" />
    <p className="stat-card__label">{label}</p>
    <p className="stat-card__value">{value}</p>
    {ghost && (
      <span className="stat-card__ghost" aria-hidden="true">
        {ghost}
      </span>
    )}
  </div>
);
