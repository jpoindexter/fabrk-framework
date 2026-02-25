import fs from "node:fs";
import path from "node:path";

/**
 * Generate Vercel Build Output API structure.
 * Creates .vercel/output/ with config.json + functions.
 */
export function generateVercelOutput(root: string, outDir: string) {
  const vercelDir = path.join(outDir, ".vercel", "output");
  fs.mkdirSync(vercelDir, { recursive: true });

  // Output config
  const config = {
    version: 3,
    routes: [
      {
        handle: "filesystem",
      },
      {
        src: "/api/agents/(.*)",
        dest: "/api/agents/$1",
      },
      {
        src: "/(.*)",
        dest: "/index",
      },
    ],
  };

  fs.writeFileSync(
    path.join(vercelDir, "config.json"),
    JSON.stringify(config, null, 2)
  );

  // Static output directory
  const staticDir = path.join(vercelDir, "static");
  fs.mkdirSync(staticDir, { recursive: true });

  // Serverless function directory
  const funcDir = path.join(vercelDir, "functions", "index.func");
  fs.mkdirSync(funcDir, { recursive: true });

  // vc-config.json for the function
  const vcConfig = {
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
  };

  fs.writeFileSync(
    path.join(funcDir, ".vc-config.json"),
    JSON.stringify(vcConfig, null, 2)
  );

  // Function entry stub
  const funcEntry = `
export default async function handler(req, res) {
  try {
    const { handler: ssrHandler } = await import('./server/handler.mjs');
    await ssrHandler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
`.trimStart();

  fs.writeFileSync(path.join(funcDir, "index.mjs"), funcEntry);

  return vercelDir;
}
