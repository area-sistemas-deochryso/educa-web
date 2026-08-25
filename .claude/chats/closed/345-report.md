# 345 — Reporte de investigación: Angular 22 (sin PrimeNG)

> Deliverable del brief [`345-p70-f1-investigate-angular22.md`](./345-p70-f1-investigate-angular22.md). Alimenta la fase F2 (`/design`) de P70.
> Angular 22 lanzado 2026-06-03. Estado actual de `educa-web`: Angular 21.0/21.1, TypeScript ~5.9.2, RxJS ~7.8.0.

## Resumen ejecutivo

Angular 22 es un salto moderado: pocas roturas de código propio, pero **tres requisitos de entorno duros** (Node 22+, TypeScript 6.0+) y **un cambio de comportamiento silencioso de alto riesgo** (transfer cache SSR con requests con credenciales) que hay que auditar antes de actualizar, no después. El resto de los breaking changes tiene migración automática vía `ng update`.

---

## 1. Stable API changes

| API | Qué cambió | Impacto en educa-web | Acción |
|---|---|---|---|
| **Signal Forms** | Graduó de experimental a estable. `touched` pasa de model binding a `input` + `touch()` output; `markAsTouched()` ahora marca descendientes por default (`skipDescendants: true` para el comportamiento viejo). | **Bajo-medio**. Reactive Forms está concentrado en 4 archivos (`form.models.ts` ~26 usos, `login-intranet.component.ts`, validators) — no es una migración masiva, pero tampoco urgente. | Adoptar después (requiere diseño puntual de esos 4 archivos, no todo el form layer). |
| **Resource API** (`resource()`, `rxResource()`, `httpResource()`) | Estable. Nuevo `chain()` para propagar loading/error entre resources dependientes. Cache SSR por `id` (evita loading state en hidratación). | **Medio**. La app usa interceptors HTTP manuales (10 interceptors en `app.config.ts`) en vez de resources — no hay migración forzada, pero `httpResource` podría simplificar patrones de fetch puntuales (ej. dashboards) y el cache-by-id ayuda a SSR. | Adoptar después, evaluar caso por caso en F2/F3. |
| **Angular Aria** | Pasó de developer preview a disponibilidad general, integrado con Signal Forms. | **Bajo** — no hay uso actual de `@angular/aria` en el código. | Ignorar por ahora; revisar si P79 (librería de reemplazo de PrimeNG) puede apoyarse en Aria para accesibilidad de sus componentes CDK. |

---

## 2. Efficiency & readability gains

- **OnPush por default**: desde v22 los componentes sin `changeDetection` explícito usan `OnPush` en vez de "check-always". La migración automática de `ng update` agrega `ChangeDetectionStrategy.Eager` a los componentes que dependían del comportamiento viejo. En `educa-web` ya hay 250+ archivos con `ChangeDetectionStrategy` seteado explícitamente (mayormente `OnPush` ya adoptado a mano) — el default nuevo **reduce boilerplate futuro**, no rompe nada existente. Impacto: **bajo**, ganancia: sí.
- **Zoneless**: confirmado en código — `provideZonelessChangeDetection()` solo aparece en `test-setup.ts` y specs de integración (testing), **no** en `app.config.ts` de producción. La app corre con Zone.js real. Angular 22 consolida zoneless como el camino recomendado pero no lo fuerza. Impacto: **ninguno hoy**, oportunidad futura (F3+) si se quiere alinear tests y runtime.
- **Fetch ya adoptado**: `app.config.ts` ya usa `provideHttpClient(withFetch(), ...)` — el cambio de default de XHR a Fetch en v22 **no afecta** a esta app, ya está en el estado nuevo. Elimina de la lista de riesgos el ítem más citado en las guías de migración.

---

## 3. Breaking changes & incompatibilidades

### Breaking changes del framework

| Cambio | Detalle | Impacto | Acción |
|---|---|---|---|
| **Node 22+ / TypeScript 6.0+ obligatorios** | Node 20 y TS 5.9 dejan de soportarse. `educa-web` está en TS ~5.9.2 hoy. | **Alto** (bloqueante de entorno) | Requiere upgrade de Node en CI/CD y máquinas de desarrollo, y bump de TypeScript — antes de correr `ng update`. |
| **`paramsInheritanceStrategy` default → `'always'`** | Rutas hijas heredan params de *todos* los padres por default (antes `'emptyOnly'`). Sin migración automática. | **Medio-alto** — app con rutas anidadas (intranet por roles). Riesgo de colisión de nombres de params entre padre/hijo. | Auditar manualmente el árbol de rutas en F2; si hay colisiones, revertir explícito con `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` o renombrar params. |
| **HTTP transfer cache SSR omite requests con credenciales por default** | Antes cacheaba y reusaba en hidratación incluso con cookies; ahora no, salvo opt-in. | **Alto** — `educa-web` usa SSR (`provideClientHydration`) + `credentialsInterceptor` + cookies (`XSRF-TOKEN`) explícitamente. Sin auditar esto puede haber requests que se re-disparan client-side donde antes se cacheaban (o al revés, dependiendo de qué se asumía). | **Auditar antes del upgrade real**, no después — es el cambio más silencioso de la lista. |
| **Bindings de input duplicados ahora son error de compilación** | Antes warning/silencioso, ahora falla el build. | Bajo probable, pero solo se sabe corriendo el build. | Correr `ng update` en el worktree dedicado y leer los errores de compilación — no requiere auditoría manual previa. |
| **Atributos `data-*` bindean como atributo HTML, no como propiedad** | Cambio de semántica de binding. | Bajo — uso de `[attr.data-*]` no es un patrón común detectado a simple vista; confirmar en F2 con grep dirigido si aparece. | Verificar en F2. |
| **`markAsTouched()` marca descendientes por default** | Ver sección 1 (Signal Forms) — mismo cambio, aplica también a validación de formularios reactivos legacy vía `ControlValueAccessor`. | Bajo-medio, acotado a los mismos 4 archivos de forms. | Cubrir junto con la migración de forms. |

### TypeScript 6.0

No se encontró una lista pública de breaking changes de TS 6.0 específica más allá de lo que ya exige Angular 22 (Angular requiere TS 6.0+, sin detalle adicional de incompatibilidades de sintaxis propia en las fuentes consultadas). Tratar como parte del mismo bump de entorno que Node 22.

### Matriz de compatibilidad de dependencias de terceros (sin PrimeNG)

| Paquete | Versión actual | Estado Angular 22 | Fuente / confianza |
|---|---|---|---|
| `@ngrx/signals`, `@ngrx/operators` | ^21.0.1 | **Beta**: `@ngrx/signals@22.0.0-beta.0` publicado 2026-07-21, peer-lock `@angular/core: ^22.0.0`. No hay release estable confirmado a la fecha de este reporte. | Confirmado (GitHub ngrx/platform issue #5158) — **verificar release estable antes de F3**. |
| `angular-eslint`, `@angular-eslint/builder` | ^19.6.0 (⚠️ ya desalineado de Angular 21 actual) | v22.1.0 disponible, con soporte completo a Angular 22 + TS 6. | Confirmado (repo angular-eslint, CHANGELOG). |
| `@analogjs/vite-plugin-angular`, `@analogjs/vitest-angular` | ^2.2.2 / ^1.14.0 | **Sin confirmar** — sin mención explícita de compatibilidad Angular 22 en las fuentes consultadas. Estos paquetes compilan componentes Angular para Vitest, por lo que sí dependen del compiler de Angular (no son agnósticos). | Sin confirmar — revisar CHANGELOG/GitHub del paquete directamente en F2. |
| `@capacitor/*` (android, camera, cli, core, filesystem, ios, local-notifications, push-notifications, splash-screen, status-bar) | v7/v8 | **Sin confirmar versión-a-versión**, pero Capacitor consume el bundle web ya compilado (`www`/`dist`) — no compila código Angular ni tiene peer dependency sobre `@angular/core`. Riesgo estructural bajo independientemente del resultado de la búsqueda. | Razonamiento arquitectónico, no una confirmación de changelog. |
| `@microsoft/signalr` | ^10.0.0 | No aplica — cliente JS/TS sin dependencia de Angular. | No requiere verificación. |
| `chart.js`, `three`, `@types/three`, `exceljs`, `xlsx`, `bootstrap-icons`, `sharp` | varias | No aplica — sin peer dependency sobre Angular. | No requiere verificación. |
| `express` | ^5.1.0 | No aplica directamente a Angular; sí es el servidor SSR (`@angular/ssr` genera el `server.mjs` que lo usa) — verificar que `@angular/ssr@22` siga generando output compatible con Express 5 en F2. | Razonamiento, no confirmado explícitamente. |
| `vite` | ^6.0.0 | Angular 22 / `@angular/build` sigue apoyado en esbuild/Vite para dev-server; sin incompatibilidad reportada en las fuentes consultadas. | Sin confirmar explícitamente. |
| `vitest` | ^4.0.0 | Depende de `@analogjs/vitest-angular` (ver arriba) más que de Angular directamente. | Ver fila de Analog. |
| `@playwright/test` | ^1.61.1 | No aplica — corre contra la app renderizada, sin dependencia de la versión de Angular. | No requiere verificación. |

**Nota de proceso**: `angular-eslint` está en `^19.6.0` mientras el resto del stack ya está en Angular 21 — este desalineamiento **es preexistente**, no causado por el salto a v22, pero conviene resolverlo en el mismo trabajo (saltar directo a v22.1.0 en vez de pasar por v21 primero).

---

## 4. Philosophical / architectural shifts

- **Signal-first, consolidado**: v22 es el release donde Signal Forms, Resource APIs y Angular Aria pasan de experimental a producción — cierra el círculo de la migración a signals que Angular viene empujando desde v17+. La dirección del framework ya no es ambigua: reactive forms, HTTP manual con interceptors, y NgModules siguen soportados pero son claramente el "camino legado".
- **Defaults modernizados agresivamente**: OnPush por default, Fetch por default, `strictTemplates` ya no opcional — Angular 22 empuja las mejores prácticas actuales a ser el comportamiento out-of-the-box, con migraciones automáticas para preservar compatibilidad. Señal de que versiones futuras probablemente sigan este patrón (ej. zoneless podría ser el próximo default).
- **Próximo en el roadmap**: bloque `@boundary` para manejo de errores en templates (mencionado como "forthcoming", sin fecha).
- **Implicancia para educa-web**: la arquitectura actual (OnPush explícito en la mayoría de componentes, Fetch ya adoptado, resources aún no usados, forms mayormente reactivos) está **alineada con la dirección del framework pero no explota lo nuevo**. La migración a v22 en sí es de bajo esfuerzo de código; el valor real está en fases posteriores (F3+) si se decide adoptar Signal Forms/Resources donde tenga sentido, no en el upgrade en sí.

---

## Recomendación consolidada para F2 (design)

1. **Bloqueante de entorno primero**: bump Node 20→22 y TypeScript 5.9→6.0 en CI/CD y dev, antes de tocar `package.json` de Angular.
2. **Auditoría dirigida** (no exploratoria) de dos puntos de alto riesgo antes de correr `ng update`: (a) árbol de rutas anidadas por colisión de params, (b) requests con credenciales bajo SSR transfer cache.
3. **Gate externo a confirmar**: esperar (o forzar via `--legacy-peer-deps` si urge) release estable de `@ngrx/signals@22` — hoy solo hay beta.
4. **No bloqueante, folder aparte**: alinear `angular-eslint` a v22.1.0 en el mismo lote de trabajo.
5. **Fuera de esta fase**: adopción de Signal Forms/Resource API — dejar para diseño explícito post-upgrade, no mezclarlo con el upgrade mecánico.

---

## Fuentes

- [Announcing Angular v22 — Angular Blog](https://blog.angular.dev/announcing-angular-v22-c52bb83a4664)
- [What's new in Angular 22.0? — Ninja Squad](https://blog.ninja-squad.com/2026/06/03/what-is-new-angular-22.0)
- [Angular 21 to 22: Breaking Changes and How to Fix Them — yeou.dev](https://www.yeou.dev/articles/angular22-upgrade/)
- [PSA: Angular v22 and NgRx v22 — ngrx/platform#5158](https://github.com/ngrx/platform/issues/5158)
- [angular-eslint ANGULAR_VERSION_SUPPORT.md](https://github.com/angular-eslint/angular-eslint/blob/main/docs/ANGULAR_VERSION_SUPPORT.md)
- [angular-eslint v22.1.0 release](https://newreleases.io/project/github/angular-eslint/angular-eslint/release/v22.1.0)
- [angular.dev — Versioning and releases](https://angular.dev/reference/releases)
