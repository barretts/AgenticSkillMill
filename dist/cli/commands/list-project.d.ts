import { type ListProjectOptions, type ListProjectResult } from '../../core/list-project.js';
export interface ListProjectCommandOptions extends ListProjectOptions {
    json: boolean;
}
export declare function listProjectCommand(options: ListProjectCommandOptions): Promise<ListProjectResult>;
//# sourceMappingURL=list-project.d.ts.map