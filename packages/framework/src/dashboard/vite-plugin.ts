import type { Plugin, ViteDevServer } from "vite";
import { buildSecurityHeaders } from "../middleware/security.js";

interface CallRecord {
  timestamp: number;
  agent: string;
  model: string;
  tokens: number;
  cost: number;
}

let agentCount = 0;
let toolCount = 0;
let calls: CallRecord[] = [];
let totalCost = 0;

export function setAgents(count: number) {
  agentCount = count;
}

export function setTools(count: number) {
  toolCount = count;
}

export function recordCall(record: CallRecord) {
  calls.push(record);
  totalCost += record.cost;
  if (calls.length > 100) calls = calls.slice(-100);
}

function generateDashboardHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>fabrk /__ai dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: #0a0a0a; color: #00ff41;
      padding: 2rem;
    }
    h1 { font-size: 1.2rem; border-bottom: 1px solid #00ff41; padding-bottom: 0.5rem; margin-bottom: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
    .stat { border: 1px solid #00ff41; padding: 1rem; }
    .stat-label { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; }
    .stat-value { font-size: 1.5rem; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #1a1a1a; }
    th { opacity: 0.6; text-transform: uppercase; font-size: 0.7rem; }
    .refresh { font-size: 0.7rem; opacity: 0.4; }
  </style>
</head>
<body>
  <h1>[FABRK] AI DASHBOARD</h1>
  <div class="grid">
    <div class="stat"><div class="stat-label">AGENTS</div><div class="stat-value" id="agents">0</div></div>
    <div class="stat"><div class="stat-label">TOOLS</div><div class="stat-value" id="tools">0</div></div>
    <div class="stat"><div class="stat-label">TOTAL COST</div><div class="stat-value" id="cost">$0.00</div></div>
    <div class="stat"><div class="stat-label">CALLS</div><div class="stat-value" id="callCount">0</div></div>
  </div>
  <h1>RECENT CALLS</h1>
  <table>
    <thead><tr><th>TIME</th><th>AGENT</th><th>MODEL</th><th>TOKENS</th><th>COST</th></tr></thead>
    <tbody id="callsBody"></tbody>
  </table>
  <p class="refresh">Auto-refreshes every 2s</p>
  <script>
    async function refresh() {
      try {
        const res = await fetch('/__ai/api');
        const data = await res.json();
        document.getElementById('agents').textContent = String(data.agents);
        document.getElementById('tools').textContent = String(data.tools);
        document.getElementById('cost').textContent = '$' + data.totalCost.toFixed(4);
        document.getElementById('callCount').textContent = String(data.calls.length);
        const tbody = document.getElementById('callsBody');
        tbody.textContent = '';
        data.calls.slice(-20).reverse().forEach(function(c) {
          const tr = document.createElement('tr');
          var fields = [new Date(c.timestamp).toLocaleTimeString(), c.agent, c.model, String(c.tokens), '$' + c.cost.toFixed(4)];
          fields.forEach(function(f) {
            var td = document.createElement('td');
            td.textContent = f;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      } catch(e) {}
    }
    refresh();
    setInterval(refresh, 2000);
  </script>
</body>
</html>`;
}

export function dashboardPlugin(): Plugin {
  return {
    name: "fabrk:dashboard",

    configureServer(server: ViteDevServer) {
      return () => {
        server.middlewares.use((req: any, res: any, next: any) => {
          const url: string = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (!pathname.startsWith("/__ai")) return next();

          const remoteAddr: string | undefined = req.socket?.remoteAddress;
          if (
            remoteAddr &&
            remoteAddr !== "127.0.0.1" &&
            remoteAddr !== "::1" &&
            remoteAddr !== "::ffff:127.0.0.1"
          ) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            for (const [k, v] of Object.entries(buildSecurityHeaders())) {
              res.setHeader(k, v);
            }
            res.end(JSON.stringify({ error: "Dashboard only available on localhost" }));
            return;
          }

          if (pathname === "/__ai/api") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            for (const [k, v] of Object.entries(buildSecurityHeaders())) {
              res.setHeader(k, v);
            }
            res.end(
              JSON.stringify({
                agents: agentCount,
                tools: toolCount,
                calls,
                totalCost,
              })
            );
            return;
          }

          if (pathname === "/__ai" || pathname === "/__ai/") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            for (const [k, v] of Object.entries(buildSecurityHeaders())) {
              res.setHeader(k, v);
            }
            res.end(generateDashboardHtml());
            return;
          }

          next();
        });
      };
    },
  };
}
