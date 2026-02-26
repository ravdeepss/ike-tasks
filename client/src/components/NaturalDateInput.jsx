import React, { useState, useEffect } from 'react';

// ============================================================
// Natural date parsing
// ============================================================
const DAYS_FULL  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAYS_SHORT = ['sun','mon','tue','wed','thu','fri','sat'];

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtPreview(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function parseNaturalDate(input) {
  if (!input || !input.trim()) return { date: null, preview: '' };

  const s = input.trim().toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Absolute keywords
  if (s === 'today')     return mk(today);
  if (s === 'yesterday') return mk(addDays(today, -1));
  if (['tomorrow', 'tom', 'tmr'].includes(s)) return mk(addDays(today, 1));

  // End of week/month
  if (s === 'eow' || s === 'end of week') {
    const day = today.getDay(); // 0=Sun … 6=Sat
    const toFri = ((5 - day) + 7) % 7 || 7;
    return mk(addDays(today, toFri));
  }
  if (s === 'eom' || s === 'end of month') {
    return mk(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  }

  // Next/this week/month
  if (s === 'next week')  return mk(addDays(today, 7));
  if (s === 'next month') return mk(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()));

  // +Nd / +Nw / +Nm shorthand
  const shortM = s.match(/^\+(\d+)([dwm])$/);
  if (shortM) {
    const n = parseInt(shortM[1], 10);
    const u = shortM[2];
    if (u === 'd') return mk(addDays(today, n));
    if (u === 'w') return mk(addDays(today, n * 7));
    return mk(new Date(today.getFullYear(), today.getMonth() + n, today.getDate()));
  }

  // "in N days/weeks/months"
  const inM = s.match(/^in (\d+) (day|days|week|weeks|month|months)$/);
  if (inM) {
    const n = parseInt(inM[1], 10);
    const u = inM[2];
    if (u.startsWith('d')) return mk(addDays(today, n));
    if (u.startsWith('w')) return mk(addDays(today, n * 7));
    return mk(new Date(today.getFullYear(), today.getMonth() + n, today.getDate()));
  }

  // "next monday" / "this friday"
  const nextDayM = s.match(/^(next|this) (.+)$/);
  if (nextDayM) {
    const prefix  = nextDayM[1];
    const dayName = nextDayM[2];
    const idx = DAYS_FULL.indexOf(dayName) !== -1 ? DAYS_FULL.indexOf(dayName) : DAYS_SHORT.indexOf(dayName);
    if (idx !== -1) {
      const todayDay = today.getDay();
      let diff = (idx - todayDay + 7) % 7;
      if (diff === 0) diff = prefix === 'this' ? 0 : 7;
      return mk(addDays(today, diff));
    }
  }

  // Bare day name: "monday", "fri"
  const dayIdx = DAYS_FULL.indexOf(s) !== -1 ? DAYS_FULL.indexOf(s) : DAYS_SHORT.indexOf(s);
  if (dayIdx !== -1) {
    const todayDay = today.getDay();
    let diff = (dayIdx - todayDay + 7) % 7;
    if (diff === 0) diff = 7; // always next occurrence
    return mk(addDays(today, diff));
  }

  // ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00');
    if (!isNaN(d)) return mk(d);
  }

  return { date: null, preview: '' };
}

function mk(date) {
  return { date, preview: fmtPreview(date) };
}

export function dateToISO(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============================================================
// Component
// ============================================================
export default function NaturalDateInput({
  value = '',
  onChange,
  placeholder = 'e.g. tomorrow, +3d, next friday',
}) {
  const [text, setText] = useState(value);
  const [showPicker, setShowPicker] = useState(false);

  // Sync when parent resets value externally
  useEffect(() => {
    setText(value || '');
  }, [value]);

  const parsed     = parseNaturalDate(text);
  const isoForPicker = parsed.date
    ? dateToISO(parsed.date)
    : (/^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '');

  const handleText = (e) => {
    const v = e.target.value;
    setText(v);
    const p = parseNaturalDate(v);
    if (p.date)        onChange(dateToISO(p.date));
    else if (!v.trim()) onChange('');
  };

  const handlePicker = (e) => {
    const v = e.target.value; // YYYY-MM-DD
    setText(v);
    onChange(v);
    setShowPicker(false);
  };

  const showError = text.length > 2 && !parsed.preview && !/^\d{4}-\d{2}-\d{2}$/.test(text);

  return (
    <div className="natural-date-input">
      <div className="natural-date-row">
        <input
          className="form-input"
          value={text}
          onChange={handleText}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          className="btn-icon natural-date-cal-btn"
          onClick={() => setShowPicker(v => !v)}
          title="Date picker"
          aria-label="Open calendar"
        >
          📅
        </button>
      </div>

      {showPicker && (
        <input
          type="date"
          className="form-input natural-date-picker"
          value={isoForPicker}
          onChange={handlePicker}
        />
      )}

      {text && parsed.preview && (
        <div className="natural-date-preview">{parsed.preview}</div>
      )}
      {showError && (
        <div className="natural-date-preview natural-date-preview-error">
          Unrecognized date format
        </div>
      )}
    </div>
  );
}
