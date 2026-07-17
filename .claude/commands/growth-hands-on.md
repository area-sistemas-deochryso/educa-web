---
description: Modo Growth Hands-On — práctica dirigida sobre código real en worktree efímero (debug, corrección, refactor, tests).
---

# Modo: Growth Hands-On

**Objetivo**: entrenar los ejes que más suben de valor en el mercado (debugging, corrección de output ajeno/IA, refactor sin romper invariantes, testing) sobre código real, en un worktree que se descarta al terminar. Ver justificación en `growth/log/` (sesión de diseño que originó este comando) y `rules/growth-mode.md`.

## Argumentos

- `/growth-hands-on [modo]` — repo = el actual (cwd, donde se invoca el comando). `modo`: `estrategico` | `alternativa` | `aleatorio`. Sin modo → preguntar.
- `/growth-hands-on <repo> [modo]` — si querés apuntar a otro repo que el actual, pasá su path.

## Qué hago

### 1. Resolver contexto

```powershell
$targetRepo = <cwd o path pasado como argumento>
$fecha = <YYYY-MM-DD-HHmm>
$parent = Split-Path $targetRepo -Parent
$project = Split-Path $targetRepo -Leaf
$wtPath = "$parent/$project-wt-growth/$fecha"
```

Si no se especificó `modo`, preguntar cuál de los tres.

### 2. Crear worktree efímero

```powershell
git -C $targetRepo worktree add -b "growth/hands-on-$fecha" $wtPath
```

Sin manifest ni lock — este flujo es práctica personal, no trabajo coordinado entre chats (a diferencia de `wt-new`).

### 3. Preparar el ejercicio según modo

- **Estratégico**: leer `growth/profile.md`, identificar el gap más atrasado. Buscar un módulo real relacionado en `$wtPath` e inyectar ahí un bug o mal diseño, o plantear un change request real con una solución mía defectuosa a propósito.
- **Alternativa**: tomar una feature ya implementada en `$wtPath`, reescribir una porción con un enfoque plausible pero distinto (a veces peor), simulando que "otro dev lo hizo así". El usuario audita/critica/corrige.
- **Aleatorio**: módulo y error elegidos al azar, sin atar al gap prioritario — entrena detección pura, no un déficit específico.

### 4. Las 4 estaciones

El usuario recorre: debug (si algo falla) → corrección con justificación (si le doy algo mal) → refactor sin romper invariantes → tests una vez estable → evaluación conjunta de si la suite de tests sirve.

### 5. Cierre

Resumir qué gap se tocó, qué salió bien/mal, comparar contra entradas previas de `growth/log/`.

### 6. Registrar

Escribir `growth/log/<fecha>-hands-on-<slug>.md` (convención de `growth/README.md`, write-once) con: repo, modo, gap practicado, qué falló, cómo se corrigió, progreso/regresión vs. sesiones anteriores.

### 7. Limpiar (con confirmación)

```powershell
git -C $targetRepo worktree remove $wtPath
git -C $targetRepo branch -D "growth/hands-on-$fecha"
```

Confirmar con el usuario antes de borrar — es descartable por diseño, pero sigue siendo una acción destructiva.

## Qué NO hago

- Mergear la rama a main — es puramente descartable, nunca se integra.
- Tocar el repo real fuera del worktree.
- Cerrar sin registrar en `growth/log/`, salvo que el usuario lo pida explícitamente.
- Usar el manifest de `wt-new`/`wt-clean` — ese es para trabajo coordinado entre chats, esto es práctica individual.

## Ver también

- `growth/README.md` — convención de `log/`.
- `rules/growth-mode.md` — gate de precisión que este comando complementa (verbal vs. hands-on).
- `commands/wt-new.md` / `wt-clean.md` — patrón de worktree del que este comando toma prestado el mecanismo, sin el manifest.
