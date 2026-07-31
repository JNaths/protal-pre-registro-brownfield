// D-05: normalized (lowercase, accent-stripped) form used both to populate
// `nombreBusqueda` on write (pre-registros.ts) and to build the `contains`
// filter on the console's search endpoint (routes/consola.ts). Prisma's
// `mode: "insensitive"` only folds case, not accents, so this normalization
// step is required for an accent-insensitive substring search. Same plain
// named-export shape as sanitizeField — no class, no default export.
export function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
