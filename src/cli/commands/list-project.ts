import { listProject, type ListProjectOptions, type ListProjectResult } from '../../core/list-project.js';

export interface ListProjectCommandOptions extends ListProjectOptions {
  json: boolean;
}

export async function listProjectCommand(
  options: ListProjectCommandOptions,
): Promise<ListProjectResult> {
  return listProject({
    cwd: options.cwd,
  });
}
