// Core domain exports
export { validateManifest } from './core/validate-manifest.js';
export type { ValidateManifestOptions, ValidateManifestResult, ManifestIssue } from './core/validate-manifest.js';

export { validateSkill } from './core/validate-skill.js';
export type { ValidateSkillOptions, ValidateSkillResult, SkillIssue } from './core/validate-skill.js';

export { listProject } from './core/list-project.js';
export type { ListProjectOptions, ListProjectResult, SkillInfo, FragmentInfo } from './core/list-project.js';

export { scaffold } from './core/scaffold.js';
export type { ScaffoldOptions, ScaffoldResult, ScaffoldFile, ScaffoldKind } from './core/scaffold.js';

export { checkExports } from './core/check-exports.js';
export type { CheckExportsOptions, CheckExportsResult, CoreModuleInfo, ExportIssue } from './core/check-exports.js';

// Cache exports
export { CacheManager } from './cache/cache-manager.js';
export type { CacheEntry, CacheStats, CacheOptions } from './cache/cache-manager.js';

// Error exports
export {
  AppError,
  NotFoundError,
  CommandError,
  CacheError,
  ConfigError,
} from './errors/types.js';

// CLI exports
export { OutputFormatter } from './cli/output-formatter.js';
