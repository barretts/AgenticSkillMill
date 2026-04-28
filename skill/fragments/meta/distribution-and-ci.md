### Distribution model

The project is published to npmjs as a public package and hosted at `https://agenticskillmill.com`.

**Remote install (no clone):** Every project hosts `site/install.sh` and `site/install.ps1` bootstrap scripts served via GitHub Pages. Non-npm projects use a clone-to-temp pattern instead of `npm install -g`.

There are multiple ways users consume it:

| Method | Command | Who uses it |
|--------|---------|-------------|
| Remote install (bash) | `bash <(curl -fsSL https://<domain>/install.sh)` | End users on Linux/macOS |
| Remote install (PowerShell) | `irm https://<domain>/install.ps1 \| iex` | End users on Windows |
| npx (no install) | `npx --yes agentic-skill-mill@latest <command>` | Users running CLI commands without global install |
| Local development | `git clone` then `node install.js --all` | Contributors working on the project itself |

### One unified installer

**`install.js`** is a single cross-platform Node.js installer that replaces the old shell/PowerShell split:
- Runs `npm install` + `npm run build` + `npm run compile` + `npm link`
- Copies compiled skill outputs to IDE-specific directories (~/.claude/skills, ~/.cursor/rules, etc.)
- Supports `--skills-only` (skip build, just copy), `--uninstall`, `--compile-only`, and per-tool flags (`--cursor`, `--claude`, etc.)
- Auto-detects installed tools when no flags are provided

**`site/install.sh`** is the remote bootstrap installer. It is hosted at `https://agenticskillmill.com/install.sh` (source: `site/install.sh`) and bundled in the npm package. It:
1. Runs `npm install -g agentic-skill-mill@latest`
2. Locates `install.js` inside the globally installed package
3. Delegates to `node install.js --skills-only` with the user's flags

Both scripts respect environment overrides `SKILLMILL_PACKAGE_NAME` and `SKILLMILL_PACKAGE_VERSION`.

### npm package contents

The `files` array in `package.json` controls what ships to npm:

| Entry | Purpose |
|-------|---------|
| `dist` | Compiled TypeScript CLI and library |
| `compiled` | Pre-compiled skill outputs for all 5 IDE targets |
| `skill` | Skill sources, fragments, compiler, and manifest |
| `README.md` | Package documentation |
| `install.js` | Unified cross-platform installer |

The `bin` field maps `skillmill` to `dist/cli/index.js`, so `npx agentic-skill-mill` and global install both expose the `skillmill` command.

### GitHub Actions workflows

**Release to npm** (`.github/workflows/release.yml`):
- Triggers on push to `main` or `workflow_dispatch`
- Skips runs caused by its own release commits (loop guard via `chore(release):` in commit message)
- Steps: `npm ci` -> `npm run build` -> `npm run test -- --passWithNoTests` -> `npm run compile` -> `npm run compile:validate` -> version bump -> `git push --follow-tags` -> `npm publish --access public`
- Version bump finds the next available patch tag to avoid collisions with existing tags
- Required secrets: `AGENT_TOKEN` (PAT with repo scope for push), `AGENT_NPM_TOKEN` (npm automation token for publish)

**Deploy GitHub Pages** (`.github/workflows/deploy-pages.yml`):
- Triggers on push to `main` when files in `site/` change, or `workflow_dispatch`
- Uploads `site/` directory as the Pages artifact
- Deploys to the `github-pages` environment at `agenticskillmill.com`

### The `site/` directory

Static site served via GitHub Pages at `https://agenticskillmill.com`:

| File | Purpose |
|------|---------|
| `site/CNAME` | Custom domain binding |
| `site/index.html` | Landing page with architecture, CLI commands, and install instructions |
| `site/style.css` | Site styles |
| `site/install.sh` | Bootstrap installer served at `https://agenticskillmill.com/install.sh` |
| `site/install.ps1` | PowerShell bootstrap installer served at `https://agenticskillmill.com/install.ps1` |

When updating the bootstrap installer logic, edit `install.sh` and `install.ps1` at the repo root and copy them to `site/install.sh` and `site/install.ps1` to keep both in sync. The release workflow publishes the repo-root copies to npm; the Pages workflow serves the site copies to the domain.

### Modifying distribution touchpoints

| Change | Files to update |
|--------|----------------|
| Add a new skill | `skill/build/manifest.json` |
| Change package name | `package.json` name + bin, `site/install.sh` default, `install.js` PROJECT_NAME + CLI_BIN_NAME, `site/index.html`, README |
| Change bootstrap behavior | `install.js`, then copy to `site/install.sh` and `site/install.ps1` |
| Add a GitHub Actions secret | Repo settings, document in README |
| Update domain | `site/CNAME`, README, skill source, architecture fragment |
