"""Validate TLC LocationIDs and prepare official zone polygons for the dashboard."""
import csv
import json
from pathlib import Path

import shapefile

ROOT = Path(__file__).resolve().parents[1]
LOCAL_ZONES = ROOT / "data/raw/zones/Urban_Flow_Analytics_Zone_Dataset.csv"
TLC_LOOKUP = ROOT / "data/reference/tlc/taxi_zone_lookup.csv"
TLC_SHP = ROOT / "data/reference/tlc/taxi_zones/taxi_zones/taxi_zones.shp"
HOTSPOTS = ROOT / "results/hotspots_by_period.csv"
CLUSTERS = ROOT / "results/zone_cluster_assignments.csv"
OUTPUT = ROOT / "dashboard/src/data/generated/taxi_zones.json"
PERIODS = ["Morning", "Midday", "Evening", "Night"]


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as handle:
        return list(csv.DictReader(handle))


def main():
    local = {int(row["loc_id"]): row for row in read_csv(LOCAL_ZONES)}
    official = {int(row["LocationID"]): row for row in read_csv(TLC_LOOKUP)}
    if set(local) != set(official) or any(local[key]["zone_name"] != official[key]["Zone"] for key in local):
        raise ValueError("Local zone IDs/names do not exactly match the official TLC lookup.")

    hotspot_rows = read_csv(HOTSPOTS)
    counts = {(int(row["zone_id"]), row["period"]): row for row in hotspot_rows if row["metric"] == "pickup"}
    clusters = {int(row["zone_id"]): row for row in read_csv(CLUSTERS)} if CLUSTERS.exists() else {}
    reader = shapefile.Reader(str(TLC_SHP))
    fields = [field[0] for field in reader.fields[1:]]
    features = []
    for record, shape in zip(reader.iterRecords(), reader.iterShapes()):
        values = dict(zip(fields, record))
        zone_id = int(values["LocationID"])
        properties = {"zone_id": zone_id, "zone_name": values["zone"],
                  "borough": values["borough"], "service_zone": official[zone_id]["service_zone"]}
        for period in PERIODS:
            row = counts.get((zone_id, period), {"count": 0, "share": 0})
            properties[f"pickup_{period.lower()}"] = int(row["count"])
            properties[f"share_{period.lower()}"] = float(row["share"])
        if zone_id in clusters:
            properties["cluster_id"] = int(clusters[zone_id]["cluster_id"])
            properties["cluster_label"] = clusters[zone_id]["cluster_label"]
        features.append({"type": "Feature", "properties": properties,
                         "geometry": shape.__geo_interface__})
    geometry_ids = {feature["properties"]["zone_id"] for feature in features}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"local_lookup_ids": len(local), "official_lookup_ids": len(official),
                      "geometry_features": len(features), "geometry_unmatched_ids": sorted(set(local) - geometry_ids),
                      "geometry_extra_ids": sorted(geometry_ids - set(local))}))


if __name__ == "__main__":
    main()