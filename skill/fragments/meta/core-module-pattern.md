Every CLI command starts as a **core module** in `src/core/`. Core modules contain pure domain logic with no CLI concerns (no chalk, no console.log, no process.exit). This separation lets the logic be consumed as a library, tested independently, and composed by multiple commands.

### Structure of a core module

```typescript
// src/core/<name>.ts

/** Input options -- everything the caller needs to provide */
export interface <Name>Options {
  requiredParam: string;
  optionalParam?: number;
}

/** Output result -- everything the caller gets back */
export interface <Name>Result {
  data: SomeType[];
  warnings: string[];
}

/** Pure function: options in, result out. No side effects on stdout. */
export function <name>(options: <Name>Options): <Name>Result {
  return { data: [], warnings: [] };
}
```

### Rules

- **Export typed interfaces** for both input and output so consumers get autocomplete and type safety
- **Return structured data**, never print to stdout -- the CLI wrapper decides how to format
- **Include a `warnings` array** in results when the function can detect non-fatal issues
- **Use `async` only when needed** (file I/O, network) -- synchronous logic stays synchronous
- **Throw typed errors** from `src/errors/types.ts` for unrecoverable failures
- **Keep modules focused** -- one concept per file. A pace calculator doesn't also validate outlines
- **Accept paths and options, not raw CLI strings** -- parsing belongs in the command wrapper

### Shared parsers

When two or more commands need to parse the same input format, extract a shared parser module. The parser returns a structured type that both consumers work with.
