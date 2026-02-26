/**
 * fabrk add — Add UI components or feature modules.
 * fabrk add-theme — Install or switch design system theme.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execFileSync } from 'child_process';
import { findProjectRoot, toKebabCase, toPascalCase, assertWithinProject, validateName } from './helpers';
import {
  FEATURE_MODULES,
  AVAILABLE_THEMES,
  generateComponentTemplate,
  generateThemeCSS,
} from './templates';

export function registerAddCommand(program: Command): void {
  program
    .command('add [components...]')
    .description('Add UI components to your project (shadcn-style copy)')
    .option('--dir <dir>', 'Target directory', 'src/components/ui')
    .action((components: string[], options) => {
      const root = findProjectRoot();
      const targetDir = path.resolve(root, options.dir);
      assertWithinProject(root, targetDir);

      if (!components || components.length === 0) {
        console.log(chalk.yellow('[FABRK]') + chalk.dim(' Usage: fabrk add button card dialog'));
        console.log(chalk.dim('\nAvailable components can be browsed at the component registry.'));
        return;
      }

      const featureModules = components.filter(c => (FEATURE_MODULES as readonly string[]).includes(c));
      const uiComponents = components.filter(c => !(FEATURE_MODULES as readonly string[]).includes(c));

      for (const mod of featureModules) {
        addFeatureModule(root, mod);
      }

      if (uiComponents.length > 0) {
        addUIComponents(root, uiComponents, targetDir);
      }
    });
}

function addFeatureModule(root: string, moduleName: string): void {
  const pkgName = `@fabrk/${moduleName}`;
  const spinner = ora(`Adding ${pkgName}...`).start();

  try {
    execFileSync('pnpm', ['add', pkgName], { cwd: root, stdio: 'ignore' });
    spinner.succeed(`Added ${pkgName}`);

    console.log(chalk.dim(`  Update fabrk.config.ts to configure ${moduleName}`));
  } catch {
    spinner.fail(`Failed to add ${pkgName}`);
    console.log(chalk.dim(`  You may need to install it manually: pnpm add ${pkgName}`));
  }
}

function addUIComponents(root: string, components: string[], targetDir: string): void {
  // Validate all component names before proceeding
  for (const component of components) {
    validateName(component);
  }

  const registryPaths = [
    path.resolve(__dirname, '../registry'),
    path.resolve(__dirname, '../../registry'),
  ];

  let registryDir: string | null = null;
  for (const p of registryPaths) {
    if (fs.existsSync(p)) {
      registryDir = p;
      break;
    }
  }

  if (!registryDir) {
    // Fallback: generate basic component scaffolds
    console.log(chalk.yellow('[FABRK]') + chalk.dim(' Component registry not found — generating scaffolds'));
    fs.ensureDirSync(targetDir);

    for (const component of components) {
      const fileName = toKebabCase(component);
      const componentName = toPascalCase(component);
      const filePath = path.join(targetDir, `${fileName}.tsx`);

      if (fs.existsSync(filePath)) {
        console.log(chalk.yellow('  ⚠') + chalk.dim(` ${fileName}.tsx already exists — skipping`));
        continue;
      }

      fs.writeFileSync(filePath, generateComponentTemplate(componentName));
      console.log(chalk.green('  ✓') + chalk.dim(` Created ${path.relative(root, filePath)}`));
    }
    return;
  }

  fs.ensureDirSync(targetDir);

  for (const component of components) {
    const fileName = toKebabCase(component);
    const sourcePaths = [
      path.join(registryDir, 'ui', `${fileName}.tsx`),
      path.join(registryDir, 'charts', `${fileName}.tsx`),
      path.join(registryDir, 'ai', `${fileName}.tsx`),
      path.join(registryDir, 'admin', `${fileName}.tsx`),
      path.join(registryDir, 'security', `${fileName}.tsx`),
      path.join(registryDir, 'organization', `${fileName}.tsx`),
      path.join(registryDir, 'seo', `${fileName}.tsx`),
    ];

    let copied = false;
    for (const src of sourcePaths) {
      if (fs.existsSync(src)) {
        const dest = path.join(targetDir, `${fileName}.tsx`);
        if (fs.existsSync(dest)) {
          console.log(chalk.yellow('  ⚠') + chalk.dim(` ${fileName}.tsx already exists — skipping`));
          copied = true;
          break;
        }
        fs.copyFileSync(src, dest);
        console.log(chalk.green('  ✓') + chalk.dim(` Copied ${fileName}.tsx`));
        copied = true;
        break;
      }
    }

    if (!copied) {
      // Generate scaffold if not in registry
      const componentName = toPascalCase(component);
      const dest = path.join(targetDir, `${fileName}.tsx`);
      fs.writeFileSync(dest, generateComponentTemplate(componentName));
      console.log(chalk.green('  ✓') + chalk.dim(` Generated ${fileName}.tsx (scaffold)`));
    }
  }
}

export function registerAddThemeCommand(program: Command): void {
  program
    .command('add-theme [theme]')
    .description('Install or switch design system theme')
    .action(async (theme: string | undefined) => {
      const root = findProjectRoot();

      if (!theme) {
        const response = await prompts({
          type: 'select',
          name: 'theme',
          message: 'Select a theme:',
          choices: [
            { title: 'Terminal', value: 'terminal', description: 'Monospace, sharp corners, green-on-black' },
            { title: 'Swiss', value: 'swiss', description: 'Clean, grid-based, industrial design' },
          ],
        });
        theme = response.theme;
      }

      if (!theme || !(AVAILABLE_THEMES as readonly string[]).includes(theme)) {
        console.log(chalk.red(`✗ Unknown theme: ${theme}`));
        console.log(chalk.dim(`Available: ${AVAILABLE_THEMES.join(', ')}`));
        return;
      }

      const spinner = ora(`Setting up ${theme} theme...`).start();

      try {
        const pkgPath = path.join(root, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = fs.readJsonSync(pkgPath);
          const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
          if (!allDeps['@fabrk/design-system']) {
            execFileSync('pnpm', ['add', '@fabrk/design-system'], { cwd: root, stdio: 'ignore' });
          }
        }

        // Generate CSS variables file
        const cssDir = path.join(root, 'src', 'styles');
        fs.ensureDirSync(cssDir);

        const cssPath = path.join(cssDir, 'theme.css');
        if (!fs.existsSync(cssPath)) {
          fs.writeFileSync(cssPath, generateThemeCSS(theme));
          spinner.succeed(`Theme "${theme}" installed`);
          console.log(chalk.dim(`  Created ${path.relative(root, cssPath)}`));
          console.log(chalk.dim(`  Import it in your layout: import '@/styles/theme.css'`));
        } else {
          spinner.succeed(`Theme "${theme}" configured`);
          console.log(chalk.dim(`  ${path.relative(root, cssPath)} already exists — update manually if needed`));
        }
      } catch (error) {
        spinner.fail('Failed to set up theme');
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      }
    });
}
