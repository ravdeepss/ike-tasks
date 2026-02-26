/**
 * Custom hook for parsing natural language date inputs.
 * Supports various formats like:
 * - "today", "tomorrow", "tom", "tmr"
 * - Day names: "monday", "fri", "this friday", "next monday"
 * - Relative: "in 3 days", "in 2 weeks", "+3d", "+1w"
 * - Special: "end of week", "eow", "end of month", "eom"
 * - "next week", "next month"
 */

const DAY_ABBREVIATIONS = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, 
  friday: 5, saturday: 6
};

/**
 * Parse a natural language date string and return a Date object and preview text.
 * @param {string} input - The natural language date string
 * @returns {{ date: Date|null, preview: string, error: string|null }}
 */
export function parseNaturalDate(input) {
  if (!input || typeof input !== 'string') {
    return { date: null, preview: '', error: null };
  }

  const trimmed = input.trim().toLowerCase();
  
  if (!trimmed) {
    return { date: null, preview: '', error: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if it's already a valid date string (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + 'T00:00:00');
    if (!isNaN(date.getTime())) {
      return {
        date,
        preview: formatDatePreview(date, today),
        error: null,
      };
    }
  }

  // Today
  if (trimmed === 'today') {
    return { date: today, preview: 'Today', error: null };
  }

  // Tomorrow variations
  if (['tomorrow', 'tom', 'tmr'].includes(trimmed)) {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return { date, preview: 'Tomorrow', error: null };
  }

  // End of week / end of month
  if (trimmed === 'end of week' || trimmed === 'eow') {
    const date = getEndOfWeek(today);
    return { date, preview: `End of week (${formatDateShort(date)})`, error: null };
  }

  if (trimmed === 'end of month' || trimmed === 'eom') {
    const date = getEndOfMonth(today);
    return { date, preview: `End of month (${formatDateShort(date)})`, error: null };
  }

  // Next week / next month
  if (trimmed === 'next week') {
    const date = new Date(today);
    date.setDate(date.getDate() + 7);
    return { date, preview: `Next week (${formatDateShort(date)})`, error: null };
  }

  if (trimmed === 'next month') {
    const date = new Date(today);
    date.setMonth(date.getMonth() + 1);
    return { date, preview: `Next month (${formatDateShort(date)})`, error: null };
  }

  // "in N days/weeks/months"
  const inMatch = trimmed.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/);
  if (inMatch) {
    const amount = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    const date = new Date(today);

    if (unit.startsWith('day')) {
      date.setDate(date.getDate() + amount);
    } else if (unit.startsWith('week')) {
      date.setDate(date.getDate() + amount * 7);
    } else if (unit.startsWith('month')) {
      date.setMonth(date.getMonth() + amount);
    }

    return { date, preview: formatDatePreview(date, today), error: null };
  }

  // "+Nd", "+Nw", "+Nm" shorthand
  const shortMatch = trimmed.match(/^\+(\d+)(d|w|m)$/);
  if (shortMatch) {
    const amount = parseInt(shortMatch[1], 10);
    const unit = shortMatch[2];
    const date = new Date(today);

    if (unit === 'd') {
      date.setDate(date.getDate() + amount);
    } else if (unit === 'w') {
      date.setDate(date.getDate() + amount * 7);
    } else if (unit === 'm') {
      date.setMonth(date.getMonth() + amount);
    }

    return { date, preview: formatDatePreview(date, today), error: null };
  }

  // "this <day>" or just "<day>"
  const thisDayMatch = trimmed.match(/^(this\s+)?(\w+)$/);
  if (thisDayMatch) {
    const dayName = thisDayMatch[2];
    if (DAY_ABBREVIATIONS[dayName] !== undefined) {
      const targetDay = DAY_ABBREVIATIONS[dayName];
      const isThis = !!thisDayMatch[1];
      const date = getNextOccurrenceOfDay(today, targetDay, isThis);
      return { date, preview: formatDayPreview(date, dayName, isThis), error: null };
    }
  }

  // "next <day>"
  const nextDayMatch = trimmed.match(/^next\s+(\w+)$/);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1];
    if (DAY_ABBREVIATIONS[dayName] !== undefined) {
      const targetDay = DAY_ABBREVIATIONS[dayName];
      const date = getNextOccurrenceOfDay(today, targetDay, false, true);
      return { date, preview: `Next ${capitalize(dayName)} (${formatDateShort(date)})`, error: null };
    }
  }

  // Try to parse as a standard date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed, preview: formatDatePreview(parsed, today), error: null };
  }

  return { 
    date: null, 
    preview: '', 
    error: `Could not parse "${input}" as a date` 
  };
}

/**
 * Get the next occurrence of a specific day of week.
 */
function getNextOccurrenceOfDay(fromDate, targetDay, isThis = false, isNext = false) {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  
  let daysUntil = targetDay - currentDay;
  
  if (isThis) {
    // "this friday" means the nearest upcoming friday
    if (daysUntil < 0) daysUntil += 7;
  } else if (isNext) {
    // "next friday" always means the friday of next week
    if (daysUntil <= 0) daysUntil += 7;
    daysUntil += 7;
  } else {
    // Just "friday" means the next friday (including today)
    if (daysUntil < 0) daysUntil += 7;
  }
  
  date.setDate(date.getDate() + daysUntil);
  return date;
}

/**
 * Get the end of the current week (Sunday).
 */
function getEndOfWeek(fromDate) {
  const date = new Date(fromDate);
  const day = date.getDay();
  const daysUntilSunday = 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);
  return date;
}

/**
 * Get the end of the current month.
 */
function getEndOfMonth(fromDate) {
  const date = new Date(fromDate);
  date.setMonth(date.getMonth() + 1, 0); // Set to last day of current month
  return date;
}

/**
 * Format a date for preview display.
 */
function formatDatePreview(date, today) {
  const diffMs = date.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return formatDateShort(date);
}

/**
 * Format a date as YYYY-MM-DD.
 */
function formatDateShort(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a day preview.
 */
function formatDayPreview(date, dayName, isThis) {
  const prefix = isThis ? 'This' : '';
  const capitalized = capitalize(dayName);
  const dateStr = formatDateShort(date);
  return `${prefix} ${capitalized} (${dateStr})`.trim();
}

/**
 * Capitalize first letter.
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format a date for display in the UI.
 */
export function formatDueDate(dateStr) {
  if (!dateStr) return { text: 'No due date', className: 'due-date-none' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateStr + 'T00:00:00');
  if (isNaN(dueDate.getTime())) {
    return { text: dateStr, className: 'due-date-none' };
  }
  
  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  const formattedDate = dueDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return { 
      text: `${formattedDate} (${daysOverdue}d overdue)`, 
      className: 'due-date-overdue' 
    };
  }
  
  if (diffDays === 0) {
    return { text: 'Today', className: 'due-date-today' };
  }
  
  if (diffDays === 1) {
    return { text: 'Tomorrow', className: 'due-date-soon' };
  }
  
  if (diffDays <= 7) {
    return { text: `${formattedDate} (in ${diffDays} days)`, className: 'due-date-soon' };
  }
  
  return { text: formattedDate, className: 'due-date-normal' };
}

/**
 * Hook that provides natural date parsing functionality.
 */
export default function useNaturalDate() {
  return {
    parseNaturalDate,
    formatDueDate,
    formatDateShort,
  };
}