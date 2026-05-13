# Agentic Skill Mill

Agentic Skill Mill publishes an installable, prebuilt skill-system companion CLI and generated skill artifacts.

This main branch is the stable static release branch. Source development happens on dev.

## Install

```bash
node install.js --all
```

Remote bootstrap installers are served from GitHub Pages:

```bash
bash <(curl -fsSL https://agenticskillmill.com/install.sh) --all
```

```powershell
powershell -ExecutionPolicy Bypass -Command "& ([ScriptBlock]::Create((Invoke-RestMethod https://agenticskillmill.com/install.ps1))) --all"
```

## CLI

The static release includes the prebuilt skillmill runtime in dist/.

```bash
node dist/cli/index.js --help
```

The installer links the CLI globally during full setup:

```bash
npm run setup:all
skillmill inventory --json
```

## Supported Targets

| Flag | Target |
|------|--------|
| --claude | Claude Code skills |
| --cursor | Cursor skills |
| --windsurf | Windsurf skills |
| --opencode | OpenCode agents |
| --codex | Codex skills |
| --all | All targets |
| --skills-only | Copy skills from compiled/ without linking the CLI |
| --uninstall | Remove installed skills |

If no target flags are provided, the installer auto-detects installed tools.

## Branches

- main: stable static release branch with dist/, compiled/, installers, public docs, and the static website.
- dev: canonical source branch with src/, skill/, build tooling, tests, and npm release automation.

To modify CLI source, skill source, fragments, compiler behavior, or release automation, branch from dev.

## Included Release Artifacts

- dist/
- compiled/claude/
- compiled/cursor/skills/
- compiled/windsurf/skills/
- compiled/opencode/
- compiled/codex/
- install.js
- site/

## Website

The static website is deployed from the tracked site/ directory on main.

Public install wrappers are available at:

- site/install.sh
- site/install.ps1
