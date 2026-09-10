"""Check configured input locations without loading the large taxi files."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def main():
    paths = json.loads((ROOT / "configs/paths.json").read_text(encoding="utf-8"))
    taxi_dir = ROOT / paths["taxi_data"]
    files = sorted(taxi_dir.glob(paths["taxi_glob"]))
    zone_file = ROOT / paths["zone_data"]
    print(f"Taxi CSVs: {len(files)}")
    print(f"Taxi file size: {sum(p.stat().st_size for p in files) / 1e9:.2f} GB")
    print(f"Zone lookup exists: {zone_file.is_file()}")
    if len(files) != 12 or not zone_file.is_file():
        raise SystemExit("Check configs/paths.json and the input files.")
    print("Input layout OK. File contents and readability were not validated.")

if __name__ == "__main__":
    main()
