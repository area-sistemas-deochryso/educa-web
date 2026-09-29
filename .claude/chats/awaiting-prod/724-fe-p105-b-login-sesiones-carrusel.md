# 724 — P105-B — Login: carrusel vertical de sesiones guardadas

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo/100-119/xrepo-105-backlog-ux-sesion-20260820.md` (idea B)
> **Created**: 2026-09-29 · **Estado**: ✅ implementado, validación prod pendiente.
> **MODO SUGERIDO**: `/design` (el plan P105 exige diseño antes de ejecutar; luego `/execute`)
> **exclusive**: `false`
> **modules**: `auth`
> **touches**:
>   - `educa-web`: `src/app/features/**/login/**` (switcher de sesiones guardadas)

## Scope

### educa-web
- Reemplazar el listado de sesiones guardadas por un rollo/carrusel vertical con altura acotada, para que no crezca sin límite con más cuentas.
- `/design`: decidir mecanismo (scroll snap, flechas, edu-ui CDK) y accesibilidad por teclado.

## Pre-work

- Leer `.claude/rules/browsing.md`: el switcher es la vía de login de QA; no debe romperse el click único en la cuenta guardada.

## Out of scope

- Cambios al almacenamiento de sesiones o a la autenticación. Puramente FE.

## Criterio de cierre

- [ ] `/design` resuelto y decisiones registradas en el brief antes de escribir código.
- [ ] FE: lint + build + tests OK, comportamiento verificado en vivo (local + BBDD de prueba).
- [ ] El click en una sesión guardada sigue iniciando sesión sin pedir credenciales.
- [ ] `plans/maestro.md` y fila de la idea B en el plan P105 actualizados.

## Tiempo estimado

~1 h.

## Decisiones de /design (2026-09-29)

- **Mecanismo**: contenedor `.sessions-scroll` con scroll vertical nativo + `scroll-snap-type: y proximity`. Sin flechas ni CDK: menos código, rueda/touch/teclado funcionan gratis.
- **Altura**: `max-height` ≈ 3,5 tarjetas (`15.5rem`); la cuarta tarjeta cortada a la mitad avisa que hay más. Con ≤3 sesiones no hay cambio visible.
- **Teclado/a11y**: los botones de cada tarjeta ya son focusables y el navegador hace scroll al foco; el contenedor es `role="region"` + `aria-label` + `tabindex="0"` para scrollear con flechas.
- **Clip de hover**: `padding` interno en el scroller para que no se recorte el `box-shadow` de la tarjeta.
- **Intacto**: `quickLogin(session)` y `removeSession`; "Usar otra cuenta" queda fuera del scroller.

## Cierre

> **Validación prod**: ⏳ pendiente desde 2026-09-29

- Lint, 23 tests (login + integración) y `ng build`: OK.
- Pendiente: verificar en `/intranet/login` con ≥4 sesiones guardadas que el scroll/snap se ve bien, el hover no se recorta y el click único en una sesión guardada sigue iniciando sesión.
- Derivado: Prettier reformateó `transition` en el SCSS (ruido menor en el diff).
