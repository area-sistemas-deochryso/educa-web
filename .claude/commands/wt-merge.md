---
description: Modo Worktree Merge — crear rama de integración y mergear branch de worktree ahí.
---

# Modo: Worktree Merge

**Objetivo**: crear una rama `integration/<NNN>-<slug>` y mergear la branch del worktree (`chat/<NNN>-<slug>`) ahí para probar estabilidad antes de promover a trunk.

## Argumentos

- `/wt-merge <NNN>-<slug>` — mergear esa branch.
- `/wt-merge <NNN>` — inferir slug del manifest o de branches existentes.
- Sin argumento → si hay una sola entry activa en manifest, usarla. Si hay varias, listar y pedir.

## Precondiciones

- Estar en el **repo principal** (main worktree), no dentro del worktree que se va a mergear.
- Estar en trunk (`main` o `master`). Si no, avisar y pedir confirmación.
- La branch `chat/<NNN>-<slug>` debe existir.
- El brief asociado debe estar en `closed/` o el usuario confirma merge sin cierre.

## Qué hago

### 1. Resolver contexto

```powershell
$mainRepo = (git rev-parse --git-common-dir | ForEach-Object { (Resolve-Path "$_/..").Path })
$manifestPath = "$mainRepo/.claude/.locks/worktrees.json"
$trunk = if (git branch --list main) { "main" } else { "master" }
```

### 2. Crear rama de integración y mergear

```powershell
git checkout -b "integration/$NNN-$slug"
git merge "chat/$NNN-$slug"
```

### 3. Manejar resultado

**Merge limpio**: reportar éxito + guía post-merge.

**Conflictos**: listar archivos en conflicto, guiar resolución. No auto-resolver.

### 4. Reportar

```text
## ✅ Merge a integración

| Campo | Valor |
|---|---|
| Branch source | `chat/<NNN>-<slug>` |
| Branch target | `integration/<NNN>-<slug>` |
| Conflictos | 0 (o listar) |

**Guía post-merge**:
1. Validar estabilidad: `/validate`
2. Promover a trunk: `git checkout <trunk> && git merge integration/<NNN>-<slug>`
3. Limpiar: `/wt-clean <NNN>-<slug>`
```

## Qué NO hago

- Mergear directamente a main/master — siempre vía rama de integración.
- Resolver conflictos automáticamente sin confirmación.
- Ejecutar tests (eso es `/validate`).
- Deregistrar del manifest — eso lo hace `/wt-clean`.

## Merge ordering & conflicts

Cuando hay múltiples worktrees paralelos pendientes de merge:

### Pre-merge check

Antes de mergear, listar otros worktrees activos en el manifest que tienen branches con commits ahead:

```text
Worktrees pendientes de merge:
- chat/045-signals (3 commits ahead) — touches: src/app/signals/, src/app/shared/
- chat/046-auth (5 commits ahead) — touches: src/app/auth/, src/app/shared/

Overlap detectado en: src/app/shared/
```

### Estrategia de orden

- **Sin overlap de archivos**: orden no importa — mergear en cualquier secuencia.
- **Con overlap**: mergear primero la branch más pequeña (menos commits/archivos). La segunda branch absorbe los conflictos con contexto completo de la primera.
- **Sugerencia automática**: reportar cuál conviene primero basado en tamaño + overlap.

### Si el merge falla por conflicto

1. **No forzar** — reportar los archivos en conflicto.
2. Sugerir: resolver conflictos en la integration branch, commitear la resolución, verificar que build/lint pasan.
3. Si el conflicto es complejo, sugerir que el usuario revise manualmente antes de continuar.

```text
❌ Merge conflict en integration/046-auth:
- src/app/shared/utils.ts
- src/app/shared/types.ts

Opciones:
  a) Resolver conflictos en integration/046-auth y commitear
  b) Abortar merge: git merge --abort
  c) Reordenar: mergear chat/045-signals primero (menos overlap)
```

## Ver también

- `/wt-new` — crear worktree.
- `/wt-clean` — eliminar worktree + branches + deregistrar.
- `/validate` — verificar estabilidad después del merge.
