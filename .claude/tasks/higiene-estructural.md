# Higiene Estructural — Segunda Pasada

> **Estado**: Aprobado, listo para ejecutar
> **Semana objetivo**: 7-11 abril 2026
> **Origen**: Auditoría cruzada Codex + Claude (2026-04-07)
> **Predecesor**: `refactor-organizacion.md` (completado 2026-03-28, archivado en `history/`)

---

## P1 — Alta prioridad

### 1. Auditar `shared/` y mover lo que solo usa intranet

`src/app/shared/` mezcla componentes verdaderamente reutilizables con cosas que solo consume `features/intranet/`.

**Decisiones tomadas:**
- Crear `features/intranet/shared/` con alias `@intranet-shared/*` en `tsconfig.json`
- Dependencias cross-boundary naturales son OK (ej: `intranet/shared/` importa de `shared/`)
- Barrel exports temporales en `shared/index.ts` apuntando a nueva ubicación (migración gradual)
- Archivos >300 líneas encontrados se registran en task separado, no se refactorizan aquí

**Items a mover a `features/intranet/shared/`** (verificados con grep — 0 consumidores fuera de intranet):

| Tipo | Items |
|------|-------|
| **Componentes** | `floating-notification-bell`, `form-error`, `form-field-error`, `login`, `offline-indicator`, `page-header`, `responsive-table`, `stats-skeleton`, `sync-status`, `table-skeleton`, `voice-button`, `layout/intranet-layout` |
| **Servicios** | `calificacion-config` |
| **Directivas** | `drag-drop`, `table-loading`, `uppercase-input` |
| **Pipes** | `estado/*` (4 pipes), `format-file-size`, `format-time`, `initials`, `seccion-label` |
| **Config** | `intranet-menu.config.ts` |

**Items que se quedan en `shared/`** (usados por public, root o core):
- `devtools`, `rate-limit-banner`, `toast-container` (root-level)
- `main-layout` (public/auth routes)
- `sections/*` (public home page)
- `skeleton-loader` (primitiva base, cross-boundary OK)
- `asistencia/` service (exportado vía core)

**Plan de ejecución:**
1. Crear `features/intranet/shared/` con subcarpetas: `components/`, `services/`, `directives/`, `pipes/`, `config/`
2. Agregar alias `@intranet-shared` en `tsconfig.json`
3. Mover por lotes (componentes → servicios → directivas → pipes → config)
4. En cada lote: mover archivos, actualizar imports, agregar re-export temporal en `shared/`, verificar build + lint
5. Actualizar barrel exports (`index.ts`) en ambas ubicaciones

**Nota**: Si dos items que se mueven se importan entre sí (ej: `login` importa `form-error`), moverlos en el mismo lote para evitar imports rotos intermedios.

**Barrels clave a editar** (re-exports temporales):
- `src/app/shared/index.ts` — barrel raíz
- `src/app/shared/components/index.ts` — componentes
- `src/app/shared/services/index.ts` — servicios
- `src/app/shared/directives/index.ts` — directivas
- `src/app/shared/pipes/index.ts` — pipes
- Cada item tiene su propio `index.ts` interno que se mueve con él.

**Regla post-tarea** (agregar a `architecture.md`):
> `src/app/shared/` = usado por public + intranet (o por 2+ features independientes).
> `features/intranet/shared/` = usado por 2+ pages de intranet pero no por public.

---

### 2. Documentar estrategia de acceso a datos

Coexisten `BaseRepository` en `@data/repositories/` y `*.service.ts` con `HttpClient` directo.

**Hallazgo**: `BaseRepository` tiene **0 consumidores reales**. Sus 2 implementaciones (`UserRepository`, `NotificationRepository`) no se inyectan en ningún servicio. Solo `PaginatedResponse` se importa como tipo. Los 21 feature services usan `HttpClient` directo — es el patrón de facto.

**Decisión**: No migrar ni eliminar nada. Solo documentar la realidad. Los repositories quedan registrados en task de revisión separado.

**Regla post-tarea** (agregar a `architecture.md`, sección "Capa de datos"):
> **Patrón estándar**: Feature service (`*.service.ts`) con `HttpClient` directo para API específica del feature.
> **`@data/repositories/`**: Existe para CRUD genérico compartido, pero actualmente sin consumidores activos. Ver task `revision-codigo-muerto.md` para decisión pendiente.

---

## P2 — Media prioridad

### 3. Renombrar `features/intranet/pages/shared` → `pages/cross-role`

El nombre "shared" dentro de "pages" genera ambigüedad con `src/app/shared/`. Contiene home, attendance, calendar, reportes — pages compartidas entre roles de intranet.

**Nombre elegido**: `cross-role` — explicita que son pages accesibles por múltiples roles.

**Plan:**
1. Rename carpeta `pages/shared/` → `pages/cross-role/`
2. Actualizar `intranet.routes.ts` (lazy imports)
3. Actualizar cualquier import que referencie la ruta anterior
4. Verificar build

**Impacto**: Bajo. Solo renombra una carpeta y actualiza paths.

---

### 4. Evaluar organización de asistencia en frontend

**Hallazgo**: ~5,600 líneas TS en 4 subdominios (diaria, curso, admin, reportes). Ya tiene separación parcial pero con problemas de navegabilidad:

| Problema | Detalle |
|----------|---------|
| **No hay claridad de pertenencia** | Los archivos no dejan claro a qué ruta/página pertenecen ni desde dónde son llamados |
| **Inconsistencia idiomática** | `asistencia-*` (español) vs `attendance-*` (inglés) mezclados en carpetas y archivos |
| **3 archivos >300 líneas** | `attendance-view.service.ts` (531), `attendance-director.component.ts` (432), `director-asistencia-api.service.ts` (363) |
| **Reportes sin ruta propia** | `reportes-asistencia/` está implementado pero se invoca desde otro lugar, no es una ruta directa |

**Decisión**: NO refactorizar asistencia en esta tarea. Solo evaluar y documentar hallazgos. Los problemas concretos se derivan a tasks separados:
- Inconsistencias idiomáticas → `task: normalizacion-idiomatica.md`
- Archivos grandes → `task: archivos-grandes-refactor.md`
- Claridad de pertenencia → se aborda cuando se toque asistencia, documentando la estructura esperada

**Evaluación post-tarea** (documentar en `architecture.md` o en el task de asistencia):
> Asistencia tiene 4 subdominios: diaria (cross-role), curso (profesor), admin (director), reportes (cross-role).
> La separación física actual es parcial — admin y reportes tienen carpetas propias, diaria y curso están mezclados con otros archivos del rol.

---

## P3 — Baja prioridad (no ejecutar esta semana)

### 5. Evaluar organización vertical del backend

**Decisión**: Diferido. El backend no tiene el mismo dolor que el frontend actualmente.

---

## Tasks derivados (crear como archivos separados)

| Task | Origen | Contenido |
|------|--------|-----------|
| `revision-codigo-muerto.md` | P1.1 audit | Código muerto en shared/ (6 componentes, 1 directiva, 1 pipe, 1 servicio) + BaseRepository sin consumidores |
| `normalizacion-idiomatica.md` | P2.4 eval | Inconsistencias español/inglés en asistencia (carpetas, archivos, componentes) |
| `archivos-grandes-refactor.md` | P1.1 + P2.4 | Archivos >300 líneas encontrados durante auditoría |

---

## Checklist de cierre

```
[x] Tasks derivados creados (3 archivos .md)
[x] P1.1: Alias @intranet-shared agregado a tsconfig.json
[x] P1.1: shared/ auditado, items intranet-only movidos a features/intranet/shared/
[x] P1.1: Re-exports temporales en shared/index.ts funcionando
[x] P1.2: Regla de repositories vs services documentada en architecture.md
[x] P1.1+P1.2: Regla shared/ vs intranet/shared/ documentada en architecture.md
[x] P2.3: pages/shared renombrado a pages/cross-role
[x] P2.4: Asistencia frontend evaluada, hallazgos documentados
[x] Build pasa sin errores tras cada cambio
[x] Lint pasa sin errores nuevos
```

## Orden de ejecución y paralelismo

### Fase 1 — Setup (secuencial, un solo agente)

| Paso | Tarea | Por qué secuencial |
| --- | --- | --- |
| 1.1 | Crear carpeta `features/intranet/shared/` con subcarpetas | Prerequisito de todo lo demás |
| 1.2 | Agregar alias `@intranet-shared` en `tsconfig.json` | Prerequisito: los imports del paso 2 dependen del alias |

### Fase 2 — Mover items de shared/ (secuencial, un solo agente)

**NO paralelizable**: todos los lotes tocan `shared/index.ts` (barrel exports) y pueden generar conflictos de merge si dos agentes editan el mismo barrel simultáneamente. Además, un item puede importar a otro que se mueve en el mismo o siguiente lote.

| Paso | Lote | Items | Nota |
| --- | --- | --- | --- |
| 2.1 | Componentes (lote A) | `login`, `form-error`, `form-field-error` | Co-dependientes: login importa form-error. Mover juntos. |
| 2.2 | Componentes (lote B) | `floating-notification-bell`, `offline-indicator`, `sync-status`, `voice-button`, `page-header` | Todos consumidos por intranet-layout. |
| 2.3 | Componentes (lote C) | `responsive-table`, `stats-skeleton`, `table-skeleton`, `layout/intranet-layout` | intranet-layout importa items de lotes A y B → va después. |
| 2.4 | Servicios | `calificacion-config` | Solo 1 servicio, independiente. |
| 2.5 | Directivas | `drag-drop`, `table-loading`, `uppercase-input` | Independientes entre sí. |
| 2.6 | Pipes | `estado/*` (4), `format-file-size`, `format-time`, `initials`, `seccion-label` | Independientes entre sí. |
| 2.7 | Config | `intranet-menu.config.ts` | Solo 1 archivo. |

Después de cada lote: actualizar imports, agregar re-export en `shared/index.ts`, verificar build.

### Fase 3 — Rename pages/shared (secuencial, un solo agente)

| Paso | Tarea | Por qué después de Fase 2 |
| --- | --- | --- |
| 3.1 | Rename `pages/shared/` → `pages/cross-role/` | Fase 2 puede tocar imports de archivos dentro de `pages/shared/`. Si se renombra antes, esos imports apuntan a paths que ya no existen. |
| 3.2 | Actualizar `intranet.routes.ts` y todos los imports | Mismo commit que 3.1. |
| 3.3 | Verificar build | — |

### Fase 4 — Documentación (paralelizable entre sí, PERO después de Fases 2+3)

Estas 3 tareas son independientes y **SÍ pueden ejecutarse en paralelo** porque editan secciones diferentes de `architecture.md` o archivos distintos:

| Paso | Tarea | Archivo que toca | Sección |
| --- | --- | --- | --- |
| 4.1 | Regla `shared/` vs `intranet/shared/` | `architecture.md` | Nueva sección "Ubicación de código compartido" |
| 4.2 | Regla repositories vs feature services | `architecture.md` | Nueva sección "Capa de datos" |
| 4.3 | Evaluación de asistencia (hallazgos) | `architecture.md` | Nueva sección "Asistencia — subdominios" |

**Riesgo de paralelizar 4.1+4.2+4.3**: Los 3 editan `architecture.md`. Si se paralelizan con agentes, cada uno lee una versión diferente y el último en escribir puede pisar los cambios de los otros. **Recomendación: ejecutar secuencialmente o usar un solo agente que agregue las 3 secciones.**

### Resumen de dependencias

```
Fase 1 (setup)
  │
  ▼
Fase 2 (mover items, 7 lotes secuenciales)
  │
  ▼
Fase 3 (rename pages/shared → cross-role)
  │
  ▼
Fase 4 (documentar reglas — secuencial por seguridad, mismo archivo)
```

**Nada es paralelizable de forma segura.** Cada fase depende de la anterior, y dentro de cada fase los pasos tocan archivos compartidos (barrels, routes, architecture.md). Un solo agente ejecutando secuencialmente es la estrategia correcta para evitar conflictos.
