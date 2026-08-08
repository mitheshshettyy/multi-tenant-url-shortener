import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import {
  Plus,
  Search,
  ExternalLink,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight,
  Clipboard,
  Check,
  AlertTriangle,
  X
} from 'lucide-react';

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copied indicator state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchUrls = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/urls', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
        },
      });
      setUrls(data.data);
      setTotalPages(data.meta.totalPages);
    } catch (err) {
      console.error('Failed to load links', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);
    try {
      await api.post('/urls', {
        originalUrl,
        customCode: customCode || undefined,
        title: title || undefined,
        expiresAt: expiresAt || undefined,
      });
      setIsModalOpen(false);
      // Reset form
      setOriginalUrl('');
      setCustomCode('');
      setTitle('');
      setExpiresAt('');
      setPage(1);
      fetchUrls();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create short link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/urls/${id}`, { isActive: !currentStatus });
      setUrls(urls.map((u) => (u.id === id ? { ...u, isActive: !currentStatus } : u)));
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this short link?')) return;
    try {
      await api.delete(`/urls/${id}`);
      fetchUrls();
    } catch (err) {
      console.error('Failed to delete link', err);
    }
  };

  const copyToClipboard = (code: string) => {
    const fullUrl = `${import.meta.env.VITE_SHORT_LINK_BASE_URL || window.location.origin}/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getStatusBadge = (url: Url) => {
    const now = new Date();
    const expired = url.expiresAt && new Date(url.expiresAt) <= now;

    if (expired) {
      return (
        <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '100px', background: 'rgba(248, 113, 113, 0.1)', color: 'var(--text-error)', border: '1px solid rgba(248, 113, 113, 0.15)', fontWeight: 600 }}>
          Expired
        </span>
      );
    }
    if (!url.isActive) {
      return (
        <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '100px', background: 'rgba(156, 163, 175, 0.1)', color: 'var(--text-muted)', border: '1px solid rgba(156, 163, 175, 0.15)', fontWeight: 600 }}>
          Inactive
        </span>
      );
    }
    return (
      <span style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '100px', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--text-success)', border: '1px solid rgba(52, 211, 153, 0.15)', fontWeight: 600 }}>
        Active
      </span>
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Short Links
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Manage and distribute your tenant's short URLs
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Create Short Link
        </button>
      </div>

      {/* Search Filter */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '6px 14px', gap: '10px' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search by title, short code or original URL..."
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', width: '100%', outline: 'none', padding: '8px 0' }}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Links List */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(255, 255, 255, 0.02)' }}>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Short Link</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Destination</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</th>
              <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading links...
                </td>
              </tr>
            ) : urls.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No short links found.
                </td>
              </tr>
            ) : (
              urls.map((url) => {
                return (
                  <tr key={url.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                        {url.title || 'Untitled Link'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '13px' }}>
                          /{url.shortCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(url.shortCode)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                          title="Copy Link"
                        >
                          {copiedCode === url.shortCode ? <Check size={14} style={{ color: 'var(--text-success)' }} /> : <Clipboard size={14} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={url.originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {url.originalUrl} <ExternalLink size={12} />
                      </a>
                    </td>
                    <td style={{ padding: '16px 24px' }}>{getStatusBadge(url)}</td>
                    <td style={{ padding: '16px 24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(url.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          onClick={() => handleToggleActive(url.id, url.isActive)}
                          style={{ background: 'transparent', border: 'none', color: url.isActive ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                          title={url.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {url.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                        </button>
                        <button
                          onClick={() => handleDelete(url.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-error)', cursor: 'pointer', padding: '4px', display: 'flex' }}
                          title="Delete Link"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <button
              disabled={page === 1}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              className="btn-secondary"
              style={{ padding: '8px 16px' }}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '32px', position: 'relative' }}>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'Outfit', fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              Create Short Link
            </h2>

            {modalError && (
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '8px', padding: '12px', color: 'var(--text-error)', fontSize: '13px', marginBottom: '20px' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Destination URL
                </label>
                <input
                  type="url"
                  required
                  className="form-input"
                  placeholder="https://example.com/very-long-path"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Link Title (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="My campaign URL"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Custom Code (Optional)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. promo2026"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Expiration Date (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
                  <input
                    type="datetime-local"
                    className="form-input"
                    style={{ paddingLeft: '42px' }}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 1 }}>
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
