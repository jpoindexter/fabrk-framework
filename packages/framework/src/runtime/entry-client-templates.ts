export const ENTRY_CLIENT_CODE = `
import { createFromReadableStream } from "react-server-dom-webpack/client";
import { rscStream } from "rsc-html-stream/client";
import { hydrateRoot, createRoot } from "react-dom/client";
import * as React from "react";

const NAVIGATE_EVENT = "fabrk:navigate";
const contentPromise = createFromReadableStream(rscStream);
let currentContent = contentPromise;

function App() {
  return React.use(currentContent);
}

const rootEl = document.getElementById("root");
let reactRoot;

if (rootEl) {
  reactRoot = hydrateRoot(rootEl, React.createElement(App));
}

window.__FABRK_RSC_NAVIGATE__ = async function(url) {
  const rscUrl = url.endsWith("/") ? url.slice(0, -1) + ".rsc" : url + ".rsc";
  const response = await fetch(rscUrl);
  if (!response.ok) {
    window.location.href = url;
    return;
  }
  currentContent = createFromReadableStream(response.body);
  if (reactRoot) {
    React.startTransition(() => {
      reactRoot.render(React.createElement(App));
      window.dispatchEvent(new CustomEvent(NAVIGATE_EVENT));
    });
  }
};

// Accept HMR updates so RSC state survives hot reloads
if (import.meta.hot) {
  import.meta.hot.accept();
}
`;

export const ENTRY_CLIENT_HYDRATE_CODE = `
import { hydrateRoot } from 'react-dom/client';
import * as React from 'react';
import { routes } from 'virtual:fabrk/routes';

function patternToRegex(pattern) {
  const p = pattern
    .replace(/\\[\\.\\.\\.(\\w+)\\]/g, '(.+)')
    .replace(/\\[(\\w+)\\]/g, '([^/]+)');
  return new RegExp('^' + p + '$');
}

function extractParams(pattern, pathname) {
  const paramNames = [];
  const re = /\\[(?:\\.\\.\\.)?([\\w]+)\\]/g;
  let m;
  while ((m = re.exec(pattern)) !== null) paramNames.push(m[1]); // eslint-disable-line
  const match = pathname.match(patternToRegex(pattern));
  if (!match) return {};
  const params = {};
  paramNames.forEach((name, i) => { params[name] = match[i + 1] ?? ''; });
  return params;
}

let reactRoot = null;

function renderCurrentRoute() {
  const pathname = window.location.pathname.replace(/\\/+$/, '') || '/';
  const searchParams = Object.fromEntries(new URLSearchParams(window.location.search));

  for (const route of routes) {
    if (route.type !== 'page') continue;
    if (pathname.match(patternToRegex(route.pattern)) && route.module.default) {
      const params = extractParams(route.pattern, pathname);
      window.__FABRK_PARAMS__ = params;
      const root = document.getElementById('root');
      if (!root) return;
      const el = React.createElement(route.module.default, { params, searchParams });
      if (!reactRoot) {
        reactRoot = hydrateRoot(root, el);
      } else {
        React.startTransition(() => reactRoot.render(el));
      }
      break;
    }
  }
}

renderCurrentRoute();
window.__FABRK_NAVIGATE__ = renderCurrentRoute;
window.addEventListener('popstate', renderCurrentRoute);

if (import.meta.hot) {
  import.meta.hot.accept();
}
`;
