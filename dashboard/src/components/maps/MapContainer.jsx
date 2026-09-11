import { useId, useState } from "react";
const zones = [
  { name: "Midtown", x: 315, y: 146, trips: "18,420", r: 29 },
  { name: "Downtown", x: 244, y: 220, trips: "12,860", r: 20 },
  { name: "Upper East", x: 377, y: 84, trips: "9,240", r: 17 },
  { name: "Brooklyn", x: 414, y: 221, trips: "7,610", r: 14 },
  { name: "Queens", x: 482, y: 135, trips: "6,340", r: 12 },
];
export function MapContainer({ onZoneSelect, timeControl, children }) {
  const streetsId = useId().replaceAll(":", "") + "-streets";
  const [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [drag, setDrag] = useState(null),
    [selected, setSelected] = useState(null);
  return (
    <div className="map-container">
      <div className="map-top">
        <span className="map-tag">
          NEW YORK CITY <span> / </span> SCHEMATIC
        </span>
        {timeControl}
      </div>
      <svg
        viewBox="0 0 650 290"
        aria-label="Illustrative zone activity map, not geographic boundaries. Drag to pan or use arrow keys."
        tabIndex="0"
        onKeyDown={(e) => {
          const delta = {
            ArrowLeft: [20, 0],
            ArrowRight: [-20, 0],
            ArrowUp: [0, 20],
            ArrowDown: [0, -20],
          }[e.key];
          if (delta) {
            e.preventDefault();
            setPan((p) => ({ x: p.x + delta[0], y: p.y + delta[1] }));
          }
        }}
        onPointerDown={(e) => {
          if (e.target.closest("[data-zone]")) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag({
            x: e.clientX,
            y: e.clientY,
            ...pan,
            originX: pan.x,
            originY: pan.y,
            clientX: e.clientX,
            clientY: e.clientY,
          });
        }}
        onPointerMove={(e) => {
          if (drag) {
            const ratio = 650 / e.currentTarget.getBoundingClientRect().width;
            setPan({
              x: drag.originX + (e.clientX - drag.clientX) * ratio,
              y: drag.originY + (e.clientY - drag.clientY) * ratio,
            });
          }
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <defs>
          <pattern
            id={streetsId}
            width="24"
            height="19"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-32)"
          >
            <rect width="24" height="19" fill="#f0f2ef" />
            <path d="M0 0H24M0 0V19" stroke="white" strokeWidth="3" />
          </pattern>
        </defs>
        <rect width="650" height="290" fill="#e6eff4" />
        <g
          transform={`translate(${pan.x} ${pan.y}) translate(325 145) scale(${zoom}) translate(-325 -145)`}
        >
          <path
            d="M0 0H240L202 50 166 111 164 149 117 201 83 290H0Z"
            fill={`url(#${streetsId})`}
          />
          <path
            d="M257 285L201 249 221 207 256 183 274 142 308 104 339 58 389 0H427L398 61 364 118 330 164 299 207Z"
            fill={`url(#${streetsId})`}
            stroke="#cbd7d6"
          />
          <path
            d="M288 290L325 229 345 195 385 162 410 100 455 20 479 0H650V290Z"
            fill={`url(#${streetsId})`}
          />
          <path d="M324 130L346 91 363 101 340 141Z" fill="#cfdfc9" />
          <path
            d="M246 228L409 229M334 143L461 140M370 88L480 78"
            stroke="#d1d9dc"
            strokeWidth="4"
            strokeDasharray="4 3"
          />
          <g fill="#81919c" fontSize="10" letterSpacing="2">
            <text x="69" y="135">
              NEW JERSEY
            </text>
            <text x="300" y="168" transform="rotate(-53 300 168)">
              MANHATTAN
            </text>
            <text x="484" y="91">
              QUEENS
            </text>
            <text x="427" y="262">
              BROOKLYN
            </text>
            <text
              x="184"
              y="114"
              transform="rotate(-53 184 114)"
              fill="#8ba8b8"
            >
              HUDSON RIVER
            </text>
          </g>
          {zones.map((zone) => (
            <g
              data-zone="true"
              key={zone.name}
              role="button"
              tabIndex="0"
              aria-label={`${zone.name}, ${zone.trips} sample pickups`}
              aria-pressed={selected?.name === zone.name}
              className="map-zone"
              onClick={() => {
                setSelected(zone);
                onZoneSelect?.(zone);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected(zone);
                  onZoneSelect?.(zone);
                }
              }}
            >
              <title>
                {zone.name}: {zone.trips} sample pickups
              </title>
              <circle
                cx={zone.x}
                cy={zone.y}
                r={zone.r}
                fill="#2563eb"
                opacity=".12"
                stroke={selected?.name === zone.name ? "#1d4ed8" : "none"}
                strokeWidth="3"
              />
              <circle
                cx={zone.x}
                cy={zone.y}
                r={zone.r * 0.57}
                fill="#2563eb"
                opacity=".22"
              />
              <circle
                cx={zone.x}
                cy={zone.y}
                r="5"
                fill="#2563eb"
                stroke="white"
                strokeWidth="2"
              />
            </g>
          ))}
          {children}
        </g>
      </svg>
      <div className="map-controls">
        <button
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          disabled={zoom >= 3}
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
          disabled={zoom <= 0.75}
        >
          −
        </button>
        <button
          aria-label="Reset map view"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setSelected(null);
          }}
        >
          ⌖
        </button>
      </div>
      <div className="map-bottom">
        <span>
          Pickup intensity <i /> Low <b /> High
        </span>
        <span>{Math.round(zoom * 100)}%</span>
      </div>
      {selected && (
        <div className="map-selection" role="status">
          <strong>{selected.name}</strong>
          <span>{selected.trips} sample pickups</span>
          <button
            onClick={() => setSelected(null)}
            aria-label="Clear selected zone"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
