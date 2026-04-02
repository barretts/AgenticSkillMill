#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { validateManifestCommand } from './commands/validate-manifest.js';
import { validateSkillCommand } from './commands/validate-skill.js';
import { listProjectCommand } from './commands/list-project.js';
import { scaffoldCommand } from './commands/scaffold.js';
import { checkExportsCommand } from './commands/check-exports.js';
import { AppError } from '../errors/types.js';
import type { ScaffoldKind } from '../core/scaffold.js';

const program = new Command()
  .name('skillmill')
  .version('1.0.0', '-v, --version')
  .description('Agentic Skill Mill -- forge and refine skill-system-template projects');

// ---- Command: inspect-manifest ----

program
  .command('inspect-manifest')
  .description('Inspect a manifest.json for correctness and cross-validate fragments')
  .argument('[manifest]', 'Path to manifest.json', 'skill/build/manifest.json')
  .option('--json', 'Output as JSON', false)
  .action(async (manifest: string, options) => {
    try {
      const result = await validateManifestCommand({
        manifestPath: manifest,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log();
        if (result.valid) {
          console.log(chalk.green.bold('  PASSED') + '  ' + result.manifestPath);
        } else {
          console.log(chalk.red.bold('  FAILED') + '  ' + result.manifestPath);
        }
        console.log();

        for (const issue of result.issues) {
          const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
          console.log(`  ${color(issue.severity.toUpperCase().padEnd(7))} [${issue.rule}] ${issue.message}`);
        }

        if (result.issues.length > 0) console.log();

        console.log(chalk.gray(`  Inventory: ${result.stats.skills} skills, ${result.stats.fragments} fragments, ${result.stats.targets} targets`));
        console.log();
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---- Command: inspect-skill ----

program
  .command('inspect-skill')
  .description('Inspect a skill source for valid frontmatter, includes, and structure')
  .argument('<skill>', 'Path to the skill source .md file')
  .option('--json', 'Output as JSON', false)
  .option('--fragments-dir <dir>', 'Path to fragments directory')
  .action(async (skill: string, options) => {
    try {
      const result = await validateSkillCommand({
        skillPath: skill,
        fragmentsDir: options.fragmentsDir,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log();
        if (result.valid) {
          console.log(chalk.green.bold('  PASSED') + '  ' + result.skillPath);
        } else {
          console.log(chalk.red.bold('  FAILED') + '  ' + result.skillPath);
        }
        console.log();

        for (const issue of result.issues) {
          const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
          console.log(`  ${color(issue.severity.toUpperCase().padEnd(7))} line ${String(issue.line).padEnd(4)} [${issue.rule}] ${issue.message}`);
        }

        if (result.issues.length > 0) console.log();

        console.log(chalk.gray(`  Name: ${result.frontmatter.name || '(none)'}`));
        console.log(chalk.gray(`  Stats: ${result.stats.sections} sections, ${result.stats.includes} includes, ${result.stats.wordCount} words`));
        console.log();
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---- Command: inventory ----

program
  .command('inventory')
  .description('Take stock of all skills, fragments, and targets in a project')
  .option('--json', 'Output as JSON', false)
  .option('--cwd <dir>', 'Project root directory', process.cwd())
  .action(async (options) => {
    try {
      const result = await listProjectCommand({
        cwd: options.cwd,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log();
        console.log(chalk.bold(`Mill: ${result.projectName}`));
        if (result.cliBinName) {
          console.log(chalk.gray(`  CLI: ${result.cliBinName}`));
        }
        console.log(chalk.gray(`  Targets: ${result.targets.join(', ')}`));
        console.log();

        console.log(chalk.bold('  Skills:'));
        for (const skill of result.skills) {
          console.log(`    ${chalk.cyan(skill.name)} ${chalk.gray(`(${skill.fragments.length} fragments)`)}`);
          if (skill.description) {
            console.log(`      ${chalk.gray(skill.description.slice(0, 80))}${skill.description.length > 80 ? '...' : ''}`);
          }
        }
        console.log();

        console.log(chalk.bold('  Fragments:'));
        for (const frag of result.fragments) {
          const usage = frag.usedBy.length > 0
            ? chalk.gray(` (used by: ${frag.usedBy.join(', ')})`)
            : chalk.yellow(' (orphaned)');
          console.log(`    ${frag.path}${usage}`);
        }
        console.log();

        if (result.stats.orphanedFragments.length > 0) {
          console.log(chalk.yellow(`  ${result.stats.orphanedFragments.length} orphaned fragment(s) not claimed by any skill`));
          console.log();
        }
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---- Command: forge ----

program
  .command('forge')
  .description('Forge scaffolding for a new command, skill, or fragment')
  .argument('<kind>', 'What to forge: command, skill, or fragment')
  .argument('<name>', 'Name for the new item (lowercase kebab-case)')
  .option('--json', 'Output as JSON', false)
  .option('--cwd <dir>', 'Project root directory', process.cwd())
  .option('--category <cat>', 'Fragment category (common, domain, meta)', 'domain')
  .option('--description <desc>', 'Skill description')
  .option('--write', 'Actually write the files (default: dry-run)', false)
  .action(async (kind: string, name: string, options) => {
    try {
      const validKinds: ScaffoldKind[] = ['command', 'skill', 'fragment'];
      if (!validKinds.includes(kind as ScaffoldKind)) {
        console.error(chalk.red(`Invalid kind: "${kind}". Must be one of: ${validKinds.join(', ')}`));
        process.exit(1);
      }

      const result = await scaffoldCommand({
        kind: kind as ScaffoldKind,
        name,
        cwd: options.cwd,
        category: options.category,
        description: options.description,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log();
        console.log(chalk.bold(`Forge: ${result.kind} "${result.name}"`));
        console.log();

        if (options.write) {
          const fsModule = await import('fs/promises');
          const pathModule = await import('path');
          for (const file of result.files) {
            const fullPath = pathModule.default.join(options.cwd, file.path);
            await fsModule.default.mkdir(pathModule.default.dirname(fullPath), { recursive: true });
            await fsModule.default.writeFile(fullPath, file.content);
            console.log(chalk.green(`  Forged: ${file.path}`));
          }
        } else {
          console.log(chalk.gray('  Dry run (use --write to stamp the files):'));
          for (const file of result.files) {
            console.log(`    ${chalk.cyan(file.path)}`);
          }
        }

        console.log();
        console.log(chalk.bold('  Next steps:'));
        for (const instruction of result.instructions) {
          console.log(`    ${instruction}`);
        }

        for (const w of result.warnings) {
          console.log(chalk.yellow(`\n  Warning: ${w}`));
        }
        console.log();
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---- Command: audit-exports ----

program
  .command('audit-exports')
  .description('Audit that src/index.ts exports match core modules')
  .option('--json', 'Output as JSON', false)
  .option('--cwd <dir>', 'Project root directory', process.cwd())
  .action(async (options) => {
    try {
      const result = await checkExportsCommand({
        cwd: options.cwd,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log();
        console.log(chalk.bold('Export Audit'));
        console.log();

        for (const mod of result.coreModules) {
          const status = mod.exportedInIndex
            ? chalk.green('exported')
            : chalk.yellow('missing');
          console.log(`  ${mod.relativePath.padEnd(35)} ${status}`);
        }

        if (result.issues.length > 0) {
          console.log();
          for (const issue of result.issues) {
            const color = issue.severity === 'error' ? chalk.red : chalk.yellow;
            console.log(`  ${color(issue.severity.toUpperCase().padEnd(7))} [${issue.rule}] ${issue.message}`);
          }
        }

        for (const w of result.warnings) {
          console.log(chalk.yellow(`\n  Warning: ${w}`));
        }
        console.log();
      }
    } catch (error) {
      handleError(error);
    }
  });

// ---- Uniform error handler ----

function handleError(error: unknown): never {
  if (error instanceof AppError) {
    console.error(chalk.red(`Error [${error.code}]: ${error.message}`));
    if (error.context) {
      console.error(chalk.gray(`Details: ${JSON.stringify(error.context)}`));
    }
  } else if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red('An unknown error occurred'));
  }
  process.exit(1);
}

program.parse(process.argv);

if (process.argv.length < 3) {
  program.help();
}
