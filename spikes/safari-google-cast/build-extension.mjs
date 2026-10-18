import { build } from 'vite';
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./', import.meta.url));
const outDir = `${root}dist`;
for (const entry of ['content', 'popup']) {
  await build({
    configFile: false,
    build: {
      outDir, emptyOutDir: entry === 'content',
      lib: { entry: `${root}extension/${entry}.ts`, name: `Uvc${entry}`, formats: ['iife'], fileName: () => `${entry}.js` },
    },
  });
}
await mkdir(outDir, { recursive: true });
for (const file of ['manifest.json', 'popup.html', 'popup.css']) {
  await copyFile(`${root}extension/${file}`, `${outDir}/${file}`);
}
