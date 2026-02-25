#!/usr/bin/env node

/**
 * fabrk CLI — Primary interface for the FABRK Framework
 *
 * FABRK wraps Next.js the same way Next.js wraps React.
 * This CLI owns the developer lifecycle: create, dev, build, add, generate.
 *
 * @example
 * ```bash
 * fabrk create my-app        # Scaffold a new FABRK project
 * fabrk dev                   # Dev server (generates .fabrk/ configs, wraps next dev)
 * fabrk build                 # Production build
 * fabrk add button card       # Add UI components (shadcn-style copy)
 * fabrk add-theme terminal    # Install a design system theme
 * fabrk add auth              # Add a feature module
 * fabrk generate component X  # Generate scaffolds
 * fabrk doctor                # Diagnose issues
 * fabrk info                  # Show project info
 * ```
 */

import { program } from 'commander';
import {
  registerCreateCommand,
  registerDevCommand,
  registerBuildCommand,
  registerStartCommand,
  registerAddCommand,
  registerAddThemeCommand,
  registerLintCommand,
  registerGenerateCommand,
  registerDoctorCommand,
  registerUpgradeCommand,
  registerInfoCommand,
} from './commands';

const VERSION = '0.1.0';

program
  .name('fabrk')
  .description('FABRK Framework CLI — The AI-first React meta-framework')
  .version(VERSION);

// Register all commands
registerCreateCommand(program);
registerDevCommand(program);
registerBuildCommand(program);
registerStartCommand(program);
registerAddCommand(program);
registerAddThemeCommand(program);
registerLintCommand(program);
registerGenerateCommand(program);
registerDoctorCommand(program);
registerUpgradeCommand(program);
registerInfoCommand(program);

program.parse();
