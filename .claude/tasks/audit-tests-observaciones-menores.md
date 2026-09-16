# Audit tests frontend 2026-09-16 — Observaciones menores

> **Origen**: `/audit` sobre la suite de tests frontend, categoría **Observación** — baja prioridad, no ameritan brief/chat dedicado (ver [`plan/audit-tests-frontend-2026-09-16.md`](../plan/audit-tests-frontend-2026-09-16.md), sección "Fuera de scope"). Abordar oportunistamente al tocar esos archivos, o agrupar en un futuro brief de housekeeping si esta lista crece.

## Ítems

- [ ] `login-intranet.component.spec.ts:145-166` — "should show error on failed login" no confirma que `router.navigate` NO se llamó tras credenciales inválidas. Agregar el assert negativo.
- [ ] `session-storage.service.spec.ts` — sin test de JSON corrupto en `getUser()`/`getPermisos()` pese al try/catch explícito en la implementación.
- [ ] `public-seo.service.spec.ts` — sin test de limpieza de meta tags al navegar de una ruta con SEO a una sin SEO.
- [ ] `calendary.component.spec.ts` — `EventsCalendarService.getActivosPorAnio` siempre mockeado con `of([])`; agregar caso con eventos reales cargados y caso de error de API.
- [ ] `attendance-director-estudiantes.component.spec.ts` — solo 2 tests triviales para un componente de ~400+ líneas (selector grado-sección, `tipoReporte`, `legendStats`, exportación PDF/Excel, justificaciones). Ampliar cobertura de scoping de rol Director, a la par de `attendance-apoderado`/`attendance-estudiante` (que sí testean INV-C11 explícitamente).
- [ ] 16/22 specs de páginas públicas y secciones shared (`about`, `faq`, `home`, `privacy`, `terms`, niveles educativos, `header`, `footer`, secciones de landing) solo tienen `should create`/`toBeTruthy()`. Aceptable para componentes presentacionales puros — evaluar caso a caso si vale la pena un assert de contenido real, priorizando `header`/`footer` por tener lógica de navegación real.

## No acción

- `videoconferencias.window.utils.spec.ts` — el audit sospechó un gap de "popup bloqueado", pero se confirmó por grep que el archivo testea lógica de **ventana horaria** (tiempo), no `window.open`; no existe ningún `window.open` en el feature `videoconferencias`. No es un gap real, fue un malentendido del scope del audit — cerrado sin acción.
- Retry policy de interceptors (4xx/429 nunca, 500 máx 1, 502-504 con backoff) — confirmado sin violación en los interceptors auditados; la lógica real vive en `core/helpers/rxjs/with-retry.ts`, fuera del scope de los hallazgos.
