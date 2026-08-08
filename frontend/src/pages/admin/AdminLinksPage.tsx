import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Search, ExternalLink } from 'lucide-react';

interface AdminLink {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  clickCount: number;
  tenant: { id: string; name: string; slug: string };
  createdBy: { email: string };
}

interface Meta { total: number; page: number; limit: number; totalPages: number; }
interface Tenant { id: string; name: string; slug: string; }

export const AdminLinksPage: React.FC = () => {
  const [links, setLinks] = useState<AdminLink[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/tenants', { params: { limit: 100 } }).then(({ data }) => {
      setTenants(data.data);
    }).catch(() => {});
  }, []);

  const fetchLinks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/links', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          tenantId: tenantFilter || undefined,
        },
      });
      setLinks(data.data);
      setMeta(data.meta);
    } catch { /* handled */ } finally { setIsLoading(false); }
  }, [page, search, tenantFilter]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  const getStatusBadge = (link: AdminLink) => {
    const expired = link.expiresAt && new Date(link.expiresAt) <= new Date();
    if (expired) return <Badge variant="expired">Expired</Badge>;
    if (!link.isActive) return <Badge variant="inactive">Inactive</Badge>;
    return <Badge variant="active">Active</Badge>;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Platform Administration"
        title="Links"
        subtitle={`${meta.total.toLocaleString()} short links across all tenants.`}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} strokeWidth={1.5} style={{ color: 'var(--muted-fg)', flexShrink: 0 }} />
          <input
            id="search-links-admin"
            type="search"
            placeholder="Search by short code, URL, or title…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search links"
          />
        </div>

        <select
          id="filter-links-tenant"
          value={tenantFilter}
          onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
          aria-label="Filter by tenant"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            color: 'var(--fg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            padding: '0 12px',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '160px',
          }}
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderTop: 'none' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', gap: '12px', color: 'var(--muted-fg)' }}>
            <Spinner size={18} />
            <span className="font-mono" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</span>
          </div>
        ) : links.length === 0 ? (
          <EmptyState label="No links found" title="Try a different filter" />
        ) : (
          <table className="data-table" aria-label="Platform links">
            <thead>
              <tr>
                <th scope="col">Short Link</th>
                <th scope="col">Destination</th>
                <th scope="col">Tenant</th>
                <th scope="col">Owner</th>
                <th scope="col">Clicks</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--fg)', marginBottom: '2px' }}>{l.title || 'Untitled'}</div>
                    <span className="font-mono" style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>/{l.shortCode}</span>
                  </td>
                  <td style={{ maxWidth: '220px' }}>
                    <a
                      href={l.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--muted-fg)',
                        textDecoration: 'none',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.originalUrl}</span>
                      <ExternalLink size={10} strokeWidth={1.5} style={{ flexShrink: 0 }} aria-hidden="true" />
                    </a>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--fg)' }}>{l.tenant.name}</div>
                    <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>{l.tenant.slug}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted-fg)' }}>{l.createdBy.email}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--fg)' }}>{l.clickCount.toLocaleString()}</span>
                  </td>
                  <td>{getStatusBadge(l)}</td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>
                      {new Date(l.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {meta.totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.75rem' }} onClick={() => setPage(page - 1)}>Prev</button>
            <span className="pagination__label">{page} / {meta.totalPages}</span>
            <button disabled={page === meta.totalPages} className="btn-secondary" style={{ padding: '8px 20px', fontSize: '0.75rem' }} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};
