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
