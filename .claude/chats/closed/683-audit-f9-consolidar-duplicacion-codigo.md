# 683 — Audit F9: Consolidar duplicación de código entre roles

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F9)
> **Creado**: 2026-09-12 · **Estado**: ✅ completo (2026-09-16, worktree `chat/683-audit-f9-consolidar-duplicacion-codigo`).
> **MODO SUGERIDO**: `/design` corto (definir el componente compartido) → `/execute`
> **touches**:
>   - `src/app/features/intranet/pages/estudiante/mensajeria/estudiante-mensajeria.component.ts`
>   - `src/app/features/intranet/pages/profesor/mensajeria/profesor-mensajeria.component.ts`
>   - `src/app/features/public/levels/{inicial,primaria,secundaria}/*`
>   - `src/app/features/intranet/pages/cross-role/attendance-component/attendance-director-staff.component.ts`, `attendance-director-asistentes-admin.component.ts`

## Origen

Hallazgos de `/audit` (2026-09-12), categoría "Observación"/"Inconsistencia" — 3 pares/tríos de código duplicado casi byte-a-byte, agrupados en un brief de consolidación porque comparten el mismo tipo de fix (extraer componente/config compartido).

## Scope

1. **`estudiante-mensajeria.component.ts` vs `profesor-mensajeria.component.ts`** — mismo `@Component` decorator completo (selector aparte), mismo template inline, mismos estilos SCSS inline, mismo `computed(cursoOptions)` copiado literal (mismo comentario en ambos). La única diferencia real es de dónde viene `horarios`. Fix: extraer un componente compartido (`cross-role/mensajeria/` o `intranet/shared/`) que reciba `horarios`/`loading` como inputs, cada rol solo aporta el data source.
2. **`levels/inicial`, `levels/primaria`, `levels/secundaria`** — los 3 `.ts` son idénticos salvo nombre de clase/selector; los `.html` tienen 176-178 líneas de estructura muy similar. Fix: extraer un `LevelPageComponent` genérico parametrizado por `@Input()`/route data (`level: 'inicial' | 'primaria' | 'secundaria'`), o al menos un shared partial para las secciones repetidas.
3. **`attendance-director-staff.component.ts` vs `attendance-director-asistentes-admin.component.ts`** — prácticamente el mismo componente copy-pasteado (~330 líneas c/u). Fix: colapsar en un componente parametrizado por el tipo de colectivo (staff/asistentes-admin), similar al criterio del punto 1.

## Pre-work

- Cada consolidación es independiente — no hace falta resolver las 3 en el mismo orden, pero el criterio de diseño (extraer inputs en vez de duplicar) es el mismo en los 3 casos.
- Confirmar con `/design` corto el shape de los inputs del componente compartido antes de escribir el refactor, para no terminar con una abstracción a medio camino.
- Verificar que ningún test existente dependa de la estructura duplicada actual (selectores específicos por rol) antes de consolidar.

## Out of scope

- Foro (`estudiante/foro` vs `profesor/foro`) — ya evaluado en el audit y descartado explícitamente como NO duplicación (son funcionalmente distintos: solo-lectura vs selector+escritura).
- El resto de hallazgos del audit (ver plan).

## Diseño real (investigado en el worktree, no en el plan)

1. **Mensajería** — extraído `MensajeriaPageComponent` (`cross-role/mensajeria/components/mensajeria-page/`), presentacional puro con `input.required<boolean>() loading` / `input.required<MensajeriaCursoOption[]>() cursoOptions`. `EstudianteMensajeriaComponent`/`ProfesorMensajeriaComponent` quedan solo con su data-fetch (facades distintas) y delegan el render.
2. **Levels** — `LevelPageComponent` genérico (`levels/shared/level-page/`) parametrizado por `LevelPageData` (título, breadcrumb, 3 `blocks` con `textBlockClass`/`heading`/`body`/`imageFirst`). Cada nivel (`InicialComponent`/`PrimariaComponent`/`SecundariaComponent`) es un wrapper fino que solo aporta el dato — mismo selector/clase/spec que antes, cero blast radius en tests existentes. El SCSS de los 3 niveles se fusionó mecánicamente en un solo archivo (selectores ya scopeados por `.level-page.<nivel>`, sin cambios de valores).
3. **Attendance director** — `AttendanceDirectorStaffComponent` se generalizó con un `@Input() loader?: AttendanceDirectorPersonaLoader` opcional (nueva interfaz en `attendance-director-persona-loader.ts`). Las 4 instancias staff (C/M/D/N) no cambian — siguen usando `AsistenciaStaffApiService` por default. La instancia "asistentes-admin" (que usa un servicio/endpoint de backend distinto, `AsistenciaAsistenteAdminApiService` — fuera de scope tocar el backend) pasa `tipoPersona="A"` + `[loader]="asistentesAdminLoader"`, un adaptador construido en `AttendanceDirectorComponent` que normaliza la respuesta (`resp.asistentesAdmin` → `personas`) al shape genérico. Se eliminó `AttendanceDirectorAsistentesAdminComponent` completo (.ts/.html/.scss). Nota: el SCSS de esa instancia tenía 2 tokens divergentes de los otros 4 (`--white-color`/`--shadow-3` vs `--intranet-white-color`/`--shadow-2`) — se convergió al valor usado por las 4 instancias staff (mayoría), micro-inconsistencia resuelta como side-effect, no ameritaba brief aparte.

## Tests agregados (no había cobertura previa en ninguno de los 3 pares)

- `mensajeria-page.component.spec.ts` (4 tests: loading/empty/list states).
- `level-page.component.spec.ts` (3 tests: título/breadcrumb desde data, orden imagen/texto por block) — los specs `inicial/primaria/secundaria.spec.ts` existentes siguen pasando sin cambios.
- `attendance-director-staff.component.spec.ts` (2 tests: camino default vía `AsistenciaStaffApiService`, camino con `loader` inyectado).

## Criterio de cierre

- [x] Los 3 pares consolidados, sin pérdida de funcionalidad por rol.
- [x] Tests existentes (o nuevos si no había) verifican ambos roles sobre el componente/config compartido.
- [x] Build + lint + tests OK (lint: 0 issues; build: sin errores, solo warnings NG8113 preexistentes no relacionados; tests: 2593/2593 verde — 1 timeout de `eslint-config-guards.spec.ts` en la corrida completa fue flake de carga de máquina, confirmado pasando aislado en 2.4s).
- [x] Plan actualizado: F9 → ✅.
- [x] Maestro actualizado.

## Tiempo estimado

~2h30.
