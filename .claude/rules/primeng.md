# PrimeNG

Componentes UI con tema **Aura**. Dark mode con clase `.dark-mode`.

## Importar componentes individualmente

```typescript
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';

@Component({
  imports: [ButtonModule, TableModule, DialogModule],
})
```

## Componentes más usados

| Componente | Módulo | Uso |
|------------|--------|-----|
| Button | `ButtonModule` | Botones con iconos |
| Table | `TableModule` | Tablas con sorting/filtering |
| Dialog | `DialogModule` | Modales |
| InputText | `InputTextModule` | Inputs de texto |
| Select | `Select` | Dropdowns |
| Calendar | `CalendarModule` | Selector de fecha |
| Toast | `ToastModule` | Notificaciones |
| ConfirmDialog | `ConfirmDialogModule` | Confirmaciones |

## Regla CRÍTICA: appendTo="body" en Dropdowns

**SIEMPRE** usar `appendTo="body"` en los componentes `p-select`, `p-multiselect`, `p-dropdown`, y `p-calendar` para evitar problemas de z-index y overflow cuando están dentro de diálogos o contenedores con overflow hidden.

### ✅ CORRECTO

```html
<!-- Select -->
<p-select
  [options]="options()"
  [(ngModel)]="selected"
  appendTo="body"
/>

<!-- MultiSelect -->
<p-multiselect
  [options]="options()"
  [(ngModel)]="selected"
  appendTo="body"
/>

<!-- Dropdown (legacy) -->
<p-dropdown
  [options]="options()"
  [(ngModel)]="selected"
  appendTo="body"
/>

<!-- Calendar -->
<p-calendar
  [(ngModel)]="date"
  appendTo="body"
/>
```

### ❌ INCORRECTO

```html
<!-- Sin appendTo - puede tener problemas de renderizado -->
<p-select
  [options]="options()"
  [(ngModel)]="selected"
/>

<p-multiselect
  [options]="options()"
  [(ngModel)]="selected"
/>
```

### Por qué es necesario

- **Diálogos**: Sin `appendTo="body"`, el dropdown queda atrapado dentro del dialog con z-index menor
- **Overflow hidden**: Contenedores con `overflow: hidden` cortan el dropdown
- **Scroll containers**: El dropdown no sigue correctamente el scroll del contenedor padre

## AdminUtilsService - Helpers compartidos

```typescript
import { AdminUtilsService } from '@shared/services';

readonly adminUtils = inject(AdminUtilsService);

// En template
{{ adminUtils.getModuloFromRuta(ruta) }}
{{ adminUtils.getRolSeverity(rol) }}
{{ adminUtils.getEstadoSeverity(estado) }}
{{ adminUtils.getModulosCount(vistas) }}
```
