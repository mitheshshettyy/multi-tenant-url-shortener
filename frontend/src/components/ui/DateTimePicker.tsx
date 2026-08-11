import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X, Check } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO string e.g. "2026-08-25T17:00:00.000Z" or ""
  onChange: (isoValue: string) => void;
  id?: string;
}

interface DraftState {
  year: number;
  month: number;
  day: number | null;
  hour12: number;
  minute: number;
  ampm: 'AM' | 'PM';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsed external date
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // View state (calendar navigation)
  const [viewDate, setViewDate] = useState<{ year: number; month: number }>(() => {
    if (parsedValue) {
      return { year: parsedValue.getFullYear(), month: parsedValue.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Draft state (uncommitted user selection in popover)
  const [draft, setDraft] = useState<DraftState>(() => {
    if (parsedValue) {
      const h = parsedValue.getHours();
      return {
        year: parsedValue.getFullYear(),
        month: parsedValue.getMonth(),
        day: parsedValue.getDate(),
        hour12: h === 0 ? 12 : h > 12 ? h - 12 : h,
        minute: parsedValue.getMinutes(),
        ampm: h >= 12 ? 'PM' : 'AM',
      };
    }
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: null,
      hour12: 12,
      minute: 0,
      ampm: 'PM',
    };
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync draft & view state when popover opens or when external `value` changes
  useEffect(() => {
    if (parsedValue) {
      const h = parsedValue.getHours();
      const newDraft: DraftState = {
        year: parsedValue.getFullYear(),
        month: parsedValue.getMonth(),
        day: parsedValue.getDate(),
        hour12: h === 0 ? 12 : h > 12 ? h - 12 : h,
        minute: parsedValue.getMinutes(),
        ampm: h >= 12 ? 'PM' : 'AM',
      };
      setDraft(newDraft);
      setViewDate({ year: newDraft.year, month: newDraft.month });
    } else {
      const now = new Date();
      setDraft({
        year: now.getFullYear(),
        month: now.getMonth(),
        day: null,
        hour12: 12,
        minute: 0,
        ampm: 'PM',
      });
      setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    }
    setValidationError(null);
  }, [value, parsedValue, isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close popover on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Convert 12h + AM/PM to 24h
  const get24Hour = (h12: number, ampm: 'AM' | 'PM') => {
    if (ampm === 'PM' && h12 < 12) return h12 + 12;
    if (ampm === 'AM' && h12 === 12) return 0;
    return h12;
  };

  // Build target Date object from draft components
  const buildTargetDate = useCallback((y: number, m: number, d: number, h12: number, min: number, ampm: 'AM' | 'PM') => {
    const h24 = get24Hour(h12, ampm);
    return new Date(y, m, d, h24, min, 0, 0);
  }, []);

  // Month Navigation
  const prevMonth = () => {
    setViewDate((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { ...prev, month: prev.month - 1 }
    );
  };

  const nextMonth = () => {
    setViewDate((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { ...prev, month: prev.month + 1 }
    );
  };

  // Year options for dropdown (current year to current year + 10)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = currentYear; y <= currentYear + 10; y++) {
      years.push(y);
    }
    return years;
  }, []);

  // Memoized Grid Calculation
  const gridData = useMemo(() => {
    const { year, month } = viewDate;
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    const days = [];
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const checkDate = new Date(year, month, dayNum, 23, 59, 59);
      const isPast = checkDate < today;
      const isToday = todayYear === year && todayMonth === month && todayDay === dayNum;
      const isSelected = draft.day === dayNum && draft.year === year && draft.month === month;
      const ariaLabel = `${MONTH_NAMES[month]} ${dayNum}, ${year}`;

      days.push({
        dayNum,
        isPast,
        isToday,
        isSelected,
        ariaLabel,
      });
    }

    return { firstDayOfWeek, days };
  }, [viewDate, draft.day, draft.year, draft.month]);

  // Calendar Day Click
  const handleSelectDay = (dayNum: number) => {
    const newDraft: DraftState = {
      ...draft,
      year: viewDate.year,
      month: viewDate.month,
      day: dayNum,
    };
    setDraft(newDraft);

    const target = buildTargetDate(viewDate.year, viewDate.month, dayNum, draft.hour12, draft.minute, draft.ampm);
    if (target <= new Date()) {
      setValidationError('Expiration date & time must be in the future.');
    } else {
      setValidationError(null);
    }
  };

  // Confirm and Apply Selection
  const handleApply = () => {
    if (!draft.day) {
      setValidationError('Please select a date from the calendar.');
      return;
    }

    const target = buildTargetDate(draft.year, draft.month, draft.day, draft.hour12, draft.minute, draft.ampm);
    if (target <= new Date()) {
      setValidationError('Expiration date & time must be in the future.');
      return;
    }

    onChange(target.toISOString());
    setIsOpen(false);
    setValidationError(null);
  };

  // Clear Selection
  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange('');
    const now = new Date();
    setDraft({
      year: now.getFullYear(),
      month: now.getMonth(),
      day: null,
      hour12: 12,
      minute: 0,
      ampm: 'PM',
    });
    setValidationError(null);
    setIsOpen(false);
  };

  // Format display text for trigger button
  const displayText = useMemo(() => {
    if (!value || !parsedValue) return null;
    return parsedValue.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' • ' + parsedValue.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [value, parsedValue]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          textAlign: 'left',
          padding: '0 14px',
          background: 'var(--input-bg)',
          borderColor: isOpen ? 'var(--accent)' : 'var(--border)',
          boxShadow: isOpen ? '0 0 0 1px var(--accent)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <CalendarIcon size={16} strokeWidth={1.5} style={{ color: value ? 'var(--accent)' : 'var(--muted-fg)', flexShrink: 0 }} />
          {value && parsedValue ? (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayText}
            </span>
          ) : (
            <span style={{ fontSize: '0.875rem', color: '#525252' }}>
              Select expiration date/time
            </span>
          )}
        </div>

        {value ? (
          <div
            role="button"
            tabIndex={0}
            aria-label="Clear expiration date"
            onClick={handleClear}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClear(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              color: 'var(--muted-fg)',
              cursor: 'pointer',
              borderRadius: '0',
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted-fg)')}
          >
            <X size={15} strokeWidth={1.5} />
          </div>
        ) : (
          <Clock size={15} strokeWidth={1.5} style={{ color: 'var(--muted-fg)', flexShrink: 0 }} />
        )}
      </button>

      {/* ── Popover Calendar + Time Picker ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Expiration date and time selector"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            maxWidth: '340px',
            background: '#121212',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          {/* Header Navigation Controls (Month & Year Dropdowns + Arrows) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
              {/* Month Select */}
              <select
                aria-label="Select month"
                value={viewDate.month}
                onChange={(e) => setViewDate((prev) => ({ ...prev, month: parseInt(e.target.value, 10) }))}
                className="form-input font-display"
                style={{
                  height: '32px',
                  padding: '0 8px',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: '#1A1A1A',
                  color: 'var(--fg)',
                  borderColor: 'var(--border)',
                  flex: 1,
                }}
              >
                {MONTH_NAMES.map((monthName, idx) => (
                  <option key={monthName} value={idx}>
                    {monthName}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                aria-label="Select year"
                value={viewDate.year}
                onChange={(e) => setViewDate((prev) => ({ ...prev, year: parseInt(e.target.value, 10) }))}
                className="form-input font-mono"
                style={{
                  height: '32px',
                  padding: '0 6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: '#1A1A1A',
                  color: 'var(--fg)',
                  borderColor: 'var(--border)',
                  width: '74px',
                }}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Prev / Next Month Buttons */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn-icon"
                onClick={prevMonth}
                aria-label="Previous month"
                style={{ padding: '6px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}
              >
                <ChevronLeft size={16} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={nextMonth}
                aria-label="Next month"
                style={{ padding: '6px', border: '1px solid var(--border)', background: 'var(--card-bg)' }}
              >
                <ChevronRight size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Day Headers (Sun - Sat) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayStr, idx) => (
              <span key={idx} className="font-mono" style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--muted-fg)', textTransform: 'uppercase' }}>
                {dayStr}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '20px' }}>
            {/* Blank leading slots */}
            {Array.from({ length: gridData.firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} style={{ height: '32px' }} />
            ))}

            {/* Month days */}
            {gridData.days.map(({ dayNum, isPast, isToday, isSelected, ariaLabel }) => {
              const classNames = [
                'calendar-day-btn',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ');

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isPast}
                  aria-label={ariaLabel}
                  aria-selected={isSelected}
                  onClick={() => handleSelectDay(dayNum)}
                  className={classNames}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />

          {/* Time Selector */}
          <div style={{ marginBottom: '16px' }}>
            <div className="form-label" style={{ marginBottom: '8px' }}>
              EXPIRATION TIME
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Hour Select */}
              <select
                aria-label="Hour"
                className="form-input font-mono"
                style={{ height: '38px', padding: '0 10px', fontSize: '0.8125rem', flex: 1, cursor: 'pointer' }}
                value={draft.hour12}
                onChange={(e) => {
                  const h = parseInt(e.target.value, 10);
                  const updatedDraft = { ...draft, hour12: h };
                  setDraft(updatedDraft);
                  if (updatedDraft.day) {
                    const target = buildTargetDate(updatedDraft.year, updatedDraft.month, updatedDraft.day, h, updatedDraft.minute, updatedDraft.ampm);
                    setValidationError(target <= new Date() ? 'Expiration date & time must be in the future.' : null);
                  }
                }}
              >
                {Array.from({ length: 12 }).map((_, i) => {
                  const h = i + 1;
                  return (
                    <option key={h} value={h}>
                      {h < 10 ? `0${h}` : h}
                    </option>
                  );
                })}
              </select>

              <span className="font-mono" style={{ color: 'var(--muted-fg)', fontWeight: 600 }}>:</span>

              {/* Minute Select */}
              <select
                aria-label="Minute"
                className="form-input font-mono"
                style={{ height: '38px', padding: '0 10px', fontSize: '0.8125rem', flex: 1, cursor: 'pointer' }}
                value={draft.minute}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  const updatedDraft = { ...draft, minute: m };
                  setDraft(updatedDraft);
                  if (updatedDraft.day) {
                    const target = buildTargetDate(updatedDraft.year, updatedDraft.month, updatedDraft.day, updatedDraft.hour12, m, updatedDraft.ampm);
                    setValidationError(target <= new Date() ? 'Expiration date & time must be in the future.' : null);
                  }
                }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {m < 10 ? `0${m}` : m}
                  </option>
                ))}
              </select>

              {/* AM / PM Toggle */}
              <div style={{ display: 'inline-flex', border: '1px solid var(--border)', background: 'var(--muted)', height: '38px', padding: '2px', gap: '2px' }}>
                {(['AM', 'PM'] as const).map((ap) => (
                  <button
                    key={ap}
                    type="button"
                    onClick={() => {
                      const updatedDraft = { ...draft, ampm: ap };
                      setDraft(updatedDraft);
                      if (updatedDraft.day) {
                        const target = buildTargetDate(updatedDraft.year, updatedDraft.month, updatedDraft.day, updatedDraft.hour12, updatedDraft.minute, ap);
                        setValidationError(target <= new Date() ? 'Expiration date & time must be in the future.' : null);
                      }
                    }}
                    className="font-mono"
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: draft.ampm === ap ? 700 : 500,
                      background: draft.ampm === ap ? 'var(--card-bg)' : 'transparent',
                      color: draft.ampm === ap ? 'var(--fg)' : 'var(--muted-fg)',
                      border: draft.ampm === ap ? '1px solid var(--border)' : '1px solid transparent',
                      padding: '0 10px',
                      cursor: 'pointer',
                      transition: 'background-color 120ms ease, color 120ms ease',
                    }}
                  >
                    {ap}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Validation note inside popover */}
          {validationError && (
            <div style={{ fontSize: '0.725rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', marginBottom: '14px', lineHeight: 1.4 }}>
              {validationError}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              className="btn-secondary-action"
              style={{ flex: 1, height: '36px', fontSize: '0.75rem' }}
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn-primary-filled"
              style={{ flex: 1, height: '36px', fontSize: '0.75rem' }}
              onClick={handleApply}
            >
              <Check size={14} strokeWidth={2} /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
