---
name: commit
description: Create semantic commit messages following educa-web conventions
user-invokable: true
---

Create a semantic commit for the staged changes in educa-web.

## Pre-commit: Production Build

**BEFORE staging files**, clean the old build output and rebuild:

```bash
# 1. Delete old build contents (keep dist/ folder itself)
rm -rf dist/*

# 2. Build fresh
npx ng build --configuration production
```

If the build fails, fix the errors before proceeding. Do NOT commit with a broken build.

## Commit Format

```
type(scope): description

[optional body]
```

## Types

| Type | Use When |
|------|----------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Code refactoring without functional changes |
| `style` | Format/style changes (no code logic) |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |
| `docs` | Documentation only |
| `perf` | Performance improvements |

## Scopes (optional but recommended)

- `auth` - Authentication/authorization
- `attendance` - Attendance module
- `admin` - Admin features
- `schedule` - Schedule/calendar
- `ui` - UI components
- `api` - API integration
- `pwa` - Service worker/offline
- `a11y` - Accessibility
- `seo` - SEO improvements

## Steps

1. Run `rm -rf dist/*` to delete old build contents
2. Run `npx ng build --configuration production` to build fresh
3. If build fails, fix the errors and rebuild
3. Run `git status` to see all changes (including updated dist)
4. Run `git diff --cached` or `git diff` to understand what changed
5. Stage all relevant files with `git add`
6. Analyze the changes and determine:
   - Type (feat, fix, refactor, etc.)
   - Scope (if applicable)
   - Clear description of WHY, not WHAT
7. Create the commit with proper format

## Examples

```bash
# Feature
feat(attendance): add daily attendance report for directors

# Bug fix
fix(auth): resolve token refresh loop on session timeout

# Refactor
refactor(admin): extract user validation to shared service

# Style
style(ui): align buttons in dialog footer

# Chore
chore(deps): update PrimeNG to v21.1.0
```

## Rules

- Description should be imperative mood ("add" not "added")
- Keep first line under 72 characters
- Reference issue numbers if applicable: `fixes #123`
- Never commit sensitive files (.env, credentials)
- Never include Co-Authored-By line
