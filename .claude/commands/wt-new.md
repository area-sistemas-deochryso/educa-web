---
description: Modo Worktree New — crear worktree + branch + registrar en manifest + lockear brief.
---

# Modo: Worktree New

**Objetivo**: crear un worktree aislado para una fase de plan, registrarlo en el manifest y lockear el brief correspondiente para que ningún otro chat lo agarre.

## Argumentos

- `/wt-new <NNN>-<slug>` — crear worktree con ese ID y slug (ej: `/wt-new 045-login-refactor`).
- `/wt-new <NNN>` — si hay un brief `chats/open/<NNN>-*.md`, inferir slug del nombre del archivo.
- Sin argumento → pedir NNN-slug.

## Qué hago

### 1. Resolver contexto

```powershell
$mainRepo = (git rev-parse --git-common-dir | ForEach-Object { (Resolve-Path "$_/..").Path })
$project = Split-Path $mainRepo -Leaf
$parent = Split-Path $mainRepo -Parent
$manifestPath = "$mainRepo/.claude/.locks/worktrees.json"
```

### 2. Validar precondiciones

- El argumento `<NNN>-<slug>` es válido (NNN = 3 dígitos, slug = kebab-case).
- La branch `chat/<NNN>-<slug>` no existe ya (`git branch --list`).
- El directorio `<parent>/<project>-wt/<NNN>-<slug>` no existe.
- Leer manifest — no hay entry activa con el mismo `chatId`.

### 3. Bootstrap (si es primer worktree)

Si `<mainRepo>/.claude/.locks/` no existe:

```powershell
New-Item -ItemType Directory -Force "$mainRepo/.claude/.locks"
```

Si `worktrees.json` no existe, crear con `{ "version": 1, "active": [] }`.

### 4. Buscar brief asociado

Buscar en `<mainRepo>/.claude/chats/open/` un archivo que empiece con `<NNN>-`. Si existe, ese es el brief que se lockea. Si no existe, avisar que no hay brief — el worktree se crea igual pero sin lock (uso informal).

### 5. Crear worktree + branch

```powershell
$wtPath = "$parent/$project-wt/$NNN-$slug"
git worktree add -b "chat/$NNN-$slug" $wtPath
```

### 6. Registrar en manifest

Leer `worktrees.json`, agregar entry al array `active`:

```json
{
  "chatId": "<NNN>",
  "slug": "<slug>",
  "branch": "chat/<NNN>-<slug>",
  "path": "<wtPath>",
  "briefRef": "chats/open/<NNN>-<slug>.md",
  "plan": null,
  "phase": null,
  "startedAt": "<ISO-8601>",
  "lastHeartbeat": "<ISO-8601>",
  "touches": [],
  "exclusive": false
}
```

Si el brief existe y tiene frontmatter con `Plan:`, `Fase:`, `touches:`, `exclusive:`, extraer esos valores.

### 7. Reportar

```text
## ✅ Worktree creado

| Campo | Valor |
|---|---|
| Branch | `chat/<NNN>-<slug>` |
| Path | `<wtPath>` |
| Brief | `chats/open/<NNN>-...md` (lockeado en manifest) |
| Manifest | `.claude/.locks/worktrees.json` (1 active) |

**Siguiente paso**: abrí Claude Code en `<wtPath>` y tipeá `/go`.
```

## Qué NO hago

- Cambiar de directorio (Claude Code no persiste `cd`).
- Mover el brief a `running/` — eso lo hace `/start-chat` o `/go` dentro del worktree.
- Commitear nada — el manifest es un archivo de coordinación local.
- Crear worktrees si ya existe uno con ese chatId en el manifest.
- Pushear la branch `chat/*` al remoto.

## Relación con el flujo de locking

```
wt-new <NNN>-<slug>        ← registra en manifest, lockea brief
  └── En el worktree:
      └── /go              ← lee manifest, sabe qué brief le toca
          └── /start-chat  ← mueve brief a running/ dentro del worktree
              └── trabajo
                  └── /end ← cierra brief, commitea
                      └── wt-merge   ← integra a trunk
                          └── wt-clean ← deregistra, limpia
```

## Dependency gate

Antes de crear el worktree, verificar dependencias de la fase en el plan:

1. Leer el plan asociado al brief. Identificar la fase que este brief implementa.
2. Si la fase tiene `depends_on` (lista de fases previas):
   - Para cada fase dependiente, verificar que su brief está en `closed/` **en trunk** (no solo en una branch de worktree).
   - Si alguna dependencia no está cerrada/mergeada → **bloquear**:

```text
⛔ Fase "<nombre>" depende de fase(s) no completadas:
- <fase-X>: brief en running/ (worktree chat/NNN-slug)
- <fase-Y>: brief en open/ (no iniciada)

Completá y mergeá las fases dependientes antes de arrancar esta.
```

3. Si la fase no tiene `depends_on` o todas las dependencias están cerradas → proceder normalmente.

**Heurística**: fases con el mismo `depends_on` (hermanas) son paralelas entre sí — no se bloquean mutuamente. Solo se bloquean por fases ancestras.

## Ver también

- `/wt-merge` — integrar branch de worktree vía rama de integración.
- `/wt-clean` — deregistrar del manifest + eliminar worktree + branches.
- `~/.claude/reference/worktrees.md` — política completa de worktrees.
