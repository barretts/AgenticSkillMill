import fs from 'fs/promises';
import path from 'path';
import { AppError } from '../errors/types.js';

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

export async function scaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
  const { kind, name, cwd } = options;
  const warnings: string[] = [];

  // Validate name
  if (name !== name.toLowerCase()) {
    throw new AppError(`Name must be lowercase: "${name}"`, 'VALIDATION_ERROR');
  }
  if (/\s/.test(name)) {
    throw new AppError(`Name must not contain spaces: "${name}"`, 'VALIDATION_ERROR');
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new AppError(`Name must be lowercase kebab-case: "${name}"`, 'VALIDATION_ERROR');
  }

  switch (kind) {
    case 'command':
      return scaffoldCommand(name, cwd, warnings);
    case 'skill':
      return scaffoldSkill(name, cwd, options.description, warnings);
    case 'fragment':
      return scaffoldFragment(name, cwd, options.category ?? 'domain', warnings);
    default:
      throw new AppError(`Unknown scaffold kind: "${kind}"`, 'VALIDATION_ERROR');
  }
}

function toPascalCase(kebab: string): string {
  return kebab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toCamelCase(kebab: string): string {
  const pascal = toPascalCase(kebab);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

async function scaffoldCommand(name: string, cwd: string, warnings: string[]): Promise<ScaffoldResult> {
  const pascal = toPascalCase(name);
  const camel = toCamelCase(name);

  const coreContent = `export interface ${pascal}Options {
  cwd: string;
}

export interface ${pascal}Result {
  warnings: string[];
}

export async function ${camel}(options: ${pascal}Options): Promise<${pascal}Result> {
  const warnings: string[] = [];

  // TODO: implement domain logic

  return { warnings };
}
`;

  const commandContent = `import { ${camel}, type ${pascal}Options, type ${pascal}Result } from '../../core/${name}.js';

export interface ${pascal}CommandOptions extends ${pascal}Options {
  json: boolean;
}

export async function ${camel}Command(
  options: ${pascal}CommandOptions,
): Promise<${pascal}Result> {
  return ${camel}({
    cwd: options.cwd,
  });
}
`;

  // Check for existing files
  const corePath = path.join(cwd, 'src', 'core', `${name}.ts`);
  const cmdPath = path.join(cwd, 'src', 'cli', 'commands', `${name}.ts`);

  try {
    await fs.access(corePath);
    warnings.push(`Core module already exists: src/core/${name}.ts`);
  } catch { /* does not exist, good */ }

  try {
    await fs.access(cmdPath);
    warnings.push(`Command wrapper already exists: src/cli/commands/${name}.ts`);
  } catch { /* does not exist, good */ }

  return {
    kind: 'command',
    name,
    files: [
      { path: `src/core/${name}.ts`, content: coreContent, action: 'create' },
      { path: `src/cli/commands/${name}.ts`, content: commandContent, action: 'create' },
    ],
    instructions: [
      `Wire the command into src/cli/index.ts`,
      `Export the public API from src/index.ts`,
      `Run: npm run build && node dist/cli/index.js ${name} --help`,
    ],
    warnings,
  };
}

async function scaffoldSkill(name: string, cwd: string, description: string | undefined, warnings: string[]): Promise<ScaffoldResult> {
  const desc = description ?? `Skill description for ${name}. Update this.`;

  const skillContent = `---
name: ${name}
description: "${desc}"
---

# ${toPascalCase(name).replace(/([A-Z])/g, ' $1').trim()}

${desc}

---

## Section Name

Direct content here, or use fragment includes:

---

## Another Section

More content.
`;

  const skillDir = path.join(cwd, 'skill', 'skills', name);
  try {
    await fs.access(skillDir);
    warnings.push(`Skill directory already exists: skill/skills/${name}/`);
  } catch { /* does not exist, good */ }

  return {
    kind: 'skill',
    name,
    files: [
      { path: `skill/skills/${name}/${name}.md`, content: skillContent, action: 'create' },
    ],
    instructions: [
      `Add skill entry to skill/build/manifest.json`,
      `Add "${name}" to the SKILLS array in install-local.sh`,
      `Run: npm run compile`,
    ],
    warnings,
  };
}

async function scaffoldFragment(name: string, cwd: string, category: string, warnings: string[]): Promise<ScaffoldResult> {
  const validCategories = ['common', 'domain', 'meta'];
  if (!validCategories.includes(category)) {
    warnings.push(`Category "${category}" is non-standard. Conventional categories: ${validCategories.join(', ')}`);
  }

  const fragmentContent = `### ${toPascalCase(name).replace(/([A-Z])/g, ' $1').trim()}

Content for the ${name} fragment. Replace this with actual knowledge.
`;

  const fragPath = path.join(cwd, 'skill', 'fragments', category, `${name}.md`);
  try {
    await fs.access(fragPath);
    warnings.push(`Fragment already exists: skill/fragments/${category}/${name}.md`);
  } catch { /* does not exist, good */ }

  return {
    kind: 'fragment',
    name,
    files: [
      { path: `skill/fragments/${category}/${name}.md`, content: fragmentContent, action: 'create' },
    ],
    instructions: [
      `Include in a skill source with: {{include:${category}/${name}.md}}`,
      `Declare in manifest.json under the skill's "fragments" array`,
      `Run: npm run compile`,
    ],
    warnings,
  };
}
