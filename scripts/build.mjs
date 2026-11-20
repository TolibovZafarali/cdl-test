import { cp, mkdir, rm } from 'node:fs/promises';
const files = ['index.html', 'styles.css', 'app.js', 'engine.js', 'storage.js', 'keywords.js', 'sw.js', 'manifest.webmanifest', 'data', 'assets', 'source'];
await rm('dist', { recursive: true, force: true });
await mkdir('dist');
for (const file of files) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built static application in dist/');
