> **Repo destino**: `educa-web` (frontend) — no toca `Educa.API`.
> **Plan**: 79 (coord, `xrepo-79-primeng-replacement-library.md`) · **Fase**: F6 · **Creado**: 2026-08-22 · **Estado**: ⏳ abierto.
> **Depende de**: brief 587 (`educa-libs`, F6 prep) — **debe estar shippeado y mergeado a `main` de `educa-libs` antes de arrancar este brief**. 587 completa `edu-ui` (IconField/InputIcon + 2 fixes de fidelidad) para que la migración no herede bugs conocidos.
> **exclusive**: `true` — este brief toca ~277 archivos (la mayoría del codebase de `educa-web`), no es seguro correr otro chat en paralelo tocando cualquier componente/página mientras este está activo.

---

# 588 — P79 F6: swap PrimeNG → EduUI en educa-web

## Contexto

Última fase de ejecución de P79 antes de F7 (destrabar Angular 22 / P70). A diferencia de F1-F5 (desarrollo de librería en `educa-libs`, sin tocar `educa-web`), este brief **es la migración real**: reemplazar todo uso de PrimeNG en `educa-web` por `edu-ui`, y remover `primeng` del `package.json`.

**Audit completo de footprint hecho el 2026-08-22** (antes de este brief): 277 archivos distintos tocan PrimeNG (242 vía tags `<p-*>`, 220 vía directivas de atributo — con overlap). Con brief 587 shippeado, la librería `edu-ui` cubre el 100% de lo auditado (36 piezas: los 34 de F1-F5 + IconField/InputIcon de 587).

A diferencia de F1-F5, **este brief NO es paralelizable en múltiples worktrees** — el overlap de archivos entre "familias" de componentes es demasiado alto (una misma página suele mezclar Table + Tag + Button + Tooltip), así que dos worktrees tocando el mismo archivo generarían conflictos constantes. Es un solo esfuerzo secuencial, coordinado, en una sola rama.

## Scope

### Superficies de migración (por riesgo, de menor a mayor)

| Superficie | Alcance | Riesgo | Nota |
|---|---|---|---|
| Selectores de elemento `<p-*>` → `<edu-*>` | ~230 archivos, 42 tags distintos | Bajo | Find-replace mecánico 1:1 — nombre de tag + imports (`primeng/tag` → `@area-sistemas-deochryso/edu-ui`). |
| `primeng/api` (`ConfirmationService`, `MessageService`, `MenuItem`) | 47 archivos | Bajo | Rename de import + tipo, misma forma de API (verificado en F2a/F4). |
| `pTooltip`/`pInputText`/`pTextarea` (directivas) | 140/60/23 archivos | Bajo-medio | Directivas ya existen en `edu-ui` con el mismo nombre de atributo (`eduTooltip`, `eduInputText`, `eduTextarea`) — rename de selector + import, sin reescritura estructural. |
| `pTemplate="..."` | 31 archivos, 62 usos | Bajo (a confirmar) | `EduTemplate` (583) ya soporta esta sintaxis legacy como alias — probablemente solo cambia el import, sin tocar el markup. **Confirmar con 2-3 casos reales antes de asumir que aplica a los 31 sin excepción.** |
| `pSortableColumn` | 15 archivos | Bajo | `edu-sortable-column` (583) ya maneja el ícono de sort internamente — confirmado, no requiere `p-sortIcon` aparte. |
| **`pButton` (directiva legacy sobre `<button>` nativo)** | **166 archivos, 485 usos** | **Alto** | La superficie más grande del codebase y la única que requiere **reescritura estructural**, no rename: `<button pButton label="X" icon="pi pi-x" [outlined]="true">` → `<edu-button label="X" icon="pi pi-x" [outlined]="true">` (elemento distinto, no atributo). Automatizar con codemod + revisar una muestra manual antes de aplicar a los 166; los casos con lógica condicional compleja en el `<button>` (múltiples directivas Angular combinadas) son los que más probablemente rompan un regex simple. |

### Pasos secuenciales dentro del brief

1. **Automatizar lo mecánico primero** (tags de elemento + `primeng/api` + directivas de rename simple) — script de codemod, no edición manual archivo por archivo.
2. **`pButton` en lotes** — dado el riesgo, migrar en tandas verificables (por feature/módulo, no los 166 de una), corriendo build + un smoke visual entre lotes.
3. **`app.config.ts`** — remover `providePrimeNG(...)` + import de `Aura`/`@primeng/themes/aura`. Verificar que `ThemeService` (acoplado al `darkModeSelector` del preset) siga funcionando solo con el mecanismo de `.dark-mode` de `edu-ui` (ya es el mismo convenio, confirmado desde F1).
4. **`package.json`** — remover `primeng` y `@primeng/themes` (NO remover `primeicons` — fuera de scope, ver nota abajo). Agregar `@area-sistemas-deochryso/edu-ui` (y `@angular/cdk` si no está ya) como dependencia real.
5. **`angular.json`/`styles.scss`** — remover cualquier import/asset de PrimeNG CSS que no sea PrimeIcons.
6. **Validación completa**: build de producción, suite de tests (unit + e2e Playwright), suite de regresión visual de `edu-ui` (586) corrida contra las páginas reales de `educa-web` post-swap, verificar delta de tamaño de bundle (debería bajar, no subir — PrimeNG es más grande que `edu-ui`).

### Nota — PrimeIcons fuera de scope

Confirmado con evidencia directa (`node_modules/primeicons/LICENSE`, MIT, sin tier comercial/dual) que PrimeIcons no tiene conflicto de licencia con la motivación de P79 (que es específicamente sobre PrimeNG, dual-licenciado desde 2026-06-28). **No tocar** `primeicons` en este brief — permanece como dependencia (360 archivos, 2013 usos de clases `pi pi-*`), wireado igual que hoy (`angular.json` + `styles.scss`).

## Out of scope

- PrimeIcons (ver nota arriba).
- Cualquier feature nueva o cambio de comportamiento — esto es un swap 1:1, no una oportunidad de rediseño.
- F7 (destrabar P70/Angular 22) — es la fase siguiente, gateada por este brief pero no parte de él.
- Componentes de `edu-ui` no cubiertos por 587 — si el audit de este brief encuentra algo más no auditado, **frenar y reportar**, no improvisar un componente nuevo a mitad de la migración.

## Deliverable

- Los 277 archivos migrados de `p-*`/`pButton`/`pTooltip`/etc. a `edu-*`/`eduButton`/`eduTooltip`/etc.
- `primeng`, `@primeng/themes` removidos de `package.json`. `primeicons` intacto.
- `app.config.ts` sin `providePrimeNG`, `ThemeService` funcionando igual.
- Build de producción verde, bundle size delta documentado (esperado: reducción).
- Suite de tests (unit + e2e) verde. Regresión visual de `edu-ui` corrida contra `educa-web` real, sin diffs fuera del umbral.

## Criterio de cierre

- [ ] Superficies mecánicas migradas (tags de elemento, `primeng/api`, directivas de rename simple)
- [ ] `pButton` migrado en los 166 archivos, verificado por lotes
- [ ] `pTemplate` confirmado como no-touch (o migrado si algún caso real lo requiere)
- [ ] `app.config.ts` limpio de PrimeNG, `ThemeService` verificado funcionando
- [ ] `primeng`/`@primeng/themes` removidos de `package.json`, `primeicons` intacto
- [ ] Build de producción verde, bundle size delta documentado
- [ ] Suite de tests (unit + e2e Playwright) verde
- [ ] Regresión visual de `edu-ui` (586) corrida contra `educa-web` post-swap, sin diffs fuera del umbral

## Tiempo estimado

Effort alto — 277 archivos, con `pButton` (166 archivos) como el único punto de riesgo estructural real. Estimar 2-3+ sesiones de `/execute`, posiblemente con subagentes despachados por lote (mismo mecanismo que `execute.md` ya define para ≥3 tareas independientes) dentro de la misma rama/worktree — no como worktrees paralelos separados.
