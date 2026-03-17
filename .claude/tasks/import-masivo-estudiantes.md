# Importación Masiva de Estudiantes

## Objetivo
Permitir crear/actualizar múltiples estudiantes desde un Excel multi-hoja. Cada hoja del archivo corresponde a un grado. La sesión (A, B, V) se elige globalmente antes de importar.

## Decisiones de diseño

| Decisión | Elección | Razón |
|----------|----------|-------|
| Formato de entrada | Excel (.xlsx) multi-hoja | El archivo real del colegio es Excel con una hoja por grado |
| Librería de parsing | `xlsx` (SheetJS, ya en package.json) | Ya instalada, soporta multi-hoja |
| Comportamiento duplicado | Upsert (crear si no existe, actualizar si existe) | Requerimiento actualizado del usuario |
| Clave de matching | DNI si presente; si no: grado+seccion+nombreCompleto | DNI puede estar vacío en alumnos de inicial |
| Campo nombre | Columna combinada "APELLIDOS Y NOMBRES" | Formato real del Excel — apellidos siempre primero |
| Split apellidos/nombres | Frontend: si hay coma → split en coma; si no → 2 primeras palabras = apellidos | Regla simple que cubre ~95% de los casos peruanos |
| Grado | Nombre de la hoja Excel | Cada tab = un grado; no viene como columna |
| Sección | Selector global en el dialog (A, B, V) | Misma sección para todo el archivo |
| `contrasena` | Autogenerada: `generatePassword(apellidos, dni)` | Solo aplica para creación; en update no cambia contraseña |
| `rol` | Hardcodeado a `'Estudiante'` | Import es solo para estudiantes |

---

## Formato real del Excel

El Excel tiene múltiples hojas. Cada hoja corresponde a un grado. El número de hojas y su contenido puede variar.

### Mapeo de nombre de hoja → grado (GRA_Nombre en BD)

| Nombre de hoja | Grado en BD |
|---------------|-------------|
| `3 AÑOS` | `INICIAL 3 AÑOS` |
| `4 AÑOS` | `INICIAL 4 AÑOS` |
| `5 AÑOS` | `INICIAL 5 AÑOS` |
| `1ER G` | `1RO PRIMARIA` |
| `2DO G` | `2DO PRIMARIA` |
| `3ER G` | `3RO PRIMARIA` |
| `4TO G` | `4TO PRIMARIA` |
| `5TO G` | `5TO PRIMARIA` |
| `6TO G` | `6TO PRIMARIA` |
| `1ERO SEC` | `1RO SECUNDARIA` |
| `2DO SEC` | `2DO SECUNDARIA` |
| `3ERO SEC` | `3RO SECUNDARIA` |
| `4TO SEC` | `4TO SECUNDARIA` |
| `5TO SEC` | `5TO SECUNDARIA` |

> Si el nombre de la hoja no está en el mapeo, la hoja se ignora (ej. hojas auxiliares).

### Columnas por hoja (detección flexible por header)

Las columnas varían entre hojas. Detectar por contenido del header (case-insensitive):

| Campo | Detectar si el header contiene... | Required |
|-------|-----------------------------------|----------|
| `nombreCompleto` | `APELLIDOS` Y/O `NOMBRES` | ✅ |
| `dni` | `DNI` | ❌ (puede estar vacío) |
| `correoApoderado` | `CORREO` (cuando hay también columna PADRE/PADRES) | ❌ |
| `correo` | `CORREO` (cuando NO hay columna PADRE/PADRES) | ❌ |
| `nombreApoderado` | `PADRE` o `PADRES` | ❌ |

> Ignorar columnas N° y celdas numéricas de numeración. Saltar filas vacías (sin nombre).

### Lógica de split nombres/apellidos

```typescript
function splitNombreCompleto(raw: string): { apellidos: string; nombres: string } {
  const clean = raw.trim().replace(/\s+/g, ' ').toUpperCase();

  // Regla 1: Si tiene coma → "APELLIDOS, NOMBRES"
  if (clean.includes(',')) {
    const idx = clean.indexOf(',');
    return {
      apellidos: clean.slice(0, idx).trim(),
      nombres: clean.slice(idx + 1).trim(),
    };
  }

  // Regla 2: Sin coma → primeras 2 palabras = apellidos, resto = nombres
  const words = clean.split(' ').filter(Boolean);
  if (words.length <= 2) return { apellidos: words[0] ?? '', nombres: words[1] ?? '' };
  return {
    apellidos: words.slice(0, 2).join(' '),
    nombres: words.slice(2).join(' '),
  };
}
```

### DNI como string

SheetJS puede leer el DNI como número. Convertir a string y 0-pad a 8 dígitos:
```typescript
const dni = rawDni ? String(Math.round(Number(rawDni))).padStart(8, '0') : undefined;
```

---

## Secciones disponibles

| Valor | Descripción |
|-------|-------------|
| `A` | Período normal, sección A |
| `B` | Período normal, sección B |
| `V` | Verano |

---

## Archivos a crear / modificar

### BACKEND (Educa.API)

#### 1. NUEVO — `DTOs/Usuarios/ImportarEstudiantesDto.cs`

```csharp
// Un estudiante del array
public class ImportarEstudianteItemDto
{
    [Required]
    public string Apellidos { get; set; } = "";

    [Required]
    public string Nombres { get; set; } = "";

    // Vacío para alumnos de inicial
    public string? Dni { get; set; }

    [Required]
    public string Grado { get; set; } = "";   // ej. "1RO PRIMARIA", "INICIAL 3 AÑOS"

    [Required]
    public string Seccion { get; set; } = ""; // "A", "B" o "V"

    public string? Correo { get; set; }
    public string? NombreApoderado { get; set; }
    public string? CorreoApoderado { get; set; }
}

// Request
public class ImportarEstudiantesRequestDto
{
    [Required]
    public List<ImportarEstudianteItemDto> Estudiantes { get; set; } = new();
}

// Response
public class ImportarEstudiantesResponseDto
{
    public int Creados { get; set; }
    public int Actualizados { get; set; }
    public int Rechazados { get; set; }
    public List<ImportarEstudianteErrorDto> Errores { get; set; } = new();
}

public class ImportarEstudianteErrorDto
{
    public int Fila { get; set; }
    public string Nombre { get; set; } = "";
    public string Dni { get; set; } = "";
    public string Razon { get; set; } = "";
}
```

#### 2. MODIFICAR — `Controllers/Sistema/UsuariosController.cs`

```csharp
[HttpPost("importar")]
public async Task<IActionResult> ImportarEstudiantes(
    [FromBody] ImportarEstudiantesRequestDto request)
{
    var dni = ObtenerDni();
    if (string.IsNullOrEmpty(dni))
        return Unauthorized(new { mensaje = "Usuario no identificado" });

    var resultado = await _usuariosService.ImportarEstudiantesAsync(request, dni);
    return Ok(resultado);
}
```

#### 3. MODIFICAR — `Services/Interfaces/IUsuariosService.cs`

```csharp
Task<ImportarEstudiantesResponseDto> ImportarEstudiantesAsync(
    ImportarEstudiantesRequestDto request, string usuarioDni);
```

#### 4. MODIFICAR — `Services/UsuariosService.cs`

Implementar `ImportarEstudiantesAsync` con lógica de **upsert**:

```
Para cada item:
  1. Si tiene DNI: buscar estudiante existente WHERE EST_DNI = dni AND EST_SED_CodID = sedeId
     - Si existe → UPDATE (actualiza nombres, apellidos, grado, seccion, correo, apoderado)
     - Si no existe → CREATE
  2. Si NO tiene DNI: buscar por grado+seccion+nombreCompleto
     - Si existe → UPDATE
     - Si no existe → CREATE (generar contraseña con GenerarContrasena(apellidos, ""))

Batch query al inicio: para los que tienen DNI, hacer:
  WHERE EST_DNI IN (lista_dnis) AND EST_SED_CodID = sedeId
(evita N queries individuales)

Para los que no tienen DNI: query separada por grado+seccion para los candidatos.

Contraseña en UPDATE: NO modificar (preservar la actual).
Contraseña en CREATE: GenerarContrasena(apellidos, dni ?? "").
```

No hay transacción global: si un registro falla, solo ese se rechaza. Los demás se procesan.

---

### FRONTEND (educa-web)

#### 5. NUEVO — `pages/admin/usuarios/helpers/estudiante-import.config.ts`

```typescript
export interface EstudianteImportRow {
  nombreCompleto: string;   // "APELLIDOS Y NOMBRES" combinado del Excel
  apellidos: string;        // Resultado del split
  nombres: string;          // Resultado del split
  dni?: string;             // Puede estar vacío para alumnos de inicial
  grado: string;            // Tomado del nombre de la hoja
  seccion: string;          // Tomado del selector global
  correo?: string;
  nombreApoderado?: string;
  correoApoderado?: string;
}

// Mapeo nombre de hoja → grado en BD
export const SHEET_TO_GRADO: Record<string, string> = {
  '3 AÑOS':   'INICIAL 3 AÑOS',
  '4 AÑOS':   'INICIAL 4 AÑOS',
  '5 AÑOS':   'INICIAL 5 AÑOS',
  '1ER G':    '1RO PRIMARIA',
  '2DO G':    '2DO PRIMARIA',
  '3ER G':    '3RO PRIMARIA',
  '4TO G':    '4TO PRIMARIA',
  '5TO G':    '5TO PRIMARIA',
  '6TO G':    '6TO PRIMARIA',
  '1ERO SEC': '1RO SECUNDARIA',
  '2DO SEC':  '2DO SECUNDARIA',
  '3ERO SEC': '3RO SECUNDARIA',
  '4TO SEC':  '4TO SECUNDARIA',
  '5TO SEC':  '5TO SECUNDARIA',
};

export const SECCIONES: { label: string; value: string }[] = [
  { label: 'A — Período normal (sección A)', value: 'A' },
  { label: 'B — Período normal (sección B)', value: 'B' },
  { label: 'V — Verano', value: 'V' },
];

export function splitNombreCompleto(raw: string): { apellidos: string; nombres: string } {
  const clean = raw.trim().replace(/\s+/g, ' ').toUpperCase();
  if (clean.includes(',')) {
    const idx = clean.indexOf(',');
    return { apellidos: clean.slice(0, idx).trim(), nombres: clean.slice(idx + 1).trim() };
  }
  const words = clean.split(' ').filter(Boolean);
  if (words.length <= 2) return { apellidos: words[0] ?? '', nombres: words[1] ?? '' };
  return { apellidos: words.slice(0, 2).join(' '), nombres: words.slice(2).join(' ') };
}

export function parseDni(raw: unknown): string | undefined {
  if (!raw && raw !== 0) return undefined;
  const str = String(Math.round(Number(raw))).padStart(8, '0');
  return /^\d{8}$/.test(str) ? str : undefined;
}
```

#### 6. MODIFICAR — `core/services/usuarios/usuarios.models.ts`

Agregar interfaces:
```typescript
export interface ImportarEstudianteItem {
  apellidos: string;
  nombres: string;
  dni?: string;
  grado: string;
  seccion: string;
  correo?: string;
  nombreApoderado?: string;
  correoApoderado?: string;
}

export interface ImportarEstudiantesResponse {
  creados: number;
  actualizados: number;
  rechazados: number;
  errores: { fila: number; nombre: string; dni: string; razon: string }[];
}
```

#### 7. MODIFICAR — `core/services/usuarios/usuarios.service.ts`

```typescript
importarEstudiantes(
  estudiantes: ImportarEstudianteItem[]
): Observable<ImportarEstudiantesResponse> {
  return this.http.post<ImportarEstudiantesResponse>(
    `${this.apiUrl}/importar`,
    { estudiantes }
  );
}
```

#### 8. MODIFICAR — `usuarios.store.ts`

Agregar en UI State:
```typescript
private readonly _importDialogVisible = signal(false);
private readonly _importLoading = signal(false);
private readonly _importResult = signal<ImportarEstudiantesResponse | null>(null);
```
+ `asReadonly()`, comandos (`openImportDialog`, `closeImportDialog`, `setImportLoading`, `setImportResult`)
+ Incluir en `vm`.

#### 9. MODIFICAR — `usuarios.facade.ts`

```typescript
openImportDialog(): void { this.store.openImportDialog(); }
closeImportDialog(): void { this.store.closeImportDialog(); }

importarEstudiantes(filas: ImportarEstudianteItem[]): void {
  this.store.setImportLoading(true);
  this.usuariosService.importarEstudiantes(filas)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (result) => {
        this.store.setImportResult(result);
        this.store.setImportLoading(false);
        if (result.creados > 0 || result.actualizados > 0) {
          this.refreshUsuariosOnly();
          this.store.incrementarEstadistica('totalEstudiantes', result.creados);
          this.store.incrementarEstadistica('totalUsuarios', result.creados);
          this.store.incrementarEstadistica('usuariosActivos', result.creados);
        }
      },
      error: (err) => {
        logger.error('Error importando estudiantes:', err);
        this.errorHandler.showError(UI_SUMMARIES.error, 'No se pudo completar la importación');
        this.store.setImportLoading(false);
      },
    });
}
```

#### 10. NUEVO — `components/usuarios-import-dialog/` (3 archivos)

**Flujo del dialog (3 pasos):**

**Paso 1 — Configuración y carga**
- `p-select` para elegir **Sección por defecto** (A, B, V) — requerido antes de proceder
- Botón de seleccionar Excel (input file oculto, acepta `.xlsx`)
- Al seleccionar: parsear con SheetJS (`import * as XLSX from 'xlsx'`)
  - Leer todas las hojas (`wb.SheetNames`)
  - Para cada hoja: mapear nombre → grado vía `SHEET_TO_GRADO`
  - Ignorar hojas sin mapeo
  - Detectar columnas por contenido del header (case-insensitive, busca "APELLIDOS", "DNI", "CORREO", "PADRE")
  - Parsear filas: skipear vacías (sin nombreCompleto), split apellidos/nombres, parsear DNI
  - Aplicar sección global a todas las filas

**Paso 2 — Vista previa**
- Agrupar por grado (una sección colapsable por grado con `p-accordion`)
- Tabla por grado con columnas: Nombres, Apellidos, DNI, Acción (crear/actualizar)
- Indicar si será "Crear" o "Actualizar" (no sabemos desde frontend, pero si DNI es vacío → siempre Crear)
- Resumen: "X estudiantes en Y grados — Sección: Z"
- Botón "Importar X estudiantes" habilitado si hay al menos 1 fila válida

**Paso 3 — Resultado**
- Muestra `ImportarEstudiantesResponse`: creados, actualizados, rechazados
- Si hay errores: tabla con fila, nombre, razón
- Botón "Cerrar" o "Importar otro archivo" (vuelve a paso 1)

**Parsing con SheetJS:**
```typescript
import * as XLSX from 'xlsx';

function parseExcel(
  buffer: ArrayBuffer,
  seccion: string
): EstudianteImportRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const rows: EstudianteImportRow[] = [];

  for (const sheetName of wb.SheetNames) {
    const grado = SHEET_TO_GRADO[sheetName.trim()];
    if (!grado) continue;  // hoja no reconocida, ignorar

    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    for (const raw of data) {
      // Detectar header de nombre (APELLIDOS y/o NOMBRES)
      const nombreKey = Object.keys(raw).find(k =>
        k.toUpperCase().includes('APELLIDOS') || k.toUpperCase().includes('NOMBRES')
      );
      if (!nombreKey) continue;

      const nombreCompleto = String(raw[nombreKey] ?? '').trim();
      if (!nombreCompleto) continue;  // fila vacía

      // Detectar DNI
      const dniKey = Object.keys(raw).find(k => k.toUpperCase().includes('DNI'));
      const dni = dniKey ? parseDni(raw[dniKey]) : undefined;

      // Detectar correo/apoderado
      const padreKey = Object.keys(raw).find(k =>
        k.toUpperCase().includes('PADRE') || k.toUpperCase().includes('PADRES')
      );
      const correoKey = Object.keys(raw).find(k => k.toUpperCase().includes('CORREO'));

      const { apellidos, nombres } = splitNombreCompleto(nombreCompleto);

      rows.push({
        nombreCompleto,
        apellidos,
        nombres,
        dni,
        grado,
        seccion,
        nombreApoderado: padreKey ? String(raw[padreKey] ?? '').trim() || undefined : undefined,
        correoApoderado: padreKey && correoKey ? String(raw[correoKey] ?? '').trim() || undefined : undefined,
        correo: !padreKey && correoKey ? String(raw[correoKey] ?? '').trim() || undefined : undefined,
      });
    }
  }

  return rows;
}
```

#### 11. MODIFICAR — `usuarios.component.html`
- Agregar botón "Importar" en `app-usuarios-filters` o en `app-usuarios-header`
- Agregar `<app-usuarios-import-dialog>` al final (NUNCA dentro de `@if`)

#### 12. MODIFICAR — `usuarios.component.ts`
- Agregar handler: `onImportUsuarios(): void { this.facade.openImportDialog(); }`

---

## Orden de implementación

```
BACKEND
1. DTOs/Usuarios/ImportarEstudiantesDto.cs              (10 min)
2. IUsuariosService + UsuariosService (upsert logic)    (30 min)
3. UsuariosController endpoint                          (10 min)

FRONTEND
4. helpers/estudiante-import.config.ts                  (10 min)
5. usuarios.models.ts (nuevas interfaces)               (5 min)
6. usuarios.service.ts (nuevo método)                   (5 min)
7. usuarios.store.ts (import state)                     (10 min)
8. usuarios.facade.ts (importarEstudiantes)             (10 min)
9. components/usuarios-import-dialog/ (3 archivos)      (60 min)
10. usuarios.component integración (html + ts)          (10 min)
```

---

## Rutas de archivos clave

```
FRONTEND
src/app/features/intranet/pages/admin/usuarios/
  ├── helpers/
  │   └── estudiante-import.config.ts          ← CREAR (paso 4)
  ├── components/
  │   └── usuarios-import-dialog/              ← CREAR (paso 9)
  │       ├── usuarios-import-dialog.component.ts
  │       ├── usuarios-import-dialog.component.html
  │       └── usuarios-import-dialog.component.scss
  ├── usuarios.store.ts                        ← MODIFICAR (paso 7)
  ├── usuarios.facade.ts                       ← MODIFICAR (paso 8)
  ├── usuarios.component.ts                    ← MODIFICAR (paso 12)
  └── usuarios.component.html                  ← MODIFICAR (paso 11)

src/app/core/services/usuarios/
  ├── usuarios.service.ts                      ← MODIFICAR (paso 6)
  └── usuarios.models.ts                       ← MODIFICAR (paso 5)

BACKEND
Educa.API/
  ├── DTOs/Usuarios/ImportarEstudiantesDto.cs  ← CREAR (paso 1)
  ├── Controllers/Sistema/UsuariosController.cs← MODIFICAR (paso 3)
  ├── Services/Interfaces/IUsuariosService.cs  ← MODIFICAR (paso 2)
  └── Services/UsuariosService.cs              ← MODIFICAR (paso 2)
```

---

## Notas técnicas

- **SheetJS ya instalado**: `"xlsx": "^0.18.5"` en `package.json`. Import: `import * as XLSX from 'xlsx';`
- **Batch query para DNIs**: al inicio de `ImportarEstudiantesAsync`, hacer `WHERE EST_DNI IN (lista)` para los que tienen DNI. Evita N queries.
- **Sin transacción global**: si un registro falla, solo ese se rechaza. Los demás se crean/actualizan.
- **Contraseña en UPDATE**: no modificar la contraseña existente del estudiante.
- **Contraseña en CREATE**: `GenerarContrasena(apellidos, dni ?? "")` — mismo helper del creación individual.
- **Sede**: usar la sede del usuario que ejecuta el import (`ObtenerSedeId()` del controller).
- **SQL script**: no hay tablas nuevas, solo nuevo endpoint. No requiere migración de BD.
