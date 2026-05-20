# Regiones en TypeScript (// #region)

## Principio fundamental

> **"Regiones para navegar rápido, no para esconder código."**

TypeScript soporta `// #region` y `// #endregion` nativamente. VS Code las renderiza como secciones colapsables.

## Sintaxis

```typescript
// #region Nombre de la sección
// ... código ...
// #endregion
```

---

## Cuándo usar regiones

| Situación | Usar region |
|-----------|-------------|
| Archivo > 100 líneas con secciones lógicas claras | Sí |
| Store, Facade, Componente con múltiples secciones | Sí |
| Archivo corto (< 80 líneas) con pocas secciones | No |
| Dentro de una función/método | No |

---

## Regiones reemplazan `// ============`

Las regiones **reemplazan** los separadores `// ============` como mecanismo principal. **No mezclar** ambos estilos en el mismo archivo. Si tocas un archivo, migra todas las secciones a regiones.

---

## Regiones estándar por tipo de archivo

### Store (`.store.ts`)

| Region | Contenido |
|--------|-----------|
| Estado privado | `private readonly _signal = signal(...)` |
| Lecturas públicas (readonly) | `.asReadonly()` expuestos |
| Computed | `computed()` derivados |
| ViewModel | `vm = computed(() => ({...}))` |
| Comandos de mutación | Métodos `set*`, `update*`, `remove*` |
| Comandos de UI | Métodos `open*`, `close*`, `toggle*` |

### Facade (`.facade.ts`)

| Region | Contenido |
|--------|-----------|
| Dependencias | `inject()` de servicios |
| Estado expuesto | Signals/vm del store re-exportados |
| Comandos CRUD | `load`, `create`, `update`, `delete` |
| Comandos de UI | `openDialog`, `closeDialog`, etc. |
| Helpers privados | Métodos `private` de soporte |

### Component (`.component.ts`)

| Region | Contenido |
|--------|-----------|
| Dependencias | `inject()` |
| Estado del facade | Signals/vm del facade |
| Estado local | Signals UI locales del componente |
| Computed locales | `computed()` del componente |
| Lifecycle | `ngOnInit`, `ngOnDestroy`, etc. |
| Event handlers | Métodos llamados desde template |
| Dialog handlers | Sincronización de overlays |

### Service API (`.service.ts`)

| Region | Contenido |
|--------|-----------|
| Dependencias | `inject()`, URLs base |
| Consultas (GET) | Métodos de lectura |
| Comandos (POST/PUT/DELETE) | Métodos de escritura |

---

## Regiones en HTML y SCSS

Para templates grandes (> 80 líneas) y archivos SCSS, usar la misma sintaxis con comentarios del lenguaje:

```html
<!-- #region Header -->
<div class="header">...</div>
<!-- #endregion -->

<!-- #region Tabla -->
<p-table>...</p-table>
<!-- #endregion -->
```

```scss
// #region Overrides PrimeNG
::ng-deep { ... }
// #endregion

// #region Responsive
@media (max-width: 768px) { ... }
// #endregion
```

Regiones HTML típicas: Header, Stats, Filtros, Tabla, Dialogs.
Regiones SCSS típicas: Variables y Host, Header, Tabla, Overrides PrimeNG, Responsive.

---

## Reglas de uso

**Sí hacer**: Archivos > 100 líneas, nombres descriptivos, consistencia con las regiones estándar.

**No hacer**: Regiones dentro de funciones, para 1-2 líneas, para esconder código muerto, nombres genéricos ("Otros", "Misc").

---

## Checklist

```
[ ] Archivo > 100 líneas? → Usar regiones
[ ] Regiones siguen las estándar del tipo de archivo?
[ ] Nombres descriptivos (no genéricos)?
[ ] No hay regiones dentro de funciones?
[ ] No hay mezcla de // ============ y // #region en el mismo archivo?
[ ] Cada region tiene su // #endregion correspondiente?
```
