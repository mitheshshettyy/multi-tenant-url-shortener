import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X, Check } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO string e.g. "2026-08-25T17:00:00.000Z" or ""
  onChange: (isoValue: string) => void;
  id?: string;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, id }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsed current selected date or fallback
  const parsedDate = value ? new Date(value) : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  // Current view year & month for calendar navigation
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (isValidDate) return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Selected date components
  const [selectedDay, setSelectedDay] = useState<number | null>(() => (isValidDate ? parsedDate.getDate() : null));
  const [selectedHour12, setSelectedHour12] = useState<number>(() => {
    if (!isValidDate) return 12;
    const h = parsedDate.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  });
  const [selectedMinute, setSelectedMinute] = useState<number>(() => (isValidDate ? parsedDate.getMinutes() : 0));
  const [selectedAmpm, setSelectedAmpm] = useState<'AM' | 'PM'>(() => {
    if (!isValidDate) return 'PM';
    return parsedDate.getHours() >= 12 ? 'PM' : 'AM';
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
        setSelectedDay(d.getDate());
        const h = d.getHours();
        setSelectedHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
        setSelectedMinute(d.getMinutes());
        setSelectedAmpm(h >= 12 ? 'PM' : 'AM');
      }
    }
  }, [value]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close popover on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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

  // Build target Date object from current selections
  const buildTargetDate = useCallback(
    (dayNum: number, h12: number, min: number, ampm: 'AM' | 'PM') => {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const h24 = get24Hour(h12, ampm);
      return new Date(year, month, dayNum, h24, min, 0, 0);
    },
    [viewDate],
  );

  // Handle Month Navigation
  const prevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calendar Day Click
  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    setValidationError(null);

    const target = buildTargetDate(day, selectedHour12, selectedMinute, selectedAmpm);
    if (target <= new Date()) {
      setValidationError('Expiration date & time must be in the future.');
    } else {
      setValidationError(null);
    }
  };

  // Confirm and Apply Selection
  const handleApply = () => {
    if (!selectedDay) {
      setValidationError('Please select a date from the calendar.');
      return;
    }

    const target = buildTargetDate(selectedDay, selectedHour12, selectedMinute, selectedAmpm);
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
    setSelectedDay(null);
    setValidationError(null);
    setIsOpen(false);
  };

  // Format display text for input button
  const getDisplayText = () => {
    if (!value || !isValidDate) return null;
    return parsedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' • ' + parsedDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Calendar calculations
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isCurrentMonthView = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
  const todayDateNum = today.getDate();

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* ── Field Trigger ── */}
      <button
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
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
          {value && isValidDate ? (
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {getDisplayText()}
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
            animation: 'modalScaleUp 150ms var(--ease-crisp)',
          }}
        >
          {/* Month & Year Navigation Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="font-display" style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
              {monthName}
            </span>
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
            {/* Blank leading slots for month start offset */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`blank-${idx}`} style={{ height: '32px' }} />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;

              // Check if date is in the past
              const checkDate = new Date(viewYear, viewMonth, dayNum, 23, 59, 59);
              const isPast = checkDate < today;

              const isSelected =
                selectedDay === dayNum &&
                isValidDate &&
                parsedDate.getFullYear() === viewYear &&
                parsedDate.getMonth() === viewMonth;

              const isToday = isCurrentMonthView && dayNum === todayDateNum;

              return (
                <button
                  key={dayNum}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(dayNum)}
                  style={{
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    fontWeight: isSelected ? 700 : isToday ? 600 : 400,
                    background: isSelected ? 'var(--accent)' : 'transparent',
                    color: isSelected ? '#0A0A0A' : isPast ? '#404040' : 'var(--fg)',
                    border: isToday && !isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                    cursor: isPast ? 'not-allowed' : 'pointer',
                    transition: 'all 120ms ease',
                    opacity: isPast ? 0.35 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isPast && !isSelected) {
                      e.currentTarget.style.background = 'var(--muted)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPast && !isSelected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
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
                value={selectedHour12}
                onChange={(e) => {
                  const h = parseInt(e.target.value, 10);
                  setSelectedHour12(h);
                  if (selectedDay) {
                    const target = buildTargetDate(selectedDay, h, selectedMinute, selectedAmpm);
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
                value={selectedMinute}
                onChange={(e) => {
                  const m = parseInt(e.target.value, 10);
                  setSelectedMinute(m);
                  if (selectedDay) {
                    const target = buildTargetDate(selectedDay, selectedHour12, m, selectedAmpm);
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
                      setSelectedAmpm(ap);
                      if (selectedDay) {
                        const target = buildTargetDate(selectedDay, selectedHour12, selectedMinute, ap);
                        setValidationError(target <= new Date() ? 'Expiration date & time must be in the future.' : null);
                      }
                    }}
                    className="font-mono"
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: selectedAmpm === ap ? 700 : 500,
                      background: selectedAmpm === ap ? 'var(--card-bg)' : 'transparent',
                      color: selectedAmpm === ap ? 'var(--fg)' : 'var(--muted-fg)',
                      border: selectedAmpm === ap ? '1px solid var(--border)' : '1px solid transparent',
                      padding: '0 10px',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
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
