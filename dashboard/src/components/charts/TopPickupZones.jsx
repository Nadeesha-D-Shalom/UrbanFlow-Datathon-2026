export function TopPickupZones({ zones }) {
  const highestCount = zones[0]?.pickup_count || 1;
  return (
    <ol className="zone-ranking" aria-label="Top five pickup zones">
      {zones.map((zone) => (
        <li key={zone.zone_id ?? "unmatched"}>
          <span className="zone-ranking__rank" aria-label={`Rank ${zone.rank}`}>{zone.rank}</span>
          <div className="zone-ranking__detail">
            <div className="zone-ranking__row">
              <strong>{zone.zone_name}</strong>
              <span className="zone-ranking__count">{zone.pickup_count.toLocaleString("en-US")}</span>
            </div>
            <div className="zone-ranking__row zone-ranking__context">
              <span>{zone.area || "Area unavailable"}</span>
              <span>{(zone.share_of_total_pickups * 100).toFixed(2)}% of pickups</span>
            </div>
            <div className="zone-ranking__track" aria-hidden="true">
              <div style={{ width: `${zone.pickup_count / highestCount * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
