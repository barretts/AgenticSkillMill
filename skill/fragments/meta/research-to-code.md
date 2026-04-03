### Extracting CLI utilities from research

When research documents, field observations, or domain expertise suggest actionable tooling, follow this process to turn insights into CLI commands:

**Step 1: Read the research and tag actionable items**

Scan the source material for:
- Checklists that could be generated dynamically (checklist generator command)
- Calculations that depend on user inputs (calculator command)
- Validation rules that can be checked programmatically (validator command)
- Structured data that can be extracted from existing files (extractor command)
- Schedules or plans that follow a formula (planner command)
- Analysis that can be automated against a codebase or artifact (scanner command)

**Step 2: Group by command**

Each command should do one thing well. If two items from the research share the same input and output shape, they belong in one command. If they have different inputs, they're separate commands.

| Research insight | CLI command type | Example |
|-----------------|-----------------|---------|
| "Audiences retain 3+/-1 points" | Validator | Check that outlines have 2-4 key sections |
| "Budget 130 WPM for speaking" | Calculator | Compute per-section word counts from time budgets |
| "Spaced retrieval beats rereading" | Planner | Generate rehearsal schedule from event date |
| "Audio quality affects credibility" | Checklist | Pre-flight checklist with audio test item |
| "Entry points tell the story structure" | Scanner | Analyze repo for entry points and connectivity |

**Step 3: Define the interface before writing code**

For each command, write the TypeScript interface first:
- What does the user provide? (Options interface)
- What does the command return? (Result interface)
- What warnings can it produce? (`warnings: string[]` in Result)

**Step 4: Implement bottom-up**

1. Core module in `src/core/` (pure logic, no CLI concerns)
2. Command wrapper in `src/cli/commands/` (thin delegate)
3. Wire into `src/cli/index.ts` (with --json support)
4. Export from `src/index.ts` (for library consumers)
5. Build and verify: `npm run build && node dist/cli/index.js <command> --help`

**Step 5: Embed the research rationale**

When a command produces items (checklist entries, warnings, schedule sessions), include a `rationale` or `description` field that cites the research principle. This teaches the user *why*, not just *what*.
