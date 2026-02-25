/**
 * fabrk generate — Generate FABRK files from templates.
 *
 * Sub-commands: component, page, api, ai-rules
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { findProjectRoot, toKebabCase, toPascalCase, assertWithinProject, validateName } from './helpers';
import { generateManifest } from './fabrk-dir';
import {
  generateComponentTemplate,
  generatePageTemplate,
  generateApiTemplate,
  generateAIRules,
} from './templates';

export function registerGenerateCommand(program: Command): void {
  const generate = program
    .command('generate')
    .alias('g')
    .description('Generate FABRK files from templates');

  generate
    .command('component <name>')
    .description('Generate a new UI component')
    .option('--dir <dir>', 'Target directory', 'src/components')
    .action((name: string, options) => {
      validateName(name);
      const root = findProjectRoot();
      const componentDir = path.resolve(root, options.dir);
      assertWithinProject(root, componentDir);
      const fileName = toKebabCase(name);
      const componentName = toPascalCase(name);
      const filePath = path.join(componentDir, `${fileName}.tsx`);

      if (fs.existsSync(filePath)) {
        console.log(chalk.red(`✗ Component already exists: ${filePath}`));
        process.exit(1);
      }

      fs.ensureDirSync(componentDir);
      fs.writeFileSync(filePath, generateComponentTemplate(componentName));
      console.log(chalk.green('✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
    });

  generate
    .command('page <name>')
    .description('Generate a new page')
    .option('--dir <dir>', 'Target directory', 'app')
    .action((name: string, options) => {
      validateName(name);
      const root = findProjectRoot();
      const pageName = toKebabCase(name);
      const pageDir = path.resolve(root, options.dir, pageName);
      assertWithinProject(root, pageDir);
      const filePath = path.join(pageDir, 'page.tsx');

      if (fs.existsSync(filePath)) {
        console.log(chalk.red(`✗ Page already exists: ${filePath}`));
        process.exit(1);
      }

      fs.ensureDirSync(pageDir);
      fs.writeFileSync(filePath, generatePageTemplate(toPascalCase(name)));
      console.log(chalk.green('✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
    });

  generate
    .command('api <name>')
    .description('Generate a new API route')
    .option('--dir <dir>', 'Target directory', 'app/api')
    .action((name: string, options) => {
      validateName(name);
      const root = findProjectRoot();
      const routeName = toKebabCase(name);
      const routeDir = path.resolve(root, options.dir, routeName);
      assertWithinProject(root, routeDir);
      const filePath = path.join(routeDir, 'route.ts');

      if (fs.existsSync(filePath)) {
        console.log(chalk.red(`✗ API route already exists: ${filePath}`));
        process.exit(1);
      }

      fs.ensureDirSync(routeDir);
      fs.writeFileSync(filePath, generateApiTemplate(name));
      console.log(chalk.green('✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
    });

  generate
    .command('ai-rules')
    .description('Generate CLAUDE.md / cursor rules from project config')
    .action(() => {
      const root = findProjectRoot();
      const filePath = path.join(root, 'CLAUDE.md');

      const manifest = generateManifest(root);
      const rules = generateAIRules(root, manifest);

      fs.writeFileSync(filePath, rules);
      console.log(chalk.green('✓') + chalk.dim(` Generated ${path.relative(root, filePath)}`));
      console.log(chalk.dim('  AI agents will use this file to understand your project'));
    });
}
