import { getDashboardEventScripts } from './inspector-events';
import { getDashboardRendererScripts } from './inspector-renderers';

/** Client-side JavaScript for the /__ai dev dashboard. */
export function getDashboardScripts(): string {
  return `
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
        renderCostChart(data);
        renderToolStats(data);
        renderCallsTable(data);
        renderToolCallsTable(data);
        renderErrorsTable(data);
      } catch(e) {}
    }

    function renderCostChart(data) {
      var chart = document.getElementById('costChart');
      chart.textContent = '';
      var trends = data.costTrends;
      if (trends.length === 0) { chart.appendChild(makeEmpty('No cost data yet')); return; }
      var maxCost = Math.max.apply(null, trends.map(function(t) { return t.cost; }));
      trends.forEach(function(t) {
        var bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.style.height = maxCost > 0 ? Math.max(2, (t.cost / maxCost) * 100) + '%' : '2px';
        bar.title = t.hour + ': $' + t.cost.toFixed(4) + ' (' + t.calls + ' calls)';
        chart.appendChild(bar);
      });
    }

    function renderToolStats(data) {
      var toolDiv = document.getElementById('toolStats');
      toolDiv.textContent = '';
      var toolList = data.toolStats;
      if (toolList.length === 0) { toolDiv.appendChild(makeEmpty('No tool calls yet')); return; }
      var maxCount = toolList[0].count;
      toolList.forEach(function(t) {
        toolDiv.appendChild(makeBarRow(t.tool, t.count / maxCount * 100, t.count + 'x ' + t.avgMs + 'ms'));
      });
    }
` + getDashboardRendererScripts() + getDashboardEventScripts();
}
