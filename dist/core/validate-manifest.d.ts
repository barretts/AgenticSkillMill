export interface ValidateManifestOptions {
    manifestPath: string;
}
export interface ManifestIssue {
    severity: 'error' | 'warning';
    rule: string;
    message: string;
}
export interface ValidateManifestResult {
    manifestPath: string;
    valid: boolean;
    issues: ManifestIssue[];
    stats: {
        skills: number;
        fragments: number;
        targets: number;
    };
    warnings: string[];
}
export declare function validateManifest(options: ValidateManifestOptions): Promise<ValidateManifestResult>;
//# sourceMappingURL=validate-manifest.d.ts.map