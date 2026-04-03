import { checkExports, type CheckExportsOptions, type CheckExportsResult } from '../../core/check-exports.js';

export interface CheckExportsCommandOptions extends CheckExportsOptions {
  json: boolean;
}

export async function checkExportsCommand(
  options: CheckExportsCommandOptions,
): Promise<CheckExportsResult> {
  return checkExports({
    cwd: options.cwd,
  });
}
