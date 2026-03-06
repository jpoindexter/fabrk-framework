/**
 * fabrk lint — Lint for FABRK design system compliance.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, findFiles, assertWithinProject } from './helpers';

export function registerLintCommand(program: Command): void {
  program
    .command('lint')
    .description('Lint for FABRK design system compliance')
    .option('--fix', 'Attempt to fix issues automatically')
    .option('--dir <dir>', 'Directory to lint', 'src')
    .action(async (options) => {
      const root = findProjectRoot();
      const targetDir = path.resolve(root, options.dir);
      assertWithinProject(root, targetDir);
      const spinner = ora('Scanning for design system violations...').start();

      if (!fs.existsSync(targetDir)) {
        const appDir = path.resolve(root, 'app');
        if (!fs.existsSync(appDir)) {
          spinner.fail(`Directory not found: ${options.dir}`);
          process.exit(1);
        }
      }

      const files = findFiles(targetDir, ['.tsx', '.jsx']);

      if (files.length === 0) {
        spinner.info('No TSX/JSX files found');
        return;
      }

      spinner.text = `Linting ${files.length} files...`;

      let totalIssues = 0;
      const results: Array<{ file: string; issues: string[] }> = [];

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const issues: string[] = [];

        // Matches all Tailwind color names with numeric shade (e.g. bg-blue-500, text-gray-50)
        // and bare white/black specifiers (e.g. bg-white, text-black).
        // Keep in sync with DS_HARDCODED_COLORS and DS_BARE_RE in eslint.config.js.
        const colorRegex = /(?:bg|text|border|ring|fill|stroke|outline|decoration|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+|(?:bg|text|border|ring)-(?:white|black)/g;
        const colorMatches = content.match(colorRegex);
        if (colorMatches) {
          const unique = [...new Set(colorMatches)];
          issues.push(`Hardcoded colors: ${unique.slice(0, 3).join(', ')}${unique.length > 3 ? ` (+${unique.length - 3} more)` : ''}`);
        }

        const radiusRegex = /\brounded-(?:sm|md|lg|xl|2xl|3xl|full)\b/g;
        const radiusMatches = content.match(radiusRegex);
        if (radiusMatches) {
          const nonSwitchRadius = radiusMatches.filter(r => r !== 'rounded-full');
          if (nonSwitchRadius.length > 0) {
            issues.push(`Hardcoded radius (use mode.radius): ${[...new Set(nonSwitchRadius)].join(', ')}`);
          }
        }

        // font-mono violates design system — must use mode.font so the monospace
        // font adapts with the active theme instead of being hardcoded.
        if (/\bfont-mono\b/.test(content)) {
          const count = (content.match(/\bfont-mono\b/g) ?? []).length;
          issues.push(`Hardcoded font-mono (use mode.font from @fabrk/design-system): ${count} occurrence${count > 1 ? 's' : ''}`);
        }

        const inlineStyleRegex = /style\s*=\s*\{\{/g;
        const inlineMatches = content.match(inlineStyleRegex);
        if (inlineMatches) {
          issues.push(`Inline styles found (${inlineMatches.length} occurrences)`);
        }

        if (content.includes('dangerously' + 'SetInnerHTML')) {
          issues.push('dangerouslySetInnerHTML usage detected');
        }

        if (issues.length > 0) {
          totalIssues += issues.length;
          results.push({ file: path.relative(root, file), issues });
        }
      }

      if (totalIssues === 0) {
        spinner.succeed(chalk.green(`All ${files.length} files pass FABRK lint`));
      } else {
        spinner.warn(chalk.yellow(`Found ${totalIssues} issues in ${results.length} files`));
        console.log();
        for (const result of results) {
          console.log(chalk.bold(result.file));
          for (const issue of result.issues) {
            console.log(chalk.dim('  ') + chalk.yellow('⚠') + chalk.dim(` ${issue}`));
          }
          console.log();
        }
      }
    });
}
