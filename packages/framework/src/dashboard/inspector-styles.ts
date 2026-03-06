/** CSS for the /__ai dev dashboard. */
export function getDashboardStyles(): string {
  return `
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
  `;
}
