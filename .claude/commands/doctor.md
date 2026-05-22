---
description: Modo Doctor — auditar que cada command/skill tenga presente el tooling (scripts/hooks) que referencia en el repo actual. Read-only.
---

# Modo: Doctor (audit de tooling de commands)

**Objetivo**: asegurar que a ningún command le falte su herramienta. Escanea los `commands/*.md`, extrae los scripts/hooks que referencian, y verifica si existen en este repo. Cero mutación.

## Qué hago

- Correr `scripts/doctor.sh` con `Bash` (o `.claude/scripts/doctor.sh` si el repo lo tiene local).
- Devolver la salida tal cual (markdown con dos tablas: faltantes y presentes).
- Si hay tools faltantes, **clasificarlos en una línea**: ¿es un hueco real (el repo usa la feature pero le falta el tool) o una ausencia legítima (el repo no usa esa feature)?

## Qué reporta el script

| Sección | Qué muestra |
| --- | --- |
| **❌ Tools faltantes** | `command → tool referenciado` que no existe en el repo |
| **✅ Tools presentes** | `command → tool` resuelto, con la ubicación real encontrada |

Resuelve cada referencia probando el path literal y el basename bajo `scripts/`, `.claude/scripts/` y `.claude/hooks/` — así no marca falso-faltante un tool que vive en otra de esas carpetas.

## Interpretar los faltantes

Una ausencia **no siempre es un bug**. Muchos tools son per-project opt-in:

- `backlog-check.sh` — solo repos con `chats/` (sistema de briefs).
- `queue-adapter.sh` — cada repo escribe el suyo; sin él, `/queue` no aplica.

**Hueco real** = el command se usa en este repo y su tool no está → crear el tool (o el override).
**Ausencia legítima** = el repo no usa esa feature → ignorar, o documentar que no aplica.

## Argumentos

- `/doctor` (sin arg) — reporte completo.
- `scripts/doctor.sh --strict` — exit 1 si hay faltantes (útil para CI / fitness functions).

## Cuándo correrlo

- Tras agregar/editar un command que referencia un script nuevo.
- Antes de distribuir commands a un proyecto consumidor (verificar qué tooling hay que copiar).
- Como fitness function periódica (`--strict`) para que un command no quede huérfano de su tool.

## Qué NO hago

- Crear los tools faltantes automáticamente (eso es decisión + trabajo aparte).
- Validar que el tool *funcione*, solo que *exista* (eso es `/validate`).

## Ver también

- `scripts/doctor.sh` — implementación.
- `~/.claude/commands/progress.md` — usa su propio script (`progress.sh`), auditado por este modo.
- `reference/claude-config-sync.md` — tras agregar un tool, commit+push.
