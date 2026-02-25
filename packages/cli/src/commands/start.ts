/**
 * fabrk start — Start production server.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import { findProjectRoot, runCommand, validatePort } from './helpers';

export function registerStartCommand(program: Command): void {
  program
    .command('start')
    .description('Start production server')
    .option('-p, --port <port>', 'Port number', '3000')
    .action((options) => {
      validatePort(options.port);
      const root = findProjectRoot();
      console.log(chalk.green('[FABRK]') + chalk.dim(` Starting production server on port ${options.port}...\n`));
      runCommand('npx', ['next', 'start', '-p', options.port], root);
    });
}
