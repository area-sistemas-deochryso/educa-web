# 140 · FE — Fix F-018: botón "Registrar" disabled en dialog asistencia manual (tipoPersona=A)

> **Creado**: 2026-05-12 · **Estado**: ⏳ pendiente arrancar · **Repo**: `educa-web` (main)
> **Modo sugerido**: `/investigate` → `/execute` → `/validate`
> **Origen**: Cowork 2026-05-12 reportó F-018 al ejecutar TEST 4.2 del bloque Plan 28 AA. Brief 127 (BE dispatcher AA correos) queda bloqueado en `awaiting-prod/` hasta que este fix llegue a prod.
> **Bloquea**: cierre del Plan 28 al 100% (brief 127 + parte 4b-tab del brief 134 que sigue en `awaiting-prod/`).

## Síntoma reproducible

1. Login Director.
2. Ir a `/intranet/admin/asistencias` → tab "Asistentes Administrativos".
3. Click "+ Nueva asistencia" → abre dialog "Registrar asistencia manual".
4. Completar:
   - Tipo persona: **Asistente Admin**
   - Tipo registro: **Solo entrada**
   - AA: seleccionar uno con highlight (ej. YARUPAITA MALASQUEZ RICARDO REY DNI 72884913)
   - Hora de entrada: fecha+hora válida
   - Observación: texto libre
5. **Síntoma**: botón "Registrar" permanece **disabled**.
6. Repro 100% en prod educa.com.pe, sesión Director, 2026-05-12.

## Lo que Cowork ya descartó

- HTML5 validity sobre los inputs nativos: todos `valid=true`.
- Re-disparar eventos `input`/`change`/`blur` por JS no rehabilita el botón.
- La condición que bloquea **NO** vive en los inputs nativos.

## Hipótesis principal

La validez del form está computada por un `computed()` o signal del componente del dialog que **no se actualiza** cuando el AA se selecciona desde el `p-select` o cuando `tipoPersona='A'`.

Hipótesis específicas a verificar (ordenadas por probabilidad):

1. El binding del `p-select` AA escribe en un `FormControl`/`signal` distinto al que mira el `isFormValid` computed. Probable que la rama `tipoPersona='A'` haya copiado la lógica de Estudiante/Profesor pero no haya sincronizado el target del binding.
2. El `computed` de validez exige `salonId`/`gradoId`/`cursoId` que solo aplican a Estudiante (los AAs no tienen) y la rama `'A'` no excluye esos requisitos.
3. La fecha+hora se está validando contra una ventana de coherencia horaria que rechaza el caso AA (INV-C09 es `'E'`-only, INV-C10 aplica a ambos pero solo en regular — la hora 08:40 entra dentro de ventana válida, así que esta hipótesis es baja).

## Alcance

- Componente del dialog "Registrar asistencia manual": probablemente vive en `features/intranet/pages/admin/asistencias/components/` o similar.
- Validador del form: signal/computed que decide `isFormValid` o `canSubmit`.
- Verificar paridad con `tipoPersona='P'` (Plan 23 que sí dejó funcional la rama profesor).

## Plan sugerido

1. `/investigate`:
   - Grep dialog component file (`asistencia-manual` / `registro-manual` / similar).
   - Identificar el computed/signal que decide la habilitación del botón.
   - Comparar rama `'P'` (funciona) vs `'A'` (no funciona) en la lógica de validación.
   - Confirmar hipótesis 1, 2 o tercera.
2. `/execute`: fix del binding o de la rama del computed.
3. `/validate`: lint + build + manual repro local con AA. Idealmente test unit del computed.
4. Smoke local: crear asistencia manual AA → ver fila en `AsistenciaPersona` con `ASP_TipoPersona='A'`, `ASP_OrigenManual=true`.
5. Cerrar con `/end` → awaiting-prod hasta deploy + verificación Cowork.

## Aprendizajes transferibles

- Patrón Plan 21 (extender flujo polimórfico Estudiante→Profesor a un tercer tipo `'A'`) tiene una superficie FE que el flujo BE solo no cubre — necesita check de paridad en cada dialog/form.
- F-018 confirma que **diseño con un solo `tipoPersona`** (rama única con switch) es más resistente que **copiar ramas** (las nuevas se olvidan de algún campo).
