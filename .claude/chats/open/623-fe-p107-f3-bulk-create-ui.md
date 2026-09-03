# 623 — P107 F3 FE: UI de creación masiva en herramientas de prueba

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F3)
> **Creado**: 2026-09-03 · **Estado**: 🟢 libre — depende del contrato de 622 (BE) para cerrar, pero puede arrancar en paralelo.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: nueva sección dentro de "herramientas de prueba" (F1 FE, brief 618) para creación masiva de Usuarios/Salones/Cursos

## OBJETIVO

Exponer desde "herramientas de prueba" la creación masiva de Usuarios (cualquier rol), Salones y Cursos — con las dos vías decididas en el plan (generación sintética de N con un click, e import de archivo) — consumiendo los endpoints que construye 622 (BE, hermano).

## PRE-WORK OBLIGATORIO

- Confirmar el estado y contrato real de 622 antes de implementar las llamadas — si 622 todavía no cerró, coordinar alcance (se puede avanzar el shell de UI sin las llamadas reales, pero no cerrar este brief sin integración real contra el BE).
- Revisar `usuarios-import-dialog` y `horarios-import-dialog` existentes como referencia de UX para la parte de import de archivo (reusar patrones de flujo/validación, no necesariamente componentes literales).

## ALCANCE

- UI para generación sintética (cantidad + entidad) por Usuarios/Salones/Cursos.
- UI para import de archivo reusando el patrón visual ya validado (preview agrupado, errores por fila).
- Todo dentro de la sección "herramientas de prueba", visible solo en desarrollo.

## FUERA DE ALCANCE

- Los endpoints en sí — eso es 622 (BE).
- UI de borrado masivo — eso es F4, brief aparte, sin diseñar todavía.
- Cambios a los diálogos de import existentes de Estudiantes/Horarios.

## VALIDACIÓN FINAL

- Generar 20 usuarios/salones/cursos sintéticos desde la UI y confirmarlos creados (vía las pantallas admin normales).
- Import de archivo funcional para al menos una entidad nueva.
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [ ] UI de generación sintética funcional para las 3 entidades.
- [ ] UI de import de archivo funcional.
- [ ] Verificado en vivo contra 622 ya cerrado.
- [ ] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F3 FE marcado).
- [ ] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [ ] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add bulk test-data creation UI (P107 F3 FE)
```

## CIERRE

Al cerrar F3 (BE 622 + FE 623 ambos cerrados), avisar que F4 (borrado masivo) queda desbloqueada para diseñarse/scopearse.
