export interface ValidateSkillOptions {
    skillPath: string;
    fragmentsDir?: string;
}
export interface SkillIssue {
    severity: 'error' | 'warning';
    line: number;
    rule: string;
    message: string;
}
export interface ValidateSkillResult {
    skillPath: string;
    valid: boolean;
    issues: SkillIssue[];
    stats: {
        includes: number;
        sections: number;
        wordCount: number;
    };
    frontmatter: Record<string, string>;
    warnings: string[];
}
export declare function validateSkill(options: ValidateSkillOptions): Promise<ValidateSkillResult>;
//# sourceMappingURL=validate-skill.d.ts.map