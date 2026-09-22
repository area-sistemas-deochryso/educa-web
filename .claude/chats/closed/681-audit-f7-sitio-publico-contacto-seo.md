# 681 — Audit F7: Sitio público — formulario de contacto + meta tags SEO

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F7)
> **Creado**: 2026-09-12 · **Estado**: ✅ cerrado localmente (2026-09-15).
> **Validación prod**: ⏳ pendiente desde 2026-09-15 — ~~depende del merge de brief backend 681-B~~ ✅ 681-B mergeado a `main` de Educa.API (`828f294`, verificado 2026-09-17) — falta smoke en prod (form contacto + SEO).
> **Cierre sin verificación post-deploy (2026-09-22)**: movido a `closed/` por decisión explícita del usuario, sin correr el smoke test en prod. El bloqueo real (681-B backend) sí está confirmado resuelto (merge `828f2946` en `main` de `Educa.API`, endpoint `POST /api/Contacto` presente en código). Riesgo residual: el formulario de contacto y los meta tags SEO nunca se probaron contra `educa.com.pe` real.
> **MODO SUGERIDO**: `/design` corto (decidir manejo del form) → `/execute`
> **touches**:
>   - `src/app/features/public/contact/contact.html`, `contact.ts`
>   - `src/app/features/public/{home,about,faq,levels,privacy,terms}/*` (meta tags)
>   - `src/index.html`

## Origen

Hallazgos de `/audit` (2026-09-12), categorías "Bug"/"Riesgo" — el formulario de contacto rompe la SPA, y ninguna página pública setea meta tags dinámicos pese a ser el área con mayor impacto de SEO/SSR.

## Scope

1. **`contact.html:84-135`** — `<form action="https://formspree.io/f/mzzprebk" method="POST">` nativo, sin manejo Angular (`ContactComponent` está vacío). Al enviar, el navegador hace un POST de página completa y navega fuera de la SPA hacia Formspree, perdiendo el shell de la app. Fix: manejar el submit con `HttpClient`/`fetch`, mostrar estado de éxito/error in-app.
2. **`contact.html:121-129`** — el `<textarea name="message">` no tiene `required` a diferencia de nombre y email. Fix: agregar `required` o justificar por qué es opcional.
3. **Meta tags dinámicos ausentes**: ningún componente público (`home`/`about`/`contact`/`faq`/`levels`×3/`privacy`/`terms`) llama a `Meta`/`Title` de `@angular/platform-browser` para setear `description`/`og:title`/`og:description`/`og:image`/`canonical` por ruta — todas comparten la única `<meta name="description">` global de `index.html`. Fix: inyectar `Meta` en cada componente público y setear valores por ruta.

## Pre-work

- Punto 1 requiere una decisión de diseño corta: ¿manejar el POST con `fetch`/`HttpClient` directo a Formspree, o migrar a un endpoint propio del backend? Confirmar con el usuario antes de ejecutar — no asumir la opción más simple si hay preferencia de mantener el proveedor externo vs propio.
- Punto 3 es mecánico pero de alto volumen (9 páginas) — puede resolverse con un resolver/servicio compartido de meta tags parametrizado por ruta en vez de repetir la llamada `Meta.updateTag` en cada componente.

## Out of scope

- El resto de hallazgos del audit (ver plan).
- `@defer`/incremental hydration de estas páginas — eso es F8 (performance), no este brief.

## Criterio de cierre

- [x] Punto 1: decisión de diseño confirmada, formulario funciona sin salir de la SPA, feedback de éxito/error visible in-app.
- [x] Punto 2: `required` agregado (ver `contact.html`).
- [x] Punto 3: las 9 páginas públicas tienen `description`/OG/`canonical` propios, verificado inspeccionando el DOM renderizado de cada ruta (validación manual en navegador, ver hallazgo abajo).
- [x] Build + lint + tests OK.
- [x] Plan actualizado: F7 → ✅.
- [x] Maestro actualizado.

## Bloqueo arquitectónico (resuelto)

✅ **SEO (Puntos 2-3)** — COMPLETO y commiteado:
- `PublicSeoService`: suscribe a `NavigationEnd`, lee `route.data['seo']`, actualiza Meta tags dinámicos + canonical
- Todas 9 rutas públicas tienen `data.seo` con description, og:title, canonical
- Validación: lint ✅, TypeScript build ✅

✅ **Contacto (Punto 1)** — DESBLOQUEADO, brief 681-B ya cerrado en Educa.API:
- Arquitectura elegida: POST `/api/Contacto` (endpoint backend, no Formspree)
- FE side: `ContactComponent`, `ContactApiService`, template con form reactivo — validado end-to-end
- BE side: `ContactoController` + `ContactoRequestDto` + `ContactoEmailNotifier` — cerrado en branch `chat/681-B-endpoint-contacto` de Educa.API (**no mergeada a `main` de Educa.API todavía** — pendiente de un chat aparte, one-repo-one-chat)

## Hallazgo durante validación end-to-end (fix aplicado en este mismo brief)

Al levantar el FE (`ng serve`) + BE (branch `chat/681-B-endpoint-contacto` local) para validar el punto 1, se encontró que **todas** las rutas públicas — no solo `/contacto` — rompían en runtime con pantalla en blanco + toast "Error de aplicación". Causa raíz: `PublicSeoService.deepestRouteData()` (commit `6e34d903`, punto 3 de este mismo brief) leía `this.route.root` (`ActivatedRoute`, inyectado desde `MainLayoutComponent`) y accedía a `current.snapshot.data`, pero `snapshot` podía ser `undefined` en el momento de construcción del servicio (carrera de timing agravada por el zoneless de brief 680). `TypeError: Cannot read properties of undefined (reading 'data')`.

**Fix**: `deepestRouteData()` ahora usa `this.router.routerState.snapshot.root` (árbol de `ActivatedRouteSnapshot`, síncrono y siempre resuelto) en vez de `this.route` (se eliminó la inyección de `ActivatedRoute`, ya sin uso). Se agregó `public-seo.service.spec.ts` (regresión) cubriendo navegación con y sin `data.seo`.

Validado en navegador tras el fix: home renderiza, `/contacto` renderiza, título de pestaña correcto por ruta, formulario de contacto enviado end-to-end vía UI real (`POST /api/Contacto` → 200, outbox encoló el correo, mensaje "¡Gracias! Tu mensaje fue enviado...' visible in-app).

## Pendiente fuera de este chat (no bloquea cierre de 681)

- Mergear `chat/681-B-endpoint-contacto` a `main` de Educa.API (chat aparte en ese repo, one-repo-one-chat).

## Tiempo estimado

~2h30 (SEO + contacto: completos, con fix de regresión encontrado en validación E2E).
