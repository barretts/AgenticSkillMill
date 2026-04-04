# Agentic Skill Mill

Forge and refine agent skill projects. The skill teaches agents how to work with the skill-system-template architecture; the companion CLI (`skillmill`) provides structured commands for inspecting, inventorying, and forging project components.

## Quick Start

```bash
npm install
npm run build
npm run compile
bash install-local.sh          # local repo setup (auto-detect tools)
bash install-local.sh --all    # local repo setup for all tools
```

## One-Line Remote Install (No Clone)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/install.sh) --all
```

This bootstrap script installs the npm utility library globally, then installs skills for the targets you specify.

## Architecture

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

**Skills** are step-by-step runbooks that agents follow. They reference the CLI by name.

**The CLI** (`skillmill`) provides structured JSON commands that skills invoke. Every command has `--json` support.

**Fragments** are shared knowledge blocks included by multiple skills. Edit a fragment once, recompile, and every skill gets the update.

## CLI Commands

| Command | Description |
|---------|-------------|
| `skillmill inspect-manifest [path]` | Inspect a manifest.json for correctness |
| `skillmill inspect-skill <path>` | Inspect a skill source .md file |
| `skillmill inventory` | Take stock of all skills, fragments, and targets |
| `skillmill forge <kind> <name>` | Forge scaffolding (command, skill, fragment) |
| `skillmill audit-exports` | Audit that src/index.ts exports match core modules |

All commands support `--json` for structured agent consumption.
You can run them without global install using npx, for example:

```bash
npx --yes agentic-skill-mill@latest inventory --json
```

## Project Layout

```
skill/
  build/
    manifest.json       # Declares skills, fragment deps, compilation targets
    compile.mjs         # Compiler: resolves includes, transforms frontmatter
  fragments/
    meta/               # Knowledge about the skill system itself
  skills/
    agentic-skill-mill/ # The skill source

src/
  cli/
    index.ts            # CLI entry point (commander)
    output-formatter.ts # JSON + human-readable formatting
    commands/           # One file per command
  core/                 # Domain logic modules
  cache/                # Two-tier cache (memory + disk)
  errors/               # Typed error hierarchy

compiled/               # Machine-generated, one subdir per IDE target
contributions/          # Field observations from real runs
install-local.sh        # One-command local setup: build CLI + install skills
install.sh              # One-command remote bootstrap: install package + skills
```

## How to Add a Skill

1. Create the source file at `skill/skills/<name>/<name>.md` with YAML frontmatter
2. Register it in `skill/build/manifest.json`
3. Add the skill name to the `SKILLS` array in `install-local.sh`
4. Compile and validate: `npm run compile && npm run compile:validate`

## How to Add a Fragment

1. Create the fragment at `skill/fragments/<category>/<name>.md` (no frontmatter)
2. Include it in skills with `{{include:<category>/<name>.md}}`
3. Declare it in `manifest.json` under each skill's `fragments` array

## How to Add a CLI Command

1. Create the core module at `src/core/<module>.ts`
2. Create the command wrapper at `src/cli/commands/<name>.ts`
3. Register the command in `src/cli/index.ts`
4. Export the public API from `src/index.ts`
5. Rebuild: `npm run build`

Or use the forge command with npx: `npx --yes agentic-skill-mill@latest forge command <name> --write`

## Compilation Targets

| Target | Output path | Frontmatter |
|--------|------------|-------------|
| `claude` | `compiled/claude/<skill>/SKILL.md` | Pass-through + managed_by |
| `cursor-rules` | `compiled/cursor/rules/<skill>.mdc` | description + alwaysApply |
| `cursor-skills` | `compiled/cursor/skills/<skill>/SKILL.md` | Pass-through + managed_by |
| `windsurf-rules` | `compiled/windsurf/rules/<skill>.md` | trigger + description |
| `windsurf-skills` | `compiled/windsurf/skills/<skill>/SKILL.md` | Pass-through + managed_by |
| `opencode` | `compiled/opencode/<skill>.md` | mode + description + tools |
| `codex` | `compiled/codex/<skill>/SKILL.md` | Pass-through + managed_by |

## Testing

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run compile:validate  # Validate skill compilation
```

## Automated npm Releases (GitHub Actions)

This repo includes `.github/workflows/release.yml` to build, test, bump patch version, and publish to npm when changes land on `main` (or when manually triggered).

Required GitHub repository secrets:

- `AGENT_TOKEN`: personal access token with `repo` scope (used to push the version bump commit + tag)
- `NPM_TOKEN`: npm automation token for publishing to npmjs

Workflow behavior:

1. `npm ci`
2. `npm run build`
3. `npm run test -- --passWithNoTests`
4. `npm run compile`
5. `npm run compile:validate`
6. `git push --follow-tags`
7. `npm publish --access public`
