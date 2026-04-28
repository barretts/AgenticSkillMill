#!/usr/bin/env node
/**
 * Unified install script for agentic-skill-mill.
 *
 * Cross-platform Node.js implementation that replaces:
 *   - install.sh / install.ps1
 *   - install-local.sh / install-local.ps1
 *
 * Usage:
 *   node install.js [options]
 *
 * Options:
 *   --claude        Install skills for Claude Code
 *   --cursor       Install skills for Cursor
 *   --windsurf     Install skills for Windsurf
 *   --opencode    Install skills for OpenCode
 *   --codex       Install skills for Codex
 *   --all         Install for all five tools
 *   --skills-only Skip npm install/build/link (just copy skills)
 *   --uninstall   Remove installed skills from target tools
 *   --compile-only Generate compiled/ output directory (no install)
 *   -h, --help    Show this help
 *
 * If no flags are provided, the script auto-detects installed tools.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoDir = path.dirname(path.resolve(__filename));

// --- Constants -------------------------------------------------------------

const MANAGED_MARKER = 'managed_by: agentic-skill-mill';
const PROJECT_NAME = 'agentic-skill-mill';
const CLI_BIN_NAME = 'skillmill';
const SKILL_NAME = 'agentic-skill-mill';

const HOME = os.homedir();
const APPDATA = process.env.APPDATA;

// --- Source dirs (compiled output) -------------------------------------

const COMPILED_DIR = path.join(repoDir, 'compiled');

const SRC = {
  claude: path.join(COMPILED_DIR, 'claude', SKILL_NAME),
  cursorSkills: path.join(COMPILED_DIR, 'cursor', 'skills'),
  windsurfSkills: path.join(COMPILED_DIR, 'windsurf', 'skills'),
  opencode: path.join(COMPILED_DIR, 'opencode'),
  codex: path.join(COMPILED_DIR, 'codex', SKILL_NAME),
};

// --- Target directories -----------------------------------------------------

const DEST = {
  claude: path.join(HOME, '.claude', 'skills', SKILL_NAME),
  cursorSkills: path.join(HOME, '.cursor', 'skills', SKILL_NAME),
  windsurfSkills: path.join(HOME, '.codeium', 'windsurf', 'skills', SKILL_NAME),
  opencode: path.join(APPDATA || path.join(HOME, '.config', 'opencode'), 'agents'),
  codex: path.join(process.env.CODEX_HOME || path.join(HOME, '.codex'), 'skills', SKILL_NAME),
};

// --- Filesystem helpers ----------------------------------------------------

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(ext))
    .map((name) => path.join(dir, name));
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function writeText(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content);
}

function fileExists(file) {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function dirExists(dir) {
  try {
    return fs.statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

function fileContains(file, marker) {
  if (!fileExists(file)) return false;
  return readText(file).includes(marker);
}

function cleanupManagedFiles(destDir) {
  if (!dirExists(destDir)) return;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && fileContains(full, MANAGED_MARKER)) {
        fs.unlinkSync(full);
        console.log(`    Removed stale: ${full}`);
        // Try to remove empty parent dirs
        const parent = path.dirname(full);
        try {
          if (dirExists(parent) && fs.readdirSync(parent).length === 0) {
            fs.rmdirSync(parent);
          }
        } catch {
          // Ignore errors
        }
      }
    }
  };
  walk(destDir);
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  console.log(`    ${dest}`);
}

// --- Shell helpers --------------------------------------------------------

function runNode(args, options = {}) {
  const result = spawnSync('node', args, {
    stdio: 'inherit',
    cwd: repoDir,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNpm(args, options = {}) {
  const result = spawnSync('npm', args, {
    stdio: 'inherit',
    cwd: repoDir,
    ...options,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// --- Install functions ------------------------------------------------------

function installClaude() {
  const src = SRC.claude;
  const dest = DEST.claude;
  if (!dirExists(src)) {
    console.log(`    Warning: source missing ${src}`);
    return;
  }
  ensureDir(dest);
  const srcFile = path.join(src, 'SKILL.md');
  if (fileExists(srcFile)) {
    copyFile(srcFile, path.join(dest, 'SKILL.md'));
  }
  console.log(`    Claude:   ${dest}`);
}

function installCursor() {
  // Skills directory only (not rules)
  const srcSkills = SRC.cursorSkills;
  const destSkills = DEST.cursorSkills;
  if (dirExists(srcSkills)) {
    ensureDir(destSkills);
    const srcFile = path.join(srcSkills, 'SKILL.md');
    if (fileExists(srcFile)) {
      copyFile(srcFile, path.join(destSkills, 'SKILL.md'));
    }
  }
  console.log(`    Cursor:  skills -> ${destSkills}`);
}

function installWindsurf() {
  // Skills directory only (not rules)
  const srcSkills = SRC.windsurfSkills;
  const destSkills = DEST.windsurfSkills;
  if (dirExists(srcSkills)) {
    ensureDir(destSkills);
    const srcFile = path.join(srcSkills, 'SKILL.md');
    if (fileExists(srcFile)) {
      copyFile(srcFile, path.join(destSkills, 'SKILL.md'));
    }
  }
  console.log(`    Windsurf: skills -> ${destSkills}`);
}

function installOpenCode() {
  const src = SRC.opencode;
  const dest = DEST.opencode;
  if (!dirExists(src)) {
    console.log(`    Warning: source missing ${src}`);
    return;
  }
  ensureDir(dest);
  // opencode uses .md files directly in agents directory
  for (const srcFile of listFiles(src, '.md')) {
    const destFile = path.join(dest, path.basename(srcFile));
    copyFile(srcFile, destFile);
  }
  console.log(`    OpenCode: ${dest}`);
}

function installCodex() {
  const src = SRC.codex;
  const dest = DEST.codex;
  if (!dirExists(src)) {
    console.log(`    Warning: source missing ${src}`);
    return;
  }
  ensureDir(dest);
  const srcFile = path.join(src, 'SKILL.md');
  if (fileExists(srcFile)) {
    copyFile(srcFile, path.join(dest, 'SKILL.md'));
  }
  console.log(`    Codex:   ${dest}`);
}

// --- Uninstall functions ---------------------------------------------------

function uninstallClaude() {
  const dest = DEST.claude;
  if (dirExists(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  console.log(`    Claude:   removed`);
}

function uninstallCursor() {
  const destSkills = DEST.cursorSkills;
  if (dirExists(destSkills)) {
    fs.rmSync(destSkills, { recursive: true, force: true });
  }
  console.log(`    Cursor:   removed`);
}

function uninstallWindsurf() {
  const destSkills = DEST.windsurfSkills;
  if (dirExists(destSkills)) {
    fs.rmSync(destSkills, { recursive: true, force: true });
  }
  console.log(`    Windsurf: removed`);
}

function uninstallOpenCode() {
  const dest = DEST.opencode;
  if (dirExists(dest)) {
    for (const f of listFiles(dest, '.md')) {
      if (fileContains(f, MANAGED_MARKER)) {
        fs.unlinkSync(f);
      }
    }
  }
  console.log(`    OpenCode: removed`);
}

function uninstallCodex() {
  const dest = DEST.codex;
  if (dirExists(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  console.log(`    Codex:    removed`);
}

// --- Auto-detection -------------------------------------------------------

function detectEditors() {
  const detected = [];
  if (dirExists(path.join(HOME, '.claude'))) detected.push('claude');
  if (dirExists(path.join(HOME, '.cursor'))) detected.push('cursor');
  if (
    dirExists(path.join(HOME, '.windsurf')) ||
    dirExists(path.join(HOME, '.codeium', 'windsurf'))
  ) {
    detected.push('windsurf');
  }
  if (
    dirExists(path.join(APPDATA || path.join(HOME, '.config', 'opencode'))) ||
    dirExists(path.join(HOME, '.config', 'opencode'))
  ) {
    detected.push('opencode');
  }
  if (
    process.env.CODEX_HOME ||
    dirExists(path.join(HOME, '.codex'))
  ) {
    detected.push('codex');
  }
  return detected;
}

// --- CLI parsing ---------------------------------------------------------

function printHelp() {
  process.stdout.write(`Usage: node install.js [options]

Options:
  --claude        Install skills for Claude Code
  --cursor        Install skills for Cursor
  --windsurf      Install skills for Windsurf
  --opencode     Install skills for OpenCode
  --codex        Install skills for Codex
  --all          Install for all five tools
  --skills-only  Skip npm install/build/link (just copy skills)
  --uninstall    Remove installed skills from target tools
  --compile-only Generate compiled/ output directory (no install)
  -h, --help     Show this help

No flags = auto-detect installed tools.

Environment overrides:
  CODEX_HOME     Codex home directory (default: ~/.codex)
`);
}

function parseArgs(argv) {
  const targets = [];
  const flags = {
    help: false,
    skillsOnly: false,
    uninstall: false,
    compileOnly: false,
    all: false,
  };

  for (const arg of argv) {
    switch (arg) {
      case '--claude':
        targets.push('claude');
        break;
      case '--cursor':
        targets.push('cursor');
        break;
      case '--windsurf':
        targets.push('windsurf');
        break;
      case '--opencode':
        targets.push('opencode');
        break;
      case '--codex':
        targets.push('codex');
        break;
      case '--all':
        flags.all = true;
        break;
      case '--skills-only':
        flags.skillsOnly = true;
        break;
      case '--uninstall':
        flags.uninstall = true;
        break;
      case '--compile-only':
        flags.compileOnly = true;
        break;
      case '-h':
      case '--help':
        flags.help = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        console.error('Run: node install.js --help');
        process.exit(1);
    }
  }

  if (flags.all) {
    targets.length = 0;
    targets.push('claude', 'cursor', 'windsurf', 'opencode', 'codex');
  }

  return { targets, flags };
}

// --- Build orchestration -------------------------------------------------

function buildProject() {
  console.log('--> Installing dependencies...');
  runNpm(['install']);

  console.log('--> Cleaning previous build...');
  const distDir = path.join(repoDir, 'dist');
  if (dirExists(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }

  console.log('--> Building TypeScript...');
  runNpm(['run', 'build']);

  const distCli = path.join(distDir, 'cli', 'index.js');
  if (fileExists(distCli)) {
    fs.chmodSync(distCli, 0o755);
  }

  console.log('--> Compiling skills...');
  runNpm(['run', 'compile']);

  console.log('--> Linking CLI globally...');
  runNpm(['link']);

  // Verify CLI is available
  const npmPrefix = spawnSync('npm', ['prefix', '-g'], { encoding: 'utf8' }).stdout.trim();
  const cliPath = path.join(npmPrefix, 'bin', CLI_BIN_NAME);
  const cliPathAlt = path.join(npmPrefix, 'bin', `${CLI_BIN_NAME}.cmd`);

  if (fileExists(cliPath) || fileExists(cliPathAlt)) {
    console.log(`    ${CLI_BIN_NAME}: ${cliPath}`);
  } else {
    console.log(`    Warning: ${CLI_BIN_NAME} not found after npm link. Try: npm link`);
  }
}

// --- Main -----------------------------------------------------------------

function main(argv) {
  const { targets, flags } = parseArgs(argv);

  if (flags.help) {
    printHelp();
    return;
  }

  // Compile-only path
  if (flags.compileOnly) {
    console.log('==> Compiling skills...');
    runNode([path.join(repoDir, 'skill', 'build', 'compile.mjs')]);
    console.log('==> Done.');
    return;
  }

  // Resolve targets
  let resolvedTargets = targets.length > 0 ? targets : detectEditors();

  if (resolvedTargets.length === 0) {
    console.error(
      'ERROR: No supported tools detected. Use --claude, --cursor, --windsurf, --opencode, or --codex.'
    );
    process.exit(1);
  }
  // Dedupe
  resolvedTargets = [...new Set(resolvedTargets)];

  console.log(`==> ${PROJECT_NAME} setup`);
  console.log(`    Project: ${repoDir}`);
  console.log(`    Targets: ${resolvedTargets.join(' ')}`);
  console.log('');

  // Uninstall path
  if (flags.uninstall) {
    console.log('==> Uninstalling...');
    for (const t of resolvedTargets) {
      switch (t) {
        case 'claude':
          uninstallClaude();
          break;
        case 'cursor':
          uninstallCursor();
          break;
        case 'windsurf':
          uninstallWindsurf();
          break;
        case 'opencode':
          uninstallOpenCode();
          break;
        case 'codex':
          uninstallCodex();
          break;
      }
    }

    console.log('--> Removing CLI link...');
    runNpm(['unlink', PROJECT_NAME]);

    console.log('');
    console.log('==> Done. Skills and CLI removed.');
    return;
  }

  // Install path
  if (!flags.skillsOnly) {
    buildProject();
  }

  console.log('--> Cleaning stale files...');
  for (const t of resolvedTargets) {
    switch (t) {
      case 'claude':
        cleanupManagedFiles(DEST.claude);
        break;
      case 'cursor':
        cleanupManagedFiles(DEST.cursorSkills);
        break;
      case 'windsurf':
        cleanupManagedFiles(DEST.windsurfSkills);
        break;
      case 'opencode':
        cleanupManagedFiles(DEST.opencode);
        break;
      case 'codex':
        cleanupManagedFiles(DEST.codex);
        break;
    }
  }

  console.log('--> Installing skills...');
  for (const t of resolvedTargets) {
    switch (t) {
      case 'claude':
        installClaude();
        break;
      case 'cursor':
        installCursor();
        break;
      case 'windsurf':
        installWindsurf();
        break;
      case 'opencode':
        installOpenCode();
        break;
      case 'codex':
        installCodex();
        break;
    }
  }

  console.log('');
  console.log('==> Done.');
  console.log('');
  console.log(`Skills installed for: ${resolvedTargets.join(' ')}`);
  console.log(`CLI available as: ${CLI_BIN_NAME}`);
}

main(process.argv.slice(2));