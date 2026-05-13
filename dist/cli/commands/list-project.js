import { listProject } from '../../core/list-project.js';
export async function listProjectCommand(options) {
    return listProject({
        cwd: options.cwd,
    });
}
//# sourceMappingURL=list-project.js.map