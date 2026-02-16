---
name: validate-code
description: Validate code against educa-web project standards (imports, logging, patterns)
allowed-tools: Read, Grep, Glob
---

Validate the specified path against educa-web coding standards.

**Usage:** `/validate-code [path]`
- If no path provided, validate `src/app/`
- Can specify a file or directory: `/validate-code src/app/features/intranet`

## Validations

### 1. Path Imports (CRITICAL)

Search for relative imports that should use aliases:

```
Pattern: from ['"]\.\.\/\.\.\/
```

**Must use:**
- `@core` instead of `../../core`
- `@shared` instead of `../../shared`
- `@features` instead of `../../features`
- `@config` instead of `../../config`
- `@data` instead of `../../data`

### 2. Console Usage (CRITICAL)

Search for forbidden console methods:

```
Pattern: console\.(log|warn|info|debug|trace)
```

**Must use:** `logger` from `@core/helpers`

Note: `console.error` is allowed in production error boundaries only.

### 3. Component Standards (HIGH)

For each `.component.ts` file, verify:

- `standalone: true` is present
- `changeDetection: ChangeDetectionStrategy.OnPush` is present
- Uses `inject()` for dependency injection (not constructor)

### 4. Subscription Cleanup (HIGH)

Search for subscriptions without cleanup:

```
Pattern: \.subscribe\(
```

Verify each has `takeUntilDestroyed` in the pipe chain.

### 5. TypeScript Any (MEDIUM)

Search for explicit `any` usage:

```
Pattern: : any[^a-zA-Z]
```

Should be properly typed.

### 6. Signal Naming (LOW)

Private signals should be prefixed with `_`:

```typescript
// Correct
private readonly _loading = signal(false);
readonly loading = this._loading.asReadonly();

// Incorrect
private readonly loading = signal(false);
```

## Output Format

```
=== VALIDATION REPORT ===
Path: [validated path]
Files scanned: [count]

CRITICAL ISSUES (must fix):
  [file:line] - [issue description]

HIGH PRIORITY (should fix):
  [file:line] - [issue description]

MEDIUM PRIORITY (consider fixing):
  [file:line] - [issue description]

LOW PRIORITY (suggestions):
  [file:line] - [issue description]

SUMMARY:
  Critical: X
  High: X
  Medium: X
  Low: X

  Status: [PASS/FAIL]
```

A validation PASSES only if there are 0 CRITICAL issues.
