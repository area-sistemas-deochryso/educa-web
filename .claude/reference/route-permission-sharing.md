# Compartir autorización entre rutas (`data.permissionPath`)

## El mecanismo

`permissionsGuard` (`src/app/core/guards/permissions/permisos.guard.ts`) matchea la
ruta activa contra `vistasPermitidas` (lista plana de `CAP_Ruta` que trae el backend)
con **igualdad exacta de string** — sin prefijos, sin herencia jerárquica. Tener
permiso a `intranet/admin` NO da acceso a `intranet/admin/usuarios` (protegido por
contrato de seguridad INV-S04,
`src/app/core/guards/permissions/permisos-security.contract.spec.ts`).

Por default, `getFullPath()` computa el path a partir de los segmentos de URL. Pero
si CUALQUIER ancestro de la ruta activa (empezando desde la hoja, subiendo por
`route.parent`) declara `data.permissionPath`, el guard usa ESE string tal cual, sin
combinarlo con el resto del árbol — no importa a qué profundidad esté ni qué URL real
tenga la ruta.

## Cuándo usar `permissionPath` vs pedir una `CAP_Ruta` nueva

| Usá `permissionPath` (reusar) cuando... | Pedí `CAP_Ruta` nueva (seed en Educa.API) cuando... |
|---|---|
| La ruta hija es conceptualmente un **tab/vista** de una página ya autorizada, sin acción de negocio que amerite gate propio | La ruta es conceptualmente una **página independiente** (aparece suelta en el menú, no agrupada como tab de otra) |
| No hay endpoint de backend con autorización granular distinta para esa vista | El backend YA expone (o va a exponer) un controller/capability separado para esa función |
| La ruta tiene `:id`/params dinámicos y nunca va a matchear un string fijo en `vistasPermitidas` (ej. `correlation/:id`) | Se necesita auditar/reportar el acceso a esa página por separado (cada `CAP_Ruta` es una fila propia en Permisos por Rol/Usuario) |

## Los 2 patrones de uso (no son lo mismo)

**(a) Compartir — declarás UNA vez en el ancestro, las hijas heredan.**
Cuando 2+ rutas hijas comparten la MISMA autorización, poné `permissionPath` en el
padre/shell y dejá que las hijas lo hereden por el walk-up de `getFullPath()` — no lo
repitas en cada hija. Precedentes: `ayuda` (`intranet.routes.ts`, shell
`AyudaShellComponent`) — el shell declara `permissionPath: 'intranet'`, sus 3 hijas
(`qa`/`ticket`/`salud-sede` en `ayuda.routes.ts`) no declaran nada y heredan
automáticamente. `admin/ayuda/tickets` (`TicketAdminShellComponent`) sigue el mismo
patrón: el shell declara `permissionPath: 'intranet/admin/ayuda/tickets'`, sus 2
hijas (`bandeja`/`tipos` en `ticket-admin.routes.ts`) heredan sin declarar nada.

**(b) Restaurar — una hija necesita SU PROPIA capability pese a un padre compartido.**
Si el padre/shell ya declara un `permissionPath` compartido para su propia activación
"bare", pero las hijas SÍ tienen capabilities individuales distintas, cada hija debe
volver a declarar `permissionPath` explícito (aunque sea igual a su path real) para
no heredar por accidente el del padre. Precedente: `monitoreo.routes.ts`
(`buildDomainChildren`) — el shell `correos`/`incidencias` declara
`permissionPath: 'intranet/admin/monitoreo'`, pero cada tab (`bandeja`, `dashboard`,
etc.) tiene su PROPIA `CAP_Ruta` seedeada — por eso cada uno re-declara
`data: { permissionPath: 'intranet/admin/monitoreo/${domainId}/${slug}' }`, que en
este caso coincide con su path real pero necesita estar explícito.

## Reglas

1. `permissionPath` es invisible para el menú/breadcrumb — `MenuItemDef.route`
   (`intranet-menu.config.ts`) sigue siendo la URL real de navegación. Solo el GUARD
   usa `permissionPath` para decidir autorización.
2. No lo uses para esquivar un caso donde en realidad el negocio SÍ quiere un permiso
   distinto — es una herramienta de "esto es un tab, no una página", no un atajo para
   evitar pedir un seed.
3. Documentá en un comentario, en la declaración de la ruta, CUÁL capability se está
   reusando y por qué (ver ejemplos existentes en `intranet.routes.ts`).
