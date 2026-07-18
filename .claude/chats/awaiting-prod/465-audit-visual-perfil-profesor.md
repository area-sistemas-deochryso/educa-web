# 465 — Auditoría visual + funcional: Perfil Profesor

> **Validación prod**: ⏳ pendiente desde 2026-07-18 — QA en vivo en TEST DB del escenario real (`MENDO CALDERON MARIELA`, curso Arte, salón `INICIAL 3 AÑOS B`), no se hizo browser QA en la sesión de cierre.
> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/investigate` (el hallazgo #1 necesita confirmar causa exacta antes de poder diseñar el fix)
> **Plan**: —
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - `src/app/features/intranet/pages/profesor/asistencia/**` (módulo de registro de asistencia — archivo exacto sin confirmar, ver hallazgo #1)
>   - `src/app/features/intranet/shared/config/intranet-menu.config.ts` (label "Notas y Asistencia" vs título real "Mis Salones", ver hallazgo #2)
>   - Ver también brief **458** (`calificar-dialog-selector-literal.md`) — actualizado en esta misma sesión con evidencia de runtime del bug de clasificación aprobado/desaprobado, confirmado también desde el lado Profesor.

## Contexto

Continuación de la sesión de auditoría (ver briefs 463 Login/Header, 464 Estudiante). Cuenta de prueba: `MENDO CALDERON MARIELA` (Profesor, DNI 42724344 — credenciales obtenidas vía `/intranet/admin/usuarios` porque la sesión guardada del switcher había expirado, comportamiento esperado no un bug). Recorrido: Inicio → Calificaciones (`/intranet/profesor/calificaciones`) → Mis Cursos (modal, 2 cursos: `Arte` en INICIAL 3 AÑOS B y `QA E2E Curso Prueba` en 1RO PRIMARIA A) → Notas y Asistencia (`/intranet/profesor/final-salones`) → Mi Asistencia (`/intranet/profesor/asistencia`) → Mis Salones (modal, tab Grupos) → Mensajes/Más (ya cubiertos en brief 464, mismos componentes cross-role).

## Scope

### 1. Discrepancia de estudiantes entre módulos: Asistencia no lista a todos los matriculados (alto — pendiente confirmar causa)

Verificado con evidencia cruzada, no es percepción:
- **Fuente de verdad** (`Mis Salones` → tab `Grupos`, sección "Sin grupo (2)"): el salón `INICIAL 3 AÑOS B` tiene **2 estudiantes** matriculados — `RICALDI PACHECO MELISA` (DNI 93324261) y `RIVERA PEYRONE ALVARO` (DNI 93083124).
- **Módulo Calificaciones** (modal "Calificar: Test verificacion 409"): también lista 2 filas, una por cada estudiante (`RICALDI PACHECO MELISA` sin nota, `RIVERA PEYRONE ALVARO` con 18.0).
- **Módulo Mi Asistencia** (`/intranet/profesor/asistencia`, tab Registrar, curso Arte, fecha 15/07/2026): lista **solo 1 estudiante** — `RIVERA PEYRONE ALVARO`. `RICALDI PACHECO MELISA` no aparece en absoluto, ni siquiera como "sin registro".

No se investigó la causa exacta en esta sesión (podría ser fecha de matrícula posterior al 15/07, un filtro de estado que excluye al estudiante, o un bug real de query). **Se recomienda `/investigate` antes de `/design`** — confirmar si es una condición legítima (matrícula tardía, retiro, etc.) o un bug de la query que arma la lista de asistencia.

### 2. Mismatch de nombre: menú dice "Notas y Asistencia", página real dice "Mis Salones" (bajo — mismo patrón ya documentado en brief 464)

El ítem de menú "Notas y Asistencia" (`Mi Seguimiento`) navega a `/intranet/profesor/final-salones`, cuyo `<h1>` real es **"Mis Salones"** — mismo patrón de desalineación label-menú vs. título-de-página que ya se documentó del lado Estudiante en el brief 464 (ahí era "Mis Calificaciones" → "Mis Salones"). Acá el label del menú es más preciso que el de Estudiante, pero el título de la página sigue sin coincidir. Confirmar si vale la pena unificar el `<h1>` de esa página a algo que abarque su contenido real (resumen de salones con columnas Aprobados/Desaprobados/Pendientes) en vez de reusar el título genérico "Mis Salones" que ya usa la ruta de `Mi Aula`.

### 3. Bug de clasificación aprobado/desaprobado — confirmado también desde Profesor (ver brief 458)

Ya documentado en profundidad en brief 458 (actualizado en esta sesión). Resumen: el nivel Inicial y Primaria están configurados como `tipoCalificacion: LITERAL` sin `notaMinima`/`notaMaxima` en sus literales; como el modal de calificar del profesor sigue pidiendo un número (no una letra), **toda nota ingresada se clasifica como "0 aprobados"** sin importar el valor (confirmado con 18.0/20 en dos cursos distintos, dos niveles distintos). Se reproduce también en el resumen agregado de "Notas y Asistencia" (columna Aprobados/Desaprobados en 0 pese a haber notas registradas). No repetir el fix acá — ejecutar contra el brief 458.

## Verificado, NO es bug (puntos positivos a preservar)

- **Validación proactiva de fecha en Mi Asistencia**: al elegir una fecha que no coincide con el día de horario del curso, muestra un banner claro ("La fecha elegida no corresponde al día de horario del curso (Miércoles)") con acción directa "Ir a fecha válida". Buen patrón, no tocar.
- **Preview de mockup al hover** en "Accesos Rápidos" del dashboard del profesor (ej. hover sobre "Mi Asistencia" muestra una miniatura de la pantalla destino con descripción). Feature pulida, no vista del lado Estudiante — considerar si vale la pena portarla a otros roles en un brief aparte (no es bug, es oportunidad).
- **Dashboard contextual de negocio**: el widget "Mi Salón" en Inicio explica con texto claro por qué el salón no usa asistencia biométrica ("El colegio habilitó el CrossChex solo desde 5to Primaria en adelante..."). Buen ejemplo de comunicación de reglas de negocio en la UI — usar como referencia para otros mensajes informativos del sistema.
- Foro, Mensajería y Videoconferencias: mismos componentes cross-role ya revisados en brief 464, sin hallazgos nuevos del lado Profesor.

## Out of scope

- Fix del bug de clasificación aprobado/desaprobado — ejecutar contra brief 458, no duplicar acá.
- Investigación de la causa exacta de la discrepancia de estudiantes en Asistencia (hallazgo #1) — este brief solo la documenta; requiere `/investigate` dedicado antes de poder estimar el fix.
- Rol Administrador — pendiente para una sesión de auditoría futura si se decide continuar.

## Criterio de cierre

- [x] Causa de la discrepancia de estudiantes en "Mi Asistencia" identificada (`/investigate`) y, si es bug, corregida.
  **Causa confirmada**: `AsistenciaCursoRepository.ObtenerEstudiantesDeHorarioAsync` leía de `HorarioEstudiante` (roster curado manualmente por horario, poblado una vez vía `AsignarEstudiantesAsync`/`AsignarTodosEstudiantesSalonAsync`), mientras que Calificaciones y Grupos leen de `EstudianteSalon` (matrícula real). Ni `EstudianteSalonManagementService.AgregarAsync` ni `TransferirAsync` tocan `HorarioEstudiante` — no existe sync alguno. Resultado: estudiantes matriculados **después** de que un horario ya tuviera su roster poblado quedan invisibles en Asistencia por Curso, aunque sí aparezcan en Salones/Calificaciones.
  **Fix aplicado** (Educa.API): `ObtenerEstudiantesDeHorarioAsync` y `EstaEstudianteEnHorarioAsync` ahora leen de `EstudianteSalon` vía `Horario.HorSalonCodId`, mismo patrón que `GrupoContenidoRepository.ObtenerEstudiantesPorContenidoAsync`. Cambia el tipo de retorno de `List<HorarioEstudiante>` a `List<Estudiante>` — se actualizaron `IAsistenciaCursoRepository` y los 3 call sites en `AsistenciaCursoService` (`ObtenerPorFechaAsync`, `ObtenerResumenAsync`, `RegistrarAsync`). `HorarioEstudiante` se mantiene intacta para sus otros usos (cruce de horarios, conteos) — no se tocó `HorarioRepository` ni `HorarioAsignacionService`.
  Decisión del usuario: no enganchar el fix en el flujo de matrícula (`AgregarAsync`/`TransferirAsync`) porque esa funcionalidad todavía no está completamente implementada — se prefirió hacer que Asistencia lea la misma fuente de verdad que el resto del sistema.
- [x] Decisión tomada sobre el título de la página "Notas y Asistencia" / "Mis Salones" (unificar o documentar por qué se mantiene separado).
  Renombrado el `<h1>` de `profesor-final-salones.component.html` de "Mis Salones" a "Notas y Asistencia" (mismo texto que el label del menú), ícono actualizado a `pi-th-large` (icono del menú) para dejar "Mis Salones" + `pi-building` exclusivo de la ruta `/intranet/profesor/salones`.
- [x] Confirmado que brief 458 cubre el fix del bug de clasificación (no se requiere trabajo adicional en este brief para ese punto).
- [x] Build + lint OK (BE: `dotnet build` 0 errores, `dotnet test` 11/11 en AsistenciaCurso; FE: `ng build` + `eslint` limpios). **Pendiente**: verificación en vivo en TEST DB contra el escenario real (`MENDO CALDERON MARIELA`, curso `Arte`) — no se hizo browser QA en esta sesión, recomendado antes de mergear.

## Tiempo estimado

~1-2h para `/investigate` del hallazgo #1 (el fix depende de la causa real). ~30min para la decisión de naming del hallazgo #2. El hallazgo #3 no suma tiempo acá (ya presupuestado en brief 458).
