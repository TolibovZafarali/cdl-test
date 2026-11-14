import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.png': 'image/png', '.webp': 'image/webp' };
createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); return response.end(); }
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    const relative = file.slice(root.length + 1);
    if (!file.startsWith(root + sep) || relative.split(sep).some(part => part.startsWith('.')) || /^(scripts|tests|research|output|node_modules)\//.test(relative) || /^(package(?:-lock)?\.json|README\.md)$/.test(relative)) { response.writeHead(404); return response.end('Not found'); }
    if (!(await stat(file)).isFile()) throw new Error('Not found');
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'" });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Missouri CDL practice is ready at http://localhost:${port}`));
