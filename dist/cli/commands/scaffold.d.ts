import { type ScaffoldOptions, type ScaffoldResult } from '../../core/scaffold.js';
export interface ScaffoldCommandOptions extends ScaffoldOptions {
    json: boolean;
}
export declare function scaffoldCommand(options: ScaffoldCommandOptions): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map