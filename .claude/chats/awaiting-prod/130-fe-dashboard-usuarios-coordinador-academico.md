---
title: Mostrar Coordinador Académico en dashboard /intranet/admin/usuarios
mode: execute
created: 2026-05-08
exclusive: false
isolation: main
touches:
  - src/app/features/intranet/pages/admin/usuarios/**
hot-paths: []
---

> **Creado**: 2026-05-08 · **Estado**: ⏳ pendiente arrancar.
> **Validación prod**: ⏳ pendiente desde 2026-05-08

## Contexto

Handoff cross-repo del chat Educa.API 002 (commit `d850026` en `master`). El backend ahora retorna `TotalCoordinadoresAcademicos` en `GET /api/usuarios/estadisticas` y el conteo de `TotalDirectores` ya no infla con Promotor + Coord Académico.

**Snapshot prod 2026-05-08**: Director=2, AsistenteAdm=4, Promotor=1, CoordinadorAcademico=1.

## Cambios visibles para el usuario

- **Tarjeta "Total Directores"** baja de 4 a 2 (era el bug). Avisar al jefe que la cifra real siempre fue 2; el dashboard mentía.
- **Tarjeta nueva "Coordinador Académico"** (1 activo).
- Total de usuarios sumado correcto (antes faltaban Promotor + Coord Acad cuando el SP devolvía 0 silencioso).

## Plan de ejecución

1. Verificar el shape actual del DTO TS: `data/models/usuarios.models.ts` (o equivalente). Agregar `totalCoordinadoresAcademicos: number`. Si el modelo es regenerado desde swagger, regenerar.
2. Ubicar la grilla de stat cards en `features/intranet/pages/admin/usuarios/components/usuarios-stats/` (o equivalente):
   - Agregar tarjeta "Coordinador Académico" siguiendo el patrón de design-system §B3 (icon + label + value + sublabel). Sugerencia de icono: `pi pi-graduation-cap` o `pi pi-book` para distinguirlo de Director (`pi pi-user-edit`) y Asistente (`pi pi-user`).
   - Si el grid es `repeat(auto-fit, minmax(200px, 1fr))` ya pasa de N a N+1 cards sin tocar layout.
3. Confirmar que `Total Usuarios` y los totales agregados (Activos/Inactivos) sigan correctos — el backend ya los corrigió, solo verificar que el FE no los recalcule en cliente.
4. Smoke en `/intranet/admin/usuarios` con usuario Director: las 6 tarjetas deben mostrar Director=2, Asistente=4, Promotor=1, CoordAcad=1, Profesor, Apoderado, Estudiante (orden a definir según UX).

## Criterios de éxito

- [ ] DTO TS expone `totalCoordinadoresAcademicos`.
- [ ] Tarjeta de Coord Académico visible en dashboard.
- [ ] Conteo de Director muestra 2 (no 4) — el bug visible se cierra.
- [ ] Total Usuarios consistente con suma de tarjetas individuales.
- [ ] Lighthouse no regresa (CLS estable).

## Riesgos y notas

- **No es breaking del JSON**: el campo nuevo es aditivo. Si el FE ignora props desconocidas (caso típico con `interface` de TS), agregar el campo no rompe — solo no se renderizaba la tarjeta.
- **UI de gestión de usuarios** (creación, edición de rol): Plan 28 ya cubrió la UX para asignar Coord Académico, este chat solo toca el dashboard de estadísticas.
- **Diseño del icono**: si no hay convención previa para Coord Académico, alinear con el patrón de iconos de Director/Profesor antes de mergear.

## Referencias

- Commit BE: `d850026` en `Educa.API@master` ("fix(usuarios): split Director count by DIR_UsuarioReg discriminator").
- Brief BE de origen: `Educa.API/.claude/chats/closed/002-reconcile-sp-estadisticas-promotor-coord-academico.md`.
- Constante de roles: `educa-web/src/app/shared/constants/app-roles.ts` (ya tiene `'Coordinador Académico'`).
- Design system stat cards: `.claude/rules/design-system.md` §B3.
