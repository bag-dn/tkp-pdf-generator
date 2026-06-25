import { defineConfig } from "vite";

// Project page: https://bag-dn.github.io/tkp-pdf-generator/
// base must equal "/<repo>/" so hashed assets and the pdf.js worker resolve correctly.
export default defineConfig({
  base: "/tkp-pdf-generator/",
  assetsInclude: ["**/*.ttf"],
  build: { outDir: "dist", assetsDir: "assets", emptyOutDir: true },
});
