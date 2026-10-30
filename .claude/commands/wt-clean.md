---
description: Modo Worktree Clean — deregistrar del manifest + eliminar worktree + branch + integration branch.
---

# Modo: Worktree Clean

**Objetivo**: limpiar un worktree completamente — deregistrar del manifest, eliminar el directorio del worktree y borrar las branches asociadas (`chat/<NNN>-<slug>` e `integration/<NNN>-<slug>`).

## Argumentos

- `/wt-clean <NNN>-<slug>` — limpiar ese worktree.
- `/wt-clean <NNN>` — inferir slug del manifest.
- Sin argumento → si hay una sola entry en manifest, usarla. Si hay varias, listar y pedir.

## Precondiciones

- Estar en el **repo principal** (main worktree), **no** dentro del worktree que se va a borrar.
- Si estamos dentro del worktree target → rechazar con mensaje claro.

## Qué hago

### 1. Resolver contexto

```powershell
$mainRepo = (git rev-parse --git-common-dir | ForEach-Object { (Resolve-Path "$_/..").Path })
$manifestPath = "$mainRepo/.claude/.locks/worktrees.json"
```

### 2. Safety checks

- **Dentro del worktree target** → abortar: "Estás dentro del worktree que querés borrar. Volvé al repo principal primero."
- **Cambios sin commit en el worktree** → avisar, preguntar si force remove.
- **Branch no merged** → listar commits que se perderían, preguntar si force delete (`-D`).
- **Brief no en `closed/`** → avisar: "El brief todavía no se cerró. ¿Seguro que querés limpiar?"

### 3. Deregistrar del manifest

Leer `worktrees.json`, remover la entry con `chatId === <NNN>` del array `active`. Escribir el archivo actualizado.

### 3b. Desvincular junctions pesados (si el proyecto los define)

Si `$mainRepo/.claude/rules/worktrees.md` define una sección de junction para carpetas pesadas (`node_modules`, `bin`/`obj`, etc. — mismo mecanismo que aplica `/wt-new` §5b al crear el worktree), desvincular esos junctions **antes** de `git worktree remove`:

```powershell
Remove-Item -Path "$wtPath\<carpeta>" -Force   # SIN -Recurse: en Windows esto borra solo el punto de enlace del junction, no atraviesa al target real
```

**Por qué es obligatorio, no opcional**: `git worktree remove` sobre un directorio que contiene un junction puede recorrerlo y borrar el contenido real del *target* en vez de solo el punto de enlace — confirmado en vivo, vació el `node_modules` real del checkout principal de este repo. Sin este paso, limpiar un worktree puede destruir datos del repo principal que nada tiene que ver con el worktree.

### 3c. Preparar la pregunta de comprensión (antes de borrar)

Si el chat cerró trabajo en este worktree, elegir **ahora** el elemento de la pregunta (regla «Closing question» de `rules/growth-mode.md`) y guardar su evidencia: commit sha + `archivo:línea`, tomados de `git diff <base>..chat/<NNN>-<slug>`. El paso 4 borra el worktree y la branch; sin esta evidencia guardada no se puede contrastar la respuesta con el código real (después solo queda en la rama donde se mergeó). No preguntar todavía.

### 4. Eliminar worktree + branches

```powershell
git worktree remove "$wtPath"
git branch -d "chat/$NNN-$slug"
git branch -d "integration/$NNN-$slug"   # puede no existir, ignorar error
```

Si `-d` falla por no-merged → preguntar antes de `-D`.

### 5. Reportar

```text
## ✅ Worktree limpiado

| Acción | Resultado |
|---|---|
| Manifest | Entry <NNN> removida (N active restantes) |
| Worktree | `<path>` removido |
| Branch `chat/<NNN>-<slug>` | eliminada |
| Branch `integration/<NNN>-<slug>` | eliminada (o no existía) |
```

### 6. Pregunta de comprensión (growth-mode)

Cierra la cadena `/end` → `/wt-merge` → `/wt-clean`. Después de reportar, hacer la pregunta del elemento elegido en 3c, contrastando contra la evidencia guardada. Registrar en `growth/gaps.md`. `//directo` la omite. Si el chat no cerró trabajo en este worktree (limpieza de un worktree ajeno o huérfano), no hay nada que preguntar.

## Qué NO hago

- Force delete sin confirmación del usuario.
- Borrar worktrees si estoy parado dentro de él.
- Tocar branches que no sigan el naming convention (`chat/<NNN>-*` / `integration/<NNN>-*`).
- Limpiar briefs — el brief ya debería estar en `closed/` vía `/end`.

## Orphan detection

Antes de intentar `git worktree remove`, verificar que el `path` de la entry existe en disco:

- **Path existe**: flujo normal — verificar uncommitted changes, deregistrar, remover worktree, borrar branches.
- **Path no existe** (directorio borrado manualmente o por otro proceso):

```text
⚠️ Entry huérfana: chat/NNN-slug apunta a path que no existe.
Deregistrando del manifest sin intentar git worktree remove.
```

  Deregistrar la entry del manifest. Intentar borrar las branches (`chat/*`, `integration/*`) si existen. No fallar si las branches tampoco existen.

## Ver también

- `/wt-new` — crear worktree.
- `/wt-merge` — integrar branch antes de limpiar.
