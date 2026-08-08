import React from 'react';

interface EmptyStateProps {
  title?: string;
  label?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Nothing here yet',
  label = 'No data',
}) => (
  <div className="empty-state">
    <p className="empty-state__label">{label}</p>
    <p className="empty-state__title">{title}</p>
  </div>
);
