# 681 — Audit F7: Sitio público — formulario de contacto + meta tags SEO

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F7)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
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

- [ ] Punto 1: decisión de diseño confirmada, formulario funciona sin salir de la SPA, feedback de éxito/error visible in-app.
- [ ] Punto 2: `required` agregado o justificado.
- [ ] Punto 3: las 9 páginas públicas tienen `description`/OG/`canonical` propios, verificado inspeccionando el DOM renderizado (SSR) de cada ruta.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F7 → ✅.
- [ ] Maestro actualizado.

## Bloqueo arquitectónico (resuelto)

✅ **SEO (Puntos 2-3)** — COMPLETO y commiteado:
- `PublicSeoService`: suscribe a `NavigationEnd`, lee `route.data['seo']`, actualiza Meta tags dinámicos + canonical
- Todas 9 rutas públicas tienen `data.seo` con description, og:title, canonical
- Validación: lint ✅, TypeScript build ✅

⏳ **Contacto (Punto 1)** — BLOQUEADO por brief 681-B (backend):
- Arquitectura elegida: POST `/api/Contacto` (endpoint backend, no Formspree)
- FE side **listo**: `ContactComponent`, `ContactApiService`, template con form reactivo
- BE side **pendiente**: POST `/api/Contacto` controller + DTO en Educa.API
- Archivos FE (contacto) están uncommitted, esperan merge de 681-B
- Referencia cruzada: [`educa-coord/chats/open/681-B-...md`](../../../../educa-coord/chats/open/) (por crear)

**Coordinación**: 681-B closes → 681 FE resumes con end-to-end validation → ambos merge.

## Tiempo estimado

~2h30 (SEO ✅; contacto validación pend. 681-B).
