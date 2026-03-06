/** Inspector dialog, export button, and SSE event-binding scripts. */
export function getDashboardEventScripts(): string {
  return `
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
  `;
}
