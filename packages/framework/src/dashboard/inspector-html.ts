export function generateDashboardHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>fabrk /__ai dashboard</title>
  <style>
    :root {
      --db-bg:        #0a0a0a;
      --db-fg:        #00ff41;
      --db-error:     #ff4141;
      --db-surface:   #1a1a1a;
      --db-border:    #1a1a1a;
      --db-muted:     #888;
      --db-dim:       #666;
      --db-panel:     #111;
      --db-dialog-border: #333;
      --db-close-border:  #444;
      --db-close-color:   #888;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: var(--db-bg); color: var(--db-fg);
      padding: 2rem;
    }
    h1 { font-size: 1.2rem; border-bottom: 1px solid var(--db-fg); padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 1.5rem; }
    h1:first-of-type { margin-top: 0; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1rem; }
    .stat { border: 1px solid var(--db-fg); padding: 1rem; }
    .stat-label { font-size: 0.7rem; opacity: 0.6; text-transform: uppercase; }
    .stat-value { font-size: 1.5rem; margin-top: 0.25rem; }
    .stat-value.error { color: var(--db-error); }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid var(--db-border); }
    th { opacity: 0.6; text-transform: uppercase; font-size: 0.7rem; }
    .bar-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; }
    .bar-label { width: 120px; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-track { flex: 1; height: 16px; background: var(--db-surface); }
    .bar-fill { height: 100%; background: var(--db-fg); transition: width 0.3s; }
    .bar-value { width: 80px; font-size: 0.7rem; text-align: right; }
    .chart { height: 80px; display: flex; align-items: flex-end; gap: 2px; margin-bottom: 1rem; }
    .chart-bar { background: var(--db-fg); min-width: 4px; flex: 1; transition: height 0.3s; }
    .actions { margin-top: 1rem; }
    .btn { background: none; border: 1px solid var(--db-fg); color: var(--db-fg); font-family: inherit; font-size: 0.75rem; padding: 0.5rem 1rem; cursor: pointer; text-transform: uppercase; }
    .btn:hover { background: var(--db-fg); color: var(--db-bg); }
    .refresh { font-size: 0.7rem; opacity: 0.4; margin-top: 1rem; }
    .error-msg { color: var(--db-error); font-size: 0.75rem; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty { opacity: 0.3; font-size: 0.8rem; padding: 1rem 0; }
    #inspector-dialog {
      background: var(--db-bg);
      color: var(--db-fg);
      border: 1px solid var(--db-dialog-border);
      border-radius: 4px;
      max-width: 900px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 20px;
    }
    #inspector-dialog::backdrop { background: rgba(0,0,0,0.7); }
    .inspector-section { margin-bottom: 16px; }
    .inspector-section h3 { color: var(--db-muted); font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; }
    .msg { margin-bottom: 8px; }
    .msg .role { font-size: 10px; color: var(--db-dim); display: block; margin-bottom: 2px; }
    .msg pre { margin: 0; font-size: 11px; white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; background: var(--db-panel); padding: 8px; border-radius: 2px; }
    .inspector-meta { font-size: 11px; color: var(--db-muted); border-top: 1px solid var(--db-surface); padding-top: 8px; margin-top: 12px; }
    .inspector-close { float: right; background: none; border: 1px solid var(--db-close-border); color: var(--db-close-color); font-family: inherit; font-size: 0.7rem; padding: 0.25rem 0.5rem; cursor: pointer; text-transform: uppercase; }
    .inspector-close:hover { border-color: var(--db-fg); color: var(--db-fg); }
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

        var tbody = document.getElementById('callsBody');
        tbody.textContent = '';
        data.calls.slice(-20).reverse().forEach(function(c) {
          var tr = document.createElement('tr');
          var fields = [
            new Date(c.timestamp).toLocaleTimeString(), c.agent, c.model,
            String(c.tokens), '$' + c.cost.toFixed(4),
            c.durationMs != null ? c.durationMs + 'ms' : '?'
          ];
          fields.forEach(function(f) {
            var td = document.createElement('td');
            td.textContent = f;
            tr.appendChild(td);
          });
          var btnCell = document.createElement('td');
          var btn = document.createElement('button');
          btn.className = 'btn';
          btn.setAttribute('data-inspect-id', c.id);
          btn.textContent = '[INSPECT]';
          btnCell.appendChild(btn);
          tr.appendChild(btnCell);
          tbody.appendChild(tr);
        });

        var toolTbody = document.getElementById('toolCallsBody');
        toolTbody.textContent = '';
        data.toolCalls.slice(-20).reverse().forEach(function(tc) {
          toolTbody.appendChild(makeTableRow([
            new Date(tc.timestamp).toLocaleTimeString(), tc.agent, tc.tool,
            tc.durationMs + 'ms', '#' + tc.iteration
          ]));
        });

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

    function el(tag, attrs, text) {
      var node = document.createElement(tag);
      Object.entries(attrs || {}).forEach(function(kv) { node.setAttribute(kv[0], kv[1]); });
      if (text !== undefined) node.textContent = String(text);
      return node;
    }

    async function inspectCall(callId) {
      try {
        var resp = await fetch('/__ai/api/calls/' + encodeURIComponent(callId));
        if (!resp.ok) return;
        var call = await resp.json();
        var body = document.getElementById('inspector-body');
        body.replaceChildren();
        var section = el('div', { class: 'inspector-section' });
        section.appendChild(el('h3', {}, 'INPUT (' + (call.inputMessages ? call.inputMessages.length : 0) + ' messages)'));
        (call.inputMessages || []).forEach(function(msg) {
          var row = el('div', { class: 'msg' });
          row.appendChild(el('span', { class: 'role' }, '[' + String(msg.role).toUpperCase() + ']'));
          row.appendChild(el('pre', {}, String(msg.content)));
          section.appendChild(row);
        });
        body.appendChild(section);
        var outSection = el('div', { class: 'inspector-section' });
        outSection.appendChild(el('h3', {}, 'OUTPUT'));
        outSection.appendChild(el('pre', {}, call.outputText || '(not captured)'));
        body.appendChild(outSection);
        var meta = el('div', { class: 'inspector-meta' });
        meta.textContent = 'Model: ' + String(call.model) + ' · Tokens: ' + String(call.tokens) + ' · Latency: ' + String(call.durationMs != null ? call.durationMs : '?') + 'ms · Cost: $' + (+(call.cost || 0)).toFixed(6);
        body.appendChild(meta);
        document.getElementById('inspector-dialog').showModal();
      } catch(e) {}
    }

    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-inspect-id]');
      if (btn) inspectCall(btn.getAttribute('data-inspect-id'));
    });

    var dialog = document.getElementById('inspector-dialog');
    if (dialog) {
      dialog.addEventListener('click', function(e) {
        if (e.target === dialog) dialog.close();
      });
    }

    document.getElementById('inspector-close-btn').addEventListener('click', function() {
      document.getElementById('inspector-dialog').close();
    });

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

    var refreshPending = false;
    function debouncedRefresh() {
      if (refreshPending) return;
      refreshPending = true;
      refresh().finally(function() { refreshPending = false; });
    }
    debouncedRefresh();

    if (typeof EventSource !== 'undefined') {
      var es = new EventSource('/__ai/events');
      es.onmessage = function(e) {
        try {
          var data = JSON.parse(e.data);
          if (data.type === 'call-recorded') debouncedRefresh();
        } catch(_) {}
      };
      es.onerror = function() { es.close(); };
    }

    setInterval(debouncedRefresh, 2000);
  </script>
</body>
</html>`;
}
