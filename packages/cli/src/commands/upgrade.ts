/**
 * fabrk upgrade — Upgrade FABRK packages to latest versions.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execFileSync } from 'child_process';
import { findProjectRoot } from './helpers';

export function registerUpgradeCommand(program: Command): void {
  program
    .command('upgrade')
    .description('Upgrade FABRK packages to latest versions')
    .action(() => {
      const root = findProjectRoot();
      const pkgPath = path.join(root, 'package.json');

      if (!fs.existsSync(pkgPath)) {
        console.log(chalk.red('✗ No package.json found'));
        process.exit(1);
      }

      const pkg = fs.readJsonSync(pkgPath);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const fabrkDeps = Object.keys(allDeps).filter(d => d.startsWith('@fabrk/'));

      if (fabrkDeps.length === 0) {
        console.log(chalk.yellow('No @fabrk/ packages found'));
        return;
      }

      // Validate dependency names to prevent injection via crafted package.json
      const validDepName = /^[@a-zA-Z0-9/_.-]+$/;
      for (const dep of fabrkDeps) {
        if (!validDepName.test(dep)) {
          console.log(chalk.red(`✗ Invalid dependency name: "${dep}"`));
          process.exit(1);
        }
      }

      const spinner = ora(`Upgrading ${fabrkDeps.length} FABRK packages...`).start();

      try {
        execFileSync('pnpm', ['update', ...fabrkDeps], { cwd: root, stdio: 'ignore' });
        spinner.succeed(`Upgraded ${fabrkDeps.length} packages: ${fabrkDeps.join(', ')}`);
      } catch {
        spinner.fail('Failed to upgrade packages');
      }
    });
}
