> Override de @rules/worktrees.md global

**Path sibling concreto**: worktrees de chat viven en `EducaWeb/WT/educa-web/<NNN>-<slug>` (no en `<parent>/educa-web-wt/`).

**Growth path**: worktrees de `/growth-hands-on` viven en `EducaWeb/Growth/educa-web/<fecha>` (no en `<parent>/educa-web-wt-growth/`).

**Repo principal**: vive en `EducaWeb/WD/educa-web` (no en `EducaWeb/educa-web`).

## `node_modules` post-creación — junction

Cada worktree comparte el `node_modules` del checkout principal mediante un **junction** de Windows, para no reinstalar 976 paquetes por worktree. `/wt-new` §5b lo aplica; `/wt-clean` §3b lo desvincula.

**Crear** (después de `git worktree add`, desde `WD/educa-web`):

```powershell
cmd /c mklink /J "<wtPath>\node_modules" "node_modules"
```

**Desvincular antes de borrar el worktree — obligatorio**:

```powershell
(Get-Item "<wtPath>\node_modules").LinkType   # debe decir "Junction"; si está vacío es un directorio real, NO seguir con Remove-Item
Remove-Item -Path "<wtPath>\node_modules" -Force   # SIN -Recurse
git worktree remove <wtPath>                        # sin --force hasta confirmar que el junction ya no existe
```

**Riesgo**: `git worktree remove` (sobre todo con `--force`) o un `Remove-Item -Recurse` sobre un directorio que aún contiene el junction puede recorrerlo y vaciar el `node_modules` real del checkout principal. Si pasa, se repone con `bun install` en `WD/educa-web` (sin tocar `package-lock.json`).

**Excepción**: un worktree con `node_modules` propio (directorio real, `LinkType` vacío) se borra normal; no hay nada que desvincular.
