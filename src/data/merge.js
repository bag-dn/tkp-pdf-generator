// Deep-merge `over` on top of `base`: objects merge recursively, arrays and
// primitives replace wholesale. `undefined` keeps the base value.
// (Ported verbatim from the original generator.js.)
export function merge(base, over) {
  if (Array.isArray(over) || over === null || typeof over !== "object") {
    return over === undefined ? base : over;
  }
  const out = Array.isArray(base) ? base.slice() : { ...base };
  for (const k of Object.keys(over)) out[k] = merge(base ? base[k] : undefined, over[k]);
  return out;
}
