/**
 * fabrk build — Production build with config validation.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, hasFabrkConfig, runCommand } from './helpers';
import { generateFabrkDir } from './fabrk-dir';

export function registerBuildCommand(program: Command): void {
  program
    .command('build')
    .description('Build the FABRK application with config validation')
    .action(() => {
      const root = findProjectRoot();
      const configPath = hasFabrkConfig(root) ? 'fabrk.config.ts' : null;

      if (configPath) {
        console.log(chalk.green('[FABRK]') + chalk.dim(` Config validated: ${configPath}`));
      } else {
        console.log(chalk.yellow('[FABRK]') + chalk.dim(' No fabrk.config.ts found — using defaults'));
      }

      // Generate .fabrk/ directory
      generateFabrkDir({ root, configPath });

      const hasFramework = fs.existsSync(path.join(root, 'node_modules', '@fabrk', 'framework'));
      if (hasFramework) {
        console.log(chalk.green('[FABRK]') + chalk.dim(' Building with Vite...\n'));
        runCommand('npx', ['fabrk', 'build'], root);
      } else {
        console.log(chalk.green('[FABRK]') + chalk.dim(' Building with Next.js...\n'));
        runCommand('npx', ['next', 'build'], root);
      }
    });
}
