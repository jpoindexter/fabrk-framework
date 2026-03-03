import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanRoutes } from "../runtime/router";

function createTempApp(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabrk-islands-"));
  return tmpDir;
}

describe("Server Islands", () => {
  it("scans island.*.tsx files from route directory", () => {
    const appDir = createTempApp();
    const blogDir = path.join(appDir, "blog");
    fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(path.join(blogDir, "page.tsx"), "export default function Blog() { return null; }");
    fs.writeFileSync(path.join(blogDir, "island.comments.tsx"), "export default function Comments() { return null; }");
    fs.writeFileSync(path.join(blogDir, "island.sidebar.tsx"), "export default function Sidebar() { return null; }");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].islands).toBeDefined();
    expect(Object.keys(routes[0].islands!)).toHaveLength(2);
    expect(routes[0].islands!["comments"]).toContain("island.comments.tsx");
    expect(routes[0].islands!["sidebar"]).toContain("island.sidebar.tsx");

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("does not attach islands when no island files exist", () => {
    const appDir = createTempApp();
    const aboutDir = path.join(appDir, "about");
    fs.mkdirSync(aboutDir, { recursive: true });
    fs.writeFileSync(path.join(aboutDir, "page.tsx"), "export default function About() { return null; }");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].islands).toBeUndefined();

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("supports different extensions: .ts, .jsx, .js", () => {
    const appDir = createTempApp();
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() { return null; }");
    fs.writeFileSync(path.join(appDir, "island.auth.ts"), "export default function Auth() { return null; }");
    fs.writeFileSync(path.join(appDir, "island.nav.jsx"), "export default function Nav() { return null; }");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].islands).toBeDefined();
    expect(routes[0].islands!["auth"]).toContain("island.auth.ts");
    expect(routes[0].islands!["nav"]).toContain("island.nav.jsx");

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("islands are scoped to their route directory", () => {
    const appDir = createTempApp();
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() { return null; }");
    fs.writeFileSync(path.join(appDir, "island.root.tsx"), "export default function Root() { return null; }");

    const blogDir = path.join(appDir, "blog");
    fs.mkdirSync(blogDir, { recursive: true });
    fs.writeFileSync(path.join(blogDir, "page.tsx"), "export default function Blog() { return null; }");
    fs.writeFileSync(path.join(blogDir, "island.comments.tsx"), "export default function Comments() { return null; }");

    const routes = scanRoutes(appDir);
    const homeRoute = routes.find((r) => r.pattern === "/");
    const blogRoute = routes.find((r) => r.pattern === "/blog");

    expect(homeRoute?.islands).toBeDefined();
    expect(homeRoute?.islands!["root"]).toBeDefined();
    expect(homeRoute?.islands!["comments"]).toBeUndefined();

    expect(blogRoute?.islands).toBeDefined();
    expect(blogRoute?.islands!["comments"]).toBeDefined();
    expect(blogRoute?.islands!["root"]).toBeUndefined();

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("ignores non-island files with similar naming", () => {
    const appDir = createTempApp();
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() { return null; }");
    fs.writeFileSync(path.join(appDir, "island-helper.ts"), "export const helper = true;");
    fs.writeFileSync(path.join(appDir, "my-island.tsx"), "export default function X() { return null; }");

    const routes = scanRoutes(appDir);
    expect(routes).toHaveLength(1);
    expect(routes[0].islands).toBeUndefined();

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("Route.islands type is Record<string, string>", () => {
    const appDir = createTempApp();
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() { return null; }");
    fs.writeFileSync(path.join(appDir, "island.footer.tsx"), "export default function Footer() { return null; }");

    const routes = scanRoutes(appDir);
    const islands = routes[0].islands!;
    expect(typeof islands).toBe("object");
    expect(typeof islands["footer"]).toBe("string");

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("islands with hyphenated names are scanned correctly", () => {
    const appDir = createTempApp();
    fs.writeFileSync(path.join(appDir, "page.tsx"), "export default function Home() { return null; }");
    fs.writeFileSync(path.join(appDir, "island.social-share.tsx"), "export default function Social() { return null; }");

    const routes = scanRoutes(appDir);
    expect(routes[0].islands).toBeDefined();
    expect(routes[0].islands!["social-share"]).toBeDefined();

    fs.rmSync(appDir, { recursive: true, force: true });
  });

  it("page-builder wraps islands in Suspense boundaries", async () => {
    const { buildPageTree } = await import("../runtime/page-builder");
    const React = await import("react");

    function Page() { return React.createElement("div", null, "Page"); }
    function CommentsIsland() { return React.createElement("div", null, "Comments"); }
    function SidebarIsland() { return React.createElement("div", null, "Sidebar"); }

    const element = buildPageTree({
      route: {
        pattern: "/blog",
        regex: /^\/blog$/,
        paramNames: [],
        filePath: "/app/blog/page.tsx",
        layoutPaths: [],
        type: "page",
      },
      params: {},
      searchParams: {},
      modules: {
        page: Page,
        layouts: [],
        islands: {
          comments: CommentsIsland,
          sidebar: SidebarIsland,
        },
      },
      pathname: "/blog",
      React,
    });

    // The element should be a Fragment containing the page + Suspense-wrapped islands
    expect(element).toBeDefined();
    // Fragment has multiple children
    expect(element.type).toBe(React.Fragment);
  });

  it("page-builder without islands renders page directly", async () => {
    const { buildPageTree } = await import("../runtime/page-builder");
    const React = await import("react");

    function Page() { return React.createElement("div", null, "Page"); }

    const element = buildPageTree({
      route: {
        pattern: "/",
        regex: /^\/$/,
        paramNames: [],
        filePath: "/app/page.tsx",
        layoutPaths: [],
        type: "page",
      },
      params: {},
      searchParams: {},
      modules: {
        page: Page,
        layouts: [],
      },
      pathname: "/",
      React,
    });

    // Without islands, the element should be the Page component directly (not a Fragment)
    expect(element.type).toBe(Page);
  });

  it("multiple islands each get their own Suspense boundary", async () => {
    const { buildPageTree } = await import("../runtime/page-builder");
    const React = await import("react");

    function Page() { return React.createElement("div", null, "Page"); }
    function A() { return React.createElement("span", null, "A"); }
    function B() { return React.createElement("span", null, "B"); }
    function C() { return React.createElement("span", null, "C"); }

    const element = buildPageTree({
      route: {
        pattern: "/test",
        regex: /^\/test$/,
        paramNames: [],
        filePath: "/app/test/page.tsx",
        layoutPaths: [],
        type: "page",
      },
      params: {},
      searchParams: {},
      modules: {
        page: Page,
        layouts: [],
        islands: { a: A, b: B, c: C },
      },
      pathname: "/test",
      React,
    });

    expect(element.type).toBe(React.Fragment);
    // 1 page + 3 islands = 4 children
    const children = (element.props as { children: unknown[] }).children;
    expect(children).toHaveLength(4);
  });
});
