> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 30 · **Chat**: FE UX polish (post-cierre) · **Fase**: micro-ajuste del Tab A · **Estado**: ⏳ pendiente arrancar — trabajo derivado del chat `040` (Plan 30 FE Chat 3+4 combinado, commit `b7f2f60`).

---

# Plan 30 FE UX — Subdividir Tab "Gap del día" en sub-tabs Resumen | Detalle

## PLAN FILE

Plan canónico: inline en `.claude/plan/maestro.md` sección **"🟡 Plan 30 —
Dashboard Visibilidad Admin"**. El Plan 30 ya quedó **100% funcional** en el
commit `b7f2f60`; este chat es un **ajuste UX** acordado con el usuario al
revisar la pantalla recién entregada:

> "hay mucho en el tab del gap del día y el tab del diagnostico por correo
> realmente tiene poco contenido, no me quejo de que tenga poco pero uno con
> mucho contenido debería subdividirse."

No abre una fase nueva del Plan 30, es un commit `refactor(admin)` puntual.

## OBJETIVO

Dentro de la pantalla `/intranet/admin/email-outbox/diagnostico`, tab principal
"Gap del día", **dividir el contenido actual en 2 sub-tabs anidados**:

- **Resumen** (default): 9 stat cards (3 generales + 6 desglose).
- **Detalle**: las 3 tablas drill-down (entradas sin correo, estudiantes sin
  correo apoderado, apoderados blacklisteados), con **badge numérico en el tab
  de "Detalle" = total del gap** (suma de las 5 razones del gap), para que el
  admin vea de un vistazo si vale la pena abrirlo.

Replicar el patrón canónico que ya usa la pantalla
`email-outbox-dashboard-dia` dentro del proyecto (sub-tabs Resumen | Detalle
con badge). El Tab "Diagnóstico por correo" **no se toca** — su contenido es
lineal y corto por diseño.

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** el patrón canónico que ya existe para ver estilo exacto del badge
   + anidación de `<p-tabs>`:

   ```
   src/app/features/intranet/pages/admin/email-outbox-dashboard-dia/
     ├── email-outbox-dashboard-dia.component.html   # ← tabs Resumen/Detalle con badge
     └── email-outbox-dashboard-dia.component.ts     # ← computed para badge
   ```

   El HTML muestra el patrón exacto del tag `<span class="tab-badge">` condicional
   en el tab Detalle.

2. **Leer** el estado actual del tab que vamos a refactorizar:

   ```
   src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/
     ├── tab-correos-dia.component.ts
     ├── tab-correos-dia.component.html
     └── tab-correos-dia.component.scss
   ```

   Solo se tocan estos 3 archivos. El resto de la carpeta (components/,
   services/, models/, pipes/) queda idéntico.

3. **Confirmar** que `TabsModule` de PrimeNG ya está disponible en el proyecto
   (lo usa la pantalla shell del diagnóstico y el dashboard-dia — no hay que
   instalar nada).

## DECISIONES YA CERRADAS (del chat `040`)

No hay decisiones nuevas para pedir al usuario — la propuesta aceptada en el
chat previo ya define todo:

| Decisión | Valor aceptado |
|---|---|
| ¿Subdividir Tab "Gap del día"? | **Sí**, en 2 sub-tabs Resumen \| Detalle |
| ¿Tocar Tab "Diagnóstico por correo"? | **No**, se queda igual (contenido ya balanceado) |
| ¿Patrón a replicar? | **El del `email-outbox-dashboard-dia`** (sub-tabs anidados + badge) |
| ¿Tab default? | **Resumen** (el admin quiere el vistazo rápido primero) |
| ¿Badge en qué tab? | **Detalle** (= total del gap, solo aparece si > 0) |
| ¿Persistir el sub-tab activo en URL? | **No** — complicaría innecesariamente (el tab-principal ya está en `?tab=`, anidar sería ruido). |

Si el usuario aparece con una duda al arrancar, proponer lo mismo. No hay
zonas grises.

## ALCANCE

Ruta raíz: `src/app/features/intranet/pages/admin/email-outbox-diagnostico/tab-correos-dia/`

### Archivos a modificar (3, ninguno nuevo)

| # | Archivo | Cambio | Líneas aprox. |
|---|---------|--------|--------------:|
| 1 | `tab-correos-dia.component.ts` | Agregar `TabsModule` al `imports`; agregar computed `totalGap` (suma de las 5 razones del gap desde el `resumen` del vm) | +15 |
| 2 | `tab-correos-dia.component.html` | Envolver `<app-correos-dia-header>` (se queda afuera — NO dentro de los sub-tabs) + sub-tabs `<p-tabs>` con 2 `<p-tabpanel>`. Panel "resumen": solo `<app-correos-dia-resumen>` + skeleton stats. Panel "detalle": los 3 `<app-*-table>` + sus skeletons de tabla, con badge condicional en el tab trigger | reescritura ligera del `<!-- #region Tablas drill-down -->` |
| 3 | `tab-correos-dia.component.scss` | Estilo del `tab-badge` (pill numérica, idéntico al del dashboard-dia — copiar el selector) | +10 |

### Esqueleto esperado del HTML

```html
<!-- #region Header (se queda arriba, fuera de los sub-tabs) -->
<app-correos-dia-header
  [fechaConsulta]="vm().fechaConsulta"
  [generatedAt]="vm().generatedAt"
  [loading]="vm().loading"
  (refresh)="onRefresh()"
  (fechaChange)="onFechaChange($event)"
/>
<!-- #endregion -->

<!-- #region Sub-tabs Resumen | Detalle -->
<p-tabs value="resumen" class="gap-subtabs">
  <p-tablist>
    <p-tab value="resumen">
      <i class="pi pi-th-large"></i>
      <span>Resumen</span>
    </p-tab>
    <p-tab value="detalle">
      <i class="pi pi-list"></i>
      <span>Detalle</span>
      @if (totalGap() > 0) {
        <span class="tab-badge">{{ totalGap() }}</span>
      }
    </p-tab>
  </p-tablist>

  <p-tabpanels>
    <!-- Sub-tab 1: Resumen -->
    <p-tabpanel value="resumen">
      @if (vm().loading && !hasData()) {
        <app-stats-skeleton [count]="3" iconPosition="right" />
      } @else if (vm().resumen; as resumen) {
        <app-correos-dia-resumen [resumen]="resumen" />
      }
    </p-tabpanel>

    <!-- Sub-tab 2: Detalle -->
    <p-tabpanel value="detalle">
      <div class="tables-stack">
        <!-- Entradas sin correo enviado — la más importante, va primero -->
        @if (vm().loading && !hasData()) {
          <app-table-skeleton [columns]="entradasColumns" [rows]="8" />
        } @else if (hasData()) {
          <app-entradas-sin-correo-table [data]="vm().entradasSinCorreoEnviado" />
        }

        <!-- Grid 2 columnas: estudiantes sin correo + apoderados blacklisteados -->
        <div class="tables-grid">
          <div class="tables-grid__left">
            @if (vm().loading && !hasData()) {
              <app-table-skeleton [columns]="listaSimpleColumns" [rows]="5" />
            } @else if (hasData()) {
              <app-estudiantes-sin-correo-table [data]="vm().estudiantesSinCorreo" />
            }
          </div>

          <div class="tables-grid__right">
            @if (vm().loading && !hasData()) {
              <app-table-skeleton [columns]="blacklistColumns" [rows]="5" />
            } @else if (hasData()) {
              <app-apoderados-blacklisteados-table [data]="vm().apoderadosBlacklisteados" />
            }
          </div>
        </div>
      </div>
    </p-tabpanel>
  </p-tabpanels>
</p-tabs>
<!-- #endregion -->
```

### Esqueleto del computed del badge (TS)

```typescript
readonly totalGap = computed(() => {
  const r = this.vm().resumen;
  if (!r) return 0;
  return (
    r.estudiantesSinCorreoApoderado +
    r.correosApoderadosBlacklisteados +
    r.correosFallidos +
    r.correosPendientes +
    r.correosFaltantes
  );
});
```

Nota: el `CorreosDiaResumenComponent` ya tiene un `totalGap` idéntico internamente
(ver su `.ts` — línea ~90). Si se prefiere, **mover ese computed al vm del store**
o al facade para no duplicarlo. Decidir al arrancar:

- **Opción quick**: duplicar la suma en el contenedor (≤10 líneas). Aceptable —
  el pipe de los 5 campos es trivial.
- **Opción limpia**: agregar `readonly totalGap = computed(...)` al
  `CorreosDiaStore` y exponerlo en el `vm()` → consumirlo desde ambos lados.

Preferir **Opción limpia** (evita duplicación y mantiene el store como fuente
única). Si se ve que toca ajustar demasiados specs del store al hacerlo, fallback
a Opción quick con un comentario `// Duplicado intencional con CorreosDiaResumenComponent.totalGap`.

### SCSS del badge (copiar del `email-outbox-dashboard-dia.component.scss`)

Revisar el selector exacto que usa `dashboard-dia` — es algo como:

```scss
.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.4rem;
  margin-left: 0.35rem;
  border-radius: 0.7rem;
  background: var(--red-500);
  color: var(--white-color);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
}
```

Copiar lo que esté en el molde (no reinventar).

## TESTS MÍNIMOS

No hay tests previos en esta pantalla (se difirieron en el chat `040` por
volumen). Este chat **tampoco agrega tests nuevos** como objetivo — es un
ajuste UX puramente de layout. Si el usuario los quiere, abrir micro-chat
separado después.

### Validación manual mínima

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Abrir `/intranet/admin/email-outbox/diagnostico` | Tab principal "Gap del día" activo por default, sub-tab "Resumen" activo por default, muestra solo los stat cards |
| 2 | Click en sub-tab "Detalle" | Cambia a las 3 tablas; si hay gap, el badge numérico aparece en el header del tab |
| 3 | Si `totalGap() === 0` | El badge NO aparece en el tab "Detalle" |
| 4 | Cambiar fecha en el date picker | Header se queda arriba (fuera de los sub-tabs); sub-tabs se mantienen en el activo; datos se refrescan en ambos |
| 5 | Click en tab principal "Diagnóstico por correo" + volver a "Gap del día" | Sub-tab activo se preserva correctamente |

## REGLAS OBLIGATORIAS

- **Standalone components + OnPush** — el `tab-correos-dia.component.ts` ya lo es,
  mantenerlo.
- **Signals** — el `totalGap` debe ser `computed()`, no un método ni un getter.
- **PrimeNG TabsModule**: el proyecto usa el componente nuevo `<p-tabs>` /
  `<p-tab>` / `<p-tabpanels>` / `<p-tabpanel>` (no el legacy `p-tabView`).
- **Diseño**: sub-tabs anidados SIEMPRE dentro del tab principal — el header
  (`<app-correos-dia-header>`) se queda **afuera** de los sub-tabs (es
  compartido por ambos).
- **Regiones HTML / SCSS** (ver `rules/regions.md`) — usar `<!-- #region -->`
  para separar Header + Sub-tabs.
- **Color tokens** (ver `rules/design-system.md` §8) — el badge usa
  `var(--red-500)` + `var(--white-color)`. Sin hex literales.
- **No tocar** los 5 sub-componentes (`correos-dia-header`, `correos-dia-resumen`,
  `estudiantes-sin-correo-table`, `apoderados-blacklisteados-table`,
  `entradas-sin-correo-table`), ni el store, ni el facade, ni los modelos.

## APRENDIZAJES TRANSFERIBLES (del chat `040`)

### Estructura de la carpeta ya montada

```
src/app/features/intranet/pages/admin/email-outbox-diagnostico/
├── _table-section.scss                 # Partial compartido por las 6 tablas (no tocar)
├── email-outbox-diagnostico.component.{ts,html,scss}  # Shell con <p-tabs> principales (no tocar)
├── index.ts
├── tab-correos-dia/                    # ← Solo aquí se toca
│   ├── tab-correos-dia.component.{ts,html,scss}  # ← 3 archivos a modificar
│   ├── components/{header, resumen, 3 tablas drill-down}  # no tocar
│   ├── models/correos-dia.models.ts    # no tocar
│   ├── pipes/razon-label.pipe.ts       # no tocar
│   └── services/{service, store, facade, index}  # no tocar (salvo agregar `totalGap` al store si elige Opción limpia)
└── tab-correo-individual/              # No tocar — Tab "Diagnóstico por correo" se queda igual
```

### Patrón anidado `<p-tabs>`

El proyecto ya tiene `<p-tabs>` anidado en `email-outbox-dashboard-dia` (mismo
nivel del feature). No hay problemas de CSS ni de z-index. Los valores de
`value=` son strings arbitrarios, basta con que sean únicos dentro de cada
nivel.

### Regla `structure/no-deep-relative-imports`

Ya se sorteó en el chat `040` moviendo `models/` y `pipes/` DENTRO de cada tab.
Mantener los imports relativos a máximo 2 niveles (`../`, `../../`). No bajar
nada más profundo.

### Query params del shell

El shell lee `?tab=gap|correo` y `?correo=...`. Los sub-tabs del Tab "Gap del día"
**NO** se sincronizan con URL (decisión cerrada arriba). Si en el futuro se
decide agregar `?subtab=resumen|detalle`, se hace en otro micro-chat.

### `totalGap` ya existe en `CorreosDiaResumenComponent`

En `tab-correos-dia/components/correos-dia-resumen/correos-dia-resumen.component.ts`
hay un computed `totalGap` con la misma fórmula. Considerar moverlo al store
(Opción limpia) para que el tab container lo consuma del mismo lugar que el
sub-componente del resumen — evita que un cambio en la fórmula tenga que
tocarse en dos sitios.

### Comandos de validación

```bash
npm run lint
npm run build
```

Ambos estaban limpios al cerrar el chat `040`. Si al arrancar hay
regresiones nuevas, son de otra sesión.

## FUERA DE ALCANCE

- ❌ **Tocar el Tab "Diagnóstico por correo"** — decisión explícita del usuario
  ("no me quejo de que tenga poco pero uno con mucho contenido debería
  subdividirse"). Su contenido se queda igual.
- ❌ **Cambiar tests** — no hay tests previos en esta pantalla y este chat no
  los agrega. Si el usuario los pide, micro-chat separado.
- ❌ **Cambiar lógica del store, facade o service** — salvo la opción limpia de
  mover `totalGap` al store si se elige esa ruta.
- ❌ **Agregar nuevos sub-componentes** — el trabajo es puramente de layout.
- ❌ **Sincronizar sub-tabs con URL query params** — fuera de scope.
- ❌ **Persistir sub-tab activo en localStorage o sessionStorage** — no tiene
  sentido práctico, son dos vistas del mismo DTO.
- ❌ **Tocar el partial SCSS compartido `_table-section.scss`** — no hace falta.
- ❌ **Refactorizar el `CorreosDiaResumenComponent`** — su layout interno
  (stat cards 3+6) ya es correcto. Solo se envuelve en un tabpanel, no se
  reestructura.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 5 min)
[ ] Leer `email-outbox-dashboard-dia.component.html` — confirmar estructura del <p-tabs> anidado con badge
[ ] Leer `email-outbox-dashboard-dia.component.scss` — confirmar selector exacto `.tab-badge`
[ ] Leer el `tab-correos-dia.component.html` actual — confirmar qué reemplazar

EJECUCIÓN
[ ] tab-correos-dia.component.ts: agregar TabsModule al imports + computed totalGap (Opción limpia en store O Opción quick local)
[ ] tab-correos-dia.component.html: envolver contenido en <p-tabs>/<p-tabpanels> con 2 sub-tabs (Resumen + Detalle con badge condicional)
[ ] tab-correos-dia.component.scss: agregar `.tab-badge` copiado del dashboard-dia
[ ] Header (<app-correos-dia-header>) queda AFUERA de los sub-tabs, visible siempre arriba

VALIDACIÓN
[ ] `npm run lint` limpio (sin nuevos warnings en la carpeta `email-outbox-diagnostico/`)
[ ] `npm run build` OK
[ ] Smoke manual en `/intranet/admin/email-outbox/diagnostico`:
    1. Default carga en sub-tab "Resumen" — solo muestra stat cards
    2. Click en "Detalle" — muestra las 3 tablas; badge numérico si gap > 0
    3. Badge oculto si gap = 0
    4. Cambiar fecha en header → ambos sub-tabs refrescan datos
    5. Cambiar a tab principal "Diagnóstico por correo" y volver → sub-tab activo se preserva

INVARIANTES (igual que el chat 040)
[ ] OnPush en el componente modificado
[ ] Imports con alias (@core, @shared, @intranet-shared) — no tocar alias existentes
[ ] Regiones HTML/SCSS mantenidas
[ ] Tokens de color (no hex literales en `.tab-badge`)
[ ] No hay `console.log` nuevos

MAESTRO + CIERRE
[ ] Commit separado: `refactor(admin): Plan 30 FE — gap subtabs Resumen|Detalle` (ver mensaje abajo)
[ ] Mover este archivo a `.claude/chats/closed/041-...md` al cerrar
[ ] Actualizar `maestro.md` Plan 30: agregar línea del refactor UX post-cierre bajo la nota del commit `b7f2f60`
[ ] Cola top 3: si Plan 30 ya estaba a 100% antes, sigue a 100%. Este refactor no cambia el porcentaje. El Plan 30 ya estaba cerrado conceptualmente.
[ ] Commit docs separado (opcional, solo si toca maestro): `docs(maestro): Plan 30 FE UX polish — subtabs Gap`
```

## COMMIT MESSAGE sugerido

### Commit A — refactor (educa-web main)

**Subject** (≤ 72 chars):

```
refactor(admin): Plan 30 FE — gap subtabs "Resumen | Detalle"
```

**Body**:

```
Split the "Gap del día" tab of
"/intranet/admin/email-outbox/diagnostico" into two nested sub-tabs
following the canonical pattern already used in "email-outbox-dashboard-dia".

 - Sub-tab "Resumen" (default) shows the 9 stat cards (3 "Universo del
   día" + 6 "Desglose del gap").
 - Sub-tab "Detalle" shows the three drill-down tables ("entradas sin
   correo enviado", "estudiantes sin correo apoderado", "apoderados
   blacklisteados") with a numeric badge on the tab header equal to
   the total gap across the five reasons ("SIN_CORREO", "BLACKLISTED",
   "FALLIDO", "PENDIENTE", "SIN_RASTRO"). The badge is hidden when
   the gap is zero.
 - The date picker header ("app-correos-dia-header") stays above the
   sub-tabs so switching between "Resumen" and "Detalle" keeps the
   same date filter active in both views.
 - The "Diagnóstico por correo" tab is unchanged — its linear flow
   (input → result) already fits in one view per user feedback.

The underlying store, facade, service, models and the five
sub-components are untouched; only the tab container layout is
reorganised. "totalGap" is computed once in the store and consumed
by both the tab header (for the badge) and the existing resumen
component (deduplicating the formula).

Lint + build OK.
```

### Commit B — docs-maestro (opcional, solo si se toca maestro.md)

**Subject**:

```
docs(maestro): Plan 30 FE UX — subtabs "Gap del día"
```

Cuerpo corto: nota de 2-3 líneas que el Plan 30 cerrado al 100% recibió un
ajuste UX post-cierre, commit hash de referencia.

## CIERRE

Feedback a pedir al cerrar este chat:

1. **¿El badge numérico ayuda al admin?** Smoke manual post-deploy: cuando el
   total del gap es alto, ¿el admin lo nota y abre "Detalle"? Si es bajo, ¿no
   estorba?
2. **¿El Tab "Diagnóstico por correo" sigue OK?** Confirmar que el balance
   entre ambos tabs principales se sintió correcto después del refactor.
3. **¿Hay otras pantallas con el mismo problema?** Si este patrón (sub-tabs
   Resumen/Detalle) ayuda, puede aplicarse a otras pantallas admin con
   contenido denso — evaluar si vale un sprint de polish UX transversal.
4. **Cola top 3 post-cierre**: el Plan 30 queda 100% cerrado sin cambios en la
   cola. Los siguientes ítems siguen siendo (1) Plan 31 Chat 2 (cuando
   desbloquée), (2) Plan 24 Chat 4, (3) frente nuevo según feedback.
