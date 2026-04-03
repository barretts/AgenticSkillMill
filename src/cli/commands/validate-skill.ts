import { validateSkill, type ValidateSkillOptions, type ValidateSkillResult } from '../../core/validate-skill.js';

export interface ValidateSkillCommandOptions extends ValidateSkillOptions {
  json: boolean;
}

export async function validateSkillCommand(
  options: ValidateSkillCommandOptions,
): Promise<ValidateSkillResult> {
  return validateSkill({
    skillPath: options.skillPath,
    fragmentsDir: options.fragmentsDir,
  });
}
