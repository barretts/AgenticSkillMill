import { scaffold } from '../../core/scaffold.js';
export async function scaffoldCommand(options) {
    return scaffold({
        kind: options.kind,
        name: options.name,
        cwd: options.cwd,
        category: options.category,
        description: options.description,
    });
}
//# sourceMappingURL=scaffold.js.map