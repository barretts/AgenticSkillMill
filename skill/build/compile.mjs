#!/usr/bin/env node

/**
 * Skill compiler: resolves {{include:...}} markers, compiles to IDE-specific
 * targets, and validates the output.
 *
 * This compiler is the core of the fragment-composition architecture.
 * It is intentionally a single self-contained file with no runtime
 * dependencies beyond Node.js builtins.
 *
 * Usage:
 *   node skill/build/compile.mjs                        # compile all
 *   node skill/build/compile.mjs --targets claude,cursor # specific targets
 *   node skill/build/compile.mjs --validate              # validate only
 *   node skill/build/compile.mjs --watch                 # recompile on change
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync, watch as fsWatch } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SKILL_ROOT = resolve(__dirname, '..');
const PROJECT_ROOT = resolve(SKILL_ROOT, '..');
const FRAGMENTS_DIR = join(SKILL_ROOT, 'fragments');
const COMPILED_DIR = join(PROJECT_ROOT, 'compiled');
const MANIFEST_PATH = join(__dirname, 'manifest.json');

const MANAGED_BY = 'managed_by: agentic-skill-mill';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const validateOnly = args.includes('--validate');
const watchMode = args.includes('--watch');
const targetFlag = args.find(a => a.startsWith('--targets=')) || args[args.indexOf('--targets') + 1];
const requestedTargets = targetFlag ? targetFlag.replace('--targets=', '').split(',').map(t => t.trim()) : null;

// ---------------------------------------------------------------------------
// Load manifest
// ---------------------------------------------------------------------------

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
const targets = requestedTargets || manifest.targets;

// ---------------------------------------------------------------------------
// Step 1: Resolve includes
// ---------------------------------------------------------------------------

function resolveIncludes(content, sourceFile) {
  const includePattern = /\{\{include:([^}]+)\}\}/g;
  const errors = [];

  const resolved = content.replace(includePattern, (match, fragmentPath) => {
    const fullPath = join(FRAGMENTS_DIR, fragmentPath.trim());
    if (!existsSync(fullPath)) {
      errors.push(`Missing fragment: ${fragmentPath} (referenced in ${sourceFile})`);
      return match;
    }
    const fragmentContent = readFileSync(fullPath, 'utf-8').trimEnd();

    if (/\{\{include:[^}]+\}\}/.test(fragmentContent)) {
      errors.push(`Nested include in fragment: ${fragmentPath} (referenced in ${sourceFile}). Only one level of includes is supported.`);
      return match;
    }

    return fragmentContent;
  });

  return { resolved, errors };
}

// ---------------------------------------------------------------------------
// Step 2: Frontmatter transforms
// ---------------------------------------------------------------------------

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fm = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[key] = val;
  }

  return { frontmatter: fm, body: match[2] };
}

function buildFrontmatter(fields) {
  const lines = ['---'];
  lines.push(MANAGED_BY);
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      lines.push(`${k}:`);
      for (const [nk, nv] of Object.entries(v)) {
        lines.push(`  ${nk}: ${nv}`);
      }
    } else if (typeof v === 'string' && (v.includes(':') || v.includes('"') || v.includes("'"))) {
      lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function compileTarget(targetName, skillName, resolvedContent) {
  const { frontmatter: fm, body } = extractFrontmatter(resolvedContent);
  const desc = fm.description || fm.name || skillName;

  function injectMarker(content) {
    return content.replace(/^---\n/, `---\n${MANAGED_BY}\n`);
  }

  switch (targetName) {
    case 'claude':
      return injectMarker(resolvedContent);

    case 'cursor-rules':
      return buildFrontmatter({ description: `"${desc}"`, alwaysApply: 'false' }) + '\n' + body;

    case 'cursor-skills':
      return injectMarker(resolvedContent);

    case 'windsurf-rules':
      return buildFrontmatter({ trigger: 'manual', description: `"${desc}"` }) + '\n' + body;

    case 'windsurf-skills':
      return injectMarker(resolvedContent);

    case 'opencode':
      return buildFrontmatter({
        mode: 'subagent',
        description: `"${desc}"`,
        permission: { bash: 'allow', edit: 'allow', webfetch: 'allow' }
      }) + '\n' + body;

    case 'codex':
      return injectMarker(resolvedContent);

    default:
      throw new Error(`Unknown target: ${targetName}`);
  }
}

function getOutputPath(targetName, skillName) {
  switch (targetName) {
    case 'claude':
      return join(COMPILED_DIR, 'claude', skillName, 'SKILL.md');
    case 'cursor-rules':
      return join(COMPILED_DIR, 'cursor', 'rules', `${skillName}.mdc`);
    case 'cursor-skills':
      return join(COMPILED_DIR, 'cursor', 'skills', skillName, 'SKILL.md');
    case 'windsurf-rules':
      return join(COMPILED_DIR, 'windsurf', 'rules', `${skillName}.md`);
    case 'windsurf-skills':
      return join(COMPILED_DIR, 'windsurf', 'skills', skillName, 'SKILL.md');
    case 'opencode':
      return join(COMPILED_DIR, 'opencode', `${skillName}.md`);
    case 'codex':
      return join(COMPILED_DIR, 'codex', skillName, 'SKILL.md');
    default:
      throw new Error(`Unknown target: ${targetName}`);
  }
}

// ---------------------------------------------------------------------------
// Step 3: Validation
// ---------------------------------------------------------------------------

function validateNaming(skillName) {
  const errors = [];
  if (skillName !== skillName.toLowerCase()) {
    errors.push(`Skill name not lowercase: ${skillName}`);
  }
  if (/\s/.test(skillName)) {
    errors.push(`Skill name contains spaces: ${skillName}`);
  }
  for (const suffix of manifest.naming_rules.forbidden_suffixes) {
    if (skillName.endsWith(`-${suffix}`) || skillName === suffix) {
      errors.push(`Skill name uses forbidden suffix '${suffix}': ${skillName}`);
    }
  }
  return errors;
}

function validateResolved(content, skillName) {
  const errors = [];
  const unresolvedPattern = /\{\{include:[^}]+\}\}/g;
  const matches = content.match(unresolvedPattern);
  if (matches) {
    for (const m of matches) {
      errors.push(`Unresolved include in ${skillName}: ${m}`);
    }
  }
  return errors;
}

function validateFrontmatter(content, skillName) {
  const errors = [];
  if (!content.startsWith('---\n')) {
    errors.push(`Missing frontmatter in ${skillName}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const allErrors = [];
  const stats = { skills: 0, targets: 0, fragments: 0 };

  function countFiles(dir) {
    let count = 0;
    if (!existsSync(dir)) return 0;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) count += countFiles(join(dir, entry.name));
      else if (entry.name.endsWith('.md')) count++;
    }
    return count;
  }
  stats.fragments = countFiles(FRAGMENTS_DIR);

  if (!validateOnly) {
    if (existsSync(COMPILED_DIR)) {
      rmSync(COMPILED_DIR, { recursive: true });
    }
  }

  for (const [skillName, skillDef] of Object.entries(manifest.skills)) {
    stats.skills++;

    allErrors.push(...validateNaming(skillName));

    const sourcePath = join(SKILL_ROOT, skillDef.source);
    if (!existsSync(sourcePath)) {
      allErrors.push(`Missing source: ${skillDef.source} (skill: ${skillName})`);
      continue;
    }
    const source = readFileSync(sourcePath, 'utf-8');

    const { resolved, errors: includeErrors } = resolveIncludes(source, skillDef.source);
    allErrors.push(...includeErrors);

    allErrors.push(...validateResolved(resolved, skillName));
    allErrors.push(...validateFrontmatter(resolved, skillName));

    if (validateOnly) continue;

    for (const target of targets) {
      stats.targets++;
      const compiled = compileTarget(target, skillName, resolved);
      const outPath = getOutputPath(target, skillName);

      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, compiled);
    }
  }

  // Cross-validate manifest fragment declarations against actual includes
  for (const [skillName, skillDef] of Object.entries(manifest.skills)) {
    const sourcePath = join(SKILL_ROOT, skillDef.source);
    if (!existsSync(sourcePath)) continue;
    const source = readFileSync(sourcePath, 'utf-8');
    const includePattern = /\{\{include:([^}]+)\}\}/g;
    const actualIncludes = new Set();
    let match;
    while ((match = includePattern.exec(source)) !== null) {
      actualIncludes.add(match[1].trim());
    }
    const declared = new Set(skillDef.fragments);

    for (const inc of actualIncludes) {
      if (!declared.has(inc)) {
        allErrors.push(`Undeclared fragment in ${skillName}: ${inc} (found in source but not in manifest.fragments)`);
      }
    }
    for (const dec of declared) {
      if (!actualIncludes.has(dec)) {
        allErrors.push(`Unused declared fragment in ${skillName}: ${dec} (in manifest.fragments but not in source)`);
      }
    }
  }

  // Staleness check (validate-only mode)
  if (validateOnly) {
    for (const [skillName, skillDef] of Object.entries(manifest.skills)) {
      const sourcePath = join(SKILL_ROOT, skillDef.source);
      if (!existsSync(sourcePath)) continue;
      const sourceMtime = statSync(sourcePath).mtimeMs;

      let newestInput = sourceMtime;
      for (const frag of skillDef.fragments) {
        const fragPath = join(FRAGMENTS_DIR, frag);
        if (existsSync(fragPath)) {
          newestInput = Math.max(newestInput, statSync(fragPath).mtimeMs);
        }
      }
      newestInput = Math.max(newestInput, statSync(MANIFEST_PATH).mtimeMs);

      for (const target of manifest.targets) {
        const outPath = getOutputPath(target, skillName);
        if (!existsSync(outPath)) {
          allErrors.push(`Missing compiled output: ${relative(PROJECT_ROOT, outPath)} (run npm run compile)`);
        } else {
          const outMtime = statSync(outPath).mtimeMs;
          if (outMtime < newestInput) {
            allErrors.push(`Stale compiled output: ${relative(PROJECT_ROOT, outPath)} is older than its source or fragments (run npm run compile)`);
          }
        }
      }
    }
  }

  if (allErrors.length > 0) {
    console.error('\n==> Errors:');
    for (const e of allErrors) {
      console.error(`  ERROR: ${e}`);
    }
    console.error(`\n${allErrors.length} error(s) found.`);
    process.exit(1);
  }

  if (validateOnly) {
    console.log(`==> Validation passed. ${stats.skills} skills, ${stats.fragments} fragments.`);
  } else {
    console.log(`==> Compiled ${stats.skills} skills to ${targets.length} targets (${stats.targets} files). ${stats.fragments} fragments resolved.`);
  }
}

// ---------------------------------------------------------------------------
// Watch mode
// ---------------------------------------------------------------------------

function startWatch() {
  console.log('==> Watch mode: compiling on change...');
  console.log(`    Watching: skill/fragments/, skill/skills/, skill/build/manifest.json`);
  console.log('    Press Ctrl+C to stop.\n');

  main();

  let debounceTimer = null;
  const recompile = (eventType, filename) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\n--- Change detected${filename ? `: ${filename}` : ''} ---`);
      try {
        main();
      } catch (e) {
        console.error(`Compile error: ${e.message}`);
      }
    }, 300);
  };

  const watchDirs = [
    FRAGMENTS_DIR,
    join(SKILL_ROOT, 'skills'),
  ];

  for (const dir of watchDirs) {
    if (existsSync(dir)) {
      fsWatch(dir, { recursive: true }, recompile);
    }
  }
  fsWatch(MANIFEST_PATH, recompile);
}

if (watchMode) {
  startWatch();
} else {
  main();
}
