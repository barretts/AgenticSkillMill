import { checkExports } from '../../core/check-exports.js';
export async function checkExportsCommand(options) {
    return checkExports({
        cwd: options.cwd,
    });
}
//# sourceMappingURL=check-exports.js.map