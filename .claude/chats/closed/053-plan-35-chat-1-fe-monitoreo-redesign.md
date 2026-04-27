> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Validación prod**: ✅ verificada 2026-04-27
> **Plan**: 35 · **Chat**: 1 · **Fase**: F1.FE · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/execute → /validate` (diseño ya cerrado en plan file).

---

# Plan 35 Chat 1 — FE: Rediseño UX/UI submódulo "Monitoreo"

## PLAN FILE

- Plan canónico: [`.claude/plan/monitoreo-redesign.md`](../plan/monitoreo-redesign.md).
- Origen: 2026-04-27, sesión `/go` con cola bloqueada (Plan 31 Chat 2 esperando OPS). El usuario pidió un plan FE-only resoluble en un solo chat para avanzar. Frase del usuario:
  > *"Tengo actualmente en Monitoreo Bandeja de Correos, Dashboard del día, Diagnóstico, Errores, Rate Limit y Reportes de Usuario. Me parece que ya está creciendo mucho. Quiero un rediseño de nivel UX/UI que priorice los flujos de trabajo obvios, simples sencillos y bien organizados sin perder las funciones actuales de las páginas."*

## OBJETIVO

Reemplazar las **7 entradas planas** del dropdown "Sistema → Monitoreo" por **1 sola entrada** que abre un **hub** con 3 dominios (Correos / Incidencias / Seguridad), navegando a sub-páginas con **tabs internas** que conservan las 6 páginas existentes intactas.

Las 7 URLs viejas siguen vivas como **redirects** para no romper bookmarks ni links de correos/Slack/Plan 32.

**Alcance explícito**: solo FE. **NO se toca lógica interna** de las 6 páginas (sus stores, facades, services, tests). Refactor estructural puro de routing + menú + 4 componentes nuevos.

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** [.claude/plan/monitoreo-redesign.md](../plan/monitoreo-redesign.md) completo — tiene las 10 decisiones de diseño cerradas, no se vuelven a discutir.
2. **Leer** `src/app/features/intranet/intranet.routes.ts` — específicamente las rutas `/admin/email-outbox`, `/admin/email-outbox/dashboard-dia`, `/admin/email-outbox/diagnostico`, `/admin/auditoria-correos`, `/admin/trazabilidad-errores`, `/admin/reportes-usuario`, `/admin/rate-limit-events`. Patrón actual: rutas hermanas con `loadComponent` + `canActivate: [authGuard, permisosGuard]`.
3. **Leer** `src/app/features/intranet/shared/config/intranet-menu.config.ts` líneas 119-126 — el grupo `Monitoreo` con sus 7 items (incluido `auditoria-correos` con flag `auditoriaCorreos`). El item nuevo debe respetar el shape `{ route, label, icon, permiso, modulo, group, preview, description }` + `featureFlag` cuando aplique.
4. **Leer** `src/app/features/intranet/pages/admin/email-outbox/email-outbox.component.html` — entender el patrón `<app-page-header>` + secciones que usan las páginas hijo. El shell de tabs debe encajar visualmente con esto.
5. **Leer** `src/app/features/intranet/pages/admin/usuarios/usuarios.component.html` (si existe el grupo "Permisos" con tabs) o cualquier página actual con `<p-tabs>` controlado por router para imitar el patrón.
6. **Repasar** reglas FE relevantes:
   - [`design-system.md`](../rules/design-system.md) §B3 (stat card layout) y §B2 (page header) para el hub
   - [`menu-modules.md`](../rules/menu-modules.md) sección 4 (cuándo agrupar items)
   - [`code-language.md`](../rules/code-language.md) — código en inglés, UI en español
   - [`a11y.md`](../rules/a11y.md) — links del hub deben tener aria-label si tienen solo icono
   - [`feature-flags.md`](../rules/feature-flags.md) — los flags `emailOutboxDashboardDia`, `emailOutboxDiagnostico`, `rateLimitMonitoring`, `auditoriaCorreos` siguen aplicando a sus tabs respectivas
   - [`primeng.md`](../rules/primeng.md) — patrón de tabs con `<p-tabs>` y `<router-outlet>`
7. **Confirmar** que `auditoria-correos` está actualmente en el menú (lo descubrió el audit del `/go` — está en el grupo Monitoreo aunque el usuario no lo mencionó). El plan lo incluye como tab del shell "Correos".

## DECISIONES YA TOMADAS (del plan file — no re-discutir)

| # | Decisión | Detalle |
|---|----------|---------|
| 1 | Estructura | Hub `/admin/monitoreo` + 3 dominios (Correos / Incidencias / Seguridad) |
| 2 | Tabs en Correos (4) e Incidencias (2) | Shell ligero con `<p-tabs>` + `<router-outlet>` |
| 3 | Una sola entrada en menú "Monitoreo" → hub | Reemplaza las 7 entradas actuales |
| 4 | URLs viejas → redirects | Las 7 rutas existentes redirigen al nuevo path |
| 5 | Lógica interna de páginas | NO se toca |
| 6 | Tab activo ↔ URL | Sincronizado vía `activatedRoute.firstChild.url` |
| 7 | Sin badges de KPI en cards del hub (Fase 1) | Simple primero |
| 8 | Iconos hub | `pi-envelope` (Correos) · `pi-megaphone` (Incidencias) · `pi-shield` (Seguridad) |
| 9 | Sin breadcrumbs | Page header + tabs alcanzan |
| 10 | Permisos | Cada tab usa el permiso de su ruta vieja. Hub: `OR` de permisos hijos |

## ALCANCE

### Archivos a CREAR (4 componentes + 1 routes file)

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-------------|
| 1 | `features/intranet/pages/admin/monitoreo/monitoreo-hub.component.ts` | Landing con 3 cards (Correos / Incidencias / Seguridad) | ~80 |
| 2 | `features/intranet/pages/admin/monitoreo/monitoreo-hub.component.html` | Template del hub: `<app-page-header>` + grid de 3 cards | ~50 |
| 3 | `features/intranet/pages/admin/monitoreo/monitoreo-hub.component.scss` | Layout del hub (grid `auto-fit minmax(300px, 1fr)`) | ~40 |
| 4 | `features/intranet/pages/admin/monitoreo/shells/correos-shell.component.ts` | Shell con tabs para 4 sub-páginas | ~60 |
| 5 | `features/intranet/pages/admin/monitoreo/shells/correos-shell.component.html` | `<app-page-header>` + `<p-tabs>` + `<router-outlet>` | ~30 |
| 6 | `features/intranet/pages/admin/monitoreo/shells/incidencias-shell.component.ts` | Shell con tabs para 2 sub-páginas | ~50 |
| 7 | `features/intranet/pages/admin/monitoreo/shells/incidencias-shell.component.html` | Igual que correos pero con 2 tabs | ~25 |
| 8 | `features/intranet/pages/admin/monitoreo/shells/shells.component.scss` | SCSS compartido por shells (1 archivo, no uno por shell) | ~20 |
| 9 | `features/intranet/pages/admin/monitoreo/monitoreo.routes.ts` | Sub-rutas anidadas con lazy loading de las 7 páginas existentes | ~80 |

**Total nuevo**: ~9 archivos · ~435 líneas (incluyendo HTML/SCSS).

### Archivos a MODIFICAR (2)

| # | Archivo | Cambio | Líneas est. tocadas |
|---|---------|--------|---------------------|
| 1 | `features/intranet/intranet.routes.ts` | • Agregar bloque `path: 'admin/monitoreo'` con `loadChildren: () => import('./pages/admin/monitoreo/monitoreo.routes')`<br>• Agregar 7 redirects de URLs viejas a nuevas (`{ path: 'admin/email-outbox', redirectTo: 'admin/monitoreo/correos/bandeja', pathMatch: 'full' }` etc.)<br>• Conservar las 7 rutas originales solo si necesitan permisos guard distintos al hub (decidir en chat) | ~30 |
| 2 | `features/intranet/shared/config/intranet-menu.config.ts` | • Eliminar las 7 entradas del grupo `Monitoreo` (líneas 119-126)<br>• Agregar 1 sola entrada con `route: '/intranet/admin/monitoreo'`, `label: 'Monitoreo'`, `icon: 'pi pi-chart-bar'`, sin `group`<br>• El permiso del menu item: usar `PERMISOS.ADMIN_MONITOREO` si existe, o cualquiera de los 7 hijos como fallback (`PERMISOS.ADMIN_EMAIL_OUTBOX`) — definir en chat | ~20 |

**Total modificado**: 2 archivos · ~50 líneas.

## ESTRUCTURA DEL HUB (referencia visual)

Aplicar [`design-system.md`](../rules/design-system.md) §B2 (page header) + §B3 (stat card / card layout):

```
┌──────────────────────────────────────────────────────────────────┐
│ [icon] Monitoreo                                                  │
│        Visibilidad de operación del sistema                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  📧 Correos      │  │ 🐛 Incidencias   │  │ 🛡️ Seguridad     │  │
│  │  4 sub-vistas    │  │ 2 sub-vistas     │  │ 1 sub-vista       │  │
│  │                  │  │                  │  │                   │  │
│  │  • Bandeja       │  │ • Errores        │  │ • Rate Limit      │  │
│  │  • Dashboard día │  │ • Reportes       │  │                   │  │
│  │  • Diagnóstico   │  │   de usuarios    │  │                   │  │
│  │  • Auditoría     │  │                  │  │                   │  │
│  │                  │  │                  │  │                   │  │
│  │  [Abrir Correos] │  │ [Abrir Incid.]   │  │ [Abrir Seguridad] │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

Cada card es clickable completo (navega a la primera tab del shell). Los sub-links secundarios dentro de la card también navegan directo a su tab.

Cards: `border 1px solid var(--surface-300)`, `border-radius 12px`, `padding 1.5rem`, sin background (Design System §1 transparencia global). Hover: `background var(--surface-50)`.

## ESTRUCTURA DE RUTAS (`monitoreo.routes.ts`)

```typescript
import { Routes } from '@angular/router';
import { authGuard, permisosGuard } from '@core/guards';

export default [
  {
    path: '',
    loadComponent: () => import('./monitoreo-hub.component').then(m => m.MonitoreoHubComponent),
    title: 'Intranet - Monitoreo',
  },
  {
    path: 'correos',
    loadComponent: () => import('./shells/correos-shell.component').then(m => m.CorreosShellComponent),
    children: [
      { path: '', redirectTo: 'bandeja', pathMatch: 'full' },
      {
        path: 'bandeja',
        loadComponent: () => import('../email-outbox/email-outbox.component').then(m => m.EmailOutboxComponent),
        canActivate: [authGuard, permisosGuard],
      },
      {
        path: 'dashboard',
        loadComponent: () => import('../email-outbox-dashboard-dia/email-outbox-dashboard-dia.component').then(m => m.EmailOutboxDashboardDiaComponent),
        canActivate: [authGuard, permisosGuard],
      },
      // ... diagnostico, auditoria
    ],
  },
  {
    path: 'incidencias',
    loadComponent: () => import('./shells/incidencias-shell.component').then(m => m.IncidenciasShellComponent),
    children: [
      { path: '', redirectTo: 'errores', pathMatch: 'full' },
      // ... errores, reportes
    ],
  },
  {
    path: 'seguridad/rate-limit',
    loadComponent: () => import('../rate-limit-events/rate-limit-events.component').then(m => m.RateLimitEventsComponent),
    canActivate: [authGuard, permisosGuard],
  },
] satisfies Routes;
```

## PASOS DEL CHAT

1. **Investigate (5 min)**: leer pre-work obligatorio (5 archivos clave). Verificar feature flags activos en el environment.
2. **Crear `monitoreo.routes.ts`** primero — esqueleto de rutas hijas con redirects vacíos a páginas existentes via `loadComponent` lazy.
3. **Crear shells** (`correos-shell`, `incidencias-shell`) con `<p-tabs>` + `<router-outlet>` y sync URL ↔ tab activo via signal del `activatedRoute.firstChild?.url`.
4. **Crear hub** con `<app-page-header>` + grid de 3 cards. Filtrar cards por permisos del usuario (hide si no tiene ningún permiso del cluster).
5. **Modificar `intranet.routes.ts`**: registrar `'admin/monitoreo'` con loadChildren + 7 redirects de URLs viejas.
6. **Modificar `intranet-menu.config.ts`**: colapsar las 7 entradas del grupo `Monitoreo` en 1 sola entrada.
7. **`/validate` (paralelo via Agent)**: lint + build + test. Reportar resultados.
8. **Browser check manual**: 7 URLs viejas redirigen, 7 URLs nuevas cargan, tabs sincronizan con URL en refresh.

## CRITERIOS DE ÉXITO (DoD)

- [ ] Click en menú "Sistema → Monitoreo" abre `/intranet/admin/monitoreo` (hub)
- [ ] Hub muestra 3 cards: Correos / Incidencias / Seguridad
- [ ] Cada card lista sus sub-páginas como links secundarios
- [ ] Click en card o link secundario navega al tab correspondiente
- [ ] Tabs en Correos (4) e Incidencias (2) navegan sin recargar datos
- [ ] Refresh en cualquier sub-ruta nueva carga el tab correcto activo
- [ ] Las 7 URLs viejas (`/admin/email-outbox`, `/admin/email-outbox/dashboard-dia`, `/admin/email-outbox/diagnostico`, `/admin/auditoria-correos`, `/admin/trazabilidad-errores`, `/admin/reportes-usuario`, `/admin/rate-limit-events`) redirigen al nuevo path correcto sin error
- [ ] Permisos: usuario sin `ADMIN_EMAIL_OUTBOX` no ve el card "Correos" en el hub
- [ ] Feature flags: si `emailOutboxDashboardDia=false`, el tab "Dashboard del día" no se muestra
- [ ] `npm run lint` ✅
- [ ] `npm run build` ✅ (config production)
- [ ] `npm test` ✅ (sin regresiones — los 6 features existentes mantienen sus tests)
- [ ] Browser check: las 6 páginas cargan sin diferencia funcional dentro del shell

## OUT OF SCOPE (no hacer en este chat)

- Mover el correlation hub `/admin/correlation/:id` a `monitoreo/incidencias/correlation/:id` (puede evaluarse en plan futuro)
- Agregar KPIs en las cards del hub (`12 errores hoy`, `3 reportes nuevos`) — Fase 2 si el usuario lo pide
- Tocar la lógica interna de cualquiera de las 6 páginas (sus stores, facades, services, tests, templates internos)
- Renombrar páginas o reorganizar sus features (Plan separado si se requiere)
- Mobile-specific UX del hub (responsive ya cubierto por el grid `auto-fit`)

## RIESGOS CONOCIDOS

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | Tab ↔ URL sync rompe deep-links | Usar patrón estándar: signal del primer segmento de `activatedRoute.firstChild.url` |
| 2 | `permisosGuard` falla con redirects | Los redirects son resolución del router antes del guard. El guard se aplica a la ruta destino con su permiso original. |
| 3 | Lazy loading anidado falla en Netlify (prod) | Patrón ya usado en el proyecto para todas las rutas; bajo riesgo. Verificar en build local |
| 4 | El SW (PWA) cachea la ruta vieja sin redirect | Verificar que el SW respete los redirects o forzar invalidación de cache si rompe (poco probable) |
| 5 | Breaking change para Plan 32 (correlation hub) | El hub Plan 32 NO se mueve. Sus deep-links a `/admin/correlation/:id` siguen funcionando |

## REVERSIBILIDAD

Si el rediseño no funciona post-deploy:
1. Revertir el commit
2. Las 7 rutas viejas vuelven a ser primarias automáticamente (al revertir desaparecen los redirects)
3. Sin pérdida de datos — refactor puramente estructural

## REFERENCIAS

- Plan canónico: [`.claude/plan/monitoreo-redesign.md`](../plan/monitoreo-redesign.md)
- Auditoría estructural del estado actual: ver chat de origen 2026-04-27 (este brief fue generado tras audit con `/go`)
- Reglas FE clave: `design-system.md`, `menu-modules.md`, `code-language.md`, `feature-flags.md`, `primeng.md`, `a11y.md`
- Sin dependencias de BE — el chat puede arrancar inmediatamente cuando se abra
