# 755 — FE: P105 D1 — Validar propuestas del hub de curso y materializar F1

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 105 · **Chat**: D1-validación · **Creado**: 2026-10-02 · **Estado**: ⏳ pendiente arrancar
> **Origen**: brief 753 (diseño D1, cerrado) · commit coord `b2d1b63`
> **Plan file**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` § "D1 — Diseño del hub de curso (brief 753, 2026-10-02)"
> **depends_on**: 753 (cerrado)
> **MODO SUGERIDO**: `/ask` → `/design` corto (sin `/execute`)
> **exclusive**: `false`
> **isolation**: ninguno (solo docs y briefs, no toca código)
> **touches**: `educa-coord` (plan P105), `educa-web/.claude/chats/open/`

## OBJETIVO

1. Que el usuario **valide, ajuste o rechace** las propuestas de D1 que quedaron sin validar.
2. **Materializar el brief de F1** (ruteo + shell + selector de franja + pestaña Contenido) y, si el usuario lo pide, los de F2-F6.

## YA VALIDADO (no re-preguntar)

| Decisión | Resultado |
|---|---|
| Modal de curso | Reemplazo total (se retira en F6). |
| Pestaña Salón | Resumen + enlace a la página de Salones. |
| Pestañas | Rutas hijas con URL propia. |
| A3-a (solo FE, par curso+salón, selector de franja) | Validada el 2026-10-01. |

## PROPUESTAS A VALIDAR (una por una, con alternativa y trade-off)

1. **Ruta**: par en el path, franja en query; `?horarioId=` entrante a Cursos redirige al hub. Autorización vía `permissionPath` apuntando a Cursos, sin seed BE.
2. **Preselección de franja**: query → la única con contenido → próxima ocurrencia. Selector oculto con 1 franja.
3. **Pestañas por franja**: Contenido, Calificaciones, Asistencia e Información muestran la franja elegida; Salón es del par. Sin agregación entre franjas.
4. **Tarjeta por par** en Cursos, con franjas como chips.
5. **`returnTo` eliminado** (botón atrás nativo) + helper único de enlaces al hub.
6. **Par inválido**: redirige a la lista de Cursos con aviso.
7. **Menú de asistencia** (Mi Asistencia vs Historial): fuera de D1.
8. **Partición en fases** F1..F6 y su orden (F3 y F4 en paralelo). ¿Alguna fase se parte o se funde?

## PRE-WORK

- Leer la sección D1 del plan P105 (arriba). El código no hace falta releerlo para validar; sí para redactar F1.
- **Para materializar F1** (ADR-0006: el brief de fase lleva el detalle descubierto, el plan no): re-verificar contra el código vigente el ruteo (rutas planas bajo `withViewAsGate`, `permissionPath`), los DTO de horario (`cursoId`/`salonId`) y los paneles reutilizables de cada pestaña.
- Brief 752 ya integrado en `main` (commit `bfbfc967`); confirmar que se mantiene.

## DATOS PARA VERIFICAR EN VIVO (opcional, para F1)

- Par curso 24 / salón 34 (2 franjas con contenidos 8 y 11) y par 14 / salón 25 (3 franjas sin contenido) en TEST.
- No hay estudiante de prueba confirmado en un par multi-franja: confirmar antes de prometer verificación como estudiante.
- Chrome visible (ocluida, `captureScreenshot` se cuelga). Login con el switcher, sin tipear credenciales. En prod solo lectura.

## SALIDA ESPERADA

- Plan P105 actualizado: propuestas marcadas validadas/cambiadas (intención y decisiones, sin rutas ni líneas).
- Brief **F1** en `chats/open/` (con `depends_on`, `touches`, criterios de aceptación y verificación en vivo). Briefs F2-F6 solo si el usuario lo pide.

## FUERA DE ALCANCE

- Implementar nada. Cambios de BE. D2-D5 salvo que condicionen el diseño.

## REGLAS OBLIGATORIAS

- Código en inglés, UI en español.
- Ante contradicción con lo documentado o con el código, detener y consultar.
- Push a `main` de `educa-web` = deploy a prod: este chat no pushea.
