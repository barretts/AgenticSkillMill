### Command wrapper pattern

Each CLI command lives in `src/cli/commands/<name>.ts` as a thin wrapper:

```typescript
// src/cli/commands/<name>.ts
import { doThing, type ThingOptions, type ThingResult } from '../../core/<name>.js';

export interface ThingCommandOptions extends ThingOptions {
  json: boolean;
}

export async function thingCommand(
  options: ThingCommandOptions,
): Promise<ThingResult> {
  return doThing({
    param: options.param,
  });
}
```

**Rules for command wrappers:**
- Import from core module using `.js` extension (ESM resolution)
- Extend the core options interface with `json: boolean`
- Delegate immediately to the core function -- no business logic in the wrapper
- Return the core result type -- formatting happens in `index.ts`

### Wiring into the CLI entry point

Add the command in `src/cli/index.ts`:

```typescript
import { thingCommand } from './commands/<name>.js';

program
  .command('<name>')
  .description('One-line description of what this does')
  .argument('<required>', 'Description of required positional arg')   // if needed
  .requiredOption('--param <value>', 'Required option description')   // if needed
  .option('--json', 'Output as JSON', false)
  .option('--optional <value>', 'Optional flag', 'default')
  .action(async (positionalArg, options) => {
    try {
      const result = await thingCommand({
        param: positionalArg,
        json: options.json,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        // Human-readable output using chalk
        console.log();
        console.log(chalk.bold('Title'));
        for (const item of result.data) {
          console.log(`  ${item}`);
        }
        console.log();
      }
    } catch (error) {
      handleError(error);
    }
  });
```

**Rules for CLI wiring:**
- Every command supports `--json` for structured agent consumption
- Human-readable output uses chalk for color and formatting
- Errors funnel through the shared `handleError()` function
- Use `.argument()` for required positional args, `.requiredOption()` for mandatory flags
- Parse string options to their real types (parseInt, parseFloat) in the action handler
- Comma-separated list options get `.split(',').map(s => s.trim())` in the action handler

### Updating exports

After adding a new core module, export its public API from `src/index.ts`:

```typescript
export { doThing } from './core/<name>.js';
export type { ThingOptions, ThingResult } from './core/<name>.js';
```

This allows the package to be consumed as a library, not just a CLI.
