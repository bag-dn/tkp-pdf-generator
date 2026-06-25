// Glyph fix for OpenGost Type A. Unlike the old DN GOST A, this font HAS
// the Russian guillemets and typographic punctuation natively, so we keep
// them as-is. We only replace the few codepoints the font lacks so they
// don't render as .notdef boxes.
export const fix = (t) =>
  String(t == null ? "" : t)
    .replace(/│/g, "|")  // box-drawing vertical -> pipe (missing)
    .replace(/→/g, "->") // rightwards arrow (missing)
    .replace(/ /g, " ")  // thin space -> normal space (missing)
    .replace(/ /g, " "); // nbsp -> normal space (normalize wrapping)
