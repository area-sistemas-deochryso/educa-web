# 166 — Coord F6: protocolo de chats cross-repo

> **Repo destino**: `educa-coord/` (escribe).
> **Plan**: [migracion-arquitectura-claude.md §F6](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chats 160-165 cerrados.
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/design` + `/execute`.

## Scope

Documentar y dejar funcional el flujo de chats que tocan ambos repos.

### Tareas

1. Expandir `educa-coord/COORD.md` con:
   - **Plantilla de brief cross-repo** — frontmatter con `repos: [educa-web, Educa.API]`, `touches:` por repo, `exclusive: true|false`.
   - Cómo arranca: `/start-chat` desde el repo donde el dev abre la sesión, levanta el brief de `educa-coord/chats/open/` a `educa-coord/chats/running/`.
   - Trabajo secuencial: un repo, luego el otro. No worktrees (no hay infra todavía).
   - Cómo cierra: `/end` commitea en cada repo afectado por separado siguiendo el `commit-style.md` de cada uno; al final, commit en `educa-coord/` moviendo el brief a `chats/closed/`.
2. Decidir si `chats/awaiting-prod/` cross-repo existe (decisión §4.3 del plan):
   - Si sí → crear `educa-coord/chats/awaiting-prod/` + integrar con `/verify`.
   - Si no → los awaiting-prod siguen en el repo dueño del deploy.
3. Crear (o documentar como deuda) scripts mínimos:
   - Move del brief entre buckets (sin manifest, sin paralelización).
   - Hook opcional al cerrar chat cross-repo que recuerda commit en cada repo.
4. Actualizar `~/.claude/rules/one-repo-one-chat.md` (override local educa) para mencionar `educa-coord/chats/` como excepción documentada.

## Out of scope

- Infra de worktrees / manifest / claims → fuera del scope mínimo, se evalúa después si hace falta.
- Comms channel entre chats paralelos → idem.

## Criterio de cierre

- `educa-coord/COORD.md` sección "Chats cross-repo" describe el flujo completo con ejemplo.
- Plantilla de brief en `educa-coord/chats/_template.md` o equivalente.
- Decisión sobre awaiting-prod documentada.

## Tiempo estimado

~45 min.
