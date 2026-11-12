import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
// Một tệp được nhúng có thể tự nhúng tệp khác (ví dụ client/account-settings.html nhúng client/dashboard.html, trang này nhúng partials/head.html):
// mở rộng tối đa 3 tầng cho tới khi hết dấu nhúng.
const expandIncludes = (html: string, depth = 0): string => {
  const out = html.replace(/<!--include:([\w./-]+)-->/g, (_, file: string) => readFileSync(join(root, file), "utf8"));
  return out !== html && depth < 3 ? expandIncludes(out, depth + 1) : out;
};
const includes = (): Plugin => ({
  name: "preview-includes",
  transformIndexHtml: { order: "pre", handler: (html) => expandIncludes(html) },
});

// Địa chỉ không có đuôi (/staff/workspace, /staff/settings/profile) mở đúng trang .html tương ứng, như app thật; chỉ cho máy chủ dev.
const cleanUrls = (): Plugin => ({
  name: "preview-clean-urls",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query] = (req.url || "").split("?");
      if (path && !path.endsWith("/") && !/\.[a-z0-9]+$/i.test(path) && existsSync(join(root, `${path}.html`))) req.url = `${path}.html${query ? `?${query}` : ""}`;
      next();
    });
  },
});

export default defineConfig({
  root,
  plugins: [includes(), cleanUrls(), tailwindcss()],
  server: { port: 3590, strictPort: true },
  build: {
    outDir: resolve(root, "../dist"),
    emptyOutDir: true,
    rollupOptions: { input: listHtml(root) },
  },
});
