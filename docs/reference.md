# Agentic Skill Mill Reference

Detailed patterns and workflows for the skill-system-template architecture. This document consolidates the knowledge encoded in the `skill/fragments/meta/` directory into a single reference for human readers.

The canonical source of truth is the fragments themselves. This document is a convenience copy.

---

## Architecture Overview

See: `skill/fragments/meta/architecture-overview.md`

The skill-system-template architecture has two halves that meet at the agent: **skills** (markdown runbooks composed from fragments, compiled to 7 IDE formats) and a **CLI companion** (TypeScript package with core modules, thin command wrappers, error hierarchy, and cache).

## Extracting CLI Utilities from Research

See: `skill/fragments/meta/research-to-code.md`

Five-step process: tag actionable items in research, group by command, define TypeScript interfaces, implement bottom-up (core -> command -> CLI wiring -> exports), embed research rationale.

## Core Module Pattern

See: `skill/fragments/meta/core-module-pattern.md`

Pure domain logic in `src/core/` with typed Options and Result interfaces. No chalk, no console.log, no process.exit. Return structured data with a `warnings: string[]` array.

## CLI Command Pattern

See: `skill/fragments/meta/cli-command-pattern.md`

Thin wrappers in `src/cli/commands/` that delegate to core modules. Every command supports `--json`. Wired into `src/cli/index.ts` with Commander.js. Exported from `src/index.ts`.

## Fragment Composition

See: `skill/fragments/meta/fragment-composition.md`

Reusable knowledge blocks in `skill/fragments/<category>/`. Categories: common, domain, meta. One level of includes only. No frontmatter. Declared in manifest.json.

## Renaming a Skill Project

See: `skill/fragments/meta/rename-workflow.md`

Three identity layers (npm package, CLI binary, skill name). 10-step checklist. Verification via grep sweep.
