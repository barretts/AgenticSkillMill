---
name: agentic-skill-mill
description: "Build, augment, and maintain skill projects that follow the skill-system-template architecture. Covers adding CLI commands, creating fragments, composing skills, renaming projects, and turning research into actionable tooling. Use when the user mentions: add a command, new skill, new fragment, augment the CLI, build a utility, add a tool, rename the project, forge a component, or wants to extend an existing skill project."
---

# Agentic Skill Mill

Forge and refine skill projects that follow the skill-system-template architecture: fragment-composed skills compiled to multiple IDE targets, paired with a TypeScript companion CLI (`skillmill`) that provides structured commands for agents and humans. Prefer `npx --yes agentic-skill-mill@latest <command>` when the utility is not globally installed. Remote users can install everything via `bash <(curl -fsSL https://agenticskillmill.com/install.sh) --all`.

---

## Architecture

{{include:meta/architecture-overview.md}}

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

{{include:meta/research-to-code.md}}

### Step 4: Implement Core Modules

{{include:meta/core-module-pattern.md}}

### Step 5: Implement CLI Command Wrappers

{{include:meta/cli-command-pattern.md}}

### Step 6: If Adding or Modifying Fragments

{{include:meta/fragment-composition.md}}

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
2. Add the skill name to the `SKILLS` array in `install-local.sh`
3. Compile: `npm run compile`

### Step 8: If Renaming the Project

{{include:meta/rename-workflow.md}}

### Step 9: Build, Compile, and Verify

After any change, run the full verification sequence:

```bash
npm run build              # TypeScript CLI compiles cleanly
npm run compile            # Skills compile to all 7 IDE targets
npm run compile:validate   # Cross-validates manifest vs source includes
npx --yes agentic-skill-mill@latest --help  # CLI command surface works via npx
```

If adding a new CLI command, also verify it runs:

```bash
npx --yes agentic-skill-mill@latest <command> --help  # Options are correct
npx --yes agentic-skill-mill@latest <command> <args>  # Human output works
npx --yes agentic-skill-mill@latest <command> --json  # JSON output works
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
- **Bare `return` in `set -e` scripts.** In `install-local.sh`, never write `[[ condition ]] || return` or `grep ... || return`. Bare `return` inherits the exit code of the failed test (1), which `set -e` treats as fatal -- killing the script silently. Always use `return 0` for early-exit guards: `[[ -d "$dir" ]] || return 0`, `[[ -z "$var" ]] && return 0`.
