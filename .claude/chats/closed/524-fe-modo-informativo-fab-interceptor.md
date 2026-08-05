---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/shared/components/intranet-fab-menu/, src/app/features/intranet/shared/services/, src/app/core/services/]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: coord `xrepo-96` · **Chat**: 1 · **Fase**: F1+F2 · **Creado**: 2026-08-05 · **Estado**: ✅ cerrado — 2 commits en worktree `chat/524-fe-modo-informativo-fab-interceptor` (`c3b97679` mecanismo base, `bc4802a9` fix hold-to-bypass post-F2), sin mergear/pushear a `main` todavía. Este stub quedó huérfano (untracked) en el repo principal; se cierra formalmente como housekeeping durante `/end` del chat 526 (2026-08-05) — el trabajo real ya estaba completo desde antes.

---

# Modo informativo — activación en el FAB + interceptor global de interacciones

## PLAN FILE

`../../educa-coord/plans/xrepo-96-modo-informativo-interactivo.md` — leer completo antes de arrancar (Problema, Decisiones, F1 y F2). El plan es intención + decisiones (QUÉ y POR QUÉ) — no seguir ninguna ruta de archivo ni firma como instrucción literal desde ahí; investigar el código actual.

Este brief cubre **solo F1 + F2** del plan (mecanismo FE puro, sin dependencia del modelo de contenido). F3 (BE + admin del contenido explicativo), F4 (conexión con contenido real), F5 (regla de mantenimiento en `CLAUDE.md`) y F6 (guía de descubribilidad) son briefs separados, a generar después.

## OBJETIVO

Agregar un modo global de sesión ("Modo informativo") activable desde el FAB de acciones existente (`IntranetFabMenuComponent`), y un interceptor que, mientras el modo está activo, bloquea el comportamiento por defecto de **cualquier** interacción por click/tap en la app y muestra en su lugar un callout explicativo (contenido de prueba en este brief — F4 lo conecta con datos reales). El propio FAB queda exento de la intercepción para poder salir del modo siempre.

## MODO SUGERIDO

Arrancar con `/design` corto (decidir dónde vive el signal global del modo y cómo se instala/desinstala el listener — el plan ya fijó el *qué*, falta el *cómo* concreto de este codebase) → `/execute` → `/validate` → cierre. No es trivial (mecanismo cross-cutting nuevo, sin precedente idéntico en el repo), pero tampoco amerita `/adr` — no rompe ninguna regla dura, solo agrega un mecanismo nuevo.

## PRE-WORK OBLIGATORIO

- Leer `src/app/features/intranet/shared/components/intranet-fab-menu/intranet-fab-menu.component.ts` completo — es el componente a extender, ya tiene el patrón de `actions` computado + `FabMenuVisibilityService` + `StorageService` para persistencia de posición.
- Investigar cómo se cierran hoy los overlays/diálogos de PrimeNG abiertos (`p-dialog`, dropdowns) — si existe algún mecanismo global (`OverlayService`, `DomHandler`) invocable desde un service, o si hay que hacerlo manualmente. El plan (decisión confirmada) exige que se cierren automáticamente al activar el modo.
- Revisar si existe ya en el repo un patrón de "modo global de UI persistente" reciente (dark mode, briefs 521/522 — `521-fe-theming-tokens-architecture.md` / `522-fe-fix-darkmode-system-default.md` en `chats/closed/`) — puede dar el patrón a reusar para el signal + persistencia del modo informativo en vez de inventar uno nuevo.

## ALCANCE

- Extender `IntranetFabMenuComponent`: nueva entrada en `actions`/`primaryActions` ("Modo informativo") que togglea el nuevo modo global; el trigger (hoy hardcodea `Acciones` en el template, `intranet-fab-menu.component.ts` líneas ~38-70) debe reflejar el modo activo.
- Nuevo service (ubicación sugerida: `src/app/features/intranet/shared/services/` o `src/app/core/services/`, a confirmar en el chat) que expone el signal del modo (Normal/Informativo) y lo persiste como estado de sesión.
- Nuevo mecanismo de intercepción: listener en fase de captura sobre `document`, instalado/desinstalado reactivamente según el signal del modo. Debe:
  - Bloquear (`preventDefault` + `stopPropagation`) cualquier click/tap salvo que el target esté dentro de `IntranetFabMenuComponent`.
  - Resolver el elemento clickeado (o su ancestro más cercano) contra una clave de "ancla" declarada — para este brief, usar un mapa de contenido de prueba en memoria (no hay backend todavía, eso es F3/F4).
  - Mostrar un callout con la explicación encontrada, o un callout genérico si no hay ancla asociada.
  - Cerrar overlays/diálogos abiertos al activarse el modo (ver pre-work).
- Componente/estilo del callout: visualmente distinto de `pTooltip` (fondo atenuado detrás del elemento resaltado + ventana tipo callout al hacer click, no hover).

## TESTS MÍNIMOS

- Activar el modo desde el FAB → cualquier botón/link de la página deja de ejecutar su acción y muestra un callout (real o genérico).
- El FAB (incluida la entrada para volver a modo normal) sigue funcionando con normalidad estando el modo activo.
- Escribir en un input y hacer scroll/drag siguen funcionando sin interceptar.
- Un `p-dialog` abierto antes de activar el modo se cierra al activarlo.
- Desactivar el modo restaura el comportamiento normal de cualquier interacción, sin necesidad de recargar la página.

## REGLAS OBLIGATORIAS

- Standalone components + `OnPush`, `inject()`, signals (no NgRx para este estado — es UI local/sesión, no dominio).
- Alias de imports del proyecto (`@core/`, `@intranet-shared/`, etc. — ver imports existentes de `intranet-fab-menu.component.ts` como referencia).
- `takeUntilDestroyed` si el listener global se instala desde un componente en vez de un service raíz.
- Logger vía `@core/helpers`, no `console.log`.

## IMPLEMENTATION DETAIL (ADR-0006)

- **Componente a extender**: `src/app/features/intranet/shared/components/intranet-fab-menu/intranet-fab-menu.component.ts`. Hoy expone `primaryActions` (computed: `ayuda` excluido en `/intranet/ayuda`, `reportar` gateado por feature flag `feedbackReport`) y `actions` (agrega `ocultar` al final). El trigger tiene label hardcodeado `"Acciones"` y un `effect()` que colapsa `expanded` cada vez que `actions()` cambia — verificar que agregar la entrada de modo informativo no dispare ese colapso de forma indeseada al togglear.
- **Servicios ya inyectados en el FAB** (patrón a imitar para el nuevo signal de modo): `StorageService` (persistencia de posición del FAB), `FabMenuVisibilityService` (oculto/visible), `FeatureFlagsFacade`.
- **`pTooltip`** está en uso extensivo en el repo (decenas de componentes) — confirma que el callout de modo informativo necesita un lenguaje visual propio, no reusar estilos de `p-tooltip`.
- **No existe** hoy una directiva genérica de gating por capability (`*hasCapability`) — el filtrado de UI se hace ad hoc por componente/ruta/menú. No es necesario para este brief (el interceptor no re-chequea rol, solo reacciona a lo que ya está renderizado), pero es contexto útil si F3/F4 necesitan decidir cómo el interceptor sabe "qué ancla corresponde a este elemento".

## APRENDIZAJES TRANSFERIBLES (del chat actual)

- El panel `/intranet/ayuda` (FAQ + Ticket + Salud de sede, plan `xrepo-panel-ayuda-intranet` en coord) es un tema aparte — **no** reusar su modelo de datos ni su admin para el contenido del modo informativo (decisión explícita del usuario, ver plan `xrepo-96`).
- El FAB ya excluye la acción "Ayuda" cuando el usuario está en `/intranet/ayuda` (comparar `currentUrl().startsWith('/intranet/ayuda')`) — mismo patrón de computed reactivo a la navegación, útil como referencia si el modo informativo necesita comportarse distinto en alguna ruta.

## FUERA DE ALCANCE

- Modelo de datos real del contenido explicativo y su admin (F3) — usar contenido de prueba en memoria en este brief.
- Conexión con contenido real por ancla (F4).
- Regla de `CLAUDE.md` que fuerza declarar ancla + explicación (F5).
- Guía de descubribilidad login → FAB (F6).
- Interceptar tipeo, drag o scroll.
- Contenido explicativo dentro de diálogos que se abren *después* de activar el modo (el plan solo exige cerrar los que ya estaban abiertos al activarse).

## VALIDACIÓN FINAL

- `bun run lint` — 0 errores.
- `bun run build` — sin errores.
- `bun run test` — sin nuevas fallas.
- Manual: activar/desactivar el modo en al menos 2 páginas distintas (una con `p-dialog` abierto al momento de activar), confirmar que el FAB nunca queda bloqueado.

## CRITERIOS DE CIERRE

- [x] Validación final pasa (código commiteado en el worktree, F4 lo extendió sin fricción — confirma que el mecanismo quedó bien construido).
- [x] Maestro FE actualizado (`xModoInformativo` refleja F1-F4 ✅ verificados).
- [x] Brief movido `running/` → `closed/`.
- [x] Commit del código ya estaba hecho en el worktree (`c3b97679`, `bc4802a9`); este commit es solo housekeeping del stub huérfano + move.

## COMMIT MESSAGE sugerido

```
feat(intranet): add informative mode toggle and global click interceptor

New session-wide mode toggled from the existing actions FAB. While
active, a capture-phase document listener blocks default interaction
behavior and shows an explanatory callout instead, falling back to a
generic message for unmapped elements. The FAB itself stays exempt so
the mode is always exitable. Real explanatory content lands in a
follow-up phase (F3/F4) — this uses in-memory test content.
```

## CIERRE

El service (`InformativeModeService`) terminó viviendo en `src/app/features/intranet/shared/services/informative-mode.service.ts`, tal como se sugería en el brief. El mecanismo de cierre de overlays fue genérico (simula `Escape`, que PrimeNG respeta por defecto en `p-dialog`/`p-drawer`/dropdowns) — no requirió casos especiales por tipo de overlay. F4 (brief 526, cerrado 2026-08-05) confirmó ambos datos al extender este mismo archivo.
