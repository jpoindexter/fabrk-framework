#!/usr/bin/env node

/**
 * create-fabrk-app — Backwards-compatible alias for `fabrk create`
 *
 * This is a thin wrapper that calls `fabrk create` with the same arguments.
 * The primary CLI is now `fabrk` (see fabrk.ts).
 */

import { execFileSync } from 'child_process';
import path from 'path';

const fabrkBin = path.resolve(__dirname, 'fabrk.js');

try {
  execFileSync('node', [fabrkBin, 'create', ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
} catch {
  process.exit(1);
}
