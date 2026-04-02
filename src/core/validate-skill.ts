import fs from 'fs/promises';
import path from 'path';
import { NotFoundError } from '../errors/types.js';

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

export async function validateSkill(options: ValidateSkillOptions): Promise<ValidateSkillResult> {
  const { skillPath } = options;
  const issues: SkillIssue[] = [];
  const warnings: string[] = [];

  let content: string;
  try {
    content = await fs.readFile(skillPath, 'utf-8');
  } catch {
    throw new NotFoundError('skill source', skillPath);
  }

  const lines = content.split('\n');

  // Parse frontmatter
  const frontmatter: Record<string, string> = {};
  let bodyStart = 0;

  if (lines[0] === '---') {
    const endIdx = lines.indexOf('---', 1);
    if (endIdx === -1) {
      issues.push({ severity: 'error', line: 1, rule: 'frontmatter-unclosed', message: 'Frontmatter block is never closed' });
    } else {
      bodyStart = endIdx + 1;
      for (let i = 1; i < endIdx; i++) {
        const colonIdx = lines[i].indexOf(':');
        if (colonIdx === -1) continue;
        const key = lines[i].slice(0, colonIdx).trim();
        let val = lines[i].slice(colonIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        frontmatter[key] = val;
      }
    }
  } else {
    issues.push({ severity: 'error', line: 1, rule: 'missing-frontmatter', message: 'Skill source must start with YAML frontmatter (---)' });
  }

  // Required frontmatter fields
  if (!frontmatter.name) {
    issues.push({ severity: 'error', line: 1, rule: 'missing-name', message: 'Frontmatter missing required "name" field' });
  }
  if (!frontmatter.description) {
    issues.push({ severity: 'error', line: 1, rule: 'missing-description', message: 'Frontmatter missing required "description" field' });
  }

  // Name should be lowercase kebab-case
  if (frontmatter.name && frontmatter.name !== frontmatter.name.toLowerCase()) {
    issues.push({ severity: 'error', line: 1, rule: 'name-case', message: `Skill name must be lowercase: "${frontmatter.name}"` });
  }
  if (frontmatter.name && /\s/.test(frontmatter.name)) {
    issues.push({ severity: 'error', line: 1, rule: 'name-spaces', message: `Skill name must not contain spaces: "${frontmatter.name}"` });
  }

  // Check body has an H1
  const bodyLines = lines.slice(bodyStart);
  const h1Line = bodyLines.findIndex(l => /^# /.test(l));
  if (h1Line === -1) {
    issues.push({ severity: 'warning', line: bodyStart + 1, rule: 'missing-h1', message: 'Skill body has no H1 heading' });
  }

  // Count sections (H2 headings)
  let sections = 0;
  for (let i = 0; i < bodyLines.length; i++) {
    if (/^## /.test(bodyLines[i])) {
      sections++;
    }
  }

  if (sections === 0) {
    issues.push({ severity: 'warning', line: bodyStart + 1, rule: 'no-sections', message: 'Skill body has no ## sections' });
  }

  // Collect and validate includes
  const includePattern = /\{\{include:([^}]+)\}\}/g;
  let match;
  const includes: Array<{ path: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    includePattern.lastIndex = 0;
    while ((match = includePattern.exec(lines[i])) !== null) {
      includes.push({ path: match[1].trim(), line: i + 1 });
    }
  }

  // Validate fragment files exist if fragmentsDir provided
  // Default: walk up from skill path to find the fragments dir.
  // Skills live at skill/skills/<name>/<name>.md, fragments at skill/fragments/
  const fragmentsDir = options.fragmentsDir ?? findFragmentsDir(skillPath);
  for (const inc of includes) {
    const fragPath = path.join(fragmentsDir, inc.path);
    try {
      await fs.access(fragPath);
    } catch {
      issues.push({
        severity: 'error',
        line: inc.line,
        rule: 'fragment-not-found',
        message: `Fragment file not found: ${inc.path}`,
      });
    }
  }

  // Check for duplicate includes
  const seen = new Map<string, number>();
  for (const inc of includes) {
    const prev = seen.get(inc.path);
    if (prev !== undefined) {
      issues.push({
        severity: 'warning',
        line: inc.line,
        rule: 'duplicate-include',
        message: `Duplicate include: ${inc.path} (first at line ${prev})`,
      });
    } else {
      seen.set(inc.path, inc.line);
    }
  }

  // Word count of the body (excluding frontmatter and include markers)
  const bodyText = bodyLines.join(' ')
    .replace(/\{\{include:[^}]+\}\}/g, '')
    .replace(/[#*`\-|]/g, ' ');
  const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

  return {
    skillPath,
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
    stats: {
      includes: includes.length,
      sections,
      wordCount,
    },
    frontmatter,
    warnings,
  };
}

function findFragmentsDir(skillPath: string): string {
  const resolved = path.resolve(skillPath);
  // Walk up from the skill file to find a directory named "skill" that has a "fragments" child
  let dir = path.dirname(resolved);
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'fragments');
    const parentName = path.basename(dir);
    if (parentName === 'skill') {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  // Fallback: two levels up from skill file
  return path.join(path.dirname(path.dirname(resolved)), 'fragments');
}
