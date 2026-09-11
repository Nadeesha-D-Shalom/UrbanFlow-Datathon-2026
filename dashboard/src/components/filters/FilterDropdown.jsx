import { useEffect, useId, useRef, useState } from "react";
export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  searchable = false,
  placeholder,
  active = false,
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const root = useRef(null),
    trigger = useRef(null),
    id = useId();
  const all = [...new Set([placeholder, value, ...options].filter(Boolean))];
  const filtered = all.filter((x) =>
    x.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (open) root.current.querySelector('input, [role="option"]')?.focus();
    else setQuery("");
  }, [open]);
  function keyboard(e) {
    if (e.key === "Escape") {
      setOpen(false);
      trigger.current.focus();
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const items = [...root.current.querySelectorAll('[role="option"]')];
      const index = items.indexOf(document.activeElement);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? items.length - 1
            : (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    }
  }
  return (
    <div
      ref={root}
      className={`filter-dropdown ${open ? "is-open" : ""}`}
      onKeyDown={keyboard}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <label id={id + "-label"} className="filter-dropdown__label">
        {label}
      </label>
      <button
        ref={trigger}
        className={`filter-dropdown__button ${active ? "is-active" : ""}`}
        aria-labelledby={id + "-label " + id + "-value"}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={id}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (!open && e.key === "ArrowDown") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }
        }}
      >
        <span id={id + "-value"}>{value}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="filter-dropdown__panel">
          {searchable && (
            <input
              className="filter-dropdown__search"
              type="search"
              aria-label={`Search ${label}`}
              placeholder="Search options…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <div id={id} role="listbox" aria-label={label}>
            {filtered.map((option) => (
              <button
                role="option"
                aria-selected={option === value}
                className={`filter-dropdown__item ${option === value ? "filter-dropdown__item--active" : ""}`}
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  trigger.current.focus();
                }}
              >
                {option}
                {option === value && <span aria-hidden="true"> ✓</span>}
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="dropdown-empty" role="status">
              No matching options.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
