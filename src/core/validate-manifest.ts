import fs from 'fs/promises';
import path from 'path';
import { ConfigError, NotFoundError } from '../errors/types.js';

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

interface ManifestSkill {
  source: string;
  fragments: string[];
}

interface Manifest {
  targets: string[];
  skills: Record<string, ManifestSkill>;
  naming_rules: {
    case: string;
    separator: string;
    forbidden_suffixes: string[];
  };
}

const KNOWN_TARGETS = [
  'claude', 'cursor-rules', 'cursor-skills',
  'windsurf-rules', 'windsurf-skills', 'opencode', 'codex',
];

export async function validateManifest(options: ValidateManifestOptions): Promise<ValidateManifestResult> {
  const { manifestPath } = options;
  const issues: ManifestIssue[] = [];
  const warnings: string[] = [];

  let raw: string;
  try {
    raw = await fs.readFile(manifestPath, 'utf-8');
  } catch {
    throw new NotFoundError('manifest', manifestPath, 'File does not exist or is not readable');
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    throw new ConfigError('Invalid JSON', manifestPath, e instanceof Error ? e : undefined);
  }

  // Required top-level keys
  if (!manifest.targets || !Array.isArray(manifest.targets)) {
    issues.push({ severity: 'error', rule: 'missing-targets', message: 'Missing or invalid "targets" array' });
  }
  if (!manifest.skills || typeof manifest.skills !== 'object') {
    issues.push({ severity: 'error', rule: 'missing-skills', message: 'Missing or invalid "skills" object' });
  }
  if (!manifest.naming_rules || typeof manifest.naming_rules !== 'object') {
    issues.push({ severity: 'warning', rule: 'missing-naming-rules', message: 'Missing "naming_rules" object' });
  }

  if (issues.some(i => i.rule === 'missing-skills')) {
    return {
      manifestPath,
      valid: false,
      issues,
      stats: { skills: 0, fragments: 0, targets: 0 },
      warnings,
    };
  }

  // Validate targets
  for (const target of manifest.targets ?? []) {
    if (!KNOWN_TARGETS.includes(target)) {
      issues.push({
        severity: 'warning',
        rule: 'unknown-target',
        message: `Unknown target "${target}". Known: ${KNOWN_TARGETS.join(', ')}`,
      });
    }
  }

  const skillRoot = path.dirname(path.dirname(manifestPath));
  const fragmentsDir = path.join(skillRoot, 'fragments');
  const allFragments = new Set<string>();

  // Validate each skill
  for (const [skillName, skillDef] of Object.entries(manifest.skills)) {
    // Naming validation
    if (skillName !== skillName.toLowerCase()) {
      issues.push({ severity: 'error', rule: 'name-case', message: `Skill name not lowercase: "${skillName}"` });
    }
    if (/\s/.test(skillName)) {
      issues.push({ severity: 'error', rule: 'name-spaces', message: `Skill name contains spaces: "${skillName}"` });
    }
    if (manifest.naming_rules?.forbidden_suffixes) {
      for (const suffix of manifest.naming_rules.forbidden_suffixes) {
        if (skillName.endsWith(`-${suffix}`) || skillName === suffix) {
          issues.push({ severity: 'error', rule: 'name-forbidden-suffix', message: `Skill "${skillName}" uses forbidden suffix "${suffix}"` });
        }
      }
    }

    // Source file exists
    if (!skillDef.source) {
      issues.push({ severity: 'error', rule: 'missing-source', message: `Skill "${skillName}" has no "source" field` });
    } else {
      const sourcePath = path.join(skillRoot, skillDef.source);
      try {
        await fs.access(sourcePath);
      } catch {
        issues.push({ severity: 'error', rule: 'source-not-found', message: `Source file not found: ${skillDef.source}` });
      }
    }

    // Fragments exist
    if (!Array.isArray(skillDef.fragments)) {
      issues.push({ severity: 'warning', rule: 'missing-fragments-array', message: `Skill "${skillName}" has no "fragments" array` });
    } else {
      for (const frag of skillDef.fragments) {
        allFragments.add(frag);
        const fragPath = path.join(fragmentsDir, frag);
        try {
          await fs.access(fragPath);
        } catch {
          issues.push({ severity: 'error', rule: 'fragment-not-found', message: `Fragment not found: ${frag} (declared in "${skillName}")` });
        }
      }
    }

    // Cross-validate: check source includes match declared fragments
    if (skillDef.source) {
      const sourcePath = path.join(skillRoot, skillDef.source);
      try {
        const source = await fs.readFile(sourcePath, 'utf-8');
        const includePattern = /\{\{include:([^}]+)\}\}/g;
        const actualIncludes = new Set<string>();
        let match;
        while ((match = includePattern.exec(source)) !== null) {
          actualIncludes.add(match[1].trim());
        }
        const declared = new Set(skillDef.fragments ?? []);

        for (const inc of actualIncludes) {
          if (!declared.has(inc)) {
            issues.push({
              severity: 'error',
              rule: 'undeclared-include',
              message: `Undeclared fragment in "${skillName}": ${inc} (in source but not in manifest)`,
            });
          }
        }
        for (const dec of declared) {
          if (!actualIncludes.has(dec)) {
            issues.push({
              severity: 'warning',
              rule: 'unused-declared-fragment',
              message: `Unused declared fragment in "${skillName}": ${dec} (in manifest but not in source)`,
            });
          }
        }
      } catch {
        // Source not readable; already reported above
      }
    }
  }

  return {
    manifestPath,
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: {
      skills: Object.keys(manifest.skills).length,
      fragments: allFragments.size,
      targets: (manifest.targets ?? []).length,
    },
    warnings,
  };
}
