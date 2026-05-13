import { validateSkill } from '../../core/validate-skill.js';
export async function validateSkillCommand(options) {
    return validateSkill({
        skillPath: options.skillPath,
        fragmentsDir: options.fragmentsDir,
    });
}
//# sourceMappingURL=validate-skill.js.map