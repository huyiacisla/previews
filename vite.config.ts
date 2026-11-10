import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "src");

const listHtml = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === "partials") return [];
    return statSync(full).isDirectory() ? listHtml(full) : full.endsWith(".html") ? [full] : [];
  });

// <!--include:partials/x.html--> → nội dung file; chỉ phục vụ preview tĩnh.
const includes = (): Plugin => ({
  name: "preview-includes",
  transformIndexHtml: {
    order: "pre",
    handler: (html) =>
      html.replace(/<!--include:([\w./-]+)-->/g, (_, file: string) => readFileSync(join(root, file), "utf8")),
  },
});

export default defineConfig({
  root,
  plugins: [includes(), tailwindcss()],
  server: { port: 3590, strictPort: true },
  build: {
    outDir: resolve(root, "../dist"),
    emptyOutDir: true,
    rollupOptions: { input: listHtml(root) },
  },
});
