---
managed_by: agentic-skill-mill
trigger: manual
description: "\"Build, augment, and maintain skill projects that follow the skill-system-template architecture. Covers adding CLI commands, creating fragments, composing skills, renaming projects, and turning research into actionable tooling. Use when the user mentions: add a command, new skill, new fragment, augment the CLI, build a utility, add a tool, rename the project, forge a component, or wants to extend an existing skill project.\""
---

# Agentic Skill Mill

Forge and refine skill projects that follow the skill-system-template architecture: fragment-composed skills compiled to multiple IDE targets, paired with a TypeScript companion CLI (`skillmill`) that provides structured commands for agents and humans.

---

## Architecture

The skill-system-template architecture has two halves that meet at the agent:

```
Skills (what to do)          CLI Companion (tools to do it with)
  skill/skills/*.md            src/cli/commands/*.ts
  skill/fragments/*.md         src/core/*.ts
          |                            |
          v                            v
  compiled/ (7 IDE formats)    dist/ (npm link -> global CLI)
          |                            |
          +---------> Agent <----------+
```

**Skills** are step-by-step runbooks in markdown with YAML frontmatter. They tell the agent *what* to do. Skills reference the CLI by name so the agent can invoke structured commands.

**Fragments** are shared knowledge blocks included by multiple skills via include markers (`\{\{include:path\}\}`). Edit a fragment once, recompile, and every skill that includes it gets the update. Fragments have no frontmatter.

**The compiler** (`skill/build/compile.mjs`) resolves includes, applies IDE-specific frontmatter transforms, and writes to `compiled/` with one subdirectory per target. It validates naming rules, checks for unresolved includes, and cross-validates manifest declarations against actual includes in source files.

**The CLI companion** is a TypeScript package with:
- `src/core/` — Pure logic modules with typed interfaces
- `src/cli/commands/` — Thin command wrappers that delegate to core modules
- `src/cli/index.ts` — Commander.js entry point wiring all commands
- `src/cli/output-formatter.ts` — JSON, table, and key-value formatters
- `src/errors/types.ts` — Typed error hierarchy (AppError, NotFoundError, etc.)
- `src/cache/cache-manager.ts` — Two-tier cache (memory + disk) with TTL

**The installer** (`install.sh`) builds the CLI, compiles skills, and copies compiled outputs to IDE-specific directories (~/.claude/skills, ~/.cursor/rules, etc.) with marker-based stale file cleanup. The installer uses `set -e` for fail-fast behavior. Any function that uses an early-exit guard (`[[ -d ... ]] || return`, `[[ -z ... ]] && return`) **must** use `return 0`, never bare `return`. Bare `return` inherits the exit code of the last command, which for a failed conditional test is 1 -- and `set -e` treats that as a script-terminating failure with no error message.

### Key files to modify when augmenting a project

| What | File(s) |
|------|---------|
| Add a CLI command | `src/core/<name>.ts`, `src/cli/commands/<name>.ts`, `src/cli/index.ts`, `src/index.ts` |
| Add a fragment | `skill/fragments/<category>/<name>.md`, `skill/build/manifest.json`, skill source |
| Add a skill | `skill/skills/<name>/<name>.md`, `skill/build/manifest.json`, `install.sh` SKILLS array |
| Rename the project | See the rename workflow |

---

## Workflow

### Step 1: Understand the Goal

Ask or infer:

| Question | Why It Matters |
|----------|---------------|
| What is the user trying to add or change? | Scopes the work: new command, new skill, new fragment, rename, or full project |
| Is there research or a requirements document? | Source material drives which CLI commands to build |
| What's the existing project state? | Read manifest.json, package.json, and src/cli/index.ts to understand what's already built |
| Does this need a new skill, a new fragment, or just a new CLI command? | Different paths require different steps |

### Step 2: Read the Project State

Before making changes, read these files to understand the current structure:

1. `skill/build/manifest.json` — what skills and fragments exist
2. `src/cli/index.ts` — what CLI commands are wired
3. `src/index.ts` — what's exported
4. `package.json` — package name, bin name, dependencies

### Step 3: If Adding CLI Commands from Research

### Extracting CLI utilities from research

When research documents, field observations, or domain expertise suggest actionable tooling, follow this process to turn insights into CLI commands:

**Step 1: Read the research and tag actionable items**

Scan the source material for:
- Checklists that could be generated dynamically (checklist generator command)
- Calculations that depend on user inputs (calculator command)
- Validation rules that can be checked programmatically (validator command)
- Structured data that can be extracted from existing files (extractor command)
- Schedules or plans that follow a formula (planner command)
- Analysis that can be automated against a codebase or artifact (scanner command)

**Step 2: Group by command**

Each command should do one thing well. If two items from the research share the same input and output shape, they belong in one command. If they have different inputs, they're separate commands.

| Research insight | CLI command type | Example |
|-----------------|-----------------|---------|
| "Audiences retain 3+/-1 points" | Validator | Check that outlines have 2-4 key sections |
| "Budget 130 WPM for speaking" | Calculator | Compute per-section word counts from time budgets |
| "Spaced retrieval beats rereading" | Planner | Generate rehearsal schedule from event date |
| "Audio quality affects credibility" | Checklist | Pre-flight checklist with audio test item |
| "Entry points tell the story structure" | Scanner | Analyze repo for entry points and connectivity |

**Step 3: Define the interface before writing code**

For each command, write the TypeScript interface first:
- What does the user provide? (Options interface)
- What does the command return? (Result interface)
- What warnings can it produce? (`warnings: string[]` in Result)

**Step 4: Implement bottom-up**

1. Core module in `src/core/` (pure logic, no CLI concerns)
2. Command wrapper in `src/cli/commands/` (thin delegate)
3. Wire into `src/cli/index.ts` (with --json support)
4. Export from `src/index.ts` (for library consumers)
5. Build and verify: `npm run build && node dist/cli/index.js <command> --help`

**Step 5: Embed the research rationale**

When a command produces items (checklist entries, warnings, schedule sessions), include a `rationale` or `description` field that cites the research principle. This teaches the user *why*, not just *what*.

### Step 4: Implement Core Modules

Every CLI command starts as a **core module** in `src/core/`. Core modules contain pure domain logic with no CLI concerns (no chalk, no console.log, no process.exit). This separation lets the logic be consumed as a library, tested independently, and composed by multiple commands.

### Structure of a core module

```typescript
// src/core/<name>.ts

/** Input options -- everything the caller needs to provide */
export interface <Name>Options {
  requiredParam: string;
  optionalParam?: number;
}

/** Output result -- everything the caller gets back */
export interface <Name>Result {
  data: SomeType[];
  warnings: string[];
}

/** Pure function: options in, result out. No side effects on stdout. */
export function <name>(options: <Name>Options): <Name>Result {
  return { data: [], warnings: [] };
}
```

### Rules

- **Export typed interfaces** for both input and output so consumers get autocomplete and type safety
- **Return structured data**, never print to stdout -- the CLI wrapper decides how to format
- **Include a `warnings` array** in results when the function can detect non-fatal issues
- **Use `async` only when needed** (file I/O, network) -- synchronous logic stays synchronous
- **Throw typed errors** from `src/errors/types.ts` for unrecoverable failures
- **Keep modules focused** -- one concept per file. A pace calculator doesn't also validate outlines
- **Accept paths and options, not raw CLI strings** -- parsing belongs in the command wrapper

### Shared parsers

When two or more commands need to parse the same input format, extract a shared parser module. The parser returns a structured type that both consumers work with.

### Step 5: Implement CLI Command Wrappers

### Command wrapper pattern

Each CLI command lives in `src/cli/commands/<name>.ts` as a thin wrapper:

```typescript
// src/cli/commands/<name>.ts
import { doThing, type ThingOptions, type ThingResult } from '../../core/<name>.js';

export interface ThingCommandOptions extends ThingOptions {
  json: boolean;
}

export async function thingCommand(
  options: ThingCommandOptions,
): Promise<ThingResult> {
  return doThing({
    param: options.param,
  });
}
```

**Rules for command wrappers:**
- Import from core module using `.js` extension (ESM resolution)
- Extend the core options interface with `json: boolean`
- Delegate immediately to the core function -- no business logic in the wrapper
- Return the core result type -- formatting happens in `index.ts`

### Wiring into the CLI entry point

Add the command in `src/cli/index.ts`:

```typescript
import { thingCommand } from './commands/<name>.js';

program
  .command('<name>')
  .description('One-line description of what this does')
  .argument('<required>', 'Description of required positional arg')   // if needed
  .requiredOption('--param <value>', 'Required option description')   // if needed
  .option('--json', 'Output as JSON', false)
  .option('--optional <value>', 'Optional flag', 'default')
  .action(async (positionalArg, options) => {
    try {
      const result = await thingCommand({
        param: positionalArg,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Human-readable output using chalk
        console.log();
        console.log(chalk.bold('Title'));
        for (const item of result.data) {
          console.log(`  ${item}`);
        }
        console.log();
      }
    } catch (error) {
      handleError(error);
    }
  });
```

**Rules for CLI wiring:**
- Every command supports `--json` for structured agent consumption
- Human-readable output uses chalk for color and formatting
- Errors funnel through the shared `handleError()` function
- Use `.argument()` for required positional args, `.requiredOption()` for mandatory flags
- Parse string options to their real types (parseInt, parseFloat) in the action handler
- Comma-separated list options get `.split(',').map(s => s.trim())` in the action handler

### Updating exports

After adding a new core module, export its public API from `src/index.ts`:

```typescript
export { doThing } from './core/<name>.js';
export type { ThingOptions, ThingResult } from './core/<name>.js';
```

This allows the package to be consumed as a library, not just a CLI.

### Step 6: If Adding or Modifying Fragments

### Designing fragments

Fragments are reusable knowledge blocks stored in `skill/fragments/<category>/`. They are included in skill sources via include markers (`\{\{include:path\}\}`) and resolved at compile time.

**When to create a fragment:**
- The knowledge applies to 2+ skills (or likely will in the future)
- The content is self-contained and makes sense without its parent skill
- Updating the knowledge in one place should propagate everywhere

**When NOT to create a fragment:**
- The content is specific to exactly one skill and unlikely to be reused
- The content requires context from the surrounding skill to make sense
- The content is a single sentence or table row (too small to justify the indirection)

### Fragment categories

| Category | What goes here | Examples |
|----------|---------------|---------|
| `common/` | Rules and formats shared across all skills | Output format, guidelines, anti-patterns |
| `domain/` | Deep domain knowledge specific to the project's subject area | Pacing tables, narrative patterns, voice guides |
| `meta/` | Knowledge about the skill system itself | Architecture, patterns, workflows |

### Creating a fragment

1. **Create the file** at `skill/fragments/<category>/<name>.md`
   - No YAML frontmatter -- fragments are pure content
   - Write in the same imperative style as the parent skill
   - Use markdown headers starting at `###` (they'll be nested inside the skill's `##` sections)

2. **Include it in the skill source** with an include marker: `\{\{include:<category>/<name>.md\}\}`

3. **Declare it in manifest.json** under the skill's `fragments` array -- the compiler cross-validates these declarations against actual includes and errors on mismatches

### Fragment rules

- **One level of includes only.** Fragments cannot include other fragments. This is enforced by the compiler.
- **No frontmatter.** Fragments are content blocks, not standalone documents.
- **Match the parent skill's voice.** If the skill uses imperative mood ("Do X"), the fragment should too.
- **Fragments are inlined verbatim.** The compiler replaces include markers with the fragment content, trimming trailing whitespace. No wrapping, no indentation changes.
- **Keep fragments focused.** A fragment about pacing shouldn't also cover narrative patterns. If they're separate concepts, they're separate fragments.

### Step 7: If Adding a New Skill

Create the skill source at `skill/skills/<name>/<name>.md` with this structure:

```markdown
---
name: <skill-name>
description: "One sentence explaining what this skill does and when to invoke it."
---

# Skill Title

Brief description of what this skill produces.

---

## Section Name

\{\{include:<category>/<fragment>.md\}\}

---

## Another Section

Direct content or more includes.
```

Then register it:

1. Add the skill entry to `skill/build/manifest.json` with its source path and fragment dependencies
2. Add the skill name to the `SKILLS` array in `install.sh`
3. Compile: `npm run compile`

### Step 8: If Renaming the Project

### Renaming a skill project

When the project, skill, or CLI needs a new name, update all touchpoints in one pass to avoid stale references. The rename affects three identity layers:

| Layer | Old example | New example |
|-------|-------------|-------------|
| npm package name | `presentation-creator` | `tech-demo-director` |
| CLI binary name | `presentation-util` | `demo-director` |
| Skill name + managed marker | `presentation-creator` | `tech-demo-director` |

### Rename checklist (in order)

1. **Skill source directory and file**
   ```bash
   mv skill/skills/<old>/ skill/skills/<new>/
   mv skill/skills/<new>/<old>.md skill/skills/<new>/<new>.md
   ```

2. **Skill source frontmatter** -- update `name:` and H1 title in the renamed .md

3. **Manifest** (`skill/build/manifest.json`) -- rename the skill key and `source` path

4. **Compiler marker** (`skill/build/compile.mjs`) -- update the `MANAGED_BY` constant

5. **Installer** (`install.sh`) -- update `PROJECT_NAME`, `CLI_BIN_NAME`, `MANAGED_MARKER`, `SKILLS` array

6. **Package metadata** (`package.json`) -- update `name` and `bin` key

7. **CLI metadata** (`src/cli/index.ts`) -- update `.name()` and `.description()` calls

8. **README** -- update title, CLI references, project layout example

9. **Any docs** referencing the old name (translation-map, lessons-learned, etc.)

10. **Regenerate everything:**
    ```bash
    rm -rf compiled
    npm install          # regenerates package-lock.json
    npm run build        # rebuilds TypeScript CLI
    npm run compile      # regenerates compiled/ under new paths
    ```

### Verification

After renaming, run this sweep to confirm no stale references remain:

```bash
grep -r "<old-name>" --include="*.md" --include="*.json" --include="*.mjs" --include="*.ts" --include="*.sh" .
```

The grep should return zero results (excluding node_modules and dist).

### Step 9: Build, Compile, and Verify

After any change, run the full verification sequence:

```bash
npm run build              # TypeScript CLI compiles cleanly
npm run compile            # Skills compile to all 7 IDE targets
npm run compile:validate   # Cross-validates manifest vs source includes
node dist/cli/index.js --help  # CLI shows expected commands
```

If adding a new CLI command, also verify it runs:

```bash
node dist/cli/index.js <command> --help     # Options are correct
node dist/cli/index.js <command> <args>     # Human output works
node dist/cli/index.js <command> --json     # JSON output works
```

### Step 10: Commit

Use conventional commit format with a detailed body:

- `feat:` for new commands, skills, or fragments
- `refactor:` for renames or restructuring
- `fix:` for bug fixes

The commit body should list every file category changed (core modules, CLI wrappers, fragments, manifest, etc.) and what was done in each.

---

## Anti-Patterns

- **Business logic in CLI wrappers.** Command wrappers delegate; they don't compute.
- **Console output in core modules.** Core modules return data; they don't print.
- **Fragments that include fragments.** Only one level of includes is supported.
- **Undeclared fragments.** Every include marker in a skill source must be declared in manifest.json. The compiler errors on mismatches.
- **Stale compiled outputs.** Always recompile after changing skills or fragments. Run `npm run compile:validate` to detect staleness.
- **Partial renames.** When renaming, update every touchpoint in one pass (see rename workflow). A grep sweep with zero results confirms completeness.
- **Missing --json support.** Every CLI command must support `--json` for structured agent consumption. Agents cannot parse chalk-colored terminal output.
- **Bare `return` in `set -e` scripts.** In `install.sh`, never write `[[ condition ]] || return` or `grep ... || return`. Bare `return` inherits the exit code of the failed test (1), which `set -e` treats as fatal -- killing the script silently. Always use `return 0` for early-exit guards: `[[ -d "$dir" ]] || return 0`, `[[ -z "$var" ]] && return 0`.
