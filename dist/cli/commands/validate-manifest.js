import { validateManifest } from '../../core/validate-manifest.js';
export async function validateManifestCommand(options) {
    return validateManifest({
        manifestPath: options.manifestPath,
    });
}
//# sourceMappingURL=validate-manifest.js.map