import React from 'react';

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  assigneeFilter,
  onAssigneeChange,
  onClear,
}) {
  const hasFilters =
    searchQuery || statusFilter || priorityFilter || dateFrom || dateTo || assigneeFilter;

  return (
    <div className="search-filter-bar">
      <div className="search-input-wrapper">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          id="search-input"
          className="form-input search-input"
          type="text"
          placeholder="Search tasks… (Ctrl+K)"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            className="search-clear-btn"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="filter-controls">
        <select
          className="form-select filter-select"
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value)}
          title="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="INPROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="DONE">Done</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="NOT DOING">Not Doing</option>
        </select>

        <select
          className="form-select filter-select"
          value={priorityFilter}
          onChange={e => onPriorityChange(e.target.value)}
          title="Filter by priority"
        >
          <option value="">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <div className="date-filter-group">
          <input
            className="form-input date-input"
            type="date"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
            title="Due date from"
            aria-label="Due date from"
          />
          <span className="date-sep" aria-hidden="true">–</span>
          <input
            className="form-input date-input"
            type="date"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
            title="Due date until"
            aria-label="Due date until"
          />
        </div>

        <input
          className="form-input filter-assignee"
          type="text"
          placeholder="Assignee…"
          value={assigneeFilter}
          onChange={e => onAssigneeChange(e.target.value)}
        />

        {hasFilters && (
          <button className="btn btn-ghost btn-sm filter-clear-btn" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
