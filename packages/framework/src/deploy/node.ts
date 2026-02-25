import fs from "node:fs";
import path from "node:path";

/**
 * Generate a Node.js standalone server entry.
 * Creates dist/standalone/server.mjs + package.json.
 */
export function generateNodeStandalone(root: string, outDir: string) {
  const standaloneDir = path.join(outDir, "standalone");
  fs.mkdirSync(standaloneDir, { recursive: true });

  // Server entry
  const serverEntry = `
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const clientDir = join(__dirname, '..', 'client');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', \`http://localhost:\${PORT}\`);

  // Try static files first
  const staticPath = join(clientDir, url.pathname);
  try {
    const content = readFileSync(staticPath);
    const ext = extname(staticPath);
    res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
    res.end(content);
    return;
  } catch {}

  // Fallback to SSR handler
  try {
    const { handler } = await import('./handler.mjs');
    await handler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(\`[fabrk] Server running on http://localhost:\${PORT}\`);
});
`.trimStart();

  fs.writeFileSync(path.join(standaloneDir, "server.mjs"), serverEntry);

  // Package.json for standalone
  const pkg = {
    name: "fabrk-standalone",
    type: "module",
    scripts: {
      start: "node server.mjs",
    },
  };

  fs.writeFileSync(
    path.join(standaloneDir, "package.json"),
    JSON.stringify(pkg, null, 2)
  );

  return standaloneDir;
}
