import { type ValidateSkillOptions, type ValidateSkillResult } from '../../core/validate-skill.js';
export interface ValidateSkillCommandOptions extends ValidateSkillOptions {
    json: boolean;
}
export declare function validateSkillCommand(options: ValidateSkillCommandOptions): Promise<ValidateSkillResult>;
//# sourceMappingURL=validate-skill.d.ts.map