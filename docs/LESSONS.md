# Lessons Learned

## `set -e` and `[[ -d ... ]] || return` in Bash Functions

**Date:** 2026-04-02
**Severity:** Silent install failure -- script dies mid-execution with no error message

### The Bug

`install.sh` uses `set -e` for fail-fast behavior. The `cleanup_managed` function had:

```bash
cleanup_managed() {
  local dir="$1"
  [[ -d "$dir" ]] || return
  # ...
}
```

When `$dir` does not exist, `[[ -d "$dir" ]]` exits with code 1. The `|| return` fires, but bare `return` propagates the most recent exit code (1) as the function's return value. Under `set -e`, that exit code 1 kills the entire script.

The failure was silent because no command actually errored -- a conditional test returning false is not an error in the traditional sense, but `set -e` treats the propagated 1 as fatal.

### The Fix

Use explicit `return 0` instead of bare `return`:

```bash
[[ -d "$dir" ]] || return 0
```

Apply the same rule to any early-exit guard in a function:

```bash
[[ -z "$managed_files" ]] && return 0
```

### The General Rule

In a `set -e` script, **never use bare `return` after a conditional that can fail**. Bare `return` inherits the exit code of the last command. If that command was a failed test (`[[ ... ]]`, `grep`, `test`), the function returns non-zero, which `set -e` treats as a script-terminating failure.

Safe patterns:
- `[[ condition ]] || return 0`
- `command || true`
- `if ! condition; then return 0; fi`

Dangerous patterns:
- `[[ condition ]] || return` (bare return inherits the test's exit code)
- `grep ... || return` (grep returns 1 when no matches found)
- `command && other || return` (if `other` fails, return inherits its code)

### Detection

This class of bug produces no stderr output, making it hard to spot. The script simply stops executing partway through. To diagnose:

1. Run with `bash -x` to see the trace cut off point
2. Use `trap 'echo TRAP: line $LINENO, exit $?' ERR` to catch the exact line
3. Separate stdout/stderr (`bash script.sh > out.log 2> err.log`) -- if stderr is empty but exit is non-zero, it's a silent `set -e` kill

### Scope of Impact

This affected any system where auto-detected tool directories were partially present. If all detected directories existed, the bug never triggered. It only appeared when a tool was detected (e.g., `~/.windsurf/` exists) but its subdirectories were absent (e.g., `~/.codeium/windsurf/skills/` does not exist).
