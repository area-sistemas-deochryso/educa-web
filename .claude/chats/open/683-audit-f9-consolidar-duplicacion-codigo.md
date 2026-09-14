# 683 — Audit F9: Consolidar duplicación de código entre roles

> **Repo destino**: `educa-web`
> **Plan**: [`audit-angular22-ts6-2026-09-12.md`](../../plan/audit-angular22-ts6-2026-09-12.md) (Fase F9)
> **Creado**: 2026-09-12 · **Estado**: ⏳ pendiente arrancar.
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

## Criterio de cierre

- [ ] Los 3 pares consolidados, sin pérdida de funcionalidad por rol.
- [ ] Tests existentes (o nuevos si no había) verifican ambos roles sobre el componente/config compartido.
- [ ] Build + lint + tests OK.
- [ ] Plan actualizado: F9 → ✅.
- [ ] Maestro actualizado.

## Tiempo estimado

~2h30.
