/**
 * fabrk create — Scaffold a new FABRK application.
 */
/* eslint-disable no-console */

import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execFileSync } from 'child_process';
import { generateFabrkDir } from './fabrk-dir';
import { TEMPLATES } from './templates';

export function registerCreateCommand(program: Command): void {
  program
    .command('create [project-name]')
    .description('Create a new FABRK application')
    .option('-t, --template <template>', 'Template to use (basic|ai-saas|dashboard)')
    .option('--no-install', 'Skip dependency installation')
    .option('--no-git', 'Skip git initialization')
    .action(async (projectName: string | undefined, options) => {
      console.log(
        chalk.bold.green('\n┌─────────────────────────────────┐')
      );
      console.log(
        chalk.bold.green('│  ') +
          chalk.white('FABRK CREATE') +
          chalk.bold.green('                │')
      );
      console.log(
        chalk.bold.green('└─────────────────────────────────┘\n')
      );

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

      // Validate project name to prevent command injection via CLI argument
      // (the prompts validator only covers interactive input, not CLI args)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (!/^[a-zA-Z0-9_-]+$/.test(projectName!)) {
        console.log(
          chalk.red(
            '\n✗ Invalid project name. Use only letters, numbers, hyphens, and underscores.'
          )
        );
        process.exit(1);
      }

      // Validate template name against known templates to prevent path traversal
      if (!TEMPLATES.some(t => t.value === template)) {
        console.log(chalk.red(`\n✗ Unknown template "${template}". Available: ${TEMPLATES.map(t => t.value).join(', ')}`));
        process.exit(1);
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const targetDir = path.resolve(process.cwd(), projectName!);

      if (fs.existsSync(targetDir)) {
        console.log(chalk.red(`\n✗ Directory "${projectName}" already exists`));
        process.exit(1);
      }

      const templatesDir = path.resolve(__dirname, '../templates');
      const templateDir = path.join(templatesDir, template);

      if (!fs.existsSync(templateDir)) {
        console.log(chalk.red(`\n✗ Template "${template}" not found`));
        process.exit(1);
      }

      const spinner = ora('Creating project...').start();

      try {
        await fs.copy(templateDir, targetDir);
        spinner.succeed('Project created');

        const packageJsonPath = path.join(targetDir, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = await fs.readJson(packageJsonPath);
          packageJson.name = projectName;
          await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
        }

        if (options.install !== false) {
          spinner.start('Installing dependencies...');
          execFileSync('pnpm', ['install'], { cwd: targetDir, stdio: 'ignore' });
          spinner.succeed('Dependencies installed');
        }

        if (options.git !== false) {
          spinner.start('Initializing git...');
          execFileSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
          execFileSync('git', ['add', '.'], { cwd: targetDir, stdio: 'ignore' });
          execFileSync('git', ['commit', '-m', 'Initial commit from fabrk create'], {
            cwd: targetDir,
            stdio: 'ignore',
          });
          spinner.succeed('Git initialized');
        }

        // Generate .fabrk/ directory
        generateFabrkDir({ root: targetDir, configPath: null });

        console.log(
          chalk.green.bold('\n✓ Success!') +
            chalk.dim(' Your FABRK app is ready.\n')
        );
        console.log(chalk.bold('Next steps:\n'));
        console.log(chalk.cyan(`  cd ${projectName}`));
        console.log(chalk.cyan('  fabrk dev'));
        console.log();
        const port = template === 'basic' ? '5173' : '3000';
        console.log(chalk.dim(`  Open http://localhost:${port} to view your app`));
        console.log(chalk.dim('  Edit fabrk.config.ts to configure your app\n'));
      } catch (error) {
        spinner.fail('Failed to create project');
        console.error(chalk.red('\nError:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
