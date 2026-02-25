/**
 * fabrk info — Show FABRK project information.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, hasFabrkConfig } from './helpers';

export function registerInfoCommand(program: Command): void {
  program
    .command('info')
    .description('Show FABRK project information')
    .action(() => {
      const root = findProjectRoot();
      const hasConfig = hasFabrkConfig(root);
      const pkgPath = path.join(root, 'package.json');

      console.log(chalk.bold.green('\n[FABRK PROJECT INFO]\n'));

      if (fs.existsSync(pkgPath)) {
        const pkg = fs.readJsonSync(pkgPath);
        console.log(chalk.dim('  Name:    ') + pkg.name);
        console.log(chalk.dim('  Version: ') + (pkg.version || 'N/A'));

        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const fabrkDeps = Object.keys(allDeps).filter(d => d.startsWith('@fabrk/'));
        if (fabrkDeps.length > 0) {
          console.log(chalk.dim('  Packages:'));
          for (const dep of fabrkDeps) {
            console.log(chalk.dim('    ') + chalk.cyan(dep) + chalk.dim(` ${allDeps[dep]}`));
          }
        }
      }

      console.log(chalk.dim('  Config:  ') + (hasConfig ? chalk.green('fabrk.config.ts') : chalk.yellow('none')));
      console.log(chalk.dim('  Root:    ') + root);
      console.log();
    });
}
