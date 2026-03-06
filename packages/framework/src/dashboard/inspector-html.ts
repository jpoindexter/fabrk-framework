import { getDashboardStyles } from './inspector-styles';
import { getDashboardScripts } from './inspector-scripts';

export function generateDashboardHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>fabrk /__ai dashboard</title>
  <style>${getDashboardStyles()}</style>
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
    <thead><tr><th>TIME</th><th>AGENT</th><th>MODEL</th><th>TOKENS</th><th>COST</th><th>LATENCY</th><th></th></tr></thead>
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

  <dialog id="inspector-dialog">
    <button class="inspector-close" id="inspector-close-btn">[X] CLOSE</button>
    <h1 style="margin-top:0">[CALL INSPECTOR]</h1>
    <div id="inspector-body"></div>
  </dialog>

  <script>${getDashboardScripts()}</script>
</body>
</html>`;
}
