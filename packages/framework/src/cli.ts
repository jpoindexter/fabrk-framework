#!/usr/bin/env node

const VERSION = "0.2.0";
const command = process.argv[2];
const rawArgs = process.argv.slice(3);

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
  fabrk v${VERSION} — modular full-stack framework

  Usage: fabrk <command> [options]

  Commands:
    dev      Start dev server with file-system routing + AI agents
    build    Build for production (client + SSR + sitemap + AGENTS.md)
    start    Start production server
    info     Show project agents, tools, and prompts
    agents   List all discovered agents with config details
    check    Run health/compatibility checks on the project
    test     Run project tests via vitest

  Options:
    --port <number>    Server port (dev: 5173, start: 3000)
    --host [address]   Bind to host (use --host for 0.0.0.0)
    --target <target>  Build target: "node" (default) or "worker"
    -h, --help         Show this help
    --version          Show version

  Examples:
    fabrk dev                  Start dev server with AI agents
    fabrk build                Build for production
    fabrk start                Start production server
    fabrk info                 Show agents, tools, prompts
    fabrk agents               List all agents and config
    fabrk check                Verify project health
    fabrk test                 Run agent tests
`);
}

function run(fn: () => Promise<void>): void {
  fn().catch((e) => { console.error(e); process.exit(1); });
}

if (command === "--version" || command === "-v") {
  // eslint-disable-next-line no-console
  console.log(`fabrk v${VERSION}`);
  process.exit(0);
}

if (command === "--help" || command === "-h" || !command) {
  printHelp();
  process.exit(0);
}

const root = process.cwd();

switch (command) {
  case "dev":
    run(async () => { const { runDev } = await import("./cli/dev-command"); await runDev(root, rawArgs, VERSION); });
    break;
  case "build":
    run(async () => { const { runBuild } = await import("./cli/build-command"); await runBuild(root, rawArgs, VERSION); });
    break;
  case "start":
    run(async () => { const { runStart } = await import("./cli/start-command"); await runStart(root, rawArgs, VERSION); });
    break;
  case "info":
    run(async () => { const { runInfo } = await import("./cli/info-command"); await runInfo(root, VERSION); });
    break;
  case "agents":
    run(async () => { const { runAgents } = await import("./cli/agents-command"); await runAgents(root, VERSION); });
    break;
  case "check":
    run(async () => { const { runCheck } = await import("./cli/check-command"); await runCheck(root, VERSION); });
    break;
  case "test":
    run(async () => { const { runTest } = await import("./cli/test-command"); await runTest(root, rawArgs, VERSION); });
    break;
  default:
    console.error(`\n  Unknown command: ${command}\n`);
    printHelp();
    process.exit(1);
}
