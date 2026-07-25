# 483 — FE: Admin — CRUD de FAQ + wizard

> **Repo**: `educa-web`
> **Creado**: 2026-07-25 · **Estado**: ✅ cerrado — verificado en vivo
> **Modo sugerido**: `/design` acotado a esta fase → `/execute` → `/validate`
> **Plan**: `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` § F7b
> **Origen**: sesión de definición + diseño del panel de ayuda de la intranet (educa-coord, 2026-07-24/25). F1 (FAQ+Wizard, BE, incluidos los endpoints admin) ya shipped en `Educa.API`. F4 (QA, FE) ya shipped en `educa-web`. `depends_on: [F1]` — no depende de F7a (esa sub-fase es del dominio Ticket, no FAQ).

## OBJETIVO
Construir la vista administrativa de gestión de FAQ: listado (activas e inactivas), crear/editar una FAQ con su wizard asociado opcional (secuencia de pasos texto+imagen), asignación opcional de una capability de gating, y eliminación (soft-delete). Protegida por la capability `AYUDA_MANAGE`.

## PRE-WORK OBLIGATORIO
- Leer `../educa-coord/contracts/api-catalog.md` § Ayuda para el shape de `GET/POST/PUT/DELETE /api/admin/faq*` (incluido el detalle de que `PUT` reemplaza el wizard en bloque y requiere `RowVersion`).
- Leer `Educa.API/.claude/chats/closed/476-be-faq-wizard-panel-ayuda.md` si el catálogo no alcanza en detalle de shape exacto del DTO.
- Investigar cómo otras vistas admin de la intranet resuelven listados con create/edit/delete + gate por capability (ej. gestión de usuarios) para reusar el patrón de tabla + dialog/formulario, no inventar uno nuevo.
- Investigar el componente `FaqListComponent`/`FaqWizardDialogComponent` de F4 (`src/app/features/intranet/pages/cross-role/ayuda/sections/ayuda-qa/`) — la vista admin construye/edita las mismas entidades que esos componentes consumen en modo lectura; puede haber piezas reutilizables (ej. el editor de pasos del wizard, aunque en modo admin es editable, no solo navegable).

## DECISIONES YA TOMADAS (no rediscutir)
- Texto plano para pregunta/respuesta — sin editor WYSIWYG (decisión original de la definición: "solo texto plano es más fácil de mantener").
- Categoría es opcional en la FAQ.
- Wizard es 1:1 opcional — se crea/edita/elimina junto con la FAQ, no como entidad independiente en su propia pantalla.
- Capability de gating es opcional (null = FAQ genérica visible a todos) — el selector debe permitir "sin capability" explícitamente.

## ALCANCE
- Listado admin de FAQ (`GET /api/admin/faq`) con estado activo/inactivo visible, búsqueda/filtro si el catálogo no impone paginación pesada.
- Formulario crear/editar: pregunta, respuesta (texto plano), categoría (opcional), capability de gating (selector, opcional), y editor del wizard asociado (agregar/quitar/reordenar pasos, cada paso con texto + imagen).
- Eliminar (soft-delete) una FAQ, con confirmación.
- Entrada de navegación hacia esta vista desde donde corresponda en la sección admin de la intranet (investigar el patrón de navegación admin existente).
- Gate de acceso a la vista por capability `AYUDA_MANAGE`.

## TESTS MÍNIMOS
- El listado admin muestra FAQ activas e inactivas (a diferencia del listado público de F4 que solo trae activas).
- Crear una FAQ sin wizard funciona (wizard es opcional).
- Crear una FAQ con wizard (2+ pasos) funciona y los pasos se guardan en el orden correcto.
- Editar una FAQ y reemplazar su wizard (agregar/quitar pasos) persiste el reemplazo en bloque.
- Eliminar una FAQ la saca del listado público de F4 sin romper esa sección.
- Un usuario sin `AYUDA_MANAGE` no puede acceder a la vista.
- Crear/editar una FAQ sin capability de gating (null) la deja visible a todos en F4.

## REGLAS OBLIGATORIAS
- No tocar la sección QA pública de F4 (`sections/ayuda-qa/`) más allá de lo estrictamente necesario si se decide reusar algún componente — si hay duda, preferir un componente admin propio antes que acoplar la vista pública a necesidades de edición.
- No implementar CRUD de Ticket ni de Salud de sede en esta fase (briefs separadas).
- Seguir las convenciones ya establecidas por F4/F5/F6 (Angular Signals, patrón facade, `WalFacadeHelper.execute({ consistencyLevel: 'server-confirmed' })` para mutaciones — regla de lint `wal/no-direct-mutation-subscribe`).

## FUERA DE ALCANCE
- CRUD de tipos de ticket y bandeja de tickets — brief separada (484).
- Cualquier cambio a la sección QA pública o al shell de navegación del panel de ayuda.
- Asignación de capabilities nuevas o gestión del catálogo de capabilities en sí (eso ya existe en xrepo-57, esta vista solo selecciona entre las existentes).

## VALIDACIÓN FINAL
- `npm run lint` limpio.
- `npm run build` limpio.
- `npm run test` — tests mínimos de arriba pasando, sin romper la suite existente.
- Verificación en vivo contra `Educa.API` real (TEST DB) antes de cerrar — este brief puede cerrar directo a `closed/` si se verifica en la misma sesión, o a `awaiting-prod/` si se difiere.

## CRITERIOS DE CIERRE
- [x] Validación final (lint/build/test) pasa, incluida verificación en vivo.
- [x] `../educa-coord/plans/xrepo-panel-ayuda-intranet.md` actualizado marcando esta porción de F7b como shipped (FAQ admin).
- [x] Brief movido a `closed/` (o `awaiting-prod/` si se difiere verificación).
- [x] Commit final único: código + move del brief + update del plan en coord (si el flujo del repo lo permite en un solo commit; si no, dos commits atados por referencia).

## COMMIT MESSAGE sugerido
```
feat(educa-web): add admin CRUD view for FAQ + wizard

Implements the AYUDA_MANAGE-gated admin view: list (active +
inactive), create/edit FAQ with optional wizard steps and optional
capability gating, soft-delete. Part of xrepo-panel-ayuda-intranet
F7b.
```

## IMPLEMENTATION DETAIL

- **Files touched** (`educa-web`): nuevo `src/app/features/intranet/pages/admin/ayuda-faq/`
  con `ayuda-faq-admin.component.{ts,html,scss}`, `services/faq-admin.service.ts`,
  `services/faq-admin.facade.ts` (+ `.spec.ts`), `models/faq-admin.models.ts`,
  `components/faq-admin-table/{.ts,.html,.scss}`,
  `components/faq-admin-form-dialog/{.ts,.html,.scss,.spec.ts}`, `index.ts`.
  Modificados: `intranet.routes.ts` (+ruta `admin/ayuda/faq`),
  `shared/config/intranet-menu.config.ts` (+entrada de menú gateada por `AYUDA_MANAGE`),
  `shared/types/capability-codes.generated.ts` (`AYUDA_MANAGE` agregado manualmente —
  el `npm run gen:caps` no la había recogido porque la migración SQL de F1 que la
  siembra no se había corrido en ninguna DB hasta la verificación en vivo de este
  brief). Test nuevo: `shared/config/intranet-menu.config.ayuda-faq.spec.ts`.
- **Interfaces/signatures creadas**: `FaqAdminService.{getAll,getById,crear,actualizar,
  eliminar}`; `FaqAdminFacade.{init,load,setSearchTerm,crear,actualizar,eliminar}` con
  `filteredFaqs` computed (filtro client-side por texto libre — sin endpoint de
  búsqueda propio en `/api/admin/faq`, mismo criterio que `AyudaQaFacade` usó para
  categorías en F4). Mutaciones vía `WalFacadeHelper.execute({ consistencyLevel:
  'server-confirmed', optimistic: { apply: () => {}, rollback: () => {} } })` — el tipo
  `WalMutateConfig` exige `optimistic` incluso en modo server-confirmed (no-op válido
  por diseño, documentado en `wal.models.ts`).
- **Architectural observations**: la vista admin NO reusa `FaqListComponent` ni
  `FaqWizardDialogComponent` de F4 — ambos son de solo lectura (el wizard público es un
  `p-stepper` navegable, no editable) y construir un componente admin propio evitó
  acoplar la sección pública a necesidades de edición (regla obligatoria de este
  brief). El editor de pasos del wizard admin es un formulario plano (texto +
  imagenUrl por fila, reordenable con flechas arriba/abajo), no un stepper — edición y
  navegación son interacciones distintas. `PUT` reemplaza el wizard en bloque: el
  formulario siempre envía el array completo de pasos vigente en memoria (sin diffing
  contra el servidor), como especifica el contrato del BE.
- **Ruta y gate**: la ruta `admin/ayuda/faq` fue elegida para coincidir exactamente con
  la capability `AYUDA_MANAGE` seed en
  `Educa.API/Migrations/Manual/20260724_CreateFaqWizardTables.sql` (`CAP_Ruta =
  'intranet/admin/ayuda/faq'`) — el `permissionsGuard` genérico ya la resuelve sin
  código nuevo de guard. La entrada de menú usa el mismo mecanismo genérico
  (`userCapabilities.has('AYUDA_MANAGE')`, ver `intranet-menu.config.ts`).
- **Current state**: `npm run lint` limpio, `npm run build` limpio, `npm run test`
  239/239 archivos y 2416/2416 tests verdes (+3 archivos / +17 tests sobre el baseline
  post-F6 de 236/2399, sin regresiones).

## VERIFICACIÓN EN VIVO

Levantado `Educa.API` (puerto 5139, TEST DB) + `educa-web` (puerto 4210, dev server
propio para no chocar con el worktree paralelo de 484 que ya ocupaba 4201/4202) y
logueado como "CODE CLAUDE" (rol Administrador) vía el switcher de sesiones guardadas
en `/intranet/login`. Flujo probado end-to-end contra la TEST DB real:

1. Navegación a `/intranet/admin/ayuda/faq` — acceso permitido (capability
   `AYUDA_MANAGE` ya concedida a Administrador), breadcrumb "Administrador > Gestión >
   FAQ (Ayuda)" y entrada de menú visibles — confirma que la tabla `Faq` +
   `AYUDA_MANAGE` ya estaban migradas/seedeadas en la TEST DB (GET admin devolvió 200
   con lista vacía, no 500).
2. **Crear FAQ con wizard de 2 pasos**: formulario completo (pregunta, respuesta,
   categoría, capability=null, wizard con 2 pasos en orden) → `POST` exitoso, toast
   "FAQ creada", fila nueva en la tabla admin con "2 pasos" y estado "Activa".
3. **Visible en la sección pública (F4)** sin capability de gating: navegado a
   `/intranet/ayuda/qa`, la FAQ recién creada aparece en el listado público — confirma
   que `capabilityId: null` la deja visible a todos.
4. **Editar con reemplazo de wizard en bloque**: abierto el dialog de edición
   (prefill correcto de todos los campos + los 2 pasos existentes), quitado el paso 1
   (renumeración automática confirmada), agregado un paso nuevo → `PUT` exitoso, toast
   "FAQ actualizada", la tabla sigue mostrando "2 pasos" (el wizard viejo fue
   reemplazado, no mergeado).
5. **Eliminar con confirmación**: click en eliminar → dialog de confirmación con el
   mensaje "Dejará de estar visible en la sección pública de ayuda" → confirmado →
   `DELETE` exitoso, toast "FAQ eliminada", tabla admin vuelve a "No hay FAQ
   registradas.".
6. **Verificado que la sección pública no se rompió**: vuelto a `/intranet/ayuda/qa`
   tras el delete — la FAQ ya no aparece, sección renderiza sin errores ("No hay
   preguntas frecuentes para este filtro.").

No se verificó en vivo el caso "usuario sin `AYUDA_MANAGE` no puede acceder" con un
segundo usuario real (no había una sesión guardada sin esa capability a mano) — cubierto
en cambio por el mecanismo genérico de `permissionsGuard` (ya probado por la suite
existente, `guard-permisos.integration.spec.ts`) más el test de contrato agregado en
`intranet-menu.config.ayuda-faq.spec.ts` que fija que la entrada requiere
`AYUDA_MANAGE`.

## CIERRE
Al cerrar, pedir feedback sobre: si algún componente de la sección QA pública (F4) se pudo reusar en modo admin sin fricción, o si terminó siendo más simple construir componentes admin propios desde cero.

**Respuesta**: se optó por construir componentes admin propios desde cero sin fricción
— ningún componente de F4 (`FaqListComponent`, `FaqWizardDialogComponent`) se reusó. La
razón no fue dificultad técnica sino de diseño: ambos son de solo lectura por
naturaleza (el wizard público es un stepper de navegación, no un editor), y forzar
edición dentro de esos componentes habría acoplado la sección pública a necesidades
admin. Construir `FaqAdminTableComponent`/`FaqAdminFormDialogComponent` propios,
siguiendo el patrón de `BlacklistCrudFacade`/`BlacklistTabComponent` (facade + WAL +
`ConfirmationService`) en vez del `BaseCrudFacade` paginado de `usuarios`, resultó más
simple porque el dataset de FAQ es pequeño (sin paginación server-side) — el patrón
liviano encajó mejor que el pesado.
