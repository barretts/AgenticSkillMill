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
