---
name: PostgreSQL sequence desync fix
description: When rows are inserted with explicit IDs, the serial sequence stays at 1; this causes duplicate key errors on subsequent auto-insert.
---

## Rule
After any migration that touches a table with a serial primary key (especially when rows may have been inserted with explicit IDs), always call `setval` to sync the sequence:

```sql
SELECT setval('rounds_id_seq', COALESCE((SELECT MAX(id) FROM rounds), 0));
```

This sets the sequence's `last_value` to `MAX(id)`, so the next `nextval()` call returns `MAX(id) + 1`.

**Why:** The old game loop inserted rounds with explicit `id: nextId` (e.g. `id: 1`). PostgreSQL's serial sequence was never used for those inserts, so it stayed at its initial value (1). When the code was refactored to drop the explicit ID and rely on auto-increment, the first new insert tried to use sequence value 1, which conflicted with the already-existing row.

**How to apply:** Add this `setval` call to `runMigrations()` in `server/db.ts` any time a migration could leave the sequence out of sync with actual row IDs.
