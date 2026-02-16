---
name: commit
description: Create semantic commit messages following educa-web conventions
allowed-tools: Bash(git:*)
---

Create a semantic commit for the staged changes in educa-web.

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

1. Run `git status` to see staged changes
2. Run `git diff --cached` to understand what changed
3. Analyze the changes and determine:
   - Type (feat, fix, refactor, etc.)
   - Scope (if applicable)
   - Clear description of WHY, not WHAT
4. Create the commit with proper format

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
