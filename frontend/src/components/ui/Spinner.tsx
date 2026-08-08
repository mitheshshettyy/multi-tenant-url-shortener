import React from 'react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 20, className = '' }) => (
  <span
    className={`spinner ${className}`}
    style={{ width: size, height: size }}
    aria-label="Loading"
    role="status"
  />
);
