"""Back up local SQLite, rehearse upgrade, compare every original value, then upgrade.

Run from backend: .venv/Scripts/python scripts/migrate_emotion_review.py
Never prints diary contents, keys, or database credentials.
"""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.config import get_settings
from sqlalchemy.engine import make_url


def snapshot(path, columns=None):
    with sqlite3.connect(path) as db:
        if columns is None:
            tables = [row[0] for row in db.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name != 'alembic_version'")]
            columns = {table: [row[1] for row in db.execute(f'pragma table_info("{table}")')] for table in tables}
        result = {}
        for table, names in columns.items():
            fields = ','.join('"' + name + '"' for name in names)
            rows = db.execute(f'SELECT {fields} FROM "{table}"').fetchall()
            encoded = sorted(json.dumps(row, ensure_ascii=False, default=str) for row in rows)
            result[table] = (len(rows), hashlib.sha256('\n'.join(encoded).encode()).hexdigest())
        return columns, result


def upgrade(path):
    env = {**os.environ, "DATABASE_URL": "sqlite+pysqlite:///" + str(path).replace('\\', '/')}
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], env=env, check=True)


def main():
    url = make_url(get_settings().effective_database_url)
    if url.get_backend_name() != "sqlite":
        raise SystemExit("This script only migrates local SQLite. PostgreSQL needs its own backup and rehearsal.")
    source = Path(url.database).resolve()
    if not source.is_file():
        raise SystemExit("Existing database not found; no changes made.")
    folder = Path(__file__).resolve().parents[2] / "tmp" / ("emotion-review-migration-" + datetime.now().strftime('%Y%m%d-%H%M%S'))
    folder.mkdir(parents=True, exist_ok=False)
    backup, rehearsal = folder / "before.db", folder / "rehearsal.db"
    with sqlite3.connect(source) as original, sqlite3.connect(backup) as target:
        original.backup(target)
    with sqlite3.connect(backup) as original, sqlite3.connect(rehearsal) as target:
        original.backup(target)
    columns, before = snapshot(backup)
    upgrade(rehearsal)
    assert snapshot(rehearsal, columns)[1] == before, "Rehearsal changed original values; production not migrated."
    # Stop if another writer changed the database during rehearsal.
    assert snapshot(source, columns)[1] == before, "Concurrent write detected; retry during idle time."
    upgrade(source)
    assert snapshot(source, columns)[1] == before, "Original values differ; retained backup requires investigation."
    with sqlite3.connect(source) as db:
        assert db.execute("pragma integrity_check").fetchone()[0] == "ok"
        assert not db.execute("pragma foreign_key_check").fetchall()
    print(json.dumps({"result": "preserved", "tables_checked": len(before), "rows_checked": sum(row[0] for row in before.values()), "backup_directory": str(folder)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
