/** Table rendering scripts for the /__ai dashboard (calls, tool calls, errors). */
export function getDashboardRendererScripts(): string {
  return `
    function renderCallsTable(data) {
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
    }

    function renderToolCallsTable(data) {
      var toolTbody = document.getElementById('toolCallsBody');
      toolTbody.textContent = '';
      data.toolCalls.slice(-20).reverse().forEach(function(tc) {
        toolTbody.appendChild(makeTableRow([
          new Date(tc.timestamp).toLocaleTimeString(), tc.agent, tc.tool,
          tc.durationMs + 'ms', '#' + tc.iteration
        ]));
      });
    }

    function renderErrorsTable(data) {
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
        return;
      }
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
  `;
}
