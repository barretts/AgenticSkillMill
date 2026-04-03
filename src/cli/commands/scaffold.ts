import { scaffold, type ScaffoldOptions, type ScaffoldResult } from '../../core/scaffold.js';

export interface ScaffoldCommandOptions extends ScaffoldOptions {
  json: boolean;
}

export async function scaffoldCommand(
  options: ScaffoldCommandOptions,
): Promise<ScaffoldResult> {
  return scaffold({
    kind: options.kind,
    name: options.name,
    cwd: options.cwd,
    category: options.category,
    description: options.description,
  });
}
