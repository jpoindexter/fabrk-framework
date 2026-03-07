/**
 * fabrk start — Start production server.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, runCommand, validatePort } from './helpers';

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start production server')
    .option('-p, --port <port>', 'Port number', '3000')
    .action((options) => {
      validatePort(options.port);
      const root = findProjectRoot();
      const hasFramework = fs.existsSync(path.join(root, 'node_modules', '@fabrk', 'framework'));
      if (hasFramework) {
        console.log(chalk.green('[FABRK]') + chalk.dim(` Starting production server on port ${options.port}...\n`));
        runCommand('npx', ['fabrk', 'start', '--port', options.port], root);
      } else {
        console.log(chalk.green('[FABRK]') + chalk.dim(` Starting Next.js production server on port ${options.port}...\n`));
        runCommand('npx', ['next', 'start', '-p', options.port], root);
      }
    });
}
