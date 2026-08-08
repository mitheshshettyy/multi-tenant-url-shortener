import React from 'react';

interface DividerProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ className = '', style }) => (
  <hr className={`divider ${className}`} style={style} />
);
