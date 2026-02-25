/**
 * Command registry — barrel export for all CLI commands.
 */

export { registerCreateCommand } from './create';
export { registerDevCommand } from './dev';
export { registerBuildCommand } from './build';
export { registerStartCommand } from './start';
export { registerAddCommand, registerAddThemeCommand } from './add';
export { registerLintCommand } from './lint';
export { registerGenerateCommand } from './generate';
export { registerDoctorCommand } from './doctor';
export { registerUpgradeCommand } from './upgrade';
export { registerInfoCommand } from './info';
