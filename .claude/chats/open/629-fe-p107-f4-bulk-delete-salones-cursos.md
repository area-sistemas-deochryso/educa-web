# 629 — P107 F4 FE: UI de borrado masivo (Salones + Cursos)

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F4, acotada a Salones+Cursos)
> **Creado**: 2026-09-04 · **Estado**: 🟢 libre — depende del contrato de 628 (BE) para cerrar, puede arrancar en paralelo.
> **MODO SUGERIDO**: `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: sección de "herramientas de prueba" (F1 FE, brief 618) — UI de borrado masivo, complementa la de creación (brief 623)

## OBJETIVO

Exponer desde "herramientas de prueba" el borrado masivo de Salones y Cursos marcados como datos de prueba, consumiendo el endpoint que construye 628 (BE, hermano).

## PRE-WORK OBLIGATORIO

- Confirmar el estado y contrato real de 628 antes de implementar las llamadas — si 628 todavía no cerró, coordinar alcance (se puede avanzar el shell de UI sin las llamadas reales, pero no cerrar este brief sin integración real contra el BE).
- Revisar la UI de creación masiva (brief 623) como referencia directa de estilo/estructura — vive en la misma sección.

## ALCANCE

- Vista/acción que liste o permita disparar el borrado en bloque de Salones y Cursos de prueba.
- Mostrar claramente qué se borró y qué no pudo borrarse (con motivo), reusando el criterio de reporte por fila ya validado en 623.
- Confirmación explícita antes de ejecutar el borrado (acción destructiva, aunque acotada a datos de prueba).

## FUERA DE ALCANCE

- Usuarios — queda para una segunda vuelta, sin brief todavía.
- El endpoint en sí — eso es 628 (BE).
- Cualquier cambio a la UI de creación masiva existente (623) más allá de lo necesario para alojar el borrado en la misma sección.

## VALIDACIÓN FINAL

- Borrar en bloque Salones/Cursos de prueba generados previamente (via 623) y confirmar que desaparecen de las pantallas admin normales.
- Caso de rechazo (dependencia real) mostrado con mensaje claro, no un error genérico.
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [ ] UI de borrado masivo funcional para Salones y Cursos.
- [ ] Caso de rechazo por dependencia manejado con mensaje claro.
- [ ] Verificado en vivo contra 628 ya cerrado.
- [ ] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F4 FE marcado, **F4 queda completo para su alcance actual — Salones+Cursos**).
- [ ] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [ ] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add bulk test-data delete UI for salones/cursos (P107 F4 FE)
```

## CIERRE

Al cerrar (junto con 628), P107 queda completo para Salones+Cursos en las 4 fases. Usuarios sigue pendiente en F3 (brief 627) y, después, en una segunda vuelta de F4 sin brief todavía.
