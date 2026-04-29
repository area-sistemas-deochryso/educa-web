> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 4 · **Fase**: F4.FE (`/design + /execute`) · **Creado**: 2026-04-27 · **Estado**: 🟢 cerrado local 2026-04-28 v2 (awaiting-prod, fix iteration) · **Bloqueado por**: Chat 4b BE (058) deployed + verificado.
> **Validación prod v1**: ❌ rollback 2026-04-28 · **Validación prod v2**: ✅ verificada 2026-04-28 — el plan quedó desfasado (la ruta real es otra), pero el rediseño está hecho y funcionando en prod.

---

## FIX ITERATION (cierre local 2026-04-28 — v2)

**Lint** ✅ · **Build** ✅ · **Tests** ✅ **1694/1694** verdes (incluye 5 tests nuevos de submit smart). El test `attendance-scope-banner` que estaba en rojo pre-existente ahora también pasa.

### Causa raíz del rollback

Dos problemas separados con misma sintomatología visible:

1. **Submit con input no-email caía en validación dura** (`!correo.includes('@') → CORREO_INVALIDO`). Cuando el typeahead no devolvía sugerencias para un DNI (por la razón que fuera) y el admin hacía click en "Buscar", el sistema decía "formato inválido" — engañoso si el input era un DNI legítimo.
2. **Item template visual** poco diferenciado entre tipos persona (icono genérico `pi pi-user`, badge tipo neutro).

Decisión: el FE no puede arreglar la búsqueda BE (ya cubierta en Chat 4b 058 — `EmailDiagnosticoPersonaSearch.LooksLikeDni` + `dniEncryption.ComputeHash` matchea exact 8-digit DNI contra `*_DNI_Hash`). El fix vive 100% en FE: dar feedback útil ante 0/1/N sugerencias.

### Decisiones tomadas

1. **Submit smart cuando el input no tiene `@`** (`resolverDesdeSugerencias`): el admin probablemente tipeó nombre/apellido/DNI. En lugar de cortar con "formato inválido":
   - **1 sugerencia** → autopick (asume intención clara, dispara `seleccionarPersona`).
   - **>1 sugerencias** → toast warning "Seleccioná una persona de las sugerencias para diagnosticar su correo." (`SELECCION_REQUERIDA`).
   - **0 sugerencias** → mensaje específico según si el input es DNI numérico (`/^\d{1,8}$/`) o texto libre (`SIN_COINCIDENCIAS`):
     - DNI: "No encontramos a nadie activo con ese DNI. Verificá el número o probá con apellido o correo."
     - Texto: "No encontramos coincidencias. Tipea un correo completo (con @) o probá otro nombre."
2. **Validación de longitud separada**: `correo.length > CORREO_MAX_LENGTH` ahora dispara su propio mensaje ("El correo es demasiado largo.") en lugar de mezclarse con `CORREO_INVALIDO`.
3. **Item template 3 líneas** en lugar de 2 (línea 1 nombre + badge tipo color-coded · línea 2 correo monospace con `pi-envelope` · línea 3 DNI con `pi-id-card` + campo BE en pill `--surface-100`).
4. **Iconos por tipo persona**: `pi-graduation-cap` (E), `pi-book` (P), `pi-shield` (D), `pi-users` (APO) — reemplazan el genérico `pi-user`. Tinte del avatar ya existía; ahora también del badge tipo (mismo color-mix).
5. **Avatar 36→40px + border-radius 8→10px** + gap más generoso. Nombre y correo con `text-overflow: ellipsis` para no romper layout en panel 420px.

### Archivos

**Modificados** (6):
- `services/correo-individual.facade.ts` — `buscar()` separa validación de longitud + ramifica a `resolverDesdeSugerencias()` cuando no hay `@`. Switch `getErrorMessage()` cubre los 3 nuevos códigos.
- `models/correo-individual.models.ts` — `CorreoIndividualErrorCode` ahora incluye `SELECCION_REQUERIDA | SIN_COINCIDENCIAS | UNKNOWN`.
- `components/correo-header/correo-header.component.ts` — mapa `TIPO_PERSONA_ICON` + helper `tipoPersonaIcon()`.
- `components/correo-header/correo-header.component.html` — item template a 3 líneas con iconos específicos.
- `components/correo-header/correo-header.component.scss` — avatar 40px, badge tipo color-coded, líneas con ellipsis, campo en pill `--surface-100`.
- `services/correo-individual.facade.spec.ts` — 5 tests nuevos (0/1/N sugerencias para input sin `@`, longitud excedida).

### Aprendizajes transferibles

- **"Validación dura es la peor UX para rescue paths"**: cuando el input ambiguo (texto libre vs correo vs DNI) tiene una resolución posible vía contexto del estado actual (sugerencias en memoria), conviene resolver antes de tirar error. Patrón aplicable a cualquier autocomplete con submit libre.
- **Distinción DNI vs texto en mensaje de error** con regex `/^\d{1,8}$/`: tres palabras de hint específico ("DNI", "número") cambian completamente la fricción percibida — el admin sabe dónde mirar (¿está activo? ¿escribí bien?).
- **Color-coding consistente entre avatar e tipo-badge**: si el avatar usa tinte por discriminador, el badge del mismo tipo también — sino el ojo lee dos sistemas semánticos paralelos. Misma `color-mix` ratio en ambos.

### Gate post-deploy v2

Verificación requerida en prod (`/verify 059`):
- Tipear 2-3 letras de un apellido conocido → typeahead muestra sugerencias en ≤ 1s.
- Tipear 8 dígitos de un DNI conocido → typeahead muestra a la persona dueña del DNI con icono específico por tipo.
- **Submit con DNI sin sugerencias** → toast "No encontramos a nadie activo con ese DNI..." (no "formato inválido").
- **Submit con apellido y 1 sugerencia visible** → autopick + diagnóstico se carga sin click extra.
- **Submit con apellido y 3+ sugerencias** → toast warning "Seleccioná una persona...".
- Item template: avatar con icono distinto por E/P/D/APO + badge tipo con tinte correspondiente.

---

## RESULTADO (cierre local 2026-04-28 — v1, rolled back)

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
