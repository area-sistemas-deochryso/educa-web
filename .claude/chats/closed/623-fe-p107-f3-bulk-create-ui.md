# 623 — P107 F3 FE: UI de creación masiva en herramientas de prueba

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F3)
> **Creado**: 2026-09-03 · **Estado**: 🏃 running — scope acotado a Salones+Cursos (622 ✅ cerrado). Usuarios queda fuera hasta que 625 (BE, `Educa.API/open/`) cierre.
> **MODO SUGERIDO**: `/investigate` → `/design` → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: nueva sección dentro de "herramientas de prueba" (F1 FE, brief 618) para creación masiva de Salones/Cursos

## OBJETIVO

Exponer desde "herramientas de prueba" la creación masiva de Salones y Cursos — con las dos vías decididas en el plan (generación sintética de N con un click, e import de archivo) — consumiendo los endpoints ya shippeados en 622 (BE).

**Scope decision (2026-09-03, con el usuario)**: Usuarios queda fuera de este brief. El BE de Usuarios (625, `Educa.API/open/`) todavía no arrancó — mayor complejidad (dispatch por `IUsuarioRolStrategy`, rango de DNI reservado, contraseña por defecto por rol). La abstracción compartida (api-service + facade) se diseña para que sumar Usuarios después sea incremental, no una reescritura.

## PRE-WORK — ya resuelto en `/investigate` + `/design` (2026-09-03)

- Contrato real de 622 confirmado: `POST api/sistema/salones/prueba/generar` `{Cantidad}`, `POST api/sistema/salones/prueba/lote` `{Salones: CrearSalonDto[]}` (GradoId/SeccionId/SedeId/Anio, todos int), `POST api/sistema/cursos/prueba/generar` `{Cantidad}`, `POST api/sistema/cursos/prueba/lote` `{Cursos: CrearCursoDto[]}` (Nombre string + GradosIds int[]). Respuesta compartida `CreacionMasivaResponseDto {Creados, Rechazados, Errores[{Fila,Detalle,Razon}]}`.
- Marcado `::TEST`: ninguno de los DTOs de request tiene campo de marcado — el BE lo aplica solo, sin trabajo FE.
- Patrón de referencia elegido: facade sin Store (mismo criterio que F2/621 — `CrosschexTriggerFacade`), import de archivo espejando `horarios-import-dialog` (FKs crudas por columna, no resolución por nombre como `usuarios-import-dialog`).
- Diseño completo (opciones, decisiones, fases, contract checklist) queda en el historial del chat — no se persiste como plan file nuevo porque es detalle de ejecución de un brief ya cubierto por `xrepo-107-entorno-dev-datos-prueba.md`.

## ALCANCE

- Capa compartida: un `BulkTestDataApiService` + un `BulkTestDataFacade` con los 4 endpoints (generar/lote × Salones/Cursos), sin Store.
- UI de generación sintética (componente reusable, `Cantidad` + botón) instanciado para Salones y para Cursos.
- UI de import de archivo — un diálogo por entidad (`SalonesImportDialogComponent`, `CursosImportDialogComponent`), clonando el step-machine de `horarios-import-dialog`.
- Todo dentro de la sección "herramientas de prueba", visible solo en desarrollo.

## FUERA DE ALCANCE

- Usuarios (cualquier rol) — depende de 625 (BE), sin arrancar. Brief de seguimiento cuando 625 cierre.
- Los endpoints en sí — eso ya es 622 (BE, cerrado).
- UI de borrado masivo — eso es F4, brief aparte, sin diseñar todavía.
- Cambios a los diálogos de import existentes de Estudiantes/Horarios.
- Componente de import genérico cross-entidad — deliberadamente no abstraído (shapes divergen entre Salones y Cursos, sin precedente en el codebase).

## VALIDACIÓN FINAL

- ~~Generar 20 salones y 20 cursos sintéticos desde la UI y confirmarlos creados~~ — ajustado: ver hallazgo de catálogo agotado abajo. Cursos generó 5/5 sintéticos confirmados en DB.
- Import de archivo funcional para Salones y Cursos — confirmado.
- Build + tests unit verdes — confirmado.

## VERIFICACIÓN EN VIVO (2026-09-03, FE+BE local, BusinessTestMode=true, TestConnection)

Levantado por Claude (BE `dotnet run --launch-profile http` puerto 5139, FE `bun run start` puerto 4201), logueado como `CODE CLAUDE` (Administrador, sesión guardada existente) vía Chrome.

- **Generación sintética Salones**: `POST prueba/generar` responde 200 pero `0 creados` — el catálogo grado×sección×sede para el año 2026 en `TestConnection` ya está saturado (acumulado de sesiones previas F1-F3). Comportamiento correcto del BE (`SalonesService.GenerarPruebaAsync` agrega un error informativo cuando `candidatos.Count < cantidad`), **pero mi UI no lo mostraba** — bug real encontrado y corregido en vivo: `BulkGenerateFormComponent` no renderizaba `result.errores`. Fix aplicado (`bulk-generate-form.component.html/scss`), reverificado: ahora muestra "Solo se generaron 0 de N solicitados — no hay más combinaciones grado/sección/sede disponibles para el año 2026".
- **Bug cosmético encontrado y corregido**: label "Cantidad De Salones/Cursos" con mayúscula indebida en "De" (CSS `text-transform: capitalize` aplicado a un label multi-palabra). Corregido quitando la regla.
- **Generación sintética Cursos**: `POST prueba/generar` con cantidad=5 → **5 creados confirmados** en `/intranet/admin/cursos` (fetch directo al endpoint `listar`, ya que la card de stats de esa página no invalida caché tras crear — bug preexistente, fuera de este scope, no corregido).
- **Import de archivo Cursos**: CSV (`Nombre,GradosIds` con `;` como separador interno) → preview correcto → `POST prueba/lote` → **2 creados confirmados**, `gradosIds` resueltos a nombres reales de grado, y **marcado `::TEST` confirmado en `usuarioReg` sin trabajo FE** (`"CODE CLAUDE::TEST"`), validando la asunción del pre-work.
- **Import de archivo Salones**: CSV con combo ya existente → `0 creados, 1 rechazado`, tabla de errores muestra "Grado 1 Sección 1 Sede 1 Año 2026 — Ya existe un salón con ese grado, sección, sede y año". Round-trip completo confirmado, incluyendo el camino de rechazo.
- **Hallazgo fuera de scope, no corregido**: `/intranet/admin/cursos` — la card "Total Cursos" no refleja altas nuevas tras crear (queda en 41 en vez de 43) ni tras click en "Refrescar"; búsqueda por nombre tampoco filtra la tabla. Pre-existente, no tocado por 623. Candidato a brief de seguimiento si molesta en uso real.

## CRITERIOS DE CIERRE

- [x] UI de generación sintética funcional para Salones + Cursos.
- [x] UI de import de archivo funcional para Salones + Cursos.
- [x] Verificado en vivo contra 622 ya cerrado.
- [x] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F3 FE Salones+Cursos marcado, Usuarios anotado como pendiente de 625).
- [x] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [x] Brief movido `running/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add bulk test-data creation UI for salones/cursos (P107 F3 FE)
```

## CIERRE

Al cerrar F3 Salones+Cursos (BE 622 + FE 623 ambos cerrados), avisar que:
- F4 (borrado masivo) queda desbloqueada para diseñarse/scopearse sobre Salones+Cursos.
- Usuarios (F3 FE) queda como brief de seguimiento, bloqueado hasta que 625 (BE) cierre.
