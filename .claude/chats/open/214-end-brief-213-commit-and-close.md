# 214 — /end de brief 213: commit + cierre

> **Creado**: 2026-05-20 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`
> **Depende de**: 213 (trabajo completado, falta commitear y cerrar)

## Context

El chat 213 completó los fixes FE de cookie hygiene (xrepo-48 F3 FE) pero el `/end` no terminó por límite de contexto. El trabajo de código está hecho, falta el cierre mecánico.

## Estado actual del repo

### Cambios del brief 213 (3 archivos — COMMITEAR)

1. **`credentials.interceptor.ts`** — Skip `withCredentials` en login/refresh/mobile-login (Fix 2, causa raíz HTTP 0)
2. **`error.interceptor.ts`** — `/sessions` y `/switch-session` en `SKIP_REFRESH_URLS` (Fix 1+5)
3. **`auth.service.ts`** — try/catch en `storage.setUser()` de `handleSuccessfulLogin` (Fix 4)

### Cambios inesperados (3 archivos schedules — PREGUNTAR)

4. `schedule.models.ts` — cambio no del brief
5. `horario-detail-drawer.component.html` — cambio no del brief
6. `horario-error.utils.ts` — cambio no del brief

**Staged**: rename `open/213-...md → running/213-...md`

### Fix 3 NO implementado

Pre-login cookie clear via silent logout no es viable: el BE tiene `[Authorize]` en logout, devuelve 401 sin emitir `Set-Cookie`. Requiere cambio BE (quitar `[Authorize]` de logout o crear endpoint dedicado `/api/Auth/clear-cookies`). Documentar como follow-up cross-repo.

## Steps del /end pendientes (6-11)

### Step 6 — Commit

1. Editar brief 213: agregar `> **Validación prod**: ⏳ pendiente desde 2026-05-20`
2. `git mv .claude/chats/running/213-...md → .claude/chats/awaiting-prod/213-...md`
3. Stagear SOLO los 3 archivos del brief + el brief move. Los 3 archivos de schedules son inesperados — preguntar al usuario (commit aparte / incluir / dejar / descartar)
4. Commit: `fix(auth): skip withCredentials for login/refresh, harden error handling (brief 213)`

### Step 7 — Briefs huérfanos

Verificar untracked en `.claude/chats/` y `.claude/history/`.

### Step 8 — Meta-refresh

Evaluar si generar brief de follow-up para Fix 3 (BE change needed). Si sí, crear en `chats/open/`.

### Step 9 — Cross-repo

- Brief en `educa-coord/chats/open/` notificando que Fix 3 requiere cambio BE (endpoint clear-cookies o quitar [Authorize] de logout).
- Posible update al plan xrepo-48 marcando F3 FE como completado (fixes 1,2,4,5) con nota de Fix 3 pendiente BE.

### Step 10 — Renderizar banner de cierre

4 bloques: banner, validación, resumen de sesión, progreso.

### Step 11 — Siguiente sesión

Recomendación concreta.

## Validation previa

- Lint: 3 errores pre-existentes en `error-groups` (NO de este chat). Los 3 archivos tocados pasan limpio.
- Build: pasó OK.

## Pre-work

- [ ] Leer brief 213 en `running/` para verificar estado actual
- [ ] `git status` fresco para confirmar que nada cambió entre chats
