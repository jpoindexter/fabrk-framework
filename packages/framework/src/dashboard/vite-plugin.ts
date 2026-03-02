import type { Plugin, ViteDevServer, Connect } from "vite";
import type { ServerResponse } from "node:http";
import { applySecurityHeaders } from "../middleware/security";

interface CallRecord {
  timestamp: number;
  agent: string;
  model: string;
  tokens: number;
  cost: number;
}

interface ToolCallRecord {
  timestamp: number;
  agent: string;
  tool: string;
  durationMs: number;
  iteration: number;
}

interface ErrorRecord {
  timestamp: number;
  agent: string;
  error: string;
}

let agentCount = 0;
let toolCount = 0;
let skillCount = 0;
let threadCount = 0;
let maxDelegationDepth = 0;
let mcpExposed = false;
let calls: CallRecord[] = [];
let toolCalls: ToolCallRecord[] = [];
let errors: ErrorRecord[] = [];
let totalCost = 0;

export function setAgents(count: number) {
  agentCount = count;
}

export function setTools(count: number) {
  toolCount = count;
}

export function setSkills(count: number) {
  skillCount = count;
}

export function setThreadCount(count: number) {
  threadCount = count;
}

export function setMaxDelegationDepth(depth: number) {
  maxDelegationDepth = depth;
}

export function setMCPExposed(exposed: boolean) {
  mcpExposed = exposed;
}

export function recordCall(record: CallRecord) {
  calls.push(record);
  if (Number.isFinite(record.cost)) {
    totalCost += record.cost;
  }
  if (calls.length > 100) calls = calls.slice(-100);
}

export function recordToolCall(record: ToolCallRecord) {
  toolCalls.push(record);
  if (toolCalls.length > 200) toolCalls = toolCalls.slice(-200);
}

export function recordError(record: ErrorRecord) {
  errors.push(record);
  if (errors.length > 100) errors = errors.slice(-100);
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

function getCostTrends(): Array<{ hour: string; cost: number; calls: number; byAgent: Record<string, number> }> {
  const buckets = new Map<string, { cost: number; calls: number; byAgent: Record<string, number> }>();

  for (const c of calls) {
    const d = new Date(c.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { cost: 0, calls: 0, byAgent: {} };
      buckets.set(key, bucket);
    }
    bucket.cost += c.cost;
    bucket.calls += 1;
    bucket.byAgent[c.agent] = (bucket.byAgent[c.agent] ?? 0) + c.cost;
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, data]) => ({ hour, ...data }));
}

function getToolStats(): Array<{ tool: string; count: number; avgMs: number; agents: string[] }> {
  const stats = new Map<string, { count: number; totalMs: number; agents: Set<string> }>();

  for (const tc of toolCalls) {
    let s = stats.get(tc.tool);
    if (!s) {
      s = { count: 0, totalMs: 0, agents: new Set() };
      stats.set(tc.tool, s);
    }
    s.count += 1;
    s.totalMs += tc.durationMs;
    s.agents.add(tc.agent);
  }

  return Array.from(stats.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([tool, s]) => ({
      tool,
      count: s.count,
      avgMs: Math.round(s.totalMs / s.count),
      agents: Array.from(s.agents),
    }));
}

function getErrorStats(): { total: number; byAgent: Record<string, number>; recent: ErrorRecord[] } {
  const byAgent: Record<string, number> = {};
  for (const e of errors) {
    byAgent[e.agent] = (byAgent[e.agent] ?? 0) + 1;
  }
  return { total: errors.length, byAgent, recent: errors.slice(-20).reverse() };
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
    h1 { font-size: 1.2rem; border-bottom: 1px solid #00ff41; padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 1.5rem; }
    h1:first-of-type { margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .stat { border: 1px solid #00ff41; padding: 1rem; }
    .stat-label { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; }
    .stat-value { font-size: 1.5rem; margin-top: 0.25rem; }
    .stat-value.error { color: #ff4141; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #1a1a1a; }
    th { opacity: 0.6; text-transform: uppercase; font-size: 0.7rem; }
    .bar-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .bar-label { width: 120px; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { flex: 1; height: 16px; background: #1a1a1a; }
    .bar-fill { height: 100%; background: #00ff41; transition: width 0.3s; }
    .bar-value { width: 80px; font-size: 0.7rem; text-align: right; }
    .chart { height: 80px; display: flex; align-items: flex-end; gap: 2px; margin-bottom: 1rem; }
    .chart-bar { background: #00ff41; min-width: 4px; flex: 1; transition: height 0.3s; }
    .actions { margin-top: 1rem; }
    .btn { background: none; border: 1px solid #00ff41; color: #00ff41; font-family: inherit; font-size: 0.75rem; padding: 0.5rem 1rem; cursor: pointer; text-transform: uppercase; }
    .btn:hover { background: #00ff41; color: #0a0a0a; }
    .refresh { font-size: 0.7rem; opacity: 0.4; margin-top: 1rem; }
    .error-msg { color: #ff4141; font-size: 0.75rem; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty { opacity: 0.3; font-size: 0.8rem; padding: 1rem 0; }
  </style>
</head>
<body>
  <h1>[FABRK] AI DASHBOARD</h1>
  <div class="grid">
    <div class="stat"><div class="stat-label">AGENTS</div><div class="stat-value" id="agents">0</div></div>
    <div class="stat"><div class="stat-label">TOOLS</div><div class="stat-value" id="tools">0</div></div>
    <div class="stat"><div class="stat-label">TOTAL COST</div><div class="stat-value" id="cost">$0.00</div></div>
    <div class="stat"><div class="stat-label">LLM CALLS</div><div class="stat-value" id="callCount">0</div></div>
  </div>
  <div class="grid">
    <div class="stat"><div class="stat-label">SKILLS</div><div class="stat-value" id="skills">0</div></div>
    <div class="stat"><div class="stat-label">THREADS</div><div class="stat-value" id="threads">0</div></div>
    <div class="stat"><div class="stat-label">ERRORS</div><div class="stat-value error" id="errorCount">0</div></div>
    <div class="stat"><div class="stat-label">MCP</div><div class="stat-value" id="mcp">OFF</div></div>
  </div>

  <h1>COST TREND</h1>
  <div class="chart" id="costChart"></div>

  <h1>TOOL USAGE</h1>
  <div id="toolStats"></div>

  <h1>RECENT CALLS</h1>
  <table>
    <thead><tr><th>TIME</th><th>AGENT</th><th>MODEL</th><th>TOKENS</th><th>COST</th></tr></thead>
    <tbody id="callsBody"></tbody>
  </table>

  <h1>TOOL CALL TIMELINE</h1>
  <table>
    <thead><tr><th>TIME</th><th>AGENT</th><th>TOOL</th><th>DURATION</th><th>ITERATION</th></tr></thead>
    <tbody id="toolCallsBody"></tbody>
  </table>

  <h1>RECENT ERRORS</h1>
  <table>
    <thead><tr><th>TIME</th><th>AGENT</th><th>ERROR</th></tr></thead>
    <tbody id="errorsBody"></tbody>
  </table>

  <div class="actions">
    <button class="btn" id="exportBtn"> > EXPORT JSON</button>
  </div>
  <p class="refresh">Auto-refreshes every 2s</p>

  <script>
    var latestData = null;

    function makeEmpty(text) {
      var span = document.createElement('span');
      span.className = 'empty';
      span.textContent = text;
      return span;
    }

    function makeTableRow(fields) {
      var tr = document.createElement('tr');
      fields.forEach(function(f) {
        var td = document.createElement('td');
        td.textContent = f;
        tr.appendChild(td);
      });
      return tr;
    }

    function makeBarRow(label, pct, value) {
      var row = document.createElement('div');
      row.className = 'bar-row';

      var labelEl = document.createElement('div');
      labelEl.className = 'bar-label';
      labelEl.textContent = label;

      var track = document.createElement('div');
      track.className = 'bar-track';
      var fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = pct + '%';
      track.appendChild(fill);

      var valEl = document.createElement('div');
      valEl.className = 'bar-value';
      valEl.textContent = value;

      row.appendChild(labelEl);
      row.appendChild(track);
      row.appendChild(valEl);
      return row;
    }

    async function refresh() {
      try {
        var res = await fetch('/__ai/api');
        var data = await res.json();
        latestData = data;

        document.getElementById('agents').textContent = String(data.agents);
        document.getElementById('tools').textContent = String(data.tools);
        document.getElementById('cost').textContent = '$' + data.totalCost.toFixed(4);
        document.getElementById('callCount').textContent = String(data.calls.length);
        document.getElementById('skills').textContent = String(data.skills);
        document.getElementById('threads').textContent = String(data.threads);
        document.getElementById('errorCount').textContent = String(data.errorStats.total);
        document.getElementById('mcp').textContent = data.mcpExposed ? 'ON' : 'OFF';

        // Cost trend chart
        var chart = document.getElementById('costChart');
        chart.textContent = '';
        var trends = data.costTrends;
        if (trends.length === 0) {
          chart.appendChild(makeEmpty('No cost data yet'));
        } else {
          var maxCost = Math.max.apply(null, trends.map(function(t) { return t.cost; }));
          trends.forEach(function(t) {
            var bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = maxCost > 0 ? Math.max(2, (t.cost / maxCost) * 100) + '%' : '2px';
            bar.title = t.hour + ': $' + t.cost.toFixed(4) + ' (' + t.calls + ' calls)';
            chart.appendChild(bar);
          });
        }

        // Tool stats
        var toolDiv = document.getElementById('toolStats');
        toolDiv.textContent = '';
        var toolList = data.toolStats;
        if (toolList.length === 0) {
          toolDiv.appendChild(makeEmpty('No tool calls yet'));
        } else {
          var maxCount = toolList[0].count;
          toolList.forEach(function(t) {
            toolDiv.appendChild(makeBarRow(t.tool, t.count / maxCount * 100, t.count + 'x ' + t.avgMs + 'ms'));
          });
        }

        // Recent calls
        var tbody = document.getElementById('callsBody');
        tbody.textContent = '';
        data.calls.slice(-20).reverse().forEach(function(c) {
          tbody.appendChild(makeTableRow([
            new Date(c.timestamp).toLocaleTimeString(), c.agent, c.model,
            String(c.tokens), '$' + c.cost.toFixed(4)
          ]));
        });

        // Tool call timeline
        var toolTbody = document.getElementById('toolCallsBody');
        toolTbody.textContent = '';
        data.toolCalls.slice(-20).reverse().forEach(function(tc) {
          toolTbody.appendChild(makeTableRow([
            new Date(tc.timestamp).toLocaleTimeString(), tc.agent, tc.tool,
            tc.durationMs + 'ms', '#' + tc.iteration
          ]));
        });

        // Recent errors
        var errTbody = document.getElementById('errorsBody');
        errTbody.textContent = '';
        var errs = data.errorStats.recent;
        if (errs.length === 0) {
          var emptyRow = document.createElement('tr');
          var emptyTd = document.createElement('td');
          emptyTd.colSpan = 3;
          emptyTd.className = 'empty';
          emptyTd.textContent = 'No errors';
          emptyRow.appendChild(emptyTd);
          errTbody.appendChild(emptyRow);
        } else {
          errs.forEach(function(e) {
            var tr = document.createElement('tr');
            var timeTd = document.createElement('td');
            timeTd.textContent = new Date(e.timestamp).toLocaleTimeString();
            var agentTd = document.createElement('td');
            agentTd.textContent = e.agent;
            var errTd = document.createElement('td');
            errTd.className = 'error-msg';
            errTd.textContent = e.error;
            errTd.title = e.error;
            tr.appendChild(timeTd);
            tr.appendChild(agentTd);
            tr.appendChild(errTd);
            errTbody.appendChild(tr);
          });
        }
      } catch(e) {}
    }

    document.getElementById('exportBtn').addEventListener('click', function() {
      if (!latestData) return;
      var blob = new Blob([JSON.stringify(latestData, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'fabrk-dashboard-' + new Date().toISOString().slice(0, 19) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

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
        server.middlewares.use((req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          const url = req.url ?? "/";
          const pathname = url.split("?")[0];

          if (!pathname.startsWith("/__ai")) return next();

          const remoteAddr = req.socket?.remoteAddress;
          if (
            remoteAddr &&
            remoteAddr !== "127.0.0.1" &&
            remoteAddr !== "::1" &&
            remoteAddr !== "::ffff:127.0.0.1"
          ) {
            res.statusCode = 403;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(JSON.stringify({ error: "Dashboard only available on localhost" }));
            return;
          }

          if (pathname === "/__ai/api/export") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", "attachment; filename=fabrk-dashboard-export.json");
            applySecurityHeaders(res);
            res.end(
              JSON.stringify({
                exportedAt: new Date().toISOString(),
                agents: agentCount,
                tools: toolCount,
                totalCost,
                calls,
                toolCalls,
                errors,
                costTrends: getCostTrends(),
                toolStats: getToolStats(),
                errorStats: getErrorStats(),
              }, null, 2)
            );
            return;
          }

          if (pathname === "/__ai/api") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            applySecurityHeaders(res);
            res.end(
              JSON.stringify({
                agents: agentCount,
                tools: toolCount,
                skills: skillCount,
                threads: threadCount,
                maxDelegationDepth,
                mcpExposed,
                calls,
                toolCalls,
                totalCost,
                costTrends: getCostTrends(),
                toolStats: getToolStats(),
                errorStats: getErrorStats(),
              })
            );
            return;
          }

          if (pathname === "/__ai" || pathname === "/__ai/") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/html");
            applySecurityHeaders(res);
            res.end(generateDashboardHtml());
            return;
          }

          next();
        });
      };
    },
  };
}
