> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 4 · **Fase**: F4.FE (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: 🟢 cerrado local 2026-04-28 (awaiting-prod) · **Bloqueado por**: Chat 4b BE (058) deployed + verificado.
> **Validación prod**: ⏳ pendiente desde 2026-04-28

---

## RESULTADO (cierre local 2026-04-28)

**Lint** ✅ · **Build** ✅ · **Tests** 1689/1690 verdes (1 fallo pre-existente en `attendance-scope-banner` fuera de scope — busca literal "INV-C11" en banner que solo dice "5to Primaria"). **Suite scoped** del diagnóstico: 16/16 verdes (4 nuevos: typeahead < 2 chars, ≥ 2 chars con debounce, seleccionarPersona autosubmit, error fail-safe).

### Decisiones tomadas
1. **`p-autoComplete` reemplaza el `<input type="email">`** del header. Submit libre sigue funcionando (Enter o botón "Buscar") — `[forceSelection]="false"` permite búsqueda directa por correo exacto sin elegir sugerencia.
2. **Debounce 300ms en facade** (Subject + `debounceTime` + `distinctUntilChanged` + `switchMap`). Al tipear el admin no se dispara una request por tecla.
3. **Min length 2** en FE (matchea BE `Q_MUY_CORTO`). `< 2` chars limpia sugerencias en lugar de pegar al BE.
4. **Fail-safe INV-S07** del typeahead: error 4xx/5xx del BE → `catchError` devuelve `of(null)` → sugerencias vacías + `loadingSugerencias=false`. No rompe la página, no muestra toast (es typeahead, no es operación crítica).
5. **Item template visual**: avatar 36×36 con tinte por tipo persona (E azul, P verde, D púrpura, APO amarillo) + doble línea (nombre+tipo / correo enmascarado · DNI · campo origen).
6. **Footer "refiná tu búsqueda"** cuando `total ≥ 10` (BE cap) — honesto sobre el cap, evita el síntoma "siempre veo 10 y no sé si hay más".
7. **`appendTo="body"`** + `[panelStyle]="{ minWidth: '420px' }"` — respeta `rules/primeng.md` y da espacio al item template denso.
8. **`seleccionarPersona`** autosubmit — al elegir un item, dispara `buscar()` con el correo del item sin que el admin tenga que clickear "Buscar".

### Archivos
**Modificados** (11): models (+`PersonaConCorreoDto`/`BuscarPersonasResponseDto`/`BuscarPersonasErrorCode`), service (+`buscarPersonas`), store (+state typeahead +clear*), facade (+pipeline debounced +`onTypeaheadQuery`/`seleccionarPersona`), correo-header (ts/html/scss reescritos para `p-autoComplete`), tab-correo-individual (ts/html wire-up de inputs/outputs nuevos), 2 specs ampliados (+1 test service, +4 tests facade).

### Aprendizajes transferibles
- **Patrón `p-autoComplete` + Subject debounced en facade** consolidado: el componente solo emite `(completeMethod)` y `(onSelect)`; toda la concurrencia (debounce, distinctUntilChanged, switchMap, fail-safe) vive en el facade. Reusable para futuros typeaheads (búsqueda de cursos, salones, etc.).
- **`forceSelection=false` desbloquea el "submit libre"**: el admin puede ignorar las sugerencias y tipear un correo exacto. La UI no obliga a seleccionar item, lo que matchea el comportamiento previo del input simple.
- **Tints por discriminador con `color-mix(in srgb, var(--X-500) 14%, transparent)`**: forma cheap de dar identidad visual a un tipo polimórfico sin perder consistencia con tokens del design system. Reusable en cualquier listado polimórfico (asistencia E/P del Plan 21, futuras listas con discriminador).
- **fakeAsync de Angular no funciona en Vitest** del proyecto — usar `vi.useFakeTimers() + vi.advanceTimersByTime()` en su lugar para tests de pipelines RxJS con `debounceTime`. Patrón a documentar en `rules/testing.md` si vuelve a aparecer.

### Limitación conocida (heredada del BE)
🔸 **Búsqueda accent-sensitive** (heredada del Chat 4b BE 058): tipear "perez" no matchea "Pérez". Si el admin reporta fricción en prod, el fix vive en el BE (`EF.Functions.Collate(field, "Latin1_General_CI_AI")` en `EmailDiagnosticoPersonaSearch`), no en el FE.

### Gate post-deploy
Verificación requerida en prod (`/verify 059`):
- Tipear 2-3 letras de un apellido conocido (ej: "gar" para "Garcia") — debe aparecer typeahead con personas matchadas en ≤ 1s.
- Tipear 8 dígitos de un DNI — debe aparecer la persona dueña del DNI.
- Click en una sugerencia → autosubmit del diagnóstico con el correo correcto sin re-tipear.
- Tipear un correo exacto que no esté en sugerencias + Enter → debe disparar diagnóstico igual (submit libre).
- Verificar que el typeahead aparece sobre el resto de la UI (`appendTo="body"` funcionando).

---

# Plan 36 Chat 4 FE — Rediseño Diagnóstico de Correos

## PLAN FILE

[`.claude/plan/monitoreo-pages-redesign.md`](../../plan/monitoreo-pages-redesign.md) · página #3.

## OBJETIVO

Mejorar visualmente la página `/intranet/admin/monitoreo/correos/diagnostico` (componente `email-outbox-diagnostico`):

1. **Más visual** en general — el "gap del día" (sub-tab) está bien; el "diagnóstico por correo" necesita iteración.
2. **Sugerencias en el buscador** del diagnóstico por correo (typeahead). Consume el endpoint nuevo del Chat 4b BE (058).
3. **Búsqueda por apellidos/nombres** además de correo.

## BLOQUEO

No arrancar hasta que Chat 4b BE (058) esté en `closed/` o `awaiting-prod/` con verificación pasada. El endpoint nuevo es prerrequisito.

## OUT OF SCOPE

- Slow request inicial (BE, fuera de Plan 36).
- Sub-tab "gap del día" no se toca.

## REGLAS

- [`rules/design-system.md`](../../rules/design-system.md) — typeahead vía `p-autocomplete` con `appendTo="body"` ([`primeng.md`](../../rules/primeng.md)).
- Tab transparente verificar (probable ya resuelto por chat previo).

## VALIDACIÓN

`npm run lint` · `npm run build` · `npm test` (+tests nuevos para autocomplete y mapping del response BE).

## POST-DEPLOY GATE

Sí — verificación end-to-end con el endpoint BE en prod.
