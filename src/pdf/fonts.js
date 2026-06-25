// Browser asset loader: Vite emits hashed URLs for the font/logo; we fetch them
// as bytes for pdf-lib (font embedded as a subset, logo embedded as PNG).
import fontUrl from "../assets/fonts/OpenGostTypeA-Regular.ttf";
import logoUrl from "../assets/logo.jpg";

let cache;
export async function loadAssets() {
  if (cache) return cache;
  const [f, l] = await Promise.all([
    fetch(fontUrl).then((r) => r.arrayBuffer()),
    fetch(logoUrl).then((r) => r.arrayBuffer()),
  ]);
  cache = { fontBytes: new Uint8Array(f), logoBytes: new Uint8Array(l) };
  return cache;
}
