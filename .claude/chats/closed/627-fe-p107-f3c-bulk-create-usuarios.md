# 627 — P107 F3c FE: UI de creación masiva para Usuarios (cualquier rol)

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F3, contraparte FE de brief 625)
> **Creado**: 2026-09-04 · **Estado**: 🟢 libre — el contrato BE (brief [625](../../Educa.API/.claude/chats/closed/625-be-p107-f3b-bulk-create-usuarios.md)) ya está cerrado y estable.
> **MODO SUGERIDO**: `/design` (mapear el contrato real contra la UI de 623) → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: sección de creación masiva dentro de "herramientas de prueba" (F1 FE, brief 618) — extiende la UI de Salones/Cursos (brief 623) a Usuarios

## OBJETIVO

Completar F3 (creación masiva) agregando Usuarios de cualquier rol a la UI de "herramientas de prueba" que ya soporta Salones y Cursos (brief 623). El contrato BE ya existe y está cerrado (brief 625): `POST api/sistema/usuarios/prueba/generar` (`{ Rol, Cantidad }`) y `POST api/sistema/usuarios/prueba/lote` (`{ Usuarios: List<CrearUsuarioDto> }`, roles mixtos permitidos), mismo `CreacionMasivaResponseDto` que Salones/Cursos.

## PRE-WORK OBLIGATORIO

- Confirmar en el código actual de `BulkTestDataApiService`/`BulkTestDataFacade` (brief 623) qué tan directo es extenderlos a una tercera entidad con forma distinta (Usuarios necesita seleccionar `Rol`, a diferencia de Salones/Cursos).
- Confirmar el rango de DNI reservado usado por el BE (`99` + 6 dígitos aleatorios, ver brief 625) para que la UI pueda mostrarlo/explicarlo si hace falta (ej. en el resultado de la generación).
- Revisar si `CrearUsuarioDto` tiene campos obligatorios por rol (vía `IUsuarioRolStrategy`) que compliquen el import de archivo — confirmar contra el DTO real antes de asumir que el patrón de Salones/Cursos aplica sin cambios.

## ALCANCE

- UI de generación sintética (rol + cantidad) reusando el patrón ya construido en 623.
- UI de import de archivo para Usuarios (xlsx/csv), con roles mixtos si el contrato lo permite.
- Mostrar el resultado (creados/errores por fila) con el mismo criterio que Salones/Cursos — 623 encontró y corrigió un bug donde los errores del backend no se mostraban; confirmar que esa corrección ya cubre este caso o replicarla si no.

## FUERA DE ALCANCE

- Los endpoints en sí — ya existen (625).
- F4 (borrado masivo) — brief aparte, y ya se decidió que arranca acotado a Salones+Cursos sin esperar este brief.
- Estudiantes — tiene su propio import, no forma parte de P107.

## VALIDACIÓN FINAL

- Generar N usuarios de al menos dos roles distintos (uno de la familia Director si es posible, dado el caso conocido de `UsuarioReg` no siempre marcable con `::TEST` — ver brief 625) y confirmarlos creados vía la pantalla admin de Usuarios normal.
- Import de archivo funcional con al menos un caso de error por fila (ej. rol inválido) mostrado correctamente.
- Build + tests unit verdes.

## CRITERIOS DE CIERRE

- [x] UI de generación sintética funcional para Usuarios (rol + cantidad).
- [x] UI de import de archivo funcional.
- [x] Verificado en vivo contra `TestConnection` real.
- [x] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F3 FE Usuarios marcado, **F3 queda 100% completo**).
- [x] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [x] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev-tooling): add bulk test-data creation UI for usuarios (P107 F3c FE)
```

## CIERRE

Al cerrar, F3 queda 100% completo (Salones+Cursos+Usuarios, BE+FE). Avisar que F4 ya está en curso acotado a Salones+Cursos (briefs 628/629) y que, si se quiere, puede ampliarse a Usuarios en una segunda vuelta.
