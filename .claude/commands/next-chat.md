# Comando: Generar prompt para siguiente chat

Genera un archivo numerado en `educa-web/.claude/chats/open/NNN-plan-X-chat-Y-<repo>-<scope>.md` con el prompt **autocontenido** que el próximo chat (fresh context) debe recibir para ejecutar la tarea acordada. Evita errores al pegar prompts largos en el chat box.

> **Cambio 2026-04-27**: los briefs ahora viven en `chats/open/` (no `chats/` directo). Ver el ciclo de vida de chats: `open/` → `running/` → (`waiting/` | `troubles/`)? → `closed/`. Ver [rules/backlog-hygiene.md](../rules/backlog-hygiene.md).

## Cuándo invocar

Al final del chat actual, cuando se sabe qué sigue (siguiente subfase, próximo chat del plan, tarea pendiente). El usuario abre un chat nuevo y pega el contenido o referencia `@.claude/chats/NNN-...md`.

## Fuente de autoridad — la cola del maestro

**Antes de inferir qué chat generar, leer la sección `📋 Próximos 3 chats (cola ordenada)` de `.claude/plan/maestro.md`**. Esa sección es la fuente de verdad.

Comportamiento según estado de la cola:

| Estado cola | Acción |
|---|---|
| 1+ items en la cola con Tipo ≠ OPS | Tomar el primer item sin preguntar, generar brief directo. |
| Primer item es Tipo **OPS** (coordinación externa, no código) | Saltarlo (no genera brief) y tomar el siguiente. Avisar al usuario: "El primer item es OPS, genero el siguiente de la cola. ¿OK?". |
| Cola vacía | Preguntar al usuario cuál es el siguiente antes de generar. Ofrecer candidatos basados en estado del maestro (Foco + frentes abiertos). |
| Empate / ambigüedad explícita en la cola | Listar opciones + razón y pedir decisión. |

**Nunca** inferir prioridad leyendo múltiples archivos históricos en `chats/closed/` cuando la cola del maestro está poblada — eso significa que la cola está desactualizada, y en ese caso la corrección es **actualizar la cola primero**, no improvisar.

Después de generar el brief, recordar al usuario mantener la cola: "Agregá el nuevo trabajo derivado al final de la cola del maestro si aplica."

## Reglas

- El archivo es **autocontenido**: el chat nuevo no debe necesitar leer nada externo para empezar (salvo el plan file referenciado).
- **Ubicación**: `educa-web/.claude/chats/open/` — los briefs nuevos entran en `open/` y de ahí los consume `/start-chat` (o automáticamente `/go`). El BE no mantiene `chats/` propio. Ciclo: `open/` → `running/` → (`waiting/` | `troubles/`)? → `closed/`.
- **Numeración**: `NNN` con 3 dígitos, secuencial, independiente del plan/repo/fecha. El siguiente número = `max(NNN existentes en chats/ y chats/closed/) + 1`.
- **Nombre**: `NNN-plan-X-chat-Y-<repo>-<scope-corto>.md` (ej: `003-plan-25-chat-2-be-migrar-reportes-restantes.md`). Scope en kebab-case, ≤ 6 palabras.
- **Metadato obligatorio al inicio** (antes del `# Título`):

  ```markdown
  > **Repo destino**: `educa-web` (frontend, branch `main`) | `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
  > **Plan**: N · **Chat**: M · **Fase**: FX.YY · **Creado**: YYYY-MM-DD · **Estado**: ⏳ pendiente | 🟡 WIP | ✅ cerrado.

  ---
  ```

  **Importante**: el campo `Creado:` lo lee el [hook backlog-check.sh](../hooks/backlog-check.sh) y `/triage` para medir edad de los briefs. Sin ese campo, el hook cae al `mtime` del archivo (menos confiable porque las ediciones lo resetean).

- Sobrescribir solo si el número ya existe con el mismo plan/chat (retomar un chat pendiente); en general **no sobrescribir** — siempre siguiente número libre.
- Formato markdown con secciones claras, code blocks para SQL/snippets/comandos.
- Incluir aprendizajes del chat actual que transfieren (dependencias ya instaladas, patterns descubiertos, archivos ya tocados).

## Cómo calcular el siguiente número

Antes de escribir, listar los archivos existentes en los 5 buckets del ciclo de vida:

```bash
for d in open running waiting troubles closed; do
  ls "educa-web/.claude/chats/$d/" 2>/dev/null | grep -E "^[0-9]{3}-" || true
done | sort | tail -5
```

Tomar el mayor NNN y sumar 1. Si no hay archivos aún, empezar en `001`. **Los NNN son globales y no se reutilizan** — cada brief tiene identidad única durante todo su ciclo de vida.

## Estructura obligatoria

```markdown
> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 25 · **Chat**: 1 · **Fase**: F1 · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar.

---

# <Plan # Chat # — Título corto>

## PLAN FILE
Ruta al plan + sección exacta (ej: "Chat 2 — F2").
Siempre referenciar el maestro de `educa-web/.claude/plan/maestro.md` con path relativo
desde el repo destino (`../../educa-web/...` desde BE, `.claude/...` desde FE).

## OBJETIVO
1-2 líneas de qué resuelve esta tarea.

## PRE-WORK OBLIGATORIO (si aplica)
SQL a mostrar, confirmaciones, setup previo antes de codificar.

## ALCANCE
Archivos a crear/modificar con rutas, roles y líneas estimadas.

## TESTS MÍNIMOS
Casos concretos en formato "input → resultado esperado".

## REGLAS OBLIGATORIAS
INV-*, cap 300 ln, AsNoTracking(), fire-and-forget, etc. — las que apliquen.

## APRENDIZAJES TRANSFERIBLES (del chat actual)
Descubrimientos no obvios, dependencias ya instaladas, patterns reutilizables,
decisiones que el chat nuevo debería conocer para no redescubrir.

## FUERA DE ALCANCE
Explícito — qué NO tocar (siguientes fases, otros repos, etc.).

## CRITERIOS DE CIERRE
Checklist accionable con `[ ]`. Incluir siempre:
- [ ] Mover este archivo de `chats/running/` a `chats/closed/` al cerrar el chat (lo hace `/end` automático en caso /ship).

## COMMIT MESSAGE sugerido
Texto exacto a usar. **Obligatorio respetar las reglas de la skill `commit`** (`.claude/skills/commit/SKILL.md`):

- **Idioma: inglés.** Subject y body en inglés, modo imperativo (`add`, `fix`, `close`, no `added`/`cerrando`).
- **Español solo entre `"..."`** para términos de dominio que quedan en español en el código o BD (ej: `"tipoPersona"`, `"EO_TipoFallo"`, `"AsistenciaProfesor"`, `"ReporteFallosCorreoAsistencia"`).
- **NUNCA agregar `Co-Authored-By`** — la skill lo prohíbe explícitamente.
- Subject ≤ 72 caracteres, formato `type(scope): description`.
- Si hay commit separado para backend y frontend (un chat que toca ambos repos), generar los dos mensajes, ambos bajo estas reglas.

## CIERRE
Qué feedback pedir al cerrar (decisiones no obvias, si siguiente fase requiere ajustes).
```

## Al cerrar un chat (limpieza)

**Nuevo flujo recomendado**: usar [`/end`](end.md) — detecta el caso (ship completo, pausa, abort, commit aparte) y hace el move + commit + actualización del maestro automáticamente, delegando el commit en `/commit-front`/`/commit-back`/`/commit-local`.

Si por alguna razón hacés el cierre manual:

```bash
git mv "educa-web/.claude/chats/running/NNN-...md" "educa-web/.claude/chats/closed/"
```

No se borra — queda como historia. El número NNN **no se reutiliza**.

**Invariante**: un brief no entra a `closed/` sin commit que lo mueva ahí. Si encontrás un brief en `closed/` sin commit que lo justifique, es un error — devolverlo a `open/` y cerrarlo bien.

## Al terminar la generación

1. Mostrar el path del archivo generado: `educa-web/.claude/chats/NNN-plan-X-chat-Y-<repo>-<scope>.md`.
2. Indicar el **repo destino** (BE o FE) para que el usuario abra el chat nuevo ahí.
3. Recordar al usuario cómo invocarlo:
   - Opción A: abrir chat nuevo en el repo destino y escribir `/execute @../../educa-web/.claude/chats/NNN-...md` (si es BE) o `/execute @.claude/chats/NNN-...md` (si es FE).
   - Opción B: abrir chat nuevo y pegar el contenido del archivo directo.
4. **NO** hacer commit de los archivos de `chats/` salvo pedido explícito — son contexto de transición, no deliverable del producto.

## Convenciones de scope (últimas palabras del nombre)

Ejemplos aprobados:

- `001-plan-22-chat-4-fe-email-outbox-tipofallo.md` — claro qué página y qué feature
- `002-plan-25-chat-1-be-closedxml-primer-excel.md` — dependencia clave (ClosedXML) + entregable (primer Excel)
- `003-plan-25-chat-2-be-migrar-reportes-restantes.md` — verbo (migrar) + objeto (reportes restantes)

Evitar:

- `003-plan-25-chat-2.md` (sin scope — no se sabe qué hace)
- `003-plan-25-chat-2-stuff.md` (vago)
- `003-plan-25-chat-2-be-lots-of-things-and-more.md` (demasiado largo)
