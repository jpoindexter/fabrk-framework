/**
 * fabrk dev — Start development server with config validation.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
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

      console.log(chalk.green('[FABRK]') + chalk.dim(` Starting dev server on port ${options.port}...\n`));
      runCommand('npx', ['next', 'dev', '-p', options.port], root);
    });
}
