# Auditoría buenas prácticas Angular 22 / TypeScript 6.0 — 2026-09-12

> **Origen**: `/audit` sobre el 100% de `src/app/` (10 agentes en paralelo: core/config, data layer, shared UI kit, `edu-ui`, admin ×2, estudiante/profesor/login, cross-role+intranet-shared, público+SSR, monitoreo/rate-limit/notificaciones).
> **Corrección de premisa**: TypeScript 7.0 no existe en npm a esta fecha (release puente TS 6.0, basado en JS, previo al compilador nativo en Go). Versión real instalada: **TS ~6.0.3**. Angular real: **22.1.3**.
> **Contraparte BE**: `Educa.API/.claude/plan/audit-csharp14-net10-2026-09-12.md` (mismo día, mismo formato).

## Problema

El codebase tiene una base moderna sólida: 100% standalone, 100% control flow nuevo (`@if/@for/@switch`), signals bien usados en la enorme mayoría del código, sin `any` evitable en casi ningún scope, `OnPush` consistente. Los hallazgos no son de adopción de features modernas sino de:

1. **Fugas/reliability**: servicios `providedIn:'root'` con polling que nunca se detiene, un error real de WAL que resuelve en vez de rechazar (pérdida silenciosa de escrituras offline), condición de carrera entre pestañas del líder WAL, gráficos Chart.js sin `destroy()`.
2. **Seguridad**: password en texto plano expuesta en `users/` (GET de detalle + export a Excel + generación adivinable).
3. **Patrón repetido de condición de carrera**: ~9 facades distintos hacen fetch sin `switchMap`/cancelación — una respuesta vieja puede pisar una más nueva.
4. **Bugs funcionales puntuales independientes**: paginación decorativa, bug de índice en carrusel, bug de clasificación de sección "verano" (mismo patrón que el bug de asistencia ya encontrado en el audit BE), fecha mal parseada, colisión de labels de filtro, KPI desincronizado, filtro descartado en silencio.
5. **Accesibilidad**: gaps de teclado/ARIA en el design system (`edu-ui`) — impacta toda la app porque son componentes base reusados en todos lados; y 9 controles de formulario sin `setDisabledState` (reactive forms `disable()` no funciona visualmente).
6. **Configuración zoneless**: `test-setup.ts` asume `provideZonelessChangeDetection()` pero `app.config.ts` de producción no lo declara explícitamente — divergencia test↔prod.
7. **Performance**: `@defer` prácticamente ausente en dashboards pesados y páginas públicas; bug de lazy-loading en `intranet.routes.ts` que descarga las 8 páginas de un rol al visitar solo una.
8. **Duplicación de código** entre roles (mensajería, niveles públicos, componentes de asistencia) y **violaciones de layering** puntuales (adapters con lógica de negocio, `shared/services` importando desde `features/pages`).

## No-objetivos

- No es un audit de features faltantes ni de diseño visual — es cumplimiento de buenas prácticas del stack real (Angular 22.1.3 / TS 6.0.3 / RxJS 7.8 / `@ngrx/signals` 22).
- No se corrigió nada durante el audit (modo `/audit` puro).
- No se re-abre nada de lo ya cerrado en `xP79` (migración PrimeNG→`edu-ui`) salvo que un hallazgo nuevo lo toque explícitamente (no fue el caso).

## Fases

| Fase | Tema | Severidad dominante | Brief / Estado |
|---|---|---|---|
| F1 | Bugs críticos de fugas/reliability (polling que no se detiene, WAL resuelve-en-vez-de-rechazar, race del líder WAL, Chart.js sin destroy) | Bug | ✅ [663](../chats/closed/663-audit-f1-bugs-criticos-fugas-reliability.md) |
| F2 | Seguridad — exposición de password en `users/` | Riesgo | 🟡 FE ✅ awaiting-prod · BE handoff pendiente ([664](../chats/awaiting-prod/664-audit-f2-seguridad-password-plaintext-users.md), `Educa.API` brief [667](../../Educa.API/.claude/chats/open/667-be-handoff-audit-fe-664-password-plaintext.md)) |
| F3 | Condiciones de carrera por fetches sin cancelación (~9 facades) | Bug/Riesgo | ✅ FE cerrado, awaiting-prod [665](../chats/awaiting-prod/665-audit-f3-race-conditions-fetches-sin-cancelacion.md) |
| F4 | Bugs funcionales puntuales independientes (9 fixes acotados) | Bug | ✅ [666](../chats/closed/666-audit-f4-bugs-funcionales-puntuales.md) |
| F5 | `edu-ui`: accesibilidad teclado/ARIA (tabs, accordion, menu, tooltip, combobox) + `setDisabledState` faltante en 9 controles CVA | Riesgo | [679](../chats/open/679-audit-f5-edu-ui-accesibilidad-setdisabledstate.md) |
| F6 | Decidir y aplicar configuración zoneless explícita en `app.config.ts` (paridad con `test-setup.ts`) | Regla violada | [680](../chats/open/680-audit-f6-zoneless-config-explicita.md) |
| F7 | Sitio público: formulario de contacto sale de la SPA (Formspree nativo) + meta tags dinámicos por ruta ausentes (SEO) | Bug/Riesgo | [681](../chats/open/681-audit-f7-sitio-publico-contacto-seo.md) |
| F8 | Performance: `@defer` ausente transversal + bug de lazy-loading barrel en `intranet.routes.ts` (profesor/estudiante) + leak Three.js campus 3D + `monitoreo-hub-badges` 10 llamadas paralelas | Performance | [682](../chats/open/682-audit-f8-performance-defer-lazy-loading-leaks.md) |
| F9 | Consolidar duplicación de código: mensajería estudiante/profesor, niveles públicos ×3, componentes de asistencia por rol | Observación | [683](../chats/open/683-audit-f9-consolidar-duplicacion-codigo.md) |
| F10 | Capa de datos: adapters con lógica de negocio filtrada, violación de layering `shared→features`, cast `as never` en `vistas.facade.ts` | Regla violada | [684](../chats/open/684-audit-f10-capa-datos-layering-vistas-facade.md) |
| F11 | Inconsistencias transversales menores: alias `@env`/`@config`, `CommonModule` sin uso, naming `severity`/`size` en `edu-ui`, `DestroyRef` de servicios root sin efecto real | Inconsistencia | [685](../chats/open/685-audit-f11-inconsistencias-transversales-menores.md) |
| F12 | Riesgos menores de seguridad/UX: login rate-limit solo en memoria, `campus-admin` sin `rowVersion`/409, videollamadas sin manejo de expiración de token JaaS | Riesgo | [686](../chats/open/686-audit-f12-riesgos-menores-seguridad-ux.md) |

## Done-when

- [x] F1-F4 cerrados y verificados.
- [ ] F5-F12: briefs 679-686 generados 2026-09-12 a pedido explícito del usuario, superando el soft cap de `chats/open/` ≤5 (excepción documentada en `backlog-hygiene.md` para fases de audit deliberadamente pesadas) — cerrados y verificados.
- [ ] Plan y maestro sincronizados en cada cierre de fase.

## Fuera de scope

- Cambios de diseño visual del design system (`edu-ui`) más allá de accesibilidad (F5).
- Migración de servicios legacy a `httpResource()`/`resource()` salvo que un hallazgo puntual lo requiera — es modernización incremental (`F9` de Design Patterns Frontend en el maestro), no parte de este audit.

## Referencia — vara de medición usada

Angular 22.1.3 real (confirmado en `package.json`): standalone único modo esperado (NgModule deprecado no eliminado), signals (`signal/computed/effect/input/output/model/linkedSignal/resource/rxResource/httpResource`) estables en v22, control flow `@if/@for/@switch/@let` vigente desde v17, zoneless default sin configurar desde v21, `@defer` para code-splitting de template, `inject()` preferido en guards/interceptors/clases base (constructor DI sigue válido en componentes/servicios simples), SSR con `provideClientHydration()` + incremental hydration, naming sin sufijo desde CLI v20 (no aplica retroactivo a código legacy), Vitest default desde v21, RxJS+Signals interop (`toSignal`/`toObservable`) sin sobre-ingeniería, `@ngrx/signals` SignalStore sobre NgRx clásico. TypeScript ~6.0.3 real (no 7.0, aún no existe): arrays vacíos tipados por default, builds más rápidos, `--stableTypeOrdering`, deprecación de `assert` extendida a `import()` dinámico — release puente hacia el compilador nativo, sin saltos semánticos grandes respecto a TS 5.x.
