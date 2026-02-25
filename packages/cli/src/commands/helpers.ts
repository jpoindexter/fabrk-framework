/**
 * Shared CLI helpers used across all commands.
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';

const MAX_DEPTH = 10;

export function findProjectRoot(): string {
  let dir = process.cwd();
  let depth = 0;
  while (dir !== path.dirname(dir) && depth < MAX_DEPTH) {
    if (fs.existsSync(path.join(dir, 'fabrk.config.ts')) ||
        fs.existsSync(path.join(dir, 'fabrk.config.js'))) {
      return dir;
    }
    dir = path.dirname(dir);
    depth++;
  }
  return process.cwd();
}

export function assertWithinProject(root: string, targetPath: string): void {
  const resolved = path.resolve(targetPath);
  const normalizedRoot = path.resolve(root);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    console.error(chalk.red(`✗ Target path escapes project root: ${resolved}`));
    process.exit(1);
  }
  // Also check resolved symlinks
  try {
    const realPath = fs.realpathSync(resolved);
    const realRoot = fs.realpathSync(normalizedRoot);
    if (!realPath.startsWith(realRoot + path.sep) && realPath !== realRoot) {
      console.error(chalk.red(`✗ Symlink escapes project root: ${realPath}`));
      process.exit(1);
    }
  } catch { /* path doesn't exist yet, lexical check is sufficient */ }
}

export function validateName(name: string): void {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    console.error(chalk.red(`Invalid name: "${name}". Use only letters, numbers, hyphens, and underscores.`));
    process.exit(1);
  }
  if (name.length > 214) {
    console.error(chalk.red('Name is too long (max 214 characters)'));
    process.exit(1);
  }
}

export function validatePort(port: string): void {
  const num = Number(port);
  if (!Number.isInteger(num) || num < 1 || num > 65535) {
    console.error(chalk.red(`Invalid port: "${port}". Must be an integer between 1 and 65535.`));
    process.exit(1);
  }
}

export function hasFabrkConfig(root: string): boolean {
  return fs.existsSync(path.join(root, 'fabrk.config.ts')) ||
         fs.existsSync(path.join(root, 'fabrk.config.js'));
}

export function runCommand(cmd: string, args: string[], cwd: string): void {
  // Validate all arguments to prevent shell metacharacter injection
  for (const arg of args) {
    if (/[;&|`$(){}[\]!#~%^<>\r\n"']/.test(arg)) {
      console.error(chalk.red(`Invalid argument: "${arg}" contains disallowed characters`));
      process.exit(1);
    }
  }

  // On Windows, .cmd/.bat files (like npx.cmd) require shell: true.
  // On Unix, avoid shell: true to prevent command injection.
  const isWindows = process.platform === 'win32';
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('close', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (err) => {
    console.error(chalk.red(`Failed to run ${cmd}: ${err.message}`));
    process.exit(1);
  });
}

export function findFiles(dir: string, extensions: string[], maxDepth = 20): string[] {
  if (maxDepth <= 0) return [];
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;  // Skip symlinks
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...findFiles(fullPath, extensions, maxDepth - 1));
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}
