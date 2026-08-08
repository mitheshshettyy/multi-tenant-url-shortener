import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Search } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  tenant: { id: string; name: string; slug: string };
}

interface Meta { total: number; page: number; limit: number; totalPages: number; }

interface Tenant { id: string; name: string; slug: string; }

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load tenant list for the filter dropdown
    api.get('/admin/tenants', { params: { limit: 100 } }).then(({ data }) => {
      setTenants(data.data);
    }).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          tenantId: tenantFilter || undefined,
        },
      });
      setUsers(data.data);
      setMeta(data.meta);
    } catch { /* handled */ } finally { setIsLoading(false); }
  }, [page, search, tenantFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Platform Administration"
        title="Users"
        subtitle={`${meta.total.toLocaleString()} users across all tenants.`}
      />

      {/* Filters row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <Search size={16} strokeWidth={1.5} style={{ color: 'var(--muted-fg)', flexShrink: 0 }} />
          <input
            id="search-users"
            type="search"
            placeholder="Search by email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search users"
          />
        </div>

        <select
          id="filter-users-tenant"
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
        ) : users.length === 0 ? (
          <EmptyState label="No users found" title="Try a different filter" />
        ) : (
          <table className="data-table" aria-label="Platform users">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Tenant</th>
                <th scope="col">Role</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--fg)' }}>{u.email}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--fg)' }}>{u.tenant.name}</div>
                    <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>{u.tenant.slug}</div>
                  </td>
                  <td>
                    <Badge variant={u.role === 'TENANT_ADMIN' ? 'role' : 'inactive'}>
                      {u.role === 'TENANT_ADMIN' ? 'Admin' : 'Member'}
                    </Badge>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>
                      {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
