import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { BarChart3, MousePointerClick, Link2, CheckCircle2, Globe, Laptop } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [ovRes, clRes, refRes, devRes] = await Promise.all([
        api.get('/analytics/overview'),
        api.get('/analytics/clicks', { params: { days: 30 } }),
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
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Loading analytics...</div>;
  }

  // Calculate SVG line points for Clicks Over Time
  const maxClicks = Math.max(...clicksData.map((d) => d.clicks), 5);
  const width = 800;
  const height = 200;
  const padding = 20;

  const points = clicksData
    .map((d, index) => {
      const x = padding + (index * (width - padding * 2)) / (clicksData.length - 1);
      const y = height - padding - (d.clicks * (height - padding * 2)) / maxClicks;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
          Analytics Overview
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Real-time metrics and visitor insights across all short URLs
        </p>
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        {/* Total Clicks */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <MousePointerClick size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Clicks</div>
            <div style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700 }}>{overview.totalClicks}</div>
          </div>
        </div>

        {/* Total URLs */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
            <Link2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Total links</div>
            <div style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700 }}>{overview.totalUrls}</div>
          </div>
        </div>

        {/* Active URLs */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(52, 211, 153, 0.1)', color: 'var(--text-success)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Active links</div>
            <div style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700 }}>{overview.activeUrls}</div>
          </div>
        </div>
      </div>

      {/* SVG Chart Panel */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <BarChart3 size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600 }}>Clicks Over Time (Last 30 Days)</h3>
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}>
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
            <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

            {/* Sparkline Path */}
            {points && (
              <>
                {/* Area under line */}
                <path
                  d={`M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`}
                  fill="url(#chart-glow)"
                />
                {/* The actual line */}
                <polyline fill="none" stroke="var(--primary)" strokeWidth="3" points={points} />
              </>
            )}

            {/* Gradients */}
            <defs>
              <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Top Referrers */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Globe size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600 }}>Top Referrers</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {referrers.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No referrer data available</div>
            ) : (
              referrers.map((ref) => {
                const percentage = overview.totalClicks > 0 ? (ref.count / overview.totalClicks) * 100 : 0;
                return (
                  <div key={ref.referrer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 500 }}>{ref.referrer}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{ref.count} clicks ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--primary)', borderRadius: '100px' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Devices / User Agents */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Laptop size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600 }}>Browsers & OS</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Browsers */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Top Browsers</div>
              {devices.browsers.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No data</div>
              ) : (
                devices.browsers.map((b) => (
                  <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span>{b.name}</span>
                    <span style={{ fontWeight: 600 }}>{b.count}</span>
                  </div>
                ))
              )}
            </div>

            {/* Operating Systems */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Top Operating Systems</div>
              {devices.os.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No data</div>
              ) : (
                devices.os.map((o) => (
                  <div key={o.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span>{o.name}</span>
                    <span style={{ fontWeight: 600 }}>{o.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
