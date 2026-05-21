# 215 — Organizar skills y agents del frontend

**Origen**: limpieza cross-repo desde Educa.API (2026-05-20)
**Modo sugerido**: `/execute`
**Esfuerzo**: bajo (~15 min)

## Contexto

El backend tenía referencias a skills y agents del frontend en su propia carpeta `.claude/`. Se limpiaron porque no pertenecían ahí. Verificar que el frontend tiene su propia documentación en orden.

## Tareas

1. **`skills/README.md`** — verificar que `/commit` y `/validate-code` están documentados en el README de skills del frontend. Si no existe el README, crearlo listando los skills disponibles.

2. **`agents/README.md`** — verificar que `code-reviewer.md` está referenciado correctamente. El backend ya no apunta aquí — el reviewer vive solo en educa-web.

3. **Limpieza general** — si hay punteros al backend en los READMEs del frontend que ya no aplican, limpiarlos.

## Criterio de cierre

- `skills/README.md` lista los skills reales del frontend
- `agents/README.md` referencia los agentes que viven en este repo
- Sin punteros rotos cross-repo
