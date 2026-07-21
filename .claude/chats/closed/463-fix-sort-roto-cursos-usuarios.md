# 463 — Fix sort roto en tabla `admin/cursos` (FE-only)

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-21 · **Modo sugerido**: `/design` primero (confirmar que no hay consumidores dependientes del modo `lazy` actual)
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - `src/app/features/intranet/admin/cursos/**`

## Contexto

Auditoría de las 13 tablas `p-table` con `pSortableColumn` en `src/app/` (2026-07-21, 2 agentes de exploración + 1 de investigación de trade-offs + 1 de auditoría de confirmación). Resultado:

- **2 tablas rotas confirmadas**: `admin/cursos` y `admin/users/usuarios-table`. Ambas en modo `[lazy]="true"` con `onLazyLoad` que solo procesa `first`/`rows` (paginación) e **ignora `sortField`/`sortOrder`** del evento de PrimeNG. Los headers son clicables (ícono de sort visible) pero clickearlos no reordena nada — la UI miente.
- **11 tablas restantes auditadas y confirmadas OK**: todas bindean `[value]` a un array con el dataset COMPLETO (sin paginación server oculta), por lo que el sort nativo client-side de PrimeNG funciona correctamente. No requieren cambios.

**Nota de scope**: el fix de `admin/users/usuarios-table` requiere backend real (paginación SQL con `UNION ALL` de 7 strategies) — no es FE-only, por lo tanto vive como brief cross-repo aparte en `educa-coord/chats/open/464-sort-server-side-usuarios-table.md`. Este brief (463) cubre **solo Cursos**.

## Scope

### `admin/cursos` (`cursos.component.ts`)

**Diagnóstico**: el backend (`CursosController.ListarCursos` → `Educa.API/Controllers/Academico/CursosController.cs:62`) ya trae **todos** los cursos filtrados a memoria (`List<Curso>`) y solo después recorta con `Skip/Take` en memoria (`ToApiResponse`). No hay `ORDER BY` dinámico ni paginación SQL real — el catálogo es chico (decenas de filas).

**Fix recomendado**: quitar `[lazy]="true"` de la tabla y pasar a sort+paginación 100% client-side (mismo patrón que las 11 tablas OK), usando el método `getCursos()` sin `page`/`pageSize` que ya existe en `CursosService`. Esto es **más barato** que implementar sort server-side y reduce trabajo del backend (evita repetir la query completa en cada cambio de página).

**Contra a validar en `/design`**: confirmar que no hay ningún otro consumidor de `cursos.component` que dependa del modo `lazy` actual (paginación con `page`/`pageSize` en la URL, deep-linking, etc.).

## Fuera de alcance

- `admin/users/usuarios-table` — ver `educa-coord/chats/open/464-sort-server-side-usuarios-table.md` (cross-repo, requiere BE).
- Las 11 tablas ya auditadas y confirmadas OK — no tocar.
- Deuda técnica menor detectada pero no rota (documentar, no arreglar en este brief):
  - `vistas.component.ts` usa `BaseCrudFacade`/`PaginatedResult` con un `pageSize` fijado dinámicamente al tamaño real del array filtrado — nunca pagina de verdad. Es indirección confusa pero no bug. Riesgo latente: si a futuro alguien activa `[lazy]` sin ajustar `fetchItems`, reintroduce el mismo bug que cursos/usuarios.
  - `eventos-calendario.service.ts` y `notificaciones-admin.service.ts` exponen parámetros `page`/`pageSize` en `listar()` que sus facades nunca usan (dead capability). Mismo riesgo latente: si alguien los activa sin agregar `[lazy]`, rompe el sort.
  - Sugerencia (no obligatoria en este brief): dejar un comentario en esos 3 archivos o abrir un `tasks/` aparte para eliminar los parámetros no usados / documentar la trampa.

## Criterio de cierre

- [x] `/design` resuelto (contra de arriba validado — no hay consumidores dependientes del modo `lazy`).
- [x] `[lazy]` removido de `cursos.component`, sort+paginación client-side funcionando (verificado en vivo con sesión quick-login "CODE CLAUDE": sort asc/desc en NOMBRE reordena, filtro de búsqueda sigue server-side).
- [x] Build + lint OK (lint ✅, build ✅, 227 archivos/2360 tests ✅).

## Resolución

Enfoque ajustado respecto a la propuesta original del brief: en vez de `getCursos()` sin filtros (que hubiera roto búsqueda/estado/nivel) o `getCursosPaginated` con `pageSize` grande, se extendió `getCursos(search, estado, nivel)` aprovechando que el backend (`CursosController.cs` + `QueryableExtensions.ToApiResponse`) ya devuelve la lista completa filtrada cuando se omiten `page`/`pageSize`. Patrón idéntico al de `vistas.facade.ts` (`fetchItems()` mapea a `PaginatedResult` client-side).

Archivos tocados: `cursos.service.ts`, `cursos.facade.ts` (+ spec), `cursos.component.ts`, `cursos.component.html`.

## Tiempo estimado

Bajo (fix simple, 1 tabla, sin tocar backend).

## Ver también

- `educa-coord/chats/open/464-sort-server-side-usuarios-table.md` — brief hermano cross-repo (Usuarios, requiere BE).
