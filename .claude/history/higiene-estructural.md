# Higiene Estructural — Completada

> **Estado**: Completada
> **Fecha cierre**: 2026-04-09
> **Origen**: Auditoría cruzada Codex + Claude (2026-04-07)
> **Predecesor**: `refactor-organizacion.md` (completado 2026-03-28)

## Resumen de lo realizado

1. **`@intranet-shared` creado**: Alias en `tsconfig.json`, carpeta `features/intranet/shared/` con componentes, servicios, directivas, pipes y config que solo usa intranet
2. **Movimiento de items**: 12 componentes, 1 servicio, 3 directivas, 8 pipes, 1 config movidos de `shared/` a `features/intranet/shared/`
3. **Re-exports temporales**: `shared/index.ts` mantiene re-exports para migración gradual
4. **Rename `pages/shared` → `pages/cross-role`**: Elimina ambigüedad con `shared/`
5. **Documentación**: Reglas de ubicación de código compartido, capa de datos, y subdominios de asistencia documentados en `architecture.md`

## Checklist final (todos completados)

- [x] Tasks derivados creados (3 archivos .md)
- [x] Alias @intranet-shared agregado a tsconfig.json
- [x] shared/ auditado, items intranet-only movidos
- [x] Re-exports temporales funcionando
- [x] Regla de repositories vs services documentada
- [x] Regla shared/ vs intranet/shared/ documentada
- [x] pages/shared renombrado a pages/cross-role
- [x] Asistencia frontend evaluada, hallazgos documentados
- [x] Build pasa sin errores
- [x] Lint pasa sin errores nuevos
