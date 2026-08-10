import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import {
  Plus,
  Search,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clipboard,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { DateTimePicker } from '../components/ui/DateTimePicker';

interface Url {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export const LinksPage: React.FC = () => {
  const [urls, setUrls] = useState<Url[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Url | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy indicator
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchUrls = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/urls', {
        params: { page, limit: 10, search: search || undefined },
      });
      setUrls(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (err) {
      console.error('Failed to load links', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (expiresAt && new Date(expiresAt) <= new Date()) {
      setModalError('Expiration date must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/urls', {
        originalUrl,
        customCode: customCode || undefined,
        title: title || undefined,
        expiresAt: expiresAt || undefined,
      });
      setIsModalOpen(false);
      setOriginalUrl('');
      setCustomCode('');
      setTitle('');
      setExpiresAt('');
      setPage(1);
      fetchUrls();
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setModalError(errorResponse.response?.data?.message || 'Failed to create short link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError(null);
    setOriginalUrl('');
    setCustomCode('');
    setTitle('');
    setExpiresAt('');
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/urls/${id}`, { isActive: !currentStatus });
      setUrls(urls.map((u) => (u.id === id ? { ...u, isActive: !currentStatus } : u)));
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const openDeleteModal = (url: Url) => {
    setDeleteTarget(url);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.delete(`/urls/${deleteTarget.id}`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchUrls();
    } catch (err) {
      console.error('Failed to delete link', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (code: string) => {
    const fullUrl = `${import.meta.env.VITE_SHORT_LINK_BASE_URL || window.location.origin}/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (url: Url) => {
    const expired = url.expiresAt && new Date(url.expiresAt) <= new Date();
    if (expired) return <Badge variant="expired">Expired</Badge>;
    if (!url.isActive) return <Badge variant="inactive">Inactive</Badge>;
    return <Badge variant="active">Active</Badge>;
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Workspace"
        title="Short Links"
        subtitle="Create, manage, and distribute your tenant's URLs."
        action={
          <button
            id="btn-create-link"
            className="btn-primary-filled"
            onClick={() => setIsModalOpen(true)}
            aria-label="Create new short link"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New Link
          </button>
        }
      />

      {/* ── Search ── */}
      <div className="search-bar" style={{ marginBottom: '2px' }}>
        <Search size={16} strokeWidth={1.5} style={{ color: 'var(--muted-fg)', flexShrink: 0 }} aria-hidden="true" />
        <input
          id="search-links"
          type="search"
          placeholder="Search by title, short code, or destination URL…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search short links"
        />
      </div>

      {/* ── Table ── */}
      <div style={{ border: '1px solid var(--border)', borderTop: 'none', background: 'var(--card-bg)' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px', gap: '12px', color: 'var(--muted-fg)' }}>
            <Spinner size={18} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Loading
            </span>
          </div>
        ) : urls.length === 0 ? (
          <EmptyState label="No links found" title="Create your first short link" />
        ) : (
          <table className="data-table" aria-label="Short links">
            <thead>
              <tr>
                <th scope="col">Short Link</th>
                <th scope="col">Destination</th>
                <th scope="col">Status</th>
                <th scope="col">Created</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => (
                <tr key={url.id}>
                  {/* Short link + title */}
                  <td style={{ minWidth: '160px' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        letterSpacing: '-0.01em',
                        color: 'var(--fg)',
                        marginBottom: '4px',
                      }}
                    >
                      {url.title || 'Untitled'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        className="font-mono"
                        style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 500 }}
                      >
                        /{url.shortCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(url.shortCode)}
                        className="btn-icon"
                        style={{ padding: '2px' }}
                        aria-label={copiedCode === url.shortCode ? 'Copied!' : `Copy /${url.shortCode}`}
                        title={copiedCode === url.shortCode ? 'Copied!' : 'Copy short URL'}
                      >
                        {copiedCode === url.shortCode
                          ? <Check size={13} strokeWidth={2} style={{ color: '#34d399' }} />
                          : <Clipboard size={13} strokeWidth={1.5} />
                        }
                      </button>
                    </div>
                  </td>

                  {/* Destination */}
                  <td style={{ maxWidth: '280px' }}>
                    <a
                      href={url.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--muted-fg)',
                        textDecoration: 'none',
                        fontSize: '0.8125rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        transition: 'color 150ms',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-fg)')}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{url.originalUrl}</span>
                      <ExternalLink size={11} strokeWidth={1.5} style={{ flexShrink: 0 }} aria-hidden="true" />
                    </a>
                  </td>

                  {/* Status badge */}
                  <td>{getStatusBadge(url)}</td>

                  {/* Created date */}
                  <td>
                    <span
                      className="font-mono"
                      style={{ fontSize: '0.75rem', color: 'var(--muted-fg)', letterSpacing: '0.02em' }}
                    >
                      {new Date(url.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(url.id, url.isActive)}
                        className="btn-icon"
                        aria-label={url.isActive ? `Deactivate /${url.shortCode}` : `Activate /${url.shortCode}`}
                        title={url.isActive ? 'Deactivate' : 'Activate'}
                        style={{ color: url.isActive ? 'var(--accent)' : 'var(--muted-fg)' }}
                      >
                        {url.isActive
                          ? <ToggleRight size={22} strokeWidth={1.5} />
                          : <ToggleLeft size={22} strokeWidth={1.5} />
                        }
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => openDeleteModal(url)}
                        className="btn-danger"
                        aria-label={`Delete /${url.shortCode}`}
                        title="Delete link"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              id="btn-prev-page"
              disabled={page === 1}
              className="btn-secondary-action"
              style={{ padding: '6px 16px', fontSize: '0.75rem', height: '36px' }}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </button>
            <span className="pagination__label">
              {page} / {totalPages}
            </span>
            <button
              id="btn-next-page"
              disabled={page === totalPages}
              className="btn-secondary-action"
              style={{ padding: '6px 16px', fontSize: '0.75rem', height: '36px' }}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="New Short Link">
        {modalError && (
          <div className="error-banner" role="alert" style={{ marginBottom: '20px' }}>
            <AlertTriangle size={15} strokeWidth={1.5} style={{ flexShrink: 0, color: 'var(--accent)' }} />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>
          <div>
            <label className="form-label" htmlFor="modal-dest-url">DESTINATION URL</label>
            <input
              id="modal-dest-url"
              type="url"
              required
              className="form-input"
              placeholder="https://example.com/very/long/path"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="modal-title">LINK TITLE (OPTIONAL)</label>
            <input
              id="modal-title"
              type="text"
              className="form-input"
              placeholder="My campaign link"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="modal-code">CUSTOM CODE (OPTIONAL)</label>
            <input
              id="modal-code"
              type="text"
              className="form-input font-mono"
              placeholder="e.g. promo2026"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            />
            <p className="form-hint">Lowercase letters and numbers only.</p>
          </div>

          <div>
            <label className="form-label" htmlFor="modal-expires">EXPIRATION DATE (OPTIONAL)</label>
            <DateTimePicker
              id="modal-expires"
              value={expiresAt}
              onChange={(val) => {
                setExpiresAt(val);
                setModalError(null);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn-secondary-action"
              style={{ flex: 1 }}
              onClick={handleCloseModal}
            >
              Cancel
            </button>
            <button
              id="btn-create-submit"
              type="submit"
              disabled={isSubmitting}
              className="btn-primary-filled"
              style={{ flex: 1 }}
            >
              {isSubmitting ? <Spinner size={16} /> : 'Create Link'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
        title="Delete Short Link"
      >
        <p style={{ color: 'var(--fg)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '8px' }}>
          This will permanently delete{' '}
          <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            /{deleteTarget?.shortCode}
          </span>
          {deleteTarget?.title ? ` (${deleteTarget.title})` : ''}.
        </p>
        <p style={{ color: 'var(--muted-fg)', fontSize: '0.8125rem', marginBottom: '24px' }}>
          All recorded click analytics data for this link will also be permanently deleted. This action cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <button
            type="button"
            className="btn-secondary-action"
            style={{ flex: 1 }}
            onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }}
          >
            Cancel
          </button>
          <button
            id="btn-delete-confirm"
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="btn-primary-filled"
            style={{
              flex: 1,
              background: '#DC2626',
              borderColor: '#DC2626',
              color: '#FFFFFF',
            }}
          >
            {isDeleting ? <Spinner size={16} /> : 'Delete Link'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
