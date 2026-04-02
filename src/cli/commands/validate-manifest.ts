import { validateManifest, type ValidateManifestOptions, type ValidateManifestResult } from '../../core/validate-manifest.js';

export interface ValidateManifestCommandOptions extends ValidateManifestOptions {
  json: boolean;
}

export async function validateManifestCommand(
  options: ValidateManifestCommandOptions,
): Promise<ValidateManifestResult> {
  return validateManifest({
    manifestPath: options.manifestPath,
  });
}
