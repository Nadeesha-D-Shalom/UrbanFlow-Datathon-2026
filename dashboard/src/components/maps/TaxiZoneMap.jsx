import { useMemo } from "react";
import geometry from "../../data/generated/taxi_zones.json";

const clusterColors = ["#2563eb", "#c2410c", "#15803d", "#7c3aed"];
const hotspotColors = ["#eff6ff", "#bfdbfe", "#fbbf24", "#f97316", "#b91c1c"];

function ringsOf(feature) {
  return feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
}

function pathFor(feature, project) {
  return ringsOf(feature).map((ring) => `${ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ")}Z`).join(" ");
}

export function TaxiZoneMap({ period, view = "hotspot" }) {
  const width = 800;
  const height = 520;
  const bounds = useMemo(() => {
    const points = geometry.features.flatMap((feature) => ringsOf(feature).flat());
    const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }, []);
  const project = (point) => {
    const scale = Math.min((width - 28) / (bounds.maxX - bounds.minX), (height - 28) / (bounds.maxY - bounds.minY));
    const mapWidth = (bounds.maxX - bounds.minX) * scale;
    const mapHeight = (bounds.maxY - bounds.minY) * scale;
    const offsetX = (width - mapWidth) / 2;
    const offsetY = (height - mapHeight) / 2;
    return [offsetX + (point[0] - bounds.minX) * scale, offsetY + (bounds.maxY - point[1]) * scale];
  };
  const countKey = `pickup_${period.toLowerCase()}`;
  const max = Math.max(...geometry.features.map((feature) => feature.properties[countKey] || 0));
  return <div className="taxi-zone-map" role="img" aria-label={`${period} taxi-zone ${view === "hotspot" ? "pickup intensity" : "movement cluster"} map`}>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <rect width={width} height={height} fill="#eef4f5" />
      {geometry.features.map((feature) => {
        const count = feature.properties[countKey] || 0;
        const intensity = Math.log1p(count) / Math.log1p(max || 1);
        const hotspotBand = intensity < 0.2 ? 0 : intensity < 0.4 ? 1 : intensity < 0.6 ? 2 : intensity < 0.8 ? 3 : 4;
        const fill = view === "cluster"
          ? clusterColors[feature.properties.cluster_id % clusterColors.length]
          : hotspotColors[hotspotBand];
        return <path key={feature.properties.zone_id} d={pathFor(feature, project)} fill={fill} fillOpacity={view === "cluster" ? 0.58 : 0.25 + intensity * 0.65} stroke="#ffffff" strokeWidth="0.7">
          <title>{feature.properties.zone_name}: {count.toLocaleString("en-US")} pickups{view === "cluster" ? ` · ${feature.properties.cluster_label}` : ""}</title>
        </path>;
      })}
    </svg>
    <div className="taxi-zone-map__legend">
      <span>{view === "hotspot" ? "Pickup intensity" : "Cluster membership"}</span>
      {view === "hotspot" ? hotspotColors.map((color, index) => <span key={color}><i style={{ background: color }} /> {[
        "Very Low", "Low", "Medium", "High", "Very High",
      ][index]}</span>) : clusterColors.map((color, index) => <span key={color}><i style={{ background: color }} /> Cluster {index}</span>)}
    </div>
  </div>;
}