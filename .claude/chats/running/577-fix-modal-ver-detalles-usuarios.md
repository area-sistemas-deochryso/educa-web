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
