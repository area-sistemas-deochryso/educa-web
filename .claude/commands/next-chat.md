---
description: Modo Handoff — cerrar un chat con trabajo real empaquetando decisiones y contexto en un brief para el chat siguiente.
---

# /next-chat (override de educa-web)

> Política universal: ver `~/.claude/commands/next-chat.md`.

## Específico de educa-web

### Maestro y cola

- Path: [../plan/maestro.md](../plan/maestro.md) (singular `plan/`).
- **La cola del maestro es la fuente de autoridad principal**. Antes de inferir qué chat generar, leer la sección `📋 Próximos 3 chats (cola ordenada)` de `../plan/maestro.md`.
- Comportamiento según estado de la cola:

  | Estado cola | Acción |
  | --- | --- |
  | 1+ items con Tipo ≠ OPS | Tomar el primer item sin preguntar, generar brief directo. |
  | Primer item es Tipo **OPS** (coordinación externa) | Saltarlo, tomar el siguiente. Avisar al usuario. |
  | Cola vacía | Preguntar al usuario cuál es el siguiente. Ofrecer candidatos basados en Foco + frentes abiertos. |
  | Empate / ambigüedad explícita | Listar opciones + razón y pedir decisión. |

- **Nunca** inferir prioridad leyendo briefs históricos en `chats/closed/` cuando la cola está poblada — eso significa que la cola está desactualizada y la corrección es **actualizarla primero**.
- Después de generar el brief, recordar al usuario: *"Agregá el nuevo trabajo derivado al final de la cola del maestro si aplica."*

### Filename obligatorio

`NNN-plan-X-chat-Y-<repo>-<scope>.md`. Repo = `fe` o `be`. Scope kebab-case ≤ 6 palabras.

Ejemplos:

- `001-plan-22-chat-4-fe-email-outbox-tipofallo.md` — claro qué página y qué feature.
- `002-plan-25-chat-1-be-closedxml-primer-excel.md` — dependencia clave + entregable.
- `003-plan-25-chat-2-be-migrar-reportes-restantes.md` — verbo + objeto.

Evitar: scope vago (`stuff`), sin scope, demasiado largo.

### Header obligatorio del brief

```markdown
> **Repo destino**: `educa-web` (frontend, branch `main`) | `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: N · **Chat**: M · **Fase**: FX.YY · **Creado**: YYYY-MM-DD · **Estado**: ⏳ pendiente | 🟡 WIP | ✅ cerrado.

---
```

El campo `Creado:` lo lee [hook backlog-check.sh](../hooks/backlog-check.sh) y `/triage` para medir edad. Sin ese campo, cae al `mtime` (menos confiable).

### Cómo calcular el siguiente número

```bash
for d in open running waiting troubles closed awaiting-prod; do
  ls "educa-web/.claude/chats/$d/" 2>/dev/null | grep -E "^[0-9]{3}-" || true
done | sort | tail -5
```

Tomar mayor NNN + 1. Los NNN son globales y no se reutilizan.

### Reglas obligatorias a listar en el brief

Las que apliquen del paquete técnico:

- **BE (Educa.API)**: INV-* (regla por carpeta), cap 300 ln, `AsNoTracking()` en queries de lectura, fire-and-forget para tareas async no críticas, sufijos `*Service.cs` / `*Repository.cs` / `*Controller.cs`.
- **FE (educa-web)**: Standalone components + OnPush, `inject()`, signals, alias `@app/@core/@data/@config/...`, logger `@core/helpers`, `takeUntilDestroyed`, NgRx donde aplique.

### Plan file

Siempre referenciar el maestro `educa-web/.claude/plan/maestro.md` con path relativo desde el repo destino:

- Desde BE: `../../educa-web/.claude/plan/...`
- Desde FE: `.claude/plan/...`

### COMMIT MESSAGE — reglas locales

**Obligatorio respetar la skill `commit`** (`.claude/skills/commit/SKILL.md`):

- **Idioma: inglés.** Subject y body en inglés, modo imperativo (`add`, `fix`, `close`, no `added`/`cerrando`).
- **Español solo entre `"..."`** para términos de dominio que quedan en español en código o BD (ej: `"tipoPersona"`, `"EO_TipoFallo"`, `"AsistenciaProfesor"`, `"ReporteFallosCorreoAsistencia"`).
- **NUNCA agregar `Co-Authored-By`** — la skill lo prohíbe explícitamente.
- Subject ≤ 72 caracteres, formato `type(scope): description`.
- Si un chat toca ambos repos, generar dos mensajes (uno por commit), ambos bajo estas reglas.

### Comando de cierre

`/end` detecta el caso (ship completo, pausa, abort, commit aparte) y delega en `/commit-front`/`/commit-back`/`/commit-local`. Ver [end.md](end.md).

### Buckets adicionales

`chats/awaiting-prod/` — briefs cerrados localmente esperando validación post-deploy. Incluir en el cálculo de NNN. Ver [verify.md](verify.md) para el cierre del ciclo.

### Indicación al usuario tras generar

1. Mostrar path del archivo: `educa-web/.claude/chats/open/NNN-plan-X-chat-Y-<repo>-<scope>.md`.
2. Indicar **repo destino** (BE o FE) para que abra el chat nuevo ahí.
3. Recordar invocación:
   - Opción A: abrir chat nuevo en repo destino y escribir `/execute @../../educa-web/.claude/chats/NNN-...md` (BE) o `/execute @.claude/chats/NNN-...md` (FE).
   - Opción B: abrir chat nuevo y pegar el contenido del archivo directo.
4. **NO** commitear archivos de `chats/` salvo pedido explícito.

## Referencias locales

- [../rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — límites + edades.
- [../plan/maestro.md](../plan/maestro.md) — cola.
- [ask.md](ask.md) — cuándo parar.
- [end.md](end.md) — flujo de cierre.
- [verify.md](verify.md) — cierre post-deploy.
- [triage.md](triage.md) — barrido cuando un gate avisa.
