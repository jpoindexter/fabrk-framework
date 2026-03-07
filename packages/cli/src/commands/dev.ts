/**
 * fabrk dev — Start development server with config validation.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, hasFabrkConfig, runCommand, validatePort } from './helpers';
import { generateFabrkDir } from './fabrk-dir';

export function registerDevCommand(program: Command): void {
  program
    .command('dev')
    .description('Start development server with FABRK config validation')
    .option('-p, --port <port>', 'Port number', '3000')
    .action((options) => {
      validatePort(options.port);
      const root = findProjectRoot();
      const configPath = hasFabrkConfig(root) ? 'fabrk.config.ts' : null;

      if (configPath) {
        console.log(chalk.green('[FABRK]') + chalk.dim(` Config detected: ${configPath}`));
      } else {
        console.log(chalk.yellow('[FABRK]') + chalk.dim(' No fabrk.config.ts found — using defaults'));
      }

      // Generate .fabrk/ directory
      generateFabrkDir({ root, configPath });

      // Detect project type: if @fabrk/framework is installed, use its CLI
      const hasFramework = fs.existsSync(path.join(root, 'node_modules', '@fabrk', 'framework'));
      if (hasFramework) {
        console.log(chalk.green('[FABRK]') + chalk.dim(` Starting Vite dev server on port ${options.port}...\n`));
        runCommand('npx', ['fabrk', 'dev', '--port', options.port], root);
      } else {
        console.log(chalk.green('[FABRK]') + chalk.dim(` Starting Next.js dev server on port ${options.port}...\n`));
        runCommand('npx', ['next', 'dev', '-p', options.port], root);
      }
    });
}
