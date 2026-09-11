import { useEffect, useRef } from "react";
const navGroups = [
  {
    title: "Overview",
    items: [{ label: "Overview", icon: "dashboard", active: true }],
  },
  {
    title: "Analytics",
    items: [
      { label: "Demand Analytics", icon: "trend" },
      { label: "Zone & Hotspots", icon: "map" },
      { label: "OD Flows", icon: "flow" },
      { label: "Fare & Revenue", icon: "currency" },
      { label: "Trip Efficiency", icon: "speed" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Predictions", icon: "forecast" },
      { label: "Business Insights", icon: "insight" },
      { label: "AI Mobility Assistant", icon: "assistant" },
    ],
  },
];

function Icon({ name }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 5.5h6v6H4z" />
          <path d="M14 5.5h6v3h-6z" />
          <path d="M14 11.5h6v7h-6z" />
          <path d="M4 14.5h6v4H4z" />
        </svg>
      );
    case "trend":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 18.5h16" />
          <path d="M6 15.5l4-5 3 3 5-8" />
          <path d="M16 5.5h2v2" />
        </svg>
      );
    case "map":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 4.8 4 7v12l5-2.2 6 2.4 5-2V5.2l-5 2-6-2.4Z" />
          <path d="M10 7v12" />
          <path d="M15 5.2v12" />
        </svg>
      );
    case "flow":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M4 7h9" />
          <path d="M11 4l3 3-3 3" />
          <path d="M20 17h-9" />
          <path d="M13 14l-3 3 3 3" />
        </svg>
      );
    case "currency":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M12 3.8v16.4" />
          <path d="M16 7.2c0-1.6-1.8-2.9-4-2.9s-4 1.1-4 2.8 1.4 2.4 4 2.8 4 1.2 4 2.9-1.8 2.9-4 2.9-4-1.3-4-2.9" />
        </svg>
      );
    case "speed":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 16.8a8 8 0 1 1 14 0" />
          <path d="M12 12l4-3" />
          <circle cx="12" cy="12" r="1.2" />
        </svg>
      );
    case "forecast":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 17h14" />
          <path d="M6 14l3-4 3 2 5-7" />
          <path d="M16 5.5h2v2" />
        </svg>
      );
    case "insight":
      return (
        <svg {...common} aria-hidden="true">
          <path d="M9 18h6" />
          <path d="M10 21h4" />
          <path d="M8 14c-1.6-1.3-2.5-3.1-2.5-5.1A6.5 6.5 0 0 1 12 2.4a6.5 6.5 0 0 1 6.5 6.5c0 2-1 3.8-2.5 5.1-.8.7-1.3 1.7-1.4 2.7H9.4c-.1-1-.6-2-1.4-2.7Z" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden="true">
          <path d="M5 5h14v11H9l-4 4V5Z" /><path d="M9 9h6M9 12h4" />
        </svg>
      );
  }
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M7 20.5 13.4 14l4.4 4.4L25 11.2"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 23.5h20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.45"
        />
        <circle cx="7" cy="20.5" r="1.8" fill="currentColor" />
        <circle cx="13.4" cy="14" r="1.8" fill="currentColor" />
        <circle cx="17.8" cy="18.4" r="1.8" fill="currentColor" />
        <circle cx="25" cy="11.2" r="1.8" fill="currentColor" />
      </svg>
    </div>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  activePage,
  onNavigate,
}) {
  const asideRef = useRef(null);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement;
    const node = asideRef.current;
    const focusFrame = requestAnimationFrame(() => {
      node.querySelector('.mobile-close')?.focus();
    });
    const key = (e) => {
      if (e.key === "Escape") onCloseMobile();
      if (e.key === "Tab") {
        const items = [...node.querySelectorAll("button")].filter(
          (el) => el.getClientRects().length,
        );
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      cancelAnimationFrame(focusFrame);
      const opener = document.getElementById('navigation-toggle');
      if (opener?.getClientRects().length) opener.focus();
      else previous?.focus();
    };
  }, [mobileOpen, onCloseMobile]);
  return (
    <>
      <div
        className={`sidebar-overlay ${mobileOpen ? "is-visible" : ""}`}
        onClick={onCloseMobile}
      />
      <aside
        ref={asideRef}
        aria-label="Application navigation"
        className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="sidebar__top">
          <div className="sidebar__brand">
            <BrandMark />
            <div className="sidebar__brand-text">
              <strong>UrbanFlow</strong>
              <span>Analytics</span>
            </div>
          </div>

          <button
            className="icon-button sidebar__collapse"
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M9 5.5 15 12l-6 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <button
          type="button"
          className="mobile-close secondary-button"
          onClick={onCloseMobile}
        >
          Close navigation
        </button>
        <nav className="sidebar__nav" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <div key={group.title} className="sidebar__group">
              <p className="sidebar__group-title">{group.title}</p>
              <div className="sidebar__items">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`sidebar__item ${activePage === item.label ? "is-active" : ""}`}
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => {
                      onNavigate(item.label);
                      onCloseMobile();
                    }}
                    aria-current={
                      activePage === item.label ? "page" : undefined
                    }
                  >
                    <span className="sidebar__icon">
                      <Icon name={item.icon} />
                    </span>
                    <span className="sidebar__label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__support">
            <span className="status-dot status-dot--info" />
            <div>
              <strong>Design preview</strong>
              <p>SLIIT Codefest Datathon 2026</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
