import hotspots from '../data/generated/hotspots.json';
import od from '../data/generated/od_flows.json';
import clusters from '../data/generated/zone_clusters.json';
import daily from '../data/generated/overview_daily.json';
import zones from '../data/generated/zone_activity.json';
import metadata from '../data/generated/fare_metadata.json';
import eta from '../../../integration/eta/eta_model_metadata.json';
import fareCsv from '../../../results/fare_results_nadeesha.csv?raw';
import demandCsv from '../../../results/metrics/demand_test_metrics.csv?raw';
import assignmentsCsv from '../../../results/zone_cluster_assignments.csv?raw';
import { parseCsv } from './engine.js';
export const assistantData = { hotspots, od, clusters, daily, zones, metadata, eta,
  fare: parseCsv(fareCsv), demand: parseCsv(demandCsv), assignments: parseCsv(assignmentsCsv) };
