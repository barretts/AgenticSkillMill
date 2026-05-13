export type ScaffoldKind = 'command' | 'skill' | 'fragment';
export interface ScaffoldOptions {
    kind: ScaffoldKind;
    name: string;
    cwd: string;
    /** For fragments: which category (common, domain, meta) */
    category?: string;
    /** For skills: initial description */
    description?: string;
}
export interface ScaffoldFile {
    path: string;
    content: string;
    action: 'create' | 'append';
}
export interface ScaffoldResult {
    kind: ScaffoldKind;
    name: string;
    files: ScaffoldFile[];
    instructions: string[];
    warnings: string[];
}
export declare function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>;
//# sourceMappingURL=scaffold.d.ts.map