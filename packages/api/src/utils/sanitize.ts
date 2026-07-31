import sanitizeHtml from "sanitize-html";

// Empty allowlist — strips ALL HTML tags/attributes while preserving plain
// text content (accents, ñ, apostrophes survive). D-01/D-02: chosen
// specifically so legitimate Mexican names/addresses are not corrupted by
// blanket HTML-entity escaping. SQL injection is handled separately by
// Prisma parameterization (API-04, Phase 1) — this is purely the XSS layer.
const EMPTY_ALLOWLIST_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

// sanitize-html strips tags but still HTML-entity-encodes the special
// characters left in the surviving plain text (e.g. "Juan & Ana" becomes
// "Juan &amp; Ana", "a < b" becomes "a &lt; b"). Because we store PLAIN TEXT
// (names, addresses) and never re-render it as raw HTML, we decode that small,
// known set of entities back to their literal characters so values are stored
// intact.
//
// With an empty allowlist, sanitize-html only ever emits these entities:
// &amp; &lt; &gt; &quot; &#39; (and the numeric &#34; / &#x27; variants in some
// contexts). We decode exactly those.
//
// Decode order is deliberate: &amp; MUST be decoded LAST. sanitize-html
// re-encodes a literal "&" in the input as "&amp;", so a raw input like
// "&amp;lt;" round-trips to "&amp;lt;" (a literal ampersand followed by the
// text "lt;"), NOT to "<". Decoding the specific entities first and then
// "&amp;" -> "&" yields "&lt;" (the literal text the user typed) rather than
// double-decoding into "<".
//
// This is safe against XSS: tags are stripped BEFORE this decode step, so any
// decoded "<"/">" originates from literal user text and is never re-parsed as
// HTML — it cannot reconstruct an executable tag.
function decodeSanitizeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}

export function sanitizeField(input: string): string {
  return decodeSanitizeHtmlEntities(sanitizeHtml(input, EMPTY_ALLOWLIST_CONFIG));
}
