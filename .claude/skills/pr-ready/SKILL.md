---
name: pr-ready
description: Pre-PR checklist - runs lint, tests, and validates code before creating a pull request
allowed-tools: Bash(npm:*), Bash(git:*), Grep, Glob, Read
---

Run the complete pre-PR checklist to ensure code is ready for review.

## Checklist

### 1. Git Status
- Check for uncommitted changes
- Verify current branch is not `main`
- Check if branch is pushed to remote

### 2. Linting
Run ESLint and report issues:
```bash
npm run lint
```

If there are auto-fixable issues, suggest running `npm run lint:fix`.

### 3. Tests
Run Vitest and verify all tests pass:
```bash
npm test
```

Report any failing tests with details.

### 4. Console.log Check
Search for any remaining console.log statements:
```
Pattern: console\.(log|warn|info|debug)
```

These must be removed or converted to `logger`.

### 5. TODO/FIXME Check
Search for incomplete work markers:
```
Pattern: (TODO|FIXME|XXX|HACK):?
```

List any found and confirm they're acceptable for this PR.

### 6. Import Validation
Quick check for relative imports that bypass aliases:
```
Pattern: from ['"]\.\.\/\.\.\/
```

### 7. Type Safety
Check for `any` type usage that should be fixed:
```
Pattern: : any[^a-zA-Z]
```

## Output Format

```
=== PR READINESS CHECK ===
Branch: [branch-name]
Base: main

[1/7] Git Status.............. [PASS/FAIL]
  - Uncommitted changes: [yes/no]
  - Pushed to remote: [yes/no]

[2/7] Linting................. [PASS/FAIL]
  - Errors: X
  - Warnings: X

[3/7] Tests................... [PASS/FAIL]
  - Passed: X
  - Failed: X

[4/7] Console Statements...... [PASS/FAIL]
  - Found: X occurrences

[5/7] TODO/FIXME.............. [PASS/WARN]
  - Found: X markers

[6/7] Import Aliases.......... [PASS/FAIL]
  - Invalid imports: X

[7/7] Type Safety............. [PASS/WARN]
  - `any` usages: X

=================================
OVERALL STATUS: [READY / NOT READY]

[If NOT READY, list items to fix]
[If READY, suggest next command: git push or gh pr create]
```

## Criteria for "READY"

- All tests pass
- No lint errors (warnings OK)
- No console.log/warn/info/debug statements
- No invalid relative imports
- Changes are committed
- Branch is pushed to remote

## After Passing

If all checks pass, offer to:
1. Push to remote if not already pushed
2. Create PR using `gh pr create`
