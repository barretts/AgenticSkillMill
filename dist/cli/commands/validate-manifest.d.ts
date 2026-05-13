import { type ValidateManifestOptions, type ValidateManifestResult } from '../../core/validate-manifest.js';
export interface ValidateManifestCommandOptions extends ValidateManifestOptions {
    json: boolean;
}
export declare function validateManifestCommand(options: ValidateManifestCommandOptions): Promise<ValidateManifestResult>;
//# sourceMappingURL=validate-manifest.d.ts.map