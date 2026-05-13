export interface ListProjectOptions {
    cwd: string;
}
export interface SkillInfo {
    name: string;
    source: string;
    fragments: string[];
    description: string | null;
}
export interface FragmentInfo {
    path: string;
    category: string;
    usedBy: string[];
    sizeBytes: number;
}
export interface ListProjectResult {
    projectName: string;
    cliBinName: string | null;
    skills: SkillInfo[];
    fragments: FragmentInfo[];
    targets: string[];
    stats: {
        totalSkills: number;
        totalFragments: number;
        totalTargets: number;
        orphanedFragments: string[];
    };
    warnings: string[];
}
export declare function listProject(options: ListProjectOptions): Promise<ListProjectResult>;
//# sourceMappingURL=list-project.d.ts.map