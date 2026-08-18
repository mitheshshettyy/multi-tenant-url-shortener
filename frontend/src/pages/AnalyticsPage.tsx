import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { Globe, Monitor, Smartphone, TrendingUp, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Spinner';
import { Divider } from '../components/ui/Divider';

interface Overview {
  totalClicks: number;
  totalUrls: number;
  activeUrls: number;
}

interface UrlSummary {
  id: string;
  shortCode: string;
  originalUrl: string;
  title: string | null;
  isActive?: boolean;
  expiresAt?: string | null;
}

interface ClickDay {
  date: string;
  clicks: number;
}

interface Referrer {
  referrer: string;
  count: number;
}

interface BrowserOS {
  browsers: Array<{ name: string; count: number }>;
  os: Array<{ name: string; count: number }>;
}

interface LinkAnalyticsState {
  loading: boolean;
  error: string | null;
  overview: Overview | null;
  clicks: ClickDay[];
  referrers: Referrer[];
  devices: BrowserOS;
}

const EMPTY_LINK_ANALYTICS: LinkAnalyticsState = {
  loading: true,
  error: null,
  overview: null,
  clicks: [],
  referrers: [],
  devices: { browsers: [], os: [] },
};

const emptyOverview: Overview = {
  totalClicks: 0,
  totalUrls: 0,
  activeUrls: 0,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function AnalyticsChart({
  data,
  days,
  totalClicks,
}: {
  data: ClickDay[];
  days: number;
  totalClicks: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 1000;
  const height = 220;
  const padX = 24;
  const padY = 24;
  const maxClicks = Math.max(...data.map((d) => d.clicks), 1);

  const points = data.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(data.length - 1, 1);
    const y = height - padY - (d.clicks * (height - padY * 2)) / maxClicks;
    return { x, y, date: d.date, clicks: d.clicks };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const totalClicksInPeriod = data.reduce((sum, item) => sum + item.clicks, 0);

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        padding: '24px 28px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <p
            className="font-mono"
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--muted-fg)',
              marginBottom: '4px',
            }}
          >
            Performance Trend
          </p>
          <h3
            className="font-display"
            style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}
          >
            Clicks Over Time
          </h3>
        </div>
        <span className="font-mono" style={{ fontSize: '0.68rem', color: 'var(--muted-fg)' }}>
          Last {days} days · {totalClicksInPeriod.toLocaleString()} clicks
        </span>
      </div>

      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        {totalClicksInPeriod === 0 ? (
          <div className="analytics-empty-card" style={{ height: '180px', margin: '12px 0' }}>
            <div className="analytics-empty-card__icon">
              <TrendingUp size={18} strokeWidth={1.5} />
            </div>
            <h4 className="analytics-empty-card__title">No clicks recorded yet</h4>
            <p className="analytics-empty-card__sub">
              Share this short link to start collecting visitor traffic data.
            </p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <svg
              viewBox={`0 0 ${width} ${height}`}
              style={{ width: '100%', minWidth: '500px', height: 'auto', display: 'block', overflow: 'visible' }}
              role="img"
              aria-label={`Click trend chart for last ${days} days`}
            >
              <defs>
                <linearGradient id="analytics-chart-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75, 1].map((ratio) => {
                const yVal = padY + (1 - ratio) * (height - padY * 2);
                return (
                  <line
                    key={ratio}
                    x1={padX}
                    y1={yVal}
                    x2={width - padX}
                    y2={yVal}
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {points.length > 1 && (
                <path
                  d={`M ${points[0].x},${height - padY} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${height - padY} Z`}
                  fill="url(#analytics-chart-fade)"
                />
              )}

              {polylinePoints && (
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {points.map((point, index) => (
                <g key={`${point.date}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={hoverIndex === index ? 6 : 3}
                    fill={hoverIndex === index ? '#FFFFFF' : 'var(--accent)'}
                    stroke="var(--bg)"
                    strokeWidth="2"
                    style={{ cursor: 'pointer', transition: 'r 150ms ease' }}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              ))}

              {hoverIndex !== null && points[hoverIndex] && (
                <line
                  x1={points[hoverIndex].x}
                  y1={padY}
                  x2={points[hoverIndex].x}
                  y2={height - padY}
                  stroke="var(--accent)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  pointerEvents="none"
                />
              )}
            </svg>

            {hoverIndex !== null && points[hoverIndex] && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: `${(points[hoverIndex].x / width) * 100}%`,
                  transform: 'translateX(-50%)',
                  background: '#1A1A1A',
                  border: '1px solid var(--accent)',
                  padding: '6px 12px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 10,
                }}
              >
                <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
                  {formatDate(points[hoverIndex].date)}
                </div>
                <div className="font-display" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--fg)' }}>
                  {points[hoverIndex].clicks.toLocaleString()} clicks
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {data.length > 1 && totalClicksInPeriod > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid var(--border)',
            marginTop: '16px',
          }}
        >
          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>
            {formatDate(data[0].date)}
          </span>
          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>
            {formatDate(data[data.length - 1].date)}
          </span>
        </div>
      )}
    </div>
  );
}

function LinkAnalyticsWindow({
  link,
  days,
}: {
  link: UrlSummary;
  days: number;
}) {
  const [state, setState] = useState<LinkAnalyticsState>(EMPTY_LINK_ANALYTICS);

  const loadAnalytics = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const [overviewRes, clicksRes, referrersRes, devicesRes] = await Promise.all([
        api.get<Overview>('/analytics/overview', {
          params: { urlId: link.id },
        }),
        api.get<ClickDay[]>('/analytics/clicks', {
          params: { urlId: link.id, days },
        }),
        api.get<Referrer[]>('/analytics/referrers', {
          params: { urlId: link.id, limit: 5 },
        }),
        api.get<BrowserOS>('/analytics/user-agents', {
          params: { urlId: link.id, limit: 5 },
        }),
      ]);

      setState({
        loading: false,
        error: null,
        overview: overviewRes.data,
        clicks: clicksRes.data,
        referrers: referrersRes.data,
        devices: devicesRes.data,
      });
    } catch (error) {
      console.error(`Failed to load analytics for /${link.shortCode}`, error);
      setState((current) => ({
        ...current,
        loading: false,
        error: 'Unable to load analytics for this short link.',
      }));
    }
  }, [days, link.id, link.shortCode]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const overview = state.overview ?? emptyOverview;
  const avgClicks = overview.totalUrls > 0
    ? (overview.totalClicks / overview.totalUrls).toFixed(1)
    : '0.0';

  return (
    <article
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        marginBottom: '32px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            className="font-mono"
            style={{
              fontSize: '0.65rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: '6px',
            }}
          >
            Link Analytics
          </p>
          <h2
            className="font-display"
            style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--fg)', marginBottom: '5px' }}
          >
            /{link.shortCode}
          </h2>
          <p
            style={{
              color: 'var(--muted-fg)',
              fontSize: '0.8125rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '760px',
            }}
            title={link.title || link.originalUrl}
          >
            {link.title || link.originalUrl}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p
            className="font-mono"
            style={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)' }}
          >
            Lifetime Clicks
          </p>
          <p className="font-display" style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--accent)' }}>
            {state.loading && !state.overview ? '—' : overview.totalClicks.toLocaleString()}
          </p>
        </div>
      </div>

      {state.loading && !state.overview ? (
        <div
          style={{
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            color: 'var(--muted-fg)',
          }}
        >
          <Spinner size={20} />
          <span className="font-mono" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Loading analytics for /{link.shortCode}
          </span>
        </div>
      ) : state.error ? (
        <div style={{ padding: '28px' }}>
          <div className="analytics-empty-card" role="alert">
            <div className="analytics-empty-card__icon">
              <TrendingUp size={18} strokeWidth={1.5} />
            </div>
            <h3 className="analytics-empty-card__title">Analytics unavailable</h3>
            <p className="analytics-empty-card__sub">{state.error}</p>
            <button
              type="button"
              className="btn-secondary-action"
              onClick={loadAnalytics}
              style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} strokeWidth={1.5} />
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '24px 28px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <StatCard
              label="Total Clicks"
              value={overview.totalClicks.toLocaleString()}
              subtitle="Lifetime link clicks"
              ghost="C"
            />
            <StatCard
              label="Avg. Clicks"
              value={avgClicks}
              subtitle="Average for this link"
              ghost="%"
            />
          </div>

          <AnalyticsChart data={state.clicks} days={days} totalClicks={overview.totalClicks} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            <div style={{ border: '1px solid var(--border)', padding: '24px 28px' }}>
              <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
                Traffic Sources
              </p>
              <h3 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--fg)', marginBottom: '20px' }}>
                Top Referrers
              </h3>

              {state.referrers.length === 0 ? (
                <div className="analytics-empty-card">
                  <div className="analytics-empty-card__icon"><Globe size={18} strokeWidth={1.5} /></div>
                  <h4 className="analytics-empty-card__title">No referral traffic yet</h4>
                  <p className="analytics-empty-card__sub">Referral sources will appear here once visitors start clicking this short link.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {state.referrers.map((ref) => {
                    const pct = overview.totalClicks > 0 ? (ref.count / overview.totalClicks) * 100 : 0;
                    return (
                      <div key={ref.referrer}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', gap: '12px' }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)' }}>{ref.referrer}</span>
                          <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', whiteSpace: 'nowrap' }}>
                            {ref.count.toLocaleString()} clicks · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }} aria-hidden="true" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border)', padding: '24px 28px' }}>
              <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
                Visitor Environment
              </p>
              <h3 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--fg)', marginBottom: '20px' }}>
                Browsers & OS
              </h3>

              {state.devices.browsers.length === 0 && state.devices.os.length === 0 ? (
                <div className="analytics-empty-card">
                  <div className="analytics-empty-card__icon"><Monitor size={18} strokeWidth={1.5} /></div>
                  <h4 className="analytics-empty-card__title">No browser or OS data yet</h4>
                  <p className="analytics-empty-card__sub">Browser and operating system metrics will appear after this link receives visits.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <p className="font-mono" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>
                      Top Browsers
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {state.devices.browsers.map((browser) => (
                        <div key={browser.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Monitor size={14} style={{ color: 'var(--muted-fg)' }} />
                            {browser.name}
                          </span>
                          <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{browser.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Divider />

                  <div>
                    <p className="font-mono" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>
                      Top Operating Systems
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {state.devices.os.map((os) => (
                        <div key={os.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.875rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Smartphone size={14} style={{ color: 'var(--muted-fg)' }} />
                            {os.name}
                          </span>
                          <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>{os.count.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [clicksData, setClicksData] = useState<ClickDay[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [devices, setDevices] = useState<BrowserOS>({ browsers: [], os: [] });
  const [links, setLinks] = useState<UrlSummary[]>([]);
  const [days, setDays] = useState<number>(30);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const fetchWorkspaceAnalytics = useCallback(async (selectedDays: number) => {
    setIsLoadingWorkspace(true);
    setWorkspaceError(null);

    try {
      const [ovRes, clRes, refRes, devRes, urlsRes] = await Promise.all([
        api.get<Overview>('/analytics/overview'),
        api.get<ClickDay[]>('/analytics/clicks', { params: { days: selectedDays } }),
        api.get<Referrer[]>('/analytics/referrers', { params: { limit: 5 } }),
        api.get<BrowserOS>('/analytics/user-agents', { params: { limit: 5 } }),
        api.get('/urls', { params: { page: 1, limit: 100 } }),
      ]);

      setOverview(ovRes.data);
      setClicksData(clRes.data);
      setReferrers(refRes.data);
      setDevices(devRes.data);
      setLinks((urlsRes.data?.data ?? []) as UrlSummary[]);
    } catch (error) {
      console.error('Failed to fetch workspace analytics', error);
      setWorkspaceError('Unable to load workspace analytics.');
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceAnalytics(days);
  }, [days, fetchWorkspaceAnalytics]);

  const avgClicksPerLink = overview.totalUrls > 0
    ? (overview.totalClicks / overview.totalUrls).toFixed(1)
    : '0.0';

  const totalClicksInPeriod = clicksData.reduce((sum, item) => sum + item.clicks, 0);

  const aggregateChart = useMemo(() => {
    const width = 1000;
    const height = 220;
    const padX = 24;
    const padY = 24;
    const maxClicks = Math.max(...clicksData.map((d) => d.clicks), 1);
    const points = clicksData.map((d, i) => ({
      x: padX + (i * (width - padX * 2)) / Math.max(clicksData.length - 1, 1),
      y: height - padY - (d.clicks * (height - padY * 2)) / maxClicks,
      date: d.date,
      clicks: d.clicks,
    }));
    return { width, height, padX, padY, points, polylinePoints: points.map((p) => `${p.x},${p.y}`).join(' ') };
  }, [clicksData]);

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    setHoverIndex(null);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Tenant Overview"
        title="Analytics"
        subtitle="Aggregate metrics and independent analytics for every short link in your workspace."
      />

      {workspaceError && (
        <div className="error-banner" role="alert" style={{ marginBottom: '24px' }}>
          <span>{workspaceError}</span>
          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => fetchWorkspaceAnalytics(days)}
            style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} strokeWidth={1.5} />
            Retry
          </button>
        </div>
      )}

      {/* Workspace-wide aggregate analytics remain at the top. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <StatCard label="Total Clicks" value={overview.totalClicks.toLocaleString()} subtitle="Lifetime link clicks" ghost="C" />
        <StatCard label="Total Links" value={overview.totalUrls.toLocaleString()} subtitle="Created short codes" ghost="L" />
        <StatCard label="Active Links" value={overview.activeUrls.toLocaleString()} subtitle="Currently redirecting" ghost="A" />
        <StatCard label="Avg. Clicks / Link" value={avgClicksPerLink} subtitle="Workspace average" ghost="%" />
      </div>

      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          marginBottom: '40px',
          padding: '24px 28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
              Workspace Performance
            </p>
            <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--fg)' }}>
              Clicks Over Time
            </h2>
          </div>

          <div className="analytics-filter-group" role="group" aria-label="Time period selector">
            {[7, 30, 90].map((period) => (
              <button
                key={period}
                type="button"
                className={`analytics-filter-pill${days === period ? ' analytics-filter-pill--active' : ''}`}
                onClick={() => handleDaysChange(period)}
              >
                Last {period} Days
              </button>
            ))}
          </div>
        </div>

        {isLoadingWorkspace ? (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-fg)' }}>
            <Spinner size={20} />
            <span className="font-mono" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Loading workspace analytics
            </span>
          </div>
        ) : totalClicksInPeriod === 0 ? (
          <div className="analytics-empty-card" style={{ height: '180px' }}>
            <div className="analytics-empty-card__icon"><TrendingUp size={18} strokeWidth={1.5} /></div>
            <h3 className="analytics-empty-card__title">No clicks recorded yet</h3>
            <p className="analytics-empty-card__sub">Share your short links to start collecting workspace traffic data.</p>
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <svg
                viewBox={`0 0 ${aggregateChart.width} ${aggregateChart.height}`}
                style={{ width: '100%', minWidth: '500px', height: 'auto', display: 'block', overflow: 'visible' }}
                role="img"
                aria-label={`Workspace click trend for last ${days} days`}
              >
                <defs>
                  <linearGradient id="workspace-chart-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const yVal = aggregateChart.padY + (1 - ratio) * (aggregateChart.height - aggregateChart.padY * 2);
                  return (
                    <line
                      key={ratio}
                      x1={aggregateChart.padX}
                      y1={yVal}
                      x2={aggregateChart.width - aggregateChart.padX}
                      y2={yVal}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}
                {aggregateChart.points.length > 1 && (
                  <path
                    d={`M ${aggregateChart.points[0].x},${aggregateChart.height - aggregateChart.padY} ${aggregateChart.points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${aggregateChart.points[aggregateChart.points.length - 1].x},${aggregateChart.height - aggregateChart.padY} Z`}
                    fill="url(#workspace-chart-fade)"
                  />
                )}
                {aggregateChart.polylinePoints && (
                  <polyline fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={aggregateChart.polylinePoints} />
                )}
                {aggregateChart.points.map((point, index) => (
                  <circle
                    key={`${point.date}-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={hoverIndex === index ? 6 : 3}
                    fill={hoverIndex === index ? '#FFFFFF' : 'var(--accent)'}
                    stroke="var(--bg)"
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverIndex(index)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                ))}
              </svg>

              {hoverIndex !== null && aggregateChart.points[hoverIndex] && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: `${(aggregateChart.points[hoverIndex].x / aggregateChart.width) * 100}%`,
                    transform: 'translateX(-50%)',
                    background: '#1A1A1A',
                    border: '1px solid var(--accent)',
                    padding: '6px 12px',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    zIndex: 10,
                  }}
                >
                  <div className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--muted-fg)' }}>
                    {formatDate(aggregateChart.points[hoverIndex].date)}
                  </div>
                  <div className="font-display" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--fg)' }}>
                    {aggregateChart.points[hoverIndex].clicks.toLocaleString()} clicks
                  </div>
                </div>
              )}
            </div>

            {clicksData.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
                <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>{formatDate(clicksData[0].date)}</span>
                <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)' }}>{formatDate(clicksData[clicksData.length - 1].date)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '4px' }}>
          Per-Link Analytics
        </p>
        <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--fg)' }}>
          Analytics by Short Link
        </h2>
        <p style={{ color: 'var(--muted-fg)', fontSize: '0.875rem', marginTop: '5px' }}>
          Every window below is isolated to one short link. A failure in one window does not hide the others.
        </p>
      </div>

      {isLoadingWorkspace && links.length === 0 ? (
        <div style={{ minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--muted-fg)', border: '1px solid var(--border)' }}>
          <Spinner size={20} />
          <span className="font-mono" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Loading short links
          </span>
        </div>
      ) : links.length === 0 ? (
        <div className="analytics-empty-card" style={{ minHeight: '220px' }}>
          <div className="analytics-empty-card__icon"><Globe size={18} strokeWidth={1.5} /></div>
          <h3 className="analytics-empty-card__title">No short links yet</h3>
          <p className="analytics-empty-card__sub">Create a short link to see its individual analytics window here.</p>
        </div>
      ) : (
        <div>
          {links.map((link) => (
            <LinkAnalyticsWindow key={link.id} link={link} days={days} />
          ))}
        </div>
      )}
    </div>
  );
};
