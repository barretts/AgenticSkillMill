The skill-system-template architecture has two halves that meet at the agent:

```
Skills (what to do)          CLI Companion (tools to do it with)
  skill/skills/*.md            src/cli/commands/*.ts
  skill/fragments/*.md         src/core/*.ts
          |                            |
          v                            v
  compiled/ (7 IDE formats)    dist/ (npm -> npx or global CLI)
          |                            |
          +---------> Agent <----------+
                        ^
                        |
  Distribution: npm publish + agenticskillmill.com
    .github/workflows/release.yml    (build, test, version, publish)
    .github/workflows/deploy-pages.yml (site/ -> GitHub Pages)
    site/install.sh                  (curl-friendly bootstrap)
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

**The local installer** (`install-local.sh`) builds the CLI, compiles skills, and copies compiled outputs to IDE-specific directories (~/.claude/skills, ~/.cursor/rules, etc.) with marker-based stale file cleanup. The bootstrap installer is hosted at `https://agenticskillmill.com/install.sh` (source: `site/install.sh`) and is also bundled in the npm package as `install.sh`. It installs the npm utility first, then delegates to `install-local.sh --skills-only`. Local installer functions use `set -e` for fail-fast behavior. Any function that uses an early-exit guard (`[[ -d ... ]] || return`, `[[ -z ... ]] && return`) **must** use `return 0`, never bare `return`. Bare `return` inherits the exit code of the last command, which for a failed conditional test is 1 -- and `set -e` treats that as a script-terminating failure with no error message.

### Key files to modify when augmenting a project

| What | File(s) |
|------|---------|
| Add a CLI command | `src/core/<name>.ts`, `src/cli/commands/<name>.ts`, `src/cli/index.ts`, `src/index.ts` |
| Add a fragment | `skill/fragments/<category>/<name>.md`, `skill/build/manifest.json`, skill source |
| Add a skill | `skill/skills/<name>/<name>.md`, `skill/build/manifest.json`, `install-local.sh` SKILLS array |
| Change installer behavior | `install.sh` (repo root) then copy to `site/install.sh` |
| Update the landing page | `site/index.html`, `site/style.css` |
| Change CI secrets or workflow | `.github/workflows/release.yml` or `deploy-pages.yml`, repo settings |
| Rename the project | See the rename workflow |
