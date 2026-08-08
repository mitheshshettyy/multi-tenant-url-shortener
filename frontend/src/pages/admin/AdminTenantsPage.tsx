import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Plus, Search, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  userCount: number;
  linkCount: number;
  clickCount: number;
}

interface Meta { total: number; page: number; limit: number; totalPages: number; }

export const AdminTenantsPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({ tenantName: '', tenantSlug: '', adminEmail: '', adminPassword: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/admin/tenants', {
        params: { page, limit: 10, search: search || undefined },
      });
      setTenants(data.data);
      setMeta(data.meta);
    } catch { /* handled */ } finally { setIsLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);
    try {
      await api.post('/admin/tenants', form);
      setIsCreateOpen(false);
      setForm({ tenantName: '', tenantSlug: '', adminEmail: '', adminPassword: '' });
      setPage(1);
      fetchTenants();
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create tenant');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/tenants/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchTenants();
    } catch { /* handled */ } finally { setIsDeleting(false); }
  };

  const setSlug = (val: string) =>
    setForm((f) => ({ ...f, tenantSlug: val.toLowerCase().replace(/[^a-z0-9-]/g, '') }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Platform Administration"
        title="Tenants"
        subtitle="All registered tenants across the platform."
        action={
          <button id="btn-create-tenant" className="btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} strokeWidth={1.5} /> Add Tenant
          </button>
        }
      />

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: '2px' }}>
        <Search size={16} strokeWidth={1.5} style={{ color: 'var(--muted-fg)', flexShrink: 0 }} />
        <input
          id="search-tenants"
          type="search"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          aria-label="Search tenants"
        />
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--border)', borderTop: 'none' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', gap: '12px', color: 'var(--muted-fg)' }}>
            <Spinner size={18} />
            <span className="font-mono" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loading</span>
          </div>
        ) : tenants.length === 0 ? (
          <EmptyState label="No tenants found" title="Create the first tenant" />
        ) : (
          <table className="data-table" aria-label="Tenants">
            <thead>
              <tr>
                <th scope="col">Tenant</th>
                <th scope="col">Slug</th>
                <th scope="col">Users</th>
                <th scope="col">Links</th>
                <th scope="col">Clicks</th>
                <th scope="col">Created</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--fg)' }}>{t.name}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>{t.slug}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--fg)' }}>{t.userCount}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--fg)' }}>{t.linkCount}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.8125rem', color: 'var(--fg)' }}>{t.clickCount.toLocaleString()}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Link
                        to={`/admin/tenants/${t.id}`}
                        className="btn-icon"
                        title="View tenant details"
                        aria-label={`View ${t.name}`}
                      >
                        <Eye size={16} strokeWidth={1.5} />
                      </Link>
                      <button
                        className="btn-danger"
                        onClick={() => setDeleteTarget(t)}
                        title="Delete tenant"
                        aria-label={`Delete ${t.name}`}
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </button>
                    </div>
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

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setCreateError(null); }} title="Add Tenant">
        {createError && (
          <div className="error-banner" role="alert" style={{ marginBottom: '20px' }}>
            <AlertTriangle size={15} strokeWidth={1.5} style={{ flexShrink: 0, color: 'var(--accent)' }} />
            <span>{createError}</span>
          </div>
        )}
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} noValidate>
          <div>
            <label className="form-label" htmlFor="ct-name">Tenant Name</label>
            <input id="ct-name" type="text" required className="form-input" placeholder="Acme Corp" value={form.tenantName} onChange={(e) => setForm((f) => ({ ...f, tenantName: e.target.value }))} />
          </div>
          <div>
            <label className="form-label" htmlFor="ct-slug">Tenant Slug</label>
            <input id="ct-slug" type="text" required className="form-input" placeholder="acme-corp" value={form.tenantSlug} onChange={(e) => setSlug(e.target.value)} />
            <p className="form-hint">Lowercase letters, numbers and hyphens only.</p>
          </div>
          <div>
            <label className="form-label" htmlFor="ct-email">Admin Email</label>
            <input id="ct-email" type="email" required className="form-input" placeholder="admin@acme.com" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} />
          </div>
          <div>
            <label className="form-label" htmlFor="ct-password">Admin Password</label>
            <input id="ct-password" type="password" required minLength={8} className="form-input" placeholder="Min. 8 characters" value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', height: '44px', fontSize: '0.8rem' }} onClick={() => setIsCreateOpen(false)}>Cancel</button>
            <button id="btn-create-tenant-submit" type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1, justifyContent: 'center', height: '44px' }}>
              {isSubmitting ? <Spinner size={16} /> : 'Create Tenant'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Tenant">
        <p style={{ color: 'var(--muted-fg)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '8px' }}>
          You are about to permanently delete tenant{' '}
          <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{deleteTarget?.name}</span>{' '}
          (<span className="font-mono" style={{ color: 'var(--accent)' }}>{deleteTarget?.slug}</span>).
        </p>
        <p style={{ color: 'var(--muted-fg)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '24px' }}>
          This will permanently remove all <strong style={{ color: 'var(--fg)' }}>{deleteTarget?.userCount} users</strong>,{' '}
          <strong style={{ color: 'var(--fg)' }}>{deleteTarget?.linkCount} links</strong>, and all associated click analytics. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', height: '44px', fontSize: '0.8rem' }} onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button
            id="btn-delete-tenant-confirm"
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="btn-secondary"
            style={{ flex: 1, justifyContent: 'center', height: '44px', fontSize: '0.8rem', borderColor: 'var(--accent)', color: 'var(--accent)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-fg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
          >
            {isDeleting ? <Spinner size={16} /> : 'Delete Tenant'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
