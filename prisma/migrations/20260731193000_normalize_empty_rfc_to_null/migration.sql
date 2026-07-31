-- 05-UAT: `rfc` is a NULLABLE UNIQUE column, but the write path previously
-- persisted an omitted RFC as the empty string "" instead of NULL (`?? null`
-- does not coalesce ""). Because Postgres treats "" (unlike NULL) as a real,
-- equal value, the second patient who omitted RFC collided on the unique index
-- and was wrongly told their CURP already existed. The write path is fixed to
-- store NULL going forward; this migration repairs existing rows so the stale
-- "" values can no longer collide with each other or block new NULL inserts.
--
-- Guarded to empty-string rows so it is a no-op on databases that never stored
-- one, and safe to re-run.
UPDATE "pre_registro"
SET "rfc" = NULL
WHERE "rfc" = '';
