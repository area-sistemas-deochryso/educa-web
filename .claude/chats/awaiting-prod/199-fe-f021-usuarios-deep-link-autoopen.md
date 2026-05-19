# Brief 199 — F-021 · Deep-link `/intranet/admin/usuarios?dni=X&autoOpen=true` no filtra ni abre drawer

> **Creado**: 2026-05-19 · **Estado**: ⏳ pendiente arrancar · **Modo sugerido**: `/execute`
> **Repo**: `educa-web` (FE)
> **Severidad**: Alto
> **Origen**: Cowork BD-PROD-RO 2026-05-19 — brief 147 G.3 verificación post-deploy. Ver `claude-cowork/reporte-cowork-2026-05-19.md` §2 F-021.

## Síntoma

Navegar a `https://educa.com.pe/intranet/admin/usuarios?dni=74125896&autoOpen=true` aterriza con:

- Tabla mostrando las 10 filas default (no filtrada al DNI).
- Input "Buscar por ID, nombre, DNI o correo..." vacío.
- Drawer del usuario cerrado (count de `role=dialog` = 0).

El flujo end-to-end desde auditoría (módulo de logs/eventos) → usuarios con deep-link queda roto. El brief 147 G.3 había declarado este flujo como completado; el deploy 2026-05-19 muestra que los query params nunca se consumen.

## Reproducir

1. Login Director en prod (o local).
2. Navegar manualmente a `/intranet/admin/usuarios?dni=74125896&autoOpen=true`.
3. Esperar 5s — la tabla termina de cargar con todas las filas, ningún drawer abierto.

## Causa probable

El componente que renderiza `/intranet/admin/usuarios` (page admin) no lee los query params `dni` y `autoOpen` en su `ngOnInit`. La feature G.3 del brief 147 quedó stubeada o nunca se cableó al `ActivatedRoute`.

## Sugerencia de fix

En el componente Usuarios page:

```typescript
ngOnInit() {
  // ... lógica existente
  const dni = this.route.snapshot.queryParamMap.get('dni');
  const autoOpen = this.route.snapshot.queryParamMap.get('autoOpen') === 'true';

  if (dni) {
    this.searchControl.setValue(dni, { emitEvent: true });
  }

  if (autoOpen && dni) {
    // esperar a que la lista cargue y haya 1 match
    this.usuariosLista$
      .pipe(filter(rows => rows.length === 1), take(1))
      .subscribe(rows => this.abrirDrawer(rows[0]));
  }
}
```

Edge cases:

- 0 matches → no abrir drawer (no hay a quién mostrar).
- 2+ matches → filtrar pero no abrir (ambiguo, dejar que el usuario elija).
- `autoOpen=true` sin `dni` → ignorar (no hay target).
- Volver a navegar al mismo URL → debe reabrir el drawer (no quedar atrapado en estado previo).

## Verificación

Test de integración con `RouterTestingHarness`:

- Setear ruta `?dni=74125896&autoOpen=true` con lista mock que contenga 1 fila con ese DNI → debe filtrar input + abrir drawer del usuario.
- Setear ruta `?dni=00000000&autoOpen=true` con lista mock vacía para ese DNI → debe filtrar input pero NO abrir drawer.
- Setear ruta sin query params → comportamiento default (lista paginada sin filtros).

Smoke browser post-deploy:

1. Login Director.
2. Navegar a auditoría/logs y click en chip "DNI 74125896".
3. Confirmar que llega a `/intranet/admin/usuarios?dni=74125896&autoOpen=true` con la fila filtrada y el drawer abierto en datos del usuario.

## Archivos esperados

- `src/app/features/intranet/pages/admin/usuarios/usuarios.component.ts` (o equivalente) — consumir query params.
- Test de integración en `usuarios.component.spec.ts`.

## Dependencias

Ninguna. Cambio FE puro. Sale a awaiting-prod tras deploy a Netlify y se verifica en próxima sesión Cowork.

## Plan asociado

Plan 43 Chat 2.1 (FE remaining) — el G.3 del brief 147 vuelve aquí como F-021. El brief 147 queda en `awaiting-prod/` con anotación de regresión hasta que F-021 cierre.

---

## 🔎 Investigación 2026-05-19 (handoff)

> Investigado en chat read-only sin cambios al código. Resumen para que el próximo chat decida con contexto antes de `/execute`.

### Lo que el código ya hace (no es lo que el brief asume)

**Archivos relevantes**:

- [src/app/features/intranet/pages/admin/users/usuarios.component.ts:139-157](src/app/features/intranet/pages/admin/users/usuarios.component.ts#L139-L157) — constructor invoca `readAutoOpenQueryParams` + `effect` que matchea y abre dialog.
- [src/app/features/intranet/pages/admin/users/helpers/auto-open-from-query.helper.ts](src/app/features/intranet/pages/admin/users/helpers/auto-open-from-query.helper.ts) — helper de parseo.
- [src/app/features/intranet/pages/admin/auditoria-correos/services/auditoria-correos.facade.ts:88-94](src/app/features/intranet/pages/admin/auditoria-correos/services/auditoria-correos.facade.ts#L88-L94) — quien genera el deep-link real.

**Contrato actual implementado** (helper líneas 21-29):

```text
?autoOpen=true&openUserId=<id>&openUserRol=<rol>&openUserName=<nombre>
```

- Lee `autoOpen` (debe ser literal `'true'`), `openUserId` (entero), `openUserRol`, `openUserName`.
- Si `name` está presente → llama `setSearchTerm(name)` para que el listado filtre.
- Devuelve `{ id, rol }` como target; un `effect` matchea contra `vm().usuarios` y dispara `uiFacade.editUsuario(match)`.
- NO lee `dni`. NO existe lookup por DNI.

**Quién emite el link real**: `auditoria-correos.facade.ts:onAbrirUsuario` arma exactamente esos 4 params (no `dni`). Ese flujo funciona correctamente.

### Por qué Cowork reportó "no funciona"

Cowork navegó **manualmente** a `?dni=74125896&autoOpen=true`. Esa URL **no es el contrato** que emite la app — la URL real desde auditoría → usuarios es `?autoOpen=true&openUserId=N&openUserRol=...&openUserName=...`. El brief 147 G.3 nunca creó la rama `?dni=X`.

El test de regresión real es: hacer el flujo end-to-end **desde `/intranet/admin/auditoria-correos`** clickeando el item afectado, no escribir la URL a mano.

### Decisión necesaria antes de `/execute`

**Opción A — Extender contrato (recomendada si querés DNI como deep-link humano-friendly)**:

Agregar al helper rama `?dni=X[&autoOpen=true]` que:

1. Filtre por DNI vía `setSearchTerm(dni)`.
2. Si `autoOpen=true` + lista cargada → tomar la única coincidencia (si hay exactamente 1) y abrir dialog.
3. Si 0 matches o 2+ matches → solo filtrar, no abrir.

Casos edge ya cubiertos en el brief (líneas 51-56).

Estimado: 1 sub-chat FE pequeño (~80 ln helper + ~20 ln cambios en component + tests). Sin BE.

**Opción B — Cerrar como falso positivo**:

El test de Cowork fue contra un contrato que nunca existió. El flujo real `auditoría-correos → usuarios` funciona. Actualizar el doc Cowork con la URL correcta para futuras verificaciones.

Costo: 5 min de doc + cerrar brief 199 + reverificar brief 147 G.3 con la URL correcta.

### Recomendación

**Opción A**. Razón: el contrato `?dni=` es más natural para humanos pegando URLs (ej: copiar DNI de un correo y armar URL manual), y deja a futuro la posibilidad de que otras fuentes (chat, foro, notification email) emitan links sin tener que conocer `openUserId/openUserRol`. La implementación es chica y el riesgo bajo. Mantener compatibilidad con el contrato actual `openUserId/...` (no romper auditoría).

### Archivos a tocar (Opción A)

- `helpers/auto-open-from-query.helper.ts` — agregar rama DNI + tests del helper.
- `usuarios.component.ts` — sin cambios estructurales si el helper devuelve el mismo `AutoOpenTarget`. Posiblemente extender el target a `{ id, rol } | { dni }`.
- `services/usuarios-data.facade.ts` — confirmar que `setSearchTerm(dni)` ya filtra contra `dni` (verificar campo `searchTerm` del store contra qué columnas filtra).

### Verificación post-fix

- Manual: `?dni=74125896&autoOpen=true` con director logueado → filtra + abre.
- Manual: `?dni=74125896` sin `autoOpen` → filtra, no abre.
- Manual: `?dni=00000000&autoOpen=true` (no existe) → filtra, no abre.
- Manual: `?dni=12345678&autoOpen=true` con 2+ matches (poco probable, DNI único) → filtra, no abre.
- E2E original: flujo desde `/intranet/admin/auditoria-correos` click item → sigue funcionando con `openUserId/openUserRol/openUserName`.
- Test: ampliar `usuarios.component.spec.ts` (si existe) o agregar test del helper.

### Estado al cerrar el handoff

Chat de investigación cerrado read-only. Brief 199 queda en `chats/open/` con esta sección anexada. Próximo `/start-chat 199` arranca con `/design` (confirmar Opción A/B con usuario) → `/execute`.
