# Agentic Skill Mill

Forge and refine agent skill projects. The skill teaches agents how to work with the skill-system-template architecture; the companion CLI (`skillmill`) provides structured commands for inspecting, inventorying, and forging project components.

## Quick Start

```bash
npm install
npm run build
npm run compile
node install.js           # local repo setup (auto-detect tools)
node install.js --all    # local repo setup for all tools
```

```powershell
npm install
npm run build
npm run compile
node install.js
node install.js --all
```

## One-Line Remote Install (No Clone)

```bash
bash <(curl -fsSL https://agenticskillmill.com/install.sh) --all
```

```powershell
powershell -ExecutionPolicy Bypass -Command "& ([ScriptBlock]::Create((Invoke-RestMethod 'https://agenticskillmill.com/install.ps1'))) --all"
```

This bootstrap script installs the npm utility library globally, then installs skills for the targets you specify.

## Architecture

```
Skills (what to do)          CLI Companion (tools to do it with)
  skill/skills/*.md            src/cli/commands/*.ts
  skill/fragments/*.md         src/core/*.ts
          |                            |
          v                            v
  compiled/ (5 IDE formats)    dist/ (npm link -> global CLI)
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
site/                   # GitHub Pages site (agenticskillmill.com)
install.js              # One-command local setup: build CLI + install skills
```

## How to Add a Skill

1. Create the source file at `skill/skills/<name>/<name>.md` with YAML frontmatter
2. Register it in `skill/build/manifest.json`
3. Compile and validate: `npm run compile && npm run compile:validate`

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

## Ecosystem

Agentic Skill Mill is the parent project that defines the skill-system-template architecture. The following projects are built on the same fragment-composition, 5-target compilation, and companion-CLI pattern:

| Project | What it does | Site | Repo |
|---------|-------------|------|------|
| **[AgentThreader](https://github.com/barretts/AgentThreader)** | Manifest-driven agentic CLI orchestration with structured contracts, resumable state, and bounded self-healing | [agentthreader.com](https://agentthreader.com) | [GitHub](https://github.com/barretts/AgentThreader) |
| **[TechDemoDirector](https://github.com/barretts/TechDemoDirector)** | Code walk-through presentation scripting with file:line references and speaker notes | [Site](https://barretts.github.io/TechDemoDirector) | [GitHub](https://github.com/barretts/TechDemoDirector) |
| **[AgentHistoric](https://github.com/barretts/AgentHistoric)** | Mixture-of-Experts persona prompt system with philosophical grounding and adversarial verification | [agenthistoric.com](https://agenthistoric.com) | [GitHub](https://github.com/barretts/AgentHistoric) |

AgentHistoric shares the compilation tooling but has its own MoE routing layer and regression suite. The other two are direct descendants of the skill-system-template.
