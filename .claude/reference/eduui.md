# edu-ui

Librería de componentes propia (CDK-based) que reemplazó a PrimeNG en el swap de P79 F6 (brief 588, 277 archivos migrados). Vendorizada en `src/app/shared/edu-ui/` (fuente de verdad vive en `educa-libs`, re-sync manual ante cambios — ver `public-api.ts`). Tema Aura preservado vía tokens propios. Dark mode con clase `.dark-mode`.

> **Para estructura recomendada por componente** (stat card, tabla, filter bar, dialogs, drawers, alert banners): ver `reference/design-system.md` sección 7 (pautas B1-B11). Esta regla cubre cómo importar y usar edu-ui; el design-system cubre cómo ensamblar los componentes en páginas consistentes.

## Importar componentes

Todo se importa desde el alias `@edu-ui` (barrel `src/app/shared/edu-ui/public-api.ts`), no por componente individual:

```typescript
import { EduButton, EduSelect, EduDialog, EduTable } from '@edu-ui';
import type { EduPaginatorPageEvent } from '@edu-ui';

@Component({
  imports: [EduButton, EduSelect, EduDialog, EduTable],
})
```

## Componentes más usados

| Componente | Selector | Uso |
|------------|----------|-----|
| Button | `edu-button` | Botones con iconos, `severity`/`size`/`text` |
| Table | `edu-table` | Tablas semánticas (`<table>` real, no CdkTable) con `eduSortableColumn` |
| Dialog | `edu-dialog` | Modales, ver regla de slots abajo |
| Drawer | `edu-drawer` | Paneles laterales, mismo patrón de slots que Dialog |
| InputText | `edu-input-text` | Inputs de texto |
| Select | `edu-select` | Dropdowns (`optionLabel`/`optionValue` como PrimeNG) |
| MultiSelect | `edu-multi-select` | Selección múltiple |
| DatePicker | `edu-datepicker` | Selector de fecha (`single`/`range`/`multiple`, popup o inline) |
| Toast | `edu-toast` + `EduMessageService` | Notificaciones (`providedIn: 'root'` por defecto) |
| ConfirmDialog | `edu-confirm-dialog` + `EduConfirmationService` | Confirmaciones |
| Popover | `edu-popover` | Ver regla de contenido abajo |

## Regla CRÍTICA: appendTo="body" en overlays anclados

**SIEMPRE** usar `appendTo="body"` en `edu-select`, `edu-multi-select`, `edu-autocomplete`, `edu-datepicker` y `edu-popover` — igual que en la era PrimeNG. Internamente usan CDK Overlay (`EduOverlayHandle` con `flexibleConnectedTo`), pero el input se mantiene por compatibilidad de API y para evitar regresiones de z-index/overflow dentro de diálogos o contenedores con `overflow: hidden`.

```html
<edu-select
  [options]="options()"
  [optionLabel]="'label'"
  [optionValue]="'value'"
  [(ngModel)]="selected"
  appendTo="body"
/>
```

## Regla CRÍTICA: contenido de `edu-popover` va en `<ng-template>`, no `<ng-content>`

`EduPopover` captura su contenido como `TemplateRef` (`contentChild(TemplateRef)`) para poder proyectarlo dentro del `TemplatePortal` del overlay. Si el consumidor pone el contenido directo (sin envolver en `<ng-template>`), el popover renderiza vacío — este fue el bug crítico de P79 F9 (rompía el menú de perfil, sin forma de cerrar sesión desde la UI).

### ✅ CORRECTO

```html
<edu-popover #myPopover appendTo="body">
  <ng-template>
    <div class="popover-content">...</div>
  </ng-template>
</edu-popover>

<button (click)="myPopover.toggle($event)">Abrir</button>
```

### ❌ INCORRECTO

```html
<!-- Sin <ng-template> — el popover no tiene contenido que proyectar -->
<edu-popover #myPopover appendTo="body">
  <div class="popover-content">...</div>
</edu-popover>
```

## Regla CRÍTICA: slots de header/footer en Dialog/Drawer vía `<ng-template>` nombrado

`EduDialog`/`EduDrawer` capturan header y footer con `contentChild<TemplateRef<unknown>>('header')` / `('footer')` — requieren `<ng-template #header>` / `<ng-template #footer>`, no proyección directa. Sin esto, el diálogo no tiene error visible pero los botones de acción (ej. Guardar/Cancelar) quedan invisibles — bug crítico encontrado y cerrado en P79 F6g.

```html
<edu-dialog [(visible)]="showDialog" header="Crear evento">
  <div class="form-body">...</div>

  <ng-template #footer>
    <edu-button label="Cancelar" [text]="true" (click)="showDialog.set(false)" />
    <edu-button label="Guardar" (click)="onSave()" />
  </ng-template>
</edu-dialog>
```

## Por qué es necesario (overlays)

- **Diálogos**: sin `appendTo="body"`, el overlay puede quedar atrapado con z-index menor dentro del dialog padre.
- **Overflow hidden**: contenedores con `overflow: hidden` cortan el overlay si no se ancla a `body`.
- **Popover cerca de bordes del viewport**: `edu-popover` solo tiene posiciones ancladas por el borde izquierdo del trigger — cerca del borde derecho del viewport puede caer a un fallback que solapa otros elementos (hallazgo no resuelto de brief 605, ver `xrepo-79-primeng-replacement-library.md` F9/F10). Si un popover nuevo se ve desalineado cerca del borde, es este bug conocido, no un error de implementación del consumidor.

## UiMappingService - Helpers compartidos

Sin cambios respecto a la era PrimeNG — es un servicio propio de la app, no de la librería de componentes.

```typescript
import { UiMappingService } from '@shared/services';

readonly uiMapping = inject(UiMappingService);

// En template
{{ uiMapping.getModuloFromRuta(ruta) }}
{{ uiMapping.getRolSeverity(rol) }}
{{ uiMapping.getEstadoSeverity(estado) }}
{{ uiMapping.getModulosCount(vistas) }}
```

## Ver también

- `src/app/shared/edu-ui/public-api.ts` — barrel completo, comentado por fase de migración (F1-F6).
- `educa-coord/plans/xrepo-79-primeng-replacement-library.md` — historia completa del swap y los 3 gaps de fidelidad visual encontrados post-migración (F8/F9).
