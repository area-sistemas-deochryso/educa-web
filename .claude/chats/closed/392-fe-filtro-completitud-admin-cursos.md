---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/cursos/]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: — · **Chat**: — · **Fase**: — · **Creado**: 2026-08-19 · **Estado**: ⏳ pendiente.

---

# Filtro por completitud en `/intranet/admin/cursos`

## OBJETIVO

La tabla de `/intranet/admin/cursos` ya muestra una columna "COMPLETITUD" con badges (`Completo` / `Sin horario` / `Sin profesor` / `N conflicto(s)`) calculados a partir de `CursoCompletitud` (P84 F3), pero no hay forma de filtrar la tabla por ese estado — solo existen filtros de texto, Estado y Nivel educativo. Agregar un `p-select` de completitud junto a los filtros existentes.

**Diseño ya cerrado** (ver detalle completo abajo) durante una sesión de investigación+diseño en `educa-coord`. Este brief es la aplicación directa de ese diseño — no requiere `/design` adicional, solo confirmar que el código no cambió desde entonces.

## MODO SUGERIDO

`/investigate` corto (confirmar que `cursos.store.ts` / `cursos.facade.ts` / `cursos.component.ts(.html)` no cambiaron respecto al diseño de abajo) → `/execute` directo con el diseño ya especificado → `/validate`.

## PRE-WORK OBLIGATORIO

Releer los 4 archivos tocados antes de tocarlos — el diseño se armó sobre una lectura puntual, puede haber drift.

## ALCANCE

Filtro **100% client-side** (no pega al backend, a diferencia de "Estado" y "Nivel" que sí filtran server-side): tanto `vm().cursos` como `vm().completitudPorCurso` ya llegan completos en `loadAll()`, y el paginator de `p-table` es client-side.

### 1. `cursos.store.ts`

- Nuevo signal `_filterCompletitud = signal<'completo' | 'incompleto' | 'sin-horario' | 'sin-profesor' | 'con-conflictos' | null>(null)`.
- `setFilterCompletitud(valor)`.
- Reset en `onClearFiltros()`.
- Nuevo computed `cursosFiltrados`:

```ts
readonly cursosFiltrados = computed(() => {
	const filtro = this._filterCompletitud();
	if (!filtro) return this.items();

	return this.items().filter((curso) => {
		const c = this.completitudPorCurso().get(curso.id);
		if (!c) return false;

		const esCompleto = c.tieneHorario && c.tieneProfesorAsignado && c.cantidadConflictos === 0;

		switch (filtro) {
			case 'completo': return esCompleto;
			case 'incompleto': return !esCompleto;
			case 'sin-horario': return !c.tieneHorario;
			case 'sin-profesor': return c.tieneHorario && !c.tieneProfesorAsignado;
			case 'con-conflictos': return c.cantidadConflictos > 0;
		}
	});
});
```

- `dataVm.cursos` pasa de `this.items()` a `this.cursosFiltrados()`.
- Exponer `filterCompletitud` en `uiVm`.

Cursos sin entrada en `completitudPorCurso` (dato no cargado, hoy muestran `—` en la columna) se excluyen de cualquier filtro que no sea "Todos".

### 2. `cursos.facade.ts`

- `setFilterCompletitud(valor: ...)`: solo delega a `this.store.setFilterCompletitud(valor)`. **Sin** `refreshItemsOnly()` — no hay refetch, es client-side (a diferencia de `setFilterNivel`, que sí hace refetch por ser server-side).

### 3. `cursos.component.ts`

- Nuevo array `completitudOptions`:

```ts
readonly completitudOptions = [
	{ label: 'Todos', value: null },
	{ label: 'Completo', value: 'completo' },
	{ label: 'Incompleto', value: 'incompleto' },
	{ label: 'Sin horario', value: 'sin-horario' },
	{ label: 'Sin profesor', value: 'sin-profesor' },
	{ label: 'Con conflictos', value: 'con-conflictos' },
];
```

- `onFilterCompletitudChange(valor)` → `this.facade.setFilterCompletitud(valor)`.

### 4. `cursos.component.html`

- Nuevo `<p-select>` junto al de "Nivel educativo" (mismo patrón: `[options]`, `[ngModel]="vm().filterCompletitud"`, `(ngModelChange)`, `appendTo="body"`, `data-info-anchor`).

## REFERENCIA — patrón similar ya implementado

El módulo de Horarios (`schedules/`) ya tiene un filtro de completitud análogo ("Sin profesor / Sin estudiantes") implementado **inline** en `horarios.component.html` con `p-select` — mismo patrón a seguir aquí. Ver brief cerrado [`391-fe-remove-dead-horarios-filters-component.md`](../closed/391-fe-remove-dead-horarios-filters-component.md) para contexto de por qué es inline y no un componente dedicado.

## TESTS MÍNIMOS

- `bun run lint` sin nuevos errores.
- `bun run build` sin errores.
- Manual en navegador: cargar `/intranet/admin/cursos`, probar cada opción del nuevo filtro contra los cursos visibles en el screenshot original (ej: "Arte", "Biología", "Caligrafía" → todos "Sin horario" en la captura original — confirmar que el filtro "Sin horario" los muestra y "Completo" los excluye).

## REGLAS OBLIGATORIAS

- No agregar refetch al backend para este filtro — es client-side por diseño (`completitudPorCurso` y `items()` ya están completos en memoria).
- Reusar `completitudPorCurso()` existente, no duplicar la lógica de completitud del template (`cursos.component.html:159-191`) en el store — la condición de "completo" debe calcularse en un solo lugar idealmente, pero si se duplica entre store y template, dejarlo documentado como deuda menor (no bloquea el cierre).

## FUERA DE ALCANCE

- Cambiar el cálculo de `CursoCompletitud` en el backend.
- Tocar el filtro análogo de `schedules/` (`horarios.component.html`) — es solo referencia de patrón.
- Paginación server-side para `cursos` (sigue siendo client-side, sin cambios).

## VALIDACIÓN FINAL

- `bun run lint` — 0 errores.
- `bun run build` — sin errores.
- Prueba manual en `/intranet/admin/cursos` con las 6 opciones del nuevo filtro.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único.

## COMMIT MESSAGE sugerido

```
feat(admin-cursos): add completitud filter to cursos list

Client-side filter (Completo/Incompleto/Sin horario/Sin profesor/Con
conflictos) reusing the existing CursoCompletitud data already loaded
per row — no backend changes needed.
```

## CIERRE

Chat corto y autocontenido — diseño ya cerrado, solo falta ejecutar.
