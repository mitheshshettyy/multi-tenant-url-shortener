import React from 'react';

interface BadgeProps {
  variant: 'active' | 'inactive' | 'expired' | 'role';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children }) => {
  const cls = {
    active:   'badge badge-active',
    inactive: 'badge badge-inactive',
    expired:  'badge badge-expired',
    role:     'badge badge-role',
  }[variant];

  return <span className={cls}>{children}</span>;
};
