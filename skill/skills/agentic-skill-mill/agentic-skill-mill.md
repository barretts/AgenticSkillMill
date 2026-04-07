---
name: agentic-skill-mill
description: "Build, augment, and maintain skill projects that follow the skill-system-template architecture. Covers adding CLI commands, creating fragments, composing skills, renaming projects, and turning research into actionable tooling. Use when the user mentions: add a command, new skill, new fragment, augment the CLI, build a utility, add a tool, rename the project, forge a component, or wants to extend an existing skill project."
---

# Agentic Skill Mill

Forge and refine skill projects that follow the skill-system-template architecture: fragment-composed skills compiled to multiple IDE targets, paired with a TypeScript companion CLI (`skillmill`) that provides structured commands for agents and humans.

---

## Architecture

{{include:meta/architecture-overview.md}}

---

## Distribution and Installation

### Distribution models: public vs private repos

Skill projects can be distributed as public npm packages or as private GitHub repos. The distribution model determines how the bootstrap installer works and how the one-liner is constructed.

| Aspect | Public repo | Private repo |
|--------|-------------|--------------|
| One-liner | `bash <(curl -fsSL https://domain.com/install.sh) --all` | `bash <(gh api repos/OWNER/REPO/contents/install.sh -H 'Accept: application/vnd.github.raw') --all` |
| Bootstrap method | `npm install -g <package>@latest` → delegates to bundled `install-local.sh` | `gh repo clone` to persistent dir → runs `install.sh` from the clone |
| Requires | Node.js, npm | Node.js, npm, `gh` CLI (authenticated) |
| Landing page | GitHub Pages site at custom domain | Not viable — Pages for private repos requires cookie auth that `curl` cannot provide |
| Env overrides | `SKILLMILL_PACKAGE_NAME`, `SKILLMILL_PACKAGE_VERSION` | `PROJECT_REPO`, `PROJECT_BRANCH`, `PROJECT_HOME` |

### Private repo: why `curl` fails

GitHub Pages for private repos serves an HTML login redirect instead of raw file content. `curl` receives a `<!DOCTYPE html>` page, and `bash` fails with a syntax error. The `gh api` approach handles authentication transparently via the user's `gh` login token.

### Private repo: why `npm install -g` fails

If the package is not published to npmjs (common for internal/private projects), the bootstrap's `npm install -g <package>@latest` hits a 404. The fix is to clone the repo instead.

### Bootstrap installer pattern for private repos

The bootstrap installer for a private repo clones to a **persistent directory** (not a temp dir) and delegates to the local installer:

```bash
REPO="${PROJECT_REPO:-owner/repo}"
BRANCH="${PROJECT_BRANCH:-main}"
INSTALL_DIR="${PROJECT_HOME:-$HOME/.project-name}"

if [[ -d "${INSTALL_DIR}/.git" ]]; then
  git -C "${INSTALL_DIR}" fetch origin "${BRANCH}" --depth 1
  git -C "${INSTALL_DIR}" reset --hard "origin/${BRANCH}"
else
  [[ -d "${INSTALL_DIR}" ]] && rm -rf "${INSTALL_DIR}"
  if command -v gh &>/dev/null; then
    gh repo clone "${REPO}" "${INSTALL_DIR}" -- --branch "${BRANCH}" --depth 1 --single-branch
  else
    git clone --branch "${BRANCH}" --depth 1 --single-branch \
      "https://github.com/${REPO}.git" "${INSTALL_DIR}"
  fi
fi

bash "${INSTALL_DIR}/install.sh" "$@"
```

**Why persistent, not temp:** The local installer runs `npm link` which creates a global symlink pointing into the install directory. If that directory is a temp dir cleaned up by a `trap EXIT`, the CLI becomes a dangling symlink immediately after install completes.

### Installer build-block requirements

The `install.sh` build block (the section that runs npm install/build/link) has two mandatory patterns:

1. **Explicit `cd "$SKILL_DIR"` before npm commands.** When invoked by the remote bootstrap, the user's cwd is wherever they ran the one-liner. All npm commands execute in the caller's cwd, not in the installer's directory. Without `cd`, `npm install` reads the wrong `package.json` and `npm run build` fails with "Missing script: build".

2. **`npm install --include=dev`** instead of bare `npm install`. If the user has `NODE_ENV=production` set (common in corporate environments, CI runners, or Node version managers), bare `npm install` silently skips devDependencies. Since `typescript` is typically a devDependency, `tsc` is never installed and `npm run build` fails.

### Modifying distribution touchpoints

| Change | Files to update |
|--------|----------------|
| Switch from public to private distribution | Bootstrap installer pattern, one-liner in README/site, env overrides in `install.sh` |
| Change package name (public) | `package.json` name + bin, `install.sh` default, `site/install.sh` default, README |
| Change repo owner/name (private) | Bootstrap installer `REPO` default, one-liner in README, `install.sh` env overrides |
| Change custom domain | `site/CNAME`, README, skill source, architecture fragment |

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
2. Add the skill name to the `SKILLS` array in `install.sh`
3. Compile: `npm run compile`

### Step 8: If Renaming the Project

{{include:meta/rename-workflow.md}}

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
- **`curl` one-liner for private repos.** GitHub Pages for private repos requires cookie-based auth that `curl` cannot provide. The user gets an HTML login redirect instead of the shell script, producing `syntax error near unexpected token 'newline'`. Use `gh api repos/OWNER/REPO/contents/install.sh -H 'Accept: application/vnd.github.raw'` instead.
- **`npx <binary-name>` as a PATH workaround.** `npx` resolves *package* names, not binary names. Running `npx tsc` installs a package literally called `tsc` (not TypeScript) and hangs waiting for interactive confirmation. The fix is to ensure devDependencies are installed (`npm install --include=dev`) and use `npm run build`, which resolves `node_modules/.bin` automatically.
- **Temp dirs for clone-based installs.** When the bootstrap clones a repo and runs `npm link`, the global symlink points into the clone directory. If that directory is a temp dir cleaned by `trap EXIT`, the CLI becomes a dangling symlink immediately. Use a persistent directory (`~/.project-name/`) with fetch+reset for updates.
- **Bare `npm install` in installer build blocks.** If `NODE_ENV=production` is set in the user's environment, `npm install` silently skips devDependencies. Always use `npm install --include=dev` so build tools like `tsc` are available regardless of environment.
