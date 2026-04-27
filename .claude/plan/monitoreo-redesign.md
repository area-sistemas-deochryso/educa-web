> **Plan**: 35 · Fecha creación: 2026-04-27 · Estado: ⏳ pendiente arrancar
> **Repo**: `educa-web` (main) — FE-only, 1 chat
> **Prioridad**: media. No bloquea ni es bloqueado por otros planes activos. Aprovechable cuando el Plan 31 Chat 2 (BE) está bloqueado por OPS.

# Plan 35 — Rediseño UX/UI del submódulo "Monitoreo"

## Objetivo

Reagrupar las **7 entradas planas** del dropdown "Monitoreo" (módulo Sistema) en una **estructura jerárquica clara por dominio**, sin perder funcionalidad ni romper URLs existentes. Reducir el cognitive load del admin al entrar.

Frase del usuario que motivó el plan:
> *"Me parece que ya está creciendo mucho. Quiero un rediseño de nivel UX/UI que priorice los flujos de trabajo obvios, simples sencillos y bien organizados sin perder las funciones actuales de las páginas."*

## Estado actual

Dropdown "Sistema → Monitoreo" tiene 7 items planos sin agrupación visual:

| # | Label | Ruta | Feature flag |
|---|-------|------|--------------|
| 1 | Errores | `/intranet/admin/trazabilidad-errores` | — |
| 2 | Bandeja de Correos | `/intranet/admin/email-outbox` | — |
| 3 | Dashboard del día | `/intranet/admin/email-outbox/dashboard-dia` | `emailOutboxDashboardDia` |
| 4 | Diagnóstico | `/intranet/admin/email-outbox/diagnostico` | `emailOutboxDiagnostico` |
| 5 | Reportes de Usuarios | `/intranet/admin/reportes-usuario` | — |
| 6 | Rate Limit | `/intranet/admin/rate-limit-events` | `rateLimitMonitoring` |
| 7 | Auditoría de Correos | `/intranet/admin/auditoria-correos` | `auditoriaCorreos` |

### Problemas detectados

| Problema | Impacto |
|----------|---------|
| 7 items planos sin jerarquía visual | Admin no escanea, lee uno por uno |
| 4 entradas son sobre correos pero no se ven juntas | "Diagnóstico" y "Auditoría de Correos" parecen dominios distintos |
| No hay landing/hub que oriente al admin | Hay que recordar qué hace cada link |
| Páginas heterogéneas: algunas tienen tabs internas, otras no | UX inconsistente entre páginas hermanas |
| Las 3 páginas de email-outbox son **rutas hermanas** sin parent route | No se navega entre ellas como tabs aunque conceptualmente lo son |

## Diseño propuesto

### Estructura: 1 entrada en menú → Hub → 3 dominios

```
Sistema (módulo)
  └─ Monitoreo (1 entrada del dropdown — antes 7)
       └─ /intranet/admin/monitoreo (NEW: hub landing)
            │
            ├─ 📧 Correos (shell con 4 tabs)
            │   ├─ /monitoreo/correos/bandeja          ← Bandeja de Correos
            │   ├─ /monitoreo/correos/dashboard         ← Dashboard del día
            │   ├─ /monitoreo/correos/diagnostico       ← Diagnóstico
            │   └─ /monitoreo/correos/auditoria         ← Auditoría de Correos
            │
            ├─ 🐛 Incidencias (shell con 2 tabs)
            │   ├─ /monitoreo/incidencias/errores       ← Trazabilidad de Errores
            │   └─ /monitoreo/incidencias/reportes      ← Reportes de Usuarios
            │
            └─ 🛡️ Seguridad
                └─ /monitoreo/seguridad/rate-limit       ← Rate Limit
```

### Por qué esta agrupación

| Dominio | Pregunta que responde | Páginas |
|---------|----------------------|---------|
| **Correos** | "¿Cómo va el envío de correos?" | Bandeja, Dashboard día, Diagnóstico, Auditoría |
| **Incidencias** | "¿Qué bugs/quejas hay?" | Trazabilidad de Errores, Reportes de Usuarios |
| **Seguridad** | "¿Hay abuso o saturación?" | Rate Limit |

Es la división natural por intención del admin. Cada cluster se abre con una pregunta única.

### Landing del hub `/intranet/admin/monitoreo`

3 cards grandes, una por dominio. Cada card muestra:
- Icono + título del dominio
- 1 línea de descripción
- Lista de sub-páginas como links secundarios
- (Opcional, fase 2) badge con estado del dominio (KPI rápido — ej: "12 errores hoy" — leído de un endpoint resumen ya existente o `null` si no aplica)

Layout de cards: `auto-fit minmax(300px, 1fr)` similar al patrón de `stats-section` del Design System (rule §B3).

### Tabs internas en Correos e Incidencias

Componente shell ligero (~80 líneas) que renderiza:

```html
<app-page-header icon="..." title="Correos" />
<p-tabs [value]="activeTab()" (valueChange)="onTabChange($event)">
  <p-tablist>
    <p-tab value="bandeja">Bandeja</p-tab>
    <p-tab value="dashboard">Dashboard del día</p-tab>
    <p-tab value="diagnostico">Diagnóstico</p-tab>
    <p-tab value="auditoria">Auditoría</p-tab>
  </p-tablist>
</p-tabs>
<router-outlet />
```

El tab activo se sincroniza con la URL via `activatedRoute.firstChild.url`. Cambiar de tab navega — no recarga datos.

Cada tab carga **la página existente sin modificarla** vía `loadComponent` lazy.

### Compatibilidad: redirects de URLs viejas

Las 7 URLs actuales **NO se eliminan**. Se mantienen como redirects para no romper bookmarks ni links externos en correos/Slack:

```typescript
// intranet.routes.ts
{ path: 'admin/email-outbox', redirectTo: 'admin/monitoreo/correos/bandeja', pathMatch: 'full' },
{ path: 'admin/email-outbox/dashboard-dia', redirectTo: 'admin/monitoreo/correos/dashboard' },
{ path: 'admin/email-outbox/diagnostico', redirectTo: 'admin/monitoreo/correos/diagnostico' },
{ path: 'admin/auditoria-correos', redirectTo: 'admin/monitoreo/correos/auditoria' },
{ path: 'admin/trazabilidad-errores', redirectTo: 'admin/monitoreo/incidencias/errores' },
{ path: 'admin/reportes-usuario', redirectTo: 'admin/monitoreo/incidencias/reportes' },
{ path: 'admin/rate-limit-events', redirectTo: 'admin/monitoreo/seguridad/rate-limit' },
```

### Permisos

Cada sub-ruta sigue apuntando al **mismo permiso** que la ruta vieja (`PERMISOS.ADMIN_EMAIL_OUTBOX`, etc.). El hub `/monitoreo` se protege con un `OR` de los permisos hijos — si el usuario tiene al menos uno, ve el hub.

Las cards/tabs cuyos permisos no tiene se ocultan visualmente (filtrado en `intranet-menu.config.ts` ya hace esto vía `permiso` por item).

## Decisiones de `/design`

| # | Decisión | Justificación |
|---|----------|---------------|
| 1 | **3 dominios** (Correos / Incidencias / Seguridad), no 2 ni 4 | Correos tiene 4 páginas — merece su propio cluster. Errores+Reportes comparten "qué reportan los humanos/sistema". Rate Limit no encaja en ninguno y es chico — queda solo. |
| 2 | **Hub landing** explícito, no "Monitoreo" colapsado a la primera sub-página | El hub es el momento de orientación. Sin él, el admin entra siempre a una sub-página y no descubre las otras. |
| 3 | **Tabs internos en Correos e Incidencias**, no nuevas páginas | Conserva el código de las 6 páginas existentes intacto. El shell es solo navegación, sin lógica. |
| 4 | **Una sola entrada en el dropdown** del módulo Sistema (label "Monitoreo") | Soluciona el problema raíz: 7 items planos. Ahora son 1 + jerarquía. |
| 5 | **Mantener URLs viejas como redirects**, no romper | Bookmarks del usuario, links en correos a `/admin/email-outbox/diagnostico`, deep-links del Plan 32 (correlation hub) siguen vivos. |
| 6 | **No tocar lógica interna de las 6 páginas** | Lower-risk. Refactor estructural puro. Tests existentes siguen verdes sin tocar. |
| 7 | **Sin badges de KPI en las cards del hub** (Fase 1) | Cada KPI requeriría endpoint o consumo de su feature. Puede hacerse en chat siguiente si el usuario lo pide. Mantener Fase 1 simple. |
| 8 | **Iconos del hub**: `pi-envelope` Correos · `pi-megaphone` Incidencias · `pi-shield` Seguridad | Reutilizar iconos ya en uso por las páginas hijo, mantener semántica. |
| 9 | **Tab activo sincronizado con URL** (no `value` en componente) | Permite deep-link, refresh y back/forward sin perder estado. Patrón estándar de PrimeNG tabs con router. |
| 10 | **Sin breadcrumbs** en Fase 1 | El page-header del shell + tabs ya da contexto. Breadcrumbs serían redundantes en estructura tan plana. |

## Plan de ejecución (1 chat FE)

### Chat 1 — `/execute → /validate` (FE)

**Archivos a CREAR (4)**

| # | Archivo | Rol | Líneas est. |
|---|---------|-----|-------------|
| 1 | `features/intranet/pages/admin/monitoreo/monitoreo-hub.component.{ts,html,scss}` | Landing con 3 cards | ~120 (TS+HTML+SCSS) |
| 2 | `features/intranet/pages/admin/monitoreo/shells/correos-shell.component.{ts,html,scss}` | Tabs shell para 4 sub-páginas de correos | ~90 |
| 3 | `features/intranet/pages/admin/monitoreo/shells/incidencias-shell.component.{ts,html,scss}` | Tabs shell para 2 sub-páginas | ~70 |
| 4 | `features/intranet/pages/admin/monitoreo/monitoreo.routes.ts` | Sub-rutas anidadas con lazy loading | ~80 |

**Archivos a MODIFICAR (2)**

| # | Archivo | Cambio | Líneas est. |
|---|---------|--------|-------------|
| 1 | `features/intranet/intranet.routes.ts` | Agregar path `'admin/monitoreo'` con loadChildren + 7 redirects | ~30 |
| 2 | `features/intranet/shared/config/intranet-menu.config.ts` | Colapsar 7 entradas en 1 sola entrada "Monitoreo" hacia el hub | ~20 |

**Total**: 4 archivos nuevos (~360 líneas) + 2 modificados (~50 líneas).

### Pasos del chat

1. **Crear `monitoreo.routes.ts`** con la estructura de rutas hijas + 3 children (correos shell, incidencias shell, seguridad).
2. **Crear `monitoreo-hub.component`** con 3 cards layout (Design System §B3).
3. **Crear `correos-shell.component` e `incidencias-shell.component`** con `<p-tabs>` + `<router-outlet>` y sync URL ↔ tab activo.
4. **Modificar `intranet.routes.ts`** para registrar `/admin/monitoreo` lazy loading + 7 redirects de URLs viejas.
5. **Modificar `intranet-menu.config.ts`** para colapsar el grupo "Monitoreo" en 1 sola entrada que apunte al hub.
6. **`/validate`**: dispatch lint + build + test en paralelo (rule [chat-modes.md](../rules/chat-modes.md)). Browser check manual: 6 URLs viejas + 7 nuevas + tabs.

### Criterios de éxito (DoD)

- [ ] Click en menú "Sistema → Monitoreo" abre `/intranet/admin/monitoreo` (hub)
- [ ] Hub muestra 3 cards: Correos (4 sub-links), Incidencias (2), Seguridad (1)
- [ ] Tabs en Correos e Incidencias navegan sin recargar datos
- [ ] Las 7 URLs viejas redirigen correctamente a las nuevas
- [ ] Refresh en cualquier sub-ruta nueva carga el tab correcto activo
- [ ] Permisos: usuario sin `ADMIN_EMAIL_OUTBOX` no ve la card "Correos" en el hub
- [ ] `npm run lint` ✅
- [ ] `npm run build` ✅ (con config `production`)
- [ ] `npm test` ✅ (suite existente sin regresiones)
- [ ] Browser check: 6 páginas existentes cargan sin diferencia funcional

## Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Tabs ↔ URL sync introduce bugs en deep-links | Media | Patrón estándar PrimeNG: usar `[value]` con signal del primer segment de `firstChild.url`. Test manual de los 6 deep-links. |
| Lazy loading anidado falla en producción (Netlify) | Baja | El proyecto ya usa lazy loading en todas las rutas. Patrón conocido. |
| Permisos no se filtran correctamente en hub | Media | Reutilizar el helper `userPermisosService.tienePermiso()` ya existente. El hub itera la misma lista que el menú config. |
| Redirects rompen el `permisosGuard` | Baja | Los redirects son a nivel router antes del guard. El guard se aplica a la ruta destino con su permiso original. |
| Bookmarks del Plan 32 (correlation hub) se rompen | Baja | El hub Plan 32 está en `/admin/correlation/:id`, no afectado por este plan. Verificar igual. |

## Reversibilidad

Si el rediseño no funciona post-deploy:
1. Revertir el commit del Plan 35
2. Las 7 rutas viejas siguen siendo las "primarias" (los redirects desaparecen al revertir)
3. Sin pérdida de datos — refactor puramente estructural

## Dependencias y coordinación

- **No bloquea ni es bloqueado por** Plan 31 (Bounce Parser BE), Plan 24 (CrossChex polling), Plan 28 (Asistentes Admin), Plan 33 (Pagination audit).
- **Complementario a**: Plan 32 (Correlation hub) — el correlation hub `/admin/correlation/:id` NO se mueve dentro de Monitoreo (es deep-link operativo, no una página de exploración). Puede revisarse en plan futuro si tiene sentido moverlo a `monitoreo/incidencias/correlation/:id`.
- **Aprovechable** cuando el Plan 31 Chat 2 está bloqueado por OPS y el dev quiere avanzar FE.

## Aprendizajes que se pueden capitalizar después

Si este rediseño funciona bien para Monitoreo, el mismo patrón **hub + shells con tabs** puede aplicarse a:
- Módulo "Académico" (cursos, salones, horarios) — actualmente flat también
- Módulo "Sistema → Permisos" (Por Rol, Por Usuario) — ya casi tiene este patrón
- Módulo "Comunicación → Calendario" (Calendario, Eventos, Notificaciones) — ya agrupado pero sin shell

No es alcance de este plan — solo lo dejamos anotado para referencia futura.
