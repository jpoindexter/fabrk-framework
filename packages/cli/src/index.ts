#!/usr/bin/env node

/**
 * create-fabrk-app — Backwards-compatible alias for `fabrk create`
 *
 * This is a thin wrapper that calls `fabrk create` with the same arguments.
 * The primary CLI is now `fabrk` (see fabrk.ts).
 */

import { execSync } from 'child_process';
import path from 'path';

const fabrkBin = path.resolve(__dirname, 'fabrk.js');
const args = process.argv.slice(2).join(' ');

try {
  execSync(`node ${fabrkBin} create ${args}`, {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
} catch {
  process.exit(1);
}
