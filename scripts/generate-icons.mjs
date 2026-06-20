#!/usr/bin/env node
/** Generate manifest icons from public/icons/icon.svg. */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public/icons/icon.svg");
const outDir = join(root, "public/icons");

mkdirSync(outDir, { recursive: true });

for (const size of [16, 48, 128]) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon${size}.png`));
}

console.log("Generated icon16.png, icon48.png, icon128.png from public/icons/icon.svg");
