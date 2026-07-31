-- WR-02: the 20260731170500_add_validacion_busqueda migration added
-- "nombreBusqueda" as NOT NULL DEFAULT '', so every pre-registro created before
-- that migration got an empty search key and became silently unsearchable by
-- name (the console filters with `contains: normalize(nombre)`, which never
-- matches ''). That migration was already applied to dev/prod DBs and is
-- immutable (Prisma verifies its checksum), so the backfill ships as this
-- separate follow-up migration instead.
--
-- The expression mirrors normalize() in packages/api/src/utils/normalize.ts
-- (trim -> lowercase -> strip diacritics) so backfilled keys are consistent with
-- values written by the application. translate() covers the Spanish diacritics
-- that occur in Mexican names; if the `unaccent` extension is available it gives
-- fuller coverage (CREATE EXTENSION IF NOT EXISTS unaccent; then
-- unaccent(lower(trim(...)))).
--
-- Guarded to rows with an empty key so it is a no-op on fresh databases and
-- safe to re-run.
UPDATE "pre_registro"
SET "nombreBusqueda" = translate(
  lower(trim("nombre" || ' ' || "apellidoPaterno" || ' ' || "apellidoMaterno")),
  'áéíóúüñÁÉÍÓÚÜÑ',
  'aeiouunAEIOUUN'
)
WHERE "nombreBusqueda" = '';
