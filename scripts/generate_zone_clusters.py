"""Cluster zones using real period-based pickup and dropoff movement profiles."""
import json
from pathlib import Path

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
HOTSPOTS = ROOT / "results/hotspots_by_period.csv"
METRICS = ROOT / "results/metrics/zone_clustering_metrics.csv"
ASSIGNMENTS = ROOT / "results/zone_cluster_assignments.csv"
FRONTEND = ROOT / "dashboard/src/data/generated/zone_clusters.json"
PERIODS = ["Morning", "Midday", "Evening", "Night"]
CLUSTER_LABELS = {
    0: "High-volume midday hubs",
    1: "Night-oriented dropoff-heavy zones",
    2: "Moderate daytime pickup-leaning zones",
    3: "Low-volume dropoff-heavy zones",
}


def build_features():
    rows = pd.read_csv(HOTSPOTS)
    counts = rows.pivot_table(index=["zone_id", "zone_name", "borough"], columns=["metric", "period"], values="count", fill_value=0)
    counts.columns = [f"{metric}_{period.lower()}" for metric, period in counts.columns]
    for metric in ["pickup", "dropoff"]:
        for period in PERIODS:
            column = f"{metric}_{period.lower()}"
            if column not in counts:
                counts[column] = 0
    for period in PERIODS:
        pickup = counts[f"pickup_{period.lower()}"]
        dropoff = counts[f"dropoff_{period.lower()}"]
        counts[f"balance_{period.lower()}"] = (pickup - dropoff) / (pickup + dropoff).replace(0, 1)
    pickup_total = counts[[f"pickup_{period.lower()}" for period in PERIODS]].sum(axis=1)
    dropoff_total = counts[[f"dropoff_{period.lower()}" for period in PERIODS]].sum(axis=1)
    features = pd.DataFrame(index=counts.index)
    features["pickup_count"] = pickup_total
    features["dropoff_count"] = dropoff_total
    features["pickup_dropoff_balance"] = (pickup_total - dropoff_total) / (pickup_total + dropoff_total).replace(0, 1)
    for period in PERIODS:
        features[f"{period.lower()}_pickup_share"] = counts[f"pickup_{period.lower()}"] / pickup_total.replace(0, 1)
        features[f"{period.lower()}_balance"] = counts[f"balance_{period.lower()}"]
    return counts.reset_index(), features.reset_index(drop=True)


def main():
    zone_rows, features = build_features()
    feature_names = list(features.columns)
    scaled = StandardScaler().fit_transform(features)
    metric_rows = []
    models = {}
    for k in range(3, 9):
        model = KMeans(n_clusters=k, random_state=42, n_init=20)
        labels = model.fit_predict(scaled)
        score = silhouette_score(scaled, labels)
        metric_rows.append({"k": k, "silhouette_score": score, "random_state": 42, "features": ",".join(feature_names)})
        models[k] = (model, labels)
    metrics = pd.DataFrame(metric_rows)
    selected_k = int(metrics.loc[metrics["silhouette_score"].idxmax(), "k"])
    model, labels = models[selected_k]
    assignments = zone_rows[["zone_id", "zone_name", "borough"]].copy()
    assignments["cluster_id"] = labels
    assignments["cluster_label"] = assignments["cluster_id"].map(CLUSTER_LABELS)
    assignments = assignments.sort_values(["cluster_id", "zone_id"]).reset_index(drop=True)
    profile = zone_rows.copy()
    profile["cluster_id"] = labels
    profile_features = features.copy()
    profile_features["cluster_id"] = labels
    summaries = []
    for cluster_id, group in profile_features.groupby("cluster_id"):
        zones = profile.loc[profile["cluster_id"] == cluster_id]
        averages = group[feature_names].mean()
        representatives = zones.assign(distance=((scaled[profile.index[profile["cluster_id"] == cluster_id]] - model.cluster_centers_[cluster_id]) ** 2).sum(axis=1)).sort_values("distance").head(3)
        dominant_period = max(PERIODS, key=lambda period: averages[f"{period.lower()}_pickup_share"])
        summaries.append({"cluster_id": int(cluster_id), "zone_count": len(group),
                          "cluster_label": CLUSTER_LABELS[int(cluster_id)],
                          "average_pickup_count": averages["pickup_count"],
                          "average_dropoff_count": averages["dropoff_count"],
                          "dominant_period": dominant_period,
                          "representative_zones": representatives["zone_name"].tolist(),
                          "average_pickup_shares": {period: averages[f"{period.lower()}_pickup_share"] for period in PERIODS},
                          "average_balances": {period: averages[f"{period.lower()}_balance"] for period in PERIODS}})
    metrics.to_csv(METRICS, index=False)
    assignments.to_csv(ASSIGNMENTS, index=False)
    FRONTEND.write_text(json.dumps({"selected_k": selected_k, "features": feature_names,
                                    "metrics": metric_rows, "clusters": summaries}, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"selected_k": selected_k, "metrics": metric_rows, "clusters": summaries}, indent=2, default=str))


if __name__ == "__main__":
    main()