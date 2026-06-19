import { defineConfig } from "vite";
import { resolve } from "path";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";

function fixPageHtml(html: string, page: "popup" | "options"): string {
  return html
    .replaceAll(`../../${page}/`, "./")
    .replaceAll("../../shared/", "../shared/");
}

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/index.ts"),
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background/index.js" : "[name]/index.js",
        chunkFileNames: "shared/[name]-[hash].js",
        assetFileNames: (asset) => {
          const name = asset.name ?? "";
          if (name.includes("popup")) return "popup/popup.css";
          if (name.includes("options")) return "options/options.css";
          return "assets/[name][extname]";
        },
      },
    },
  },
  plugins: [
    {
      name: "extension-build",
      closeBundle() {
        mkdirSync("dist/popup", { recursive: true });
        mkdirSync("dist/options", { recursive: true });
        mkdirSync("dist/icons", { recursive: true });

        const htmlMoves: Array<[string, string]> = [
          ["dist/src/popup/index.html", "dist/popup/index.html"],
          ["dist/src/options/index.html", "dist/options/index.html"],
        ];

        for (const [from, to] of htmlMoves) {
          if (existsSync(from)) renameSync(from, to);
        }

        if (existsSync("dist/popup/index.html")) {
          writeFileSync(
            "dist/popup/index.html",
            fixPageHtml(readFileSync("dist/popup/index.html", "utf8"), "popup"),
          );
        }
        if (existsSync("dist/options/index.html")) {
          writeFileSync(
            "dist/options/index.html",
            fixPageHtml(
              readFileSync("dist/options/index.html", "utf8"),
              "options",
            ),
          );
        }

        if (existsSync("dist/src")) {
          rmSync("dist/src", { recursive: true });
        }

        copyFileSync("manifest.json", "dist/manifest.json");
        copyFileSync("public/icons/icon16.png", "dist/icons/icon16.png");
        copyFileSync("public/icons/icon48.png", "dist/icons/icon48.png");
        copyFileSync("public/icons/icon128.png", "dist/icons/icon128.png");
      },
    },
  ],
});
