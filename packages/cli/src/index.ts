#!/usr/bin/env node

/**
 * create-fabrk-app CLI
 *
 * Scaffolding tool for FABRK applications
 */

import { program } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

interface TemplateChoice {
  title: string;
  value: string;
  description: string;
}

const TEMPLATES: TemplateChoice[] = [
  {
    title: 'Basic',
    value: 'basic',
    description: 'Minimal setup with core components',
  },
  {
    title: 'AI SaaS',
    value: 'ai-saas',
    description: 'Full AI features with cost tracking and validation',
  },
  {
    title: 'Dashboard',
    value: 'dashboard',
    description: 'Analytics-focused with charts and KPIs',
  },
];

async function main() {
  console.log(
    chalk.bold.green('\n┌─────────────────────────────────┐')
  );
  console.log(
    chalk.bold.green('│  ') +
      chalk.white('CREATE FABRK APP') +
      chalk.bold.green('            │')
  );
  console.log(
    chalk.bold.green('└─────────────────────────────────┘\n')
  );

  program
    .name('create-fabrk-app')
    .description('Create a new FABRK application')
    .argument('[project-name]', 'Name of your project')
    .option('-t, --template <template>', 'Template to use (basic|ai-saas|dashboard)')
    .option('--no-install', 'Skip dependency installation')
    .option('--no-git', 'Skip git initialization')
    .parse();

  const options = program.opts();
  let projectName = program.args[0];

  // Interactive prompts
  const responses = await prompts(
    [
      {
        type: projectName ? null : 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'my-fabrk-app',
        validate: (value: string) =>
          /^[a-z0-9-]+$/.test(value)
            ? true
            : 'Project name must be lowercase with hyphens only',
      },
      {
        type: options.template ? null : 'select',
        name: 'template',
        message: 'Select a template:',
        choices: TEMPLATES,
        initial: 0,
      },
    ],
    {
      onCancel: () => {
        console.log(chalk.red('\n✗ Cancelled'));
        process.exit(0);
      },
    }
  );

  projectName = projectName || responses.projectName;
  const template = options.template || responses.template;
  const targetDir = path.resolve(process.cwd(), projectName);

  // Validation
  if (fs.existsSync(targetDir)) {
    console.log(chalk.red(`\n✗ Directory "${projectName}" already exists`));
    process.exit(1);
  }

  // Find template directory
  const templatesDir = path.resolve(__dirname, '../templates');
  const templateDir = path.join(templatesDir, template);

  if (!fs.existsSync(templateDir)) {
    console.log(chalk.red(`\n✗ Template "${template}" not found`));
    console.log(chalk.dim(`\nAvailable templates: ${TEMPLATES.map(t => t.value).join(', ')}`));
    process.exit(1);
  }

  // Create project
  const spinner = ora('Creating project...').start();

  try {
    // Copy template
    await fs.copy(templateDir, targetDir);
    spinner.succeed('Project created');

    // Update package.json with project name
    const packageJsonPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      packageJson.name = projectName;
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
    }

    // Install dependencies
    if (options.install !== false) {
      spinner.start('Installing dependencies...');
      execSync('pnpm install', {
        cwd: targetDir,
        stdio: 'ignore',
      });
      spinner.succeed('Dependencies installed');
    }

    // Initialize git
    if (options.git !== false) {
      spinner.start('Initializing git...');
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      execSync('git add .', { cwd: targetDir, stdio: 'ignore' });
      execSync('git commit -m "Initial commit from create-fabrk-app"', {
        cwd: targetDir,
        stdio: 'ignore',
      });
      spinner.succeed('Git initialized');
    }

    // Success!
    console.log(
      chalk.green.bold('\n✓ Success!') +
        chalk.dim(' Your FABRK app is ready.\n')
    );

    console.log(chalk.bold('Next steps:\n'));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan('  pnpm dev'));
    console.log();
    console.log(chalk.dim('  Open http://localhost:3000 to view your app\n'));

    // Template-specific instructions
    if (template === 'ai-saas') {
      console.log(chalk.yellow('⚡ AI SaaS Template Setup:\n'));
      console.log(chalk.dim('  1. Copy .env.example to .env.local'));
      console.log(chalk.dim('  2. Add your OPENAI_API_KEY or ANTHROPIC_API_KEY'));
      console.log(chalk.dim('  3. Configure database (optional)'));
      console.log(chalk.dim('  4. Run pnpm db:push to setup database\n'));
    }

    console.log(
      chalk.dim('Documentation: ') +
        chalk.blue('https://github.com/jpoindexter/fabrk-framework')
    );
    console.log();
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
