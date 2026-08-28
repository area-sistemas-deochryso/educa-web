> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 103 (coord) · **Fase**: F1 · **Creado**: 2026-08-21 · **Estado**: ⏳ abierto.

---

# 577 — Fix: modal "Ver detalles" no abre en /intranet/admin/usuarios

## Contexto

En `/intranet/admin/usuarios`, la acción "Ver detalles" de una fila dispara la apertura del modal, pero este se cierra inmediatamente — apenas empieza a abrirse. Reportado por el usuario 2026-08-20 durante uso real.

## Qué investigar

- Handler de click-outside/overlay disparándose en el mismo evento que abre el modal.
- Conflicto de z-index/orden de montaje con otro overlay activo en la tabla (filtros, FAB, tooltips).
- Doble binding del evento de apertura (abre y cierra en el mismo ciclo de detección de cambios).

## Done-when

- El modal "Ver detalles" abre y permanece abierto hasta que el usuario lo cierre explícitamente, verificado en vivo en `/intranet/admin/usuarios`.

## Plan cross-repo

[`educa-coord/plans/xrepo-103-bug-modal-ver-detalles-usuarios.md`](../../../../educa-coord/plans/xrepo-103-bug-modal-ver-detalles-usuarios.md)

## Hallazgo (2026-08-28)

**Reproducido en vivo contra `educa.com.pe/intranet` real** (cuenta CODE CLAUDE, Administrador), 2/2 intentos. Instrumentando un `MutationObserver` + hooks de `console.error`/`unhandledrejection` antes del click: el nodo `p-drawer` nace **ya con clases de animación "leave"** (`p-drawer-leave-right p-leave-to`) en vez de "enter", y se remueve del DOM ~500-800ms después — sin ningún error en consola ni `unhandledrejection`. Esto confirma la hipótesis 3 del brief: el signal `visible` pasa a `true` y casi inmediatamente vuelve a `false` en el mismo ciclo, tan rápido que Angular Animations nunca llega a reproducir la transición de entrada.

**No reproduce en el build local con `edu-ui`** (worktree de este brief, basado en `main`, que ya incluye el swap 588): mismo flujo probado 8+ veces (roles admin/asistente/estudiante, tabs, clicks simples y rápidos, con Service Worker activo vía `start:prod`) — el drawer abre y permanece abierto siempre.

`usuarios-ui.facade.ts` y `usuarios.store.ts` son **byte-idénticos** entre el commit pre-swap (`27408cdd`) y `main` actual — el único cambio real es `p-drawer` (PrimeNG) → `edu-drawer` (CDK propio). El bug es específico del componente `Drawer` de PrimeNG 21 (probablemente una colisión entre el ciclo de animación de PrimeNG y el patrón async-then-open del facade), no del código de la app.

**Conclusión**: el swap a `edu-ui` (588, mergeado a `main`, pendiente solo de desplegar) ya resuelve este bug como efecto colateral — no hace falta un fix propio en PrimeNG (librería que se está retirando). Recomendación: cerrar 577 sin código adicional, verificar en el post-deploy de 588.
