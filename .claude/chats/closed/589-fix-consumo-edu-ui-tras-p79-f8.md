> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: `educa-coord/plans/xrepo-79-primeng-replacement-library.md` (P79, F8) · **Creado**: 2026-08-26 · **Estado**: ⏳ abierto.
> **Depende de**: brief 597 en `educa-libs` (F8) shippeado — trae 6 componentes con `styleClass` nuevo (`edu-tag`, `edu-message`, `edu-table`, `edu-spinner`, `edu-skeleton`, `edu-input-icon`) y el fix de `rowIndex` en `edu-table`. Este brief empieza con **re-sincronizar la copia vendorizada** en `src/app/shared/edu-ui/` desde `educa-libs` main antes de tocar nada más.

---

# 589 — Fix de consumo de `edu-ui` encontrados en la auditoría de fidelidad visual (P79 F8)

## Contexto

La auditoría de fidelidad visual `edu-ui` vs. PrimeNG (brief 597, `educa-libs`) comparó en vivo `educa-web` local (con `edu-ui`, sin Angular 22) contra `educa.com.pe/intranet` real (PrimeNG). De los 4 gaps confirmados, 2 tienen causa raíz en `educa-libs` (ya corregidos en 597: `edu-tag` sin soporte de `styleClass`, `edu-table` con el nombre de contexto `index` en vez de `rowIndex`). Los otros 2 (+ 1 hallazgo adicional del barrido ampliado) tienen causa raíz acá, en `educa-web`.

## Hallazgos a corregir

1. **`usuarios-table.component.ts` no importa `EduSortableColumn`.** Los headers NOMBRE/ROL/FECHA de la tabla de Usuarios (`/admin/usuarios`) usan `eduSortableColumn="..."` pero el directive standalone no está en el array `imports` del componente (comparar con `cursos.component.ts:12`, que sí lo importa). Sin el import, Angular trata el atributo como texto plano — no hay error de compilación porque no usa sintaxis de binding (`[eduSortableColumn]`), solo atributo estático. Resultado: sin íconos de sort, sin click-to-sort. Confirmado en vivo (DOM inspection): `hasSortableClass: false` en los 3 headers.
   - Archivo: `src/app/features/intranet/pages/admin/users/components/usuarios-table/usuarios-table.component.ts:14`
   - Fix: agregar `EduSortableColumn` al array `imports` (importarlo desde `@edu-ui` igual que en `cursos.component.ts:12`).

2. **`.grados-button` en `cursos.component.scss:429` no llega al `<button>` interno de `edu-button`.** El botón "N grados" en `/admin/cursos` debería verse outline/secundario (como en PrimeNG real) pero se ve filled sólido. La regla `.grados-button { background: transparent !important; border: 1px solid ...; }` fue escrita para cuando `styleClass`/`class` caía directo sobre el `<button>` nativo de `p-button`. Con `edu-button`, `class="grados-button"` en `<edu-button>` (`cursos.component.html:141`) queda en el elemento **host**, no llega al `<button class="edu-button">` interno — mismo patrón de encapsulación ya documentado en F3b (brief 583, `edu-table`).
   - Archivo: `src/app/features/intranet/pages/admin/cursos/cursos.component.scss:429`
   - Fix — dos opciones válidas, evaluar cuál es más consistente con el resto del código:
     a. `::ng-deep .grados-button .edu-button { ... }` (mismo mecanismo que usaron en F3b para `.edu-table`), o
     b. reemplazar el CSS override por las props semánticas reales de `edu-button`: `[outlined]="true"` (y opcionalmente `severity="secondary"`) en vez de la clase custom — más alineado con el resto de la migración P79, que prefirió props declarativas sobre overrides de CSS. **Recomendado.**

3. **Restaurar `.tag-neutral` con el selector correcto.** El commit `986ea325` ("refactor(styles): remove dead PrimeNG CSS + fix raw --p-* value refs (paso 5)") borró la regla `.p-tag.tag-neutral` pensando que era CSS muerto — pero no era muerto, estaba roto por partida doble: (1) `edu-tag` no soportaba `styleClass` como input (ya corregido en 597), así que la clase nunca llegaba a ningún elemento real; (2) aunque llegara, el selector viejo apuntaba a `.p-tag`, clase que ya no existe tras el swap a `edu-tag`. Confirmado en vivo contra producción: el tag "Administrador" en PrimeNG real usa clases `p-component p-tag p-tag-danger tag-neutral` con `background: rgb(227,227,227)` — gris neutro — mientras que en `edu-ui` (aún sin este fix) se ve rojo/salmón (`severity="danger"` sin el override). Afecta potencialmente **~80 call-sites** que usan `styleClass="tag-neutral"` en `<edu-tag>` (grep completo: buscar `styleClass="tag-neutral"` en `src/app/**/*.html` y `*.ts`), no solo el tag de rol en Usuarios.
   - Regla original (recuperada del diff de `986ea325`, ajustar selector):
     ```scss
     .edu-tag.tag-neutral {
     	background: var(--surface-100);
     	color: var(--text-color);
     	font-weight: 600;
     }
     ```
   - Restaurar en el mismo archivo global de donde se borró (revisar `git show 986ea325 -- '*.scss'` para ubicar el archivo exacto — era parte de un bloque grande de estilos de intranet).
   - **Requisito previo**: la copia vendorizada de `edu-tag.ts` en `src/app/shared/edu-ui/` debe estar re-sincronizada con el fix de `styleClass` de 597 antes de que esta regla tenga efecto visible.

## Verificación final antes de cerrar

Los 3 checks de "Done-when" abajo solo confirman los puntos ya conocidos. Antes de dar el trabajo por terminado, repetir el mismo método de la auditoría original (597): comparar en vivo `educa-web` (post-fix, local) contra `educa.com.pe/intranet` real (PrimeNG), con la misma cuenta Administrador, sobre una muestra de páginas — no solo los 3 puntos ya identificados. Mínimo las 6 páginas que cubrió 597 (Usuarios, Cursos, Horarios, Asistencia, Rendimiento, Salones) más cualquier página nueva que use uno de los 6 componentes con `styleClass` nuevo (`edu-tag`, `edu-message`, `edu-table`, `edu-spinner`, `edu-skeleton`, `edu-input-icon`). Si aparece una diferencia nueva no cubierta por los 3 hallazgos de arriba, documentarla y decidir si bloquea el cierre o queda como brief de seguimiento — no cerrar 589 asumiendo cobertura completa sin este barrido.

## Qué NO hacer

- No tocar `educa-libs` desde este brief — los 3 hallazgos de arriba son 100% de este repo.
- No relitigar el resto de la migración P79 F1-F6 (ya cerrada).
- No re-litigar la decisión F2.1 (convención `tag-neutral`) — solo restaurar su implementación rota.

## Done-when

- [x] Tabla de Usuarios (`/admin/usuarios`) muestra íconos de sort (↑↓⇅) en NOMBRE/ROL/FECHA y el click ordena, verificado en vivo.
- [x] Botón "N grados" en `/admin/cursos` se ve outline/secundario igual que en PrimeNG real, verificado en vivo.
- [x] Tag "Administrador" (y una muestra de otros `tag-neutral`, ej. `modo-asignacion-badge` en `/admin/salones`) se ven gris neutro igual que en PrimeNG real, verificado en vivo.
- [x] Copia vendorizada de `edu-ui` en `src/app/shared/edu-ui/` re-sincronizada desde `educa-libs` main (post-597).
- [x] `npm run build` verde.
- [x] Barrido final hecho contra `educa.com.pe/intranet` real (cuenta Administrador "CODE CLAUDE", switcher de sesión guardada en ambos entornos) sobre las 6 páginas: Usuarios, Cursos, Horarios, Asistencia, Rendimiento, Salones. Sin diferencias de estilo nuevas — ver notas abajo.

### Notas del barrido (2026-08-26)

- **Hallazgo 1 no se vio corregido con el fix de import solo** — el dev server (`ng serve`, arrancado antes de la edición) no recompiló el cambio en el array `imports` del `@Component` decorator vía HMR (limitación conocida de HMR de Angular/Vite con metadata de decoradores). Requirió reinicio completo del dev server para que `EduSortableColumn` se aplicara. Sin acción de código adicional — solo operacional.
- **Hallazgo 3 (`tag-neutral`) necesitó un fix adicional no anticipado en el brief**: la regla restaurada en `styles.scss` (selector global sin scope) perdía en la cascada contra `edu-tag.scss` `[data-severity='danger']`, porque ese archivo es un stylesheet de componente con `ViewEncapsulation.Emulated` (default) — Angular le agrega el atributo `_ngcontent-*` a cada selector compilado, dándole más especificidad real que `.edu-tag.tag-neutral` aunque el conteo de clases sea igual (2 vs 2). Se agregó `!important` a `background`/`color` en la regla restaurada, consistente con el resto de `styles.scss` (todas las reglas de override global sobre componentes en ese archivo ya usan `!important` por el mismo motivo). Verificado con `getComputedStyle`: `background-color: rgb(227, 227, 227)` — coincide exacto con el valor documentado en el brief para prod.
- Backend `Educa.API` no estaba corriendo en local — se levantó (`dotnet run --launch-profile http`, puerto 5139) para poder loguear y probar contra datos reales.
- Asistencia (`/admin/asistencias`) mostró un widget de sincronización CrossChex colgado ("Encolando sincronización...") en local — es limitación esperada de dev sin integración CrossChex real configurada, no relacionado a este brief.

## Plan cross-repo

[`educa-coord/plans/xrepo-79-primeng-replacement-library.md`](../../../../educa-coord/plans/xrepo-79-primeng-replacement-library.md) — P79 F8.

## Origen

Brief 597 en `educa-libs` (`.claude/chats/`), auditoría de fidelidad visual `edu-ui` vs. PrimeNG.
