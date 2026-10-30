---
description: Modo Update-Command — modificar un comando existente y propagarlo a sus copias por proyecto.
---

# Modo: Update Command

**Objetivo**: aplicar un cambio puntual a un comando existente sin romper hardlinks ni pisar overrides de proyecto. Un comando vive en el global (`claude-config/commands/`) y puede tener copias en cada proyecto; editar solo una deja las demás desfasadas.

## Argumentos

- `/update-command <comando> <qué cambiar>` — `<comando>` = nombre sin slash (`end`, `wt-clean`); `<qué cambiar>` = texto libre con el cambio deseado (no necesita comillas).
- Falta alguno → preguntar. Comando inexistente → listar los de nombre parecido y frenar.
- Un comando que solo existe en un proyecto (sin global) se edita ahí y no se propaga.

## Qué hago

### 1. Ubicar el global y sus copias

Global: `claude-config/commands/<comando>.md`. Copias: `<proyecto>/.claude/commands/<comando>.md` para cada proyecto de `$targetProjects` en `setup-links.ps1` (leer la lista del script, no hardcodearla).

### 2. Clasificar cada copia

Comparar contra el global **antes** del cambio (`git show HEAD:commands/<comando>.md`, ignorando CR):

| Clase | Señal | Qué hago luego |
|---|---|---|
| **espejo** | idéntica o diferencia de una línea de redacción | copiar el global actualizado, conservando esa línea propia |
| **override** | `> Override de …` o solo deltas por paso | aplicar solo el delta si el cambio la afecta |
| **fork** | estructura propia, difiere en muchas líneas | editar la copia siguiendo su estructura; si es muy divergente, reportar y preguntar |

Nunca sobrescribir un override ni un fork con el global.

### 3. Aplicar el cambio

- Interpretar `<qué cambiar>`. Si admite varias lecturas, proponer el cambio en 3-5 líneas y esperar confirmación; si es claro, aplicar.
- Edición mínima sobre el global, respetando su estilo (no reescribir secciones).
- Propagar según la clase. Actualizar también lo que el cambio deja falso dentro del archivo (ej. «Flujo (13 pasos)», tablas de casos).

### 4. Buscar referencias cruzadas

`Grep` del nombre del comando en `commands/`, `rules/`, `reference/`, `README.md` y docs de los proyectos (`ops-map`, índices). Corregir lo que el cambio deja desactualizado; no tocar registro histórico (`chats/closed/`, ADRs, auditorías fechadas).

### 5. Cerrar

1. Correr `setup-links.ps1`: editar rompe el hardlink de `~/.claude/` y `skills/`.
2. **claude-config**: commit solo de los archivos tocados (nunca `git add .`: suele haber cambios ajenos), mensaje en inglés Conventional Commits, y push (regla de `claude-config-sync`).
3. **Repos de producto**: dejar los cambios sin commitear y preguntar. No hacer push (en `educa-web` un push a `main` despliega).
4. Reportar una tabla: copia · clase · acción · estado (commiteado / pendiente).

## Qué NO hago

- Crear, renombrar o borrar comandos (otro flujo).
- Tocar chats cerrados, ADRs ni auditorías fechadas.
- Usar `git add .` / `git add -A`.
- Cambiar hardlinks o skills a mano: lo hace `setup-links.ps1`.

## Ver también

- `reference/claude-config-sync.md` — commit + push en `claude-config`.
- `commands/README.md` — cómo agregar y rutear comandos.
- `/doctor` — verifica que cada comando tenga el tooling que referencia.
