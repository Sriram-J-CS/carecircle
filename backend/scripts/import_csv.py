"""Load a big dataset into the directory tables.

  python scripts/import_csv.py hospitals hospitals.csv --name "Hospital Name" --city City --state State
  python scripts/import_csv.py medicines a_z_medicines.csv --name name --generic "short_composition1" --category type
  python scripts/import_csv.py doctors doctors.csv --name name --specialty speciality --city city --state state

Column flags say which CSV column maps to which field; unmapped fields stay empty. Re-running appends, so
use --replace to clear the table first. Suggested free datasets are listed in PROJECT_OVERVIEW.md (section 9).
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.db import connect, init_db  # noqa: E402

TABLES = {
    "hospitals": ["name", "city", "state", "kind"],
    "medicines": ["name", "generic", "category"],
    "doctors": ["name", "specialty", "city", "state"],
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("table", choices=TABLES)
    ap.add_argument("csv_file")
    ap.add_argument("--replace", action="store_true")
    for field in sorted({f for fs in TABLES.values() for f in fs}):
        ap.add_argument(f"--{field}", help=f"CSV column for {field}")
    args = ap.parse_args()

    init_db()
    conn = connect()
    fields = TABLES[args.table]
    mapping = {f: getattr(args, f) for f in fields if getattr(args, f)}
    if "name" not in mapping:
        sys.exit("--name <column> is required")
    if args.replace:
        conn.execute(f"DELETE FROM {args.table}")
    n = 0
    conn.execute("BEGIN")
    with open(args.csv_file, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            vals = [(row.get(mapping[f]) or "").strip() or None if f in mapping else None for f in fields]
            if not vals[0]:
                continue
            if args.table == "doctors":
                vals.append(0)  # real data, not sample
            conn.execute(f"INSERT INTO {args.table} ({', '.join(fields + (['is_sample'] if args.table == 'doctors' else []))}) "
                         f"VALUES ({', '.join('?' * (len(fields) + (1 if args.table == 'doctors' else 0)))})", vals)
            n += 1
    conn.execute("COMMIT")
    print(f"Imported {n} rows into {args.table}")


if __name__ == "__main__":
    main()
