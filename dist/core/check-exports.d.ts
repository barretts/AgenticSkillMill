export interface CheckExportsOptions {
    cwd: string;
}
export interface ExportIssue {
    severity: 'error' | 'warning';
    rule: string;
    message: string;
}
export interface CoreModuleInfo {
    name: string;
    relativePath: string;
    exportedInIndex: boolean;
}
export interface CheckExportsResult {
    indexPath: string;
    coreModules: CoreModuleInfo[];
    issues: ExportIssue[];
    warnings: string[];
}
export declare function checkExports(options: CheckExportsOptions): Promise<CheckExportsResult>;
//# sourceMappingURL=check-exports.d.ts.map