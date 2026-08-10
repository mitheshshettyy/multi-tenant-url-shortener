import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, action }) => (
  <div
    className="page-header"
    style={{
      display: 'flex',
      alignItems: action ? 'flex-start' : undefined,
      justifyContent: action ? 'space-between' : undefined,
    }}
  >
    <div>
      {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__sub">{subtitle}</p>}
    </div>
    {action && <div style={{ flexShrink: 0, paddingTop: '4px' }}>{action}</div>}
  </div>
);
