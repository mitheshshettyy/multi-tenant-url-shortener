import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { Globe, Monitor, Smartphone, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Spinner';
import { Divider } from '../components/ui/Divider';

interface Overview {
  totalClicks: number;
  totalUrls: number;
  activeUrls: number;
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

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<Overview>({ totalClicks: 0, totalUrls: 0, activeUrls: 0 });
  const [clicksData, setClicksData] = useState<ClickDay[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [devices, setDevices] = useState<BrowserOS>({ browsers: [], os: [] });
  const [days, setDays] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);

  // Hover state for interactive chart tooltip
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const fetchAnalytics = useCallback(async (selectedDays: number) => {
    setIsLoading(true);
    try {
      const [ovRes, clRes, refRes, devRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/clicks', { params: { days: selectedDays } }),
        api.get('/analytics/referrers', { params: { limit: 5 } }),
        api.get('/analytics/user-agents', { params: { limit: 5 } }),
      ]);
      setOverview(ovRes.data);
      setClicksData(clRes.data);
      setReferrers(refRes.data);
      setDevices(devRes.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  const handleDaysChange = (newDays: number) => {
    setDays(newDays);
    setHoverIndex(null);
  };

  // Calculations for average clicks and SVG chart
  const avgClicksPerLink =
    overview.totalUrls > 0 ? (overview.totalClicks / overview.totalUrls).toFixed(1) : '0.0';

  const totalClicksInPeriod = clicksData.reduce((acc, curr) => acc + curr.clicks, 0);

  const width = 1000;
  const height = 220;
  const padX = 24;
  const padY = 24;

  const maxClicks = Math.max(...clicksData.map((d) => d.clicks), 1);

  const points = clicksData.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(clicksData.length - 1, 1);
    const y = height - padY - (d.clicks * (height - padY * 2)) / maxClicks;
    return { x, y, date: d.date, clicks: d.clicks };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '12px', color: 'var(--muted-fg)' }}>
        <Spinner size={20} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Loading analytics
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ── Header ── */}
      <PageHeader
        eyebrow="Tenant Overview"
        title="Analytics"
        subtitle="Aggregate metrics and visitor data across all short URLs in your workspace."
      />

      {/* ── 4 Stat cards grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          label="Total Clicks"
          value={overview.totalClicks.toLocaleString()}
          subtitle="Lifetime link clicks"
          ghost="C"
        />
        <StatCard
          label="Total Links"
          value={overview.totalUrls.toLocaleString()}
          subtitle="Created short codes"
          ghost="L"
        />
        <StatCard
          label="Active Links"
          value={overview.activeUrls.toLocaleString()}
          subtitle="Currently redirecting"
          ghost="A"
        />
        <StatCard
          label="Avg. Clicks / Link"
          value={avgClicksPerLink}
          subtitle="Workspace average"
          ghost="%"
        />
      </div>

      {/* ── Sparkline chart ── */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          marginBottom: '32px',
          padding: '24px 28px',
        }}
      >
        {/* Chart header & filter pills */}
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
              style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}
            >
              Performance Trend
            </p>
            <h2
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}
            >
              Clicks Over Time
            </h2>
          </div>

          <div className="analytics-filter-group" role="group" aria-label="Time period selector">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={`analytics-filter-pill${days === d ? ' analytics-filter-pill--active' : ''}`}
                onClick={() => handleDaysChange(d)}
              >
                Last {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* SVG chart or empty state */}
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          {totalClicksInPeriod === 0 ? (
            <div className="analytics-empty-card" style={{ height: '220px', margin: '12px 0' }}>
              <div className="analytics-empty-card__icon">
                <TrendingUp size={18} strokeWidth={1.5} />
              </div>
              <h3 className="analytics-empty-card__title">No clicks recorded yet</h3>
              <p className="analytics-empty-card__sub">
                Share your short links across campaigns to start collecting real-time visitor traffic data.
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
                  <linearGradient id="chart-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
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

                {/* Area fill */}
                {points.length > 1 && (
                  <path
                    d={`M ${points[0].x},${height - padY} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${height - padY} Z`}
                    fill="url(#chart-fade)"
                  />
                )}

                {/* Line */}
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

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={hoverIndex === idx ? 6 : 3}
                      fill={hoverIndex === idx ? '#FFFFFF' : 'var(--accent)'}
                      stroke="var(--bg)"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'r 150ms ease' }}
                      onMouseEnter={() => setHoverIndex(idx)}
                      onMouseLeave={() => setHoverIndex(null)}
                    />
                  </g>
                ))}

                {/* Vertical crosshair line on hover */}
                {hoverIndex !== null && (
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

              {/* Hover Tooltip Overlay */}
              {hoverIndex !== null && (
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
                    {new Date(points[hoverIndex].date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="font-display" style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--fg)' }}>
                    {points[hoverIndex].clicks.toLocaleString()} clicks
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Date range labels */}
        {clicksData.length > 1 && totalClicksInPeriod > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              marginTop: '16px',
            }}
          >
            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', letterSpacing: '0.05em' }}>
              {new Date(clicksData[0].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', letterSpacing: '0.05em' }}>
              {new Date(clicksData[clicksData.length - 1].date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* ── Breakdown grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '24px',
        }}
      >
        {/* Top Referrers */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '24px 28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
            Traffic Sources
          </p>
          <h3 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)', marginBottom: '20px' }}>
            Top Referrers
          </h3>

          {referrers.length === 0 ? (
            <div className="analytics-empty-card">
              <div className="analytics-empty-card__icon">
                <Globe size={18} strokeWidth={1.5} />
              </div>
              <h4 className="analytics-empty-card__title">No referral traffic yet</h4>
              <p className="analytics-empty-card__sub">
                Referral sources will appear here once visitors start clicking your short links.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {referrers.map((ref) => {
                const pct = overview.totalClicks > 0 ? (ref.count / overview.totalClicks) * 100 : 0;
                return (
                  <div key={ref.referrer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)' }}>
                        {ref.referrer}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted-fg)', letterSpacing: '0.05em' }}>
                        {ref.count.toLocaleString()} clicks · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${Math.max(pct, 2)}%` }} aria-hidden="true" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visitor Environment */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', padding: '24px 28px' }}>
          <p className="font-mono" style={{ fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '4px' }}>
            Visitor Environment
          </p>
          <h3 className="font-display" style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)', marginBottom: '20px' }}>
            Browsers & OS
          </h3>

          {devices.browsers.length === 0 && devices.os.length === 0 ? (
            <div className="analytics-empty-card">
              <div className="analytics-empty-card__icon">
                <Monitor size={18} strokeWidth={1.5} />
              </div>
              <h4 className="analytics-empty-card__title">No browser or OS data yet</h4>
              <p className="analytics-empty-card__sub">
                Browser and operating system metrics will automatically aggregate after your first link visits.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Browsers */}
              <div>
                <p className="font-mono" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>
                  Top Browsers
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {devices.browsers.map((b) => (
                    <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Monitor size={14} style={{ color: 'var(--muted-fg)' }} />
                        {b.name}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>
                        {b.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Divider />

              {/* OS */}
              <div>
                <p className="font-mono" style={{ fontSize: '0.625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted-fg)', marginBottom: '12px' }}>
                  Top Operating Systems
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {devices.os.map((o) => (
                    <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Smartphone size={14} style={{ color: 'var(--muted-fg)' }} />
                        {o.name}
                      </span>
                      <span className="font-mono" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--fg)' }}>
                        {o.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

