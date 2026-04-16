# /drift-check — Auditoría de drift documentación vs código

Auditar la sincronización entre documentación (.claude/) y código real. Detectar drift en 6 categorías y generar reporte.

## Argumentos

- Sin args: auditar ambos repos (educa-web + Educa.API)
- `-front`: solo educa-web
- `-back`: solo Educa.API

## Instrucciones

Ejecutar las 6 categorías de checks listadas abajo. Generar el reporte en `.claude/reporte-drift-check/drift-report.md` (sobreescribir si existe). Usar el mapa de dependencias en `.claude/config/drift-map.md` como referencia.

**IMPORTANTE**: No corregir nada. Solo detectar y reportar. El usuario decide qué arreglar.

### Severidades

| Severidad | Criterio | Ejemplo |
|-----------|----------|---------|
| **Crítico** | Referencia rota, config que causa bug en runtime | @-ref a archivo inexistente, flag en env pero no en routes |
| **Moderado** | Docs desactualizados, convención violada | Carpeta no documentada, DateTime.Now en BE |
| **Informativo** | Posible mejora, cobertura parcial | Feature sin docs, tipo semántico no usado |

---

## C1 — Integridad de Referencias

Verificar que las referencias en documentación apunten a archivos/carpetas que existen.

### C1.1 @-refs en CLAUDE.md (CRÍTICO)

Leer `.claude/CLAUDE.md`. Buscar todas las líneas con `@` que referencien archivos (formato `@.claude/...`). Verificar que cada archivo referenciado existe.

```bash
grep -n "^@" .claude/CLAUDE.md
# Para cada match, verificar que el path después de @ existe
```

### C1.2 Links en maestro.md (moderado)

Leer `.claude/plan/maestro.md`. Buscar links markdown `[texto](path)` y verificar que los paths existan.

### C1.3 Carpetas en architecture.md (moderado)

Leer `.claude/rules/architecture.md`. Extraer las carpetas mencionadas en el árbol de estructura (`src/app/...`). Verificar que las carpetas principales existan.

### C1.4 Links en MEMORY.md (moderado)

Leer el archivo MEMORY.md del proyecto de memoria. Verificar que los archivos `.md` referenciados existan.

### C1.5 Paths en planes (informativo)

Buscar archivos `.md` en `.claude/plan/`. Verificar links internos a archivos.

### C1.6 Refs BE (moderado) — solo si `-back` o sin args

Verificar que paths mencionados en `backend.md` (estructura de carpetas) correspondan a carpetas reales en `../Educa.API/Educa.API/`.

---

## C2 — Sincronización de Configuración

Verificar que configs declaradas en código estén sincronizadas.

### C2.1 Feature flags: environment.ts vs environment.development.ts (CRÍTICO)

```bash
# Extraer keys de features en ambos archivos
grep -A50 "features:" src/app/config/environment.ts
grep -A50 "features:" src/app/config/environment.development.ts
```

Verificar que ambos archivos tengan exactamente las mismas keys (valores pueden diferir).

### C2.2 Feature flags vs rutas (moderado)

Para cada flag en `environment.features`, verificar que existe una referencia en `intranet.routes.ts` que la use como condición.

### C2.3 Module registry vs menu-modules.md (informativo)

Comparar módulos definidos en `src/app/shared/constants/module-registry.ts` con los documentados en `.claude/rules/menu-modules.md`.

### C2.4 WAL_CACHE_MAP vs resourceTypes usados (moderado) — solo si el archivo existe

Si existe un archivo con `WAL_CACHE_MAP`, verificar que los `resourceType` usados en facades tengan entrada en el map.

### C2.5 Aliases tsconfig vs uso real (informativo)

Leer `tsconfig.json` y extraer aliases (`@core`, `@shared`, etc.). Verificar que cada alias se usa en al menos un import.

---

## C3 — Cobertura de Documentación (código sin docs)

Detectar código que debería estar documentado pero no lo está.

### C3.1 Carpetas core/services/ sin mención en architecture.md (moderado)

```bash
ls -d src/app/core/services/*/
# Comparar con las carpetas listadas en architecture.md tabla "core/services/"
```

### C3.2 Features sin documentación (informativo)

```bash
ls -d src/app/features/intranet/pages/*/
ls -d src/app/features/intranet/pages/admin/*/
ls -d src/app/features/intranet/pages/cross-role/*/
ls -d src/app/features/intranet/pages/profesor/*/
ls -d src/app/features/intranet/pages/estudiante/*/
```

Verificar que cada feature tenga al menos una mención en algún doc de `.claude/`.

### C3.3 INV-* en código sin business-rules.md (moderado)

```bash
# Buscar INV-* en código TypeScript y C#
grep -rn "INV-[A-Z]*[0-9]" src/app/ --include="*.ts"
grep -rn "INV-[A-Z]*[0-9]" ../Educa.API/ --include="*.cs" 2>/dev/null
```

Verificar que cada ID de invariante referenciado en código exista en `.claude/rules/business-rules.md`.

### C3.4 Controllers BE sin api-endpoints.md (moderado) — solo si `-back` o sin args

```bash
ls ../Educa.API/Educa.API/Controllers/**/*.cs 2>/dev/null
```

Comparar con endpoints documentados en `.claude/context/api-endpoints.md`.

### C3.5 Services BE sin registro DI (moderado) — solo si `-back` o sin args

```bash
grep -rn "AddScoped\|AddTransient\|AddSingleton" ../Educa.API/Educa.API/Program.cs 2>/dev/null
```

Comparar con services en la carpeta `Services/`.

---

## C4 — Documentación Fantasma (docs sin código)

Detectar documentación que referencia código que ya no existe.

### C4.1 INV-* documentados pero no referenciados en código (informativo)

Extraer todos los `INV-*` de `business-rules.md`. Verificar cuáles no aparecen en ningún archivo `.ts` o `.cs`.

### C4.2 Tipos semánticos documentados vs definidos (informativo)

Leer `.claude/rules/semantic-types.md`. Para cada tipo listado en la tabla "Tipos Semánticos Existentes", verificar que el tipo realmente existe en el código.

### C4.3 Aliases tsconfig fantasma (moderado)

Para cada alias en `tsconfig.json`, verificar que la carpeta destino exista.

### C4.4 npm scripts fantasma (informativo)

Leer `package.json` scripts. Verificar que los comandos referenciados por scripts existan (binarios en node_modules/.bin/).

---

## C5 — Convenciones No-ESLint

Detectar violaciones de convenciones que ESLint no cubre.

### C5.1 Separadores `====` (informativo) — frontend

```bash
grep -rn "// =====" src/app/ --include="*.ts" | head -20
```

Regla: Usar `// #region` en su lugar.

### C5.2 `[(visible)]` two-way binding (CRÍTICO) — frontend

```bash
grep -rn '\[(visible)\]' src/app/ --include="*.html"
```

Regla: Separar `[visible]` y `(visibleChange)`.

### C5.3 appendTo faltante en dropdowns (moderado) — frontend

```bash
grep -rn '<p-select\|<p-multiselect\|<p-calendar\|<p-dropdown' src/app/ --include="*.html" | grep -v 'appendTo'
```

### C5.4 Overlays dentro de @if (CRÍTICO) — frontend

```bash
grep -B2 '<p-dialog\|<p-drawer\|<p-sidebar\|<p-confirmDialog' src/app/ --include="*.html" -rn | grep '@if'
```

### C5.5 Archivos BE > 300 líneas (moderado) — solo si `-back` o sin args

```bash
find ../Educa.API/Educa.API/ -name "*.cs" -exec wc -l {} + 2>/dev/null | awk '$1 > 300' | sort -rn
```

Excepción: `ApplicationDbContext.cs`.

### C5.6 DateTime.Now en BE (CRÍTICO) — solo si `-back` o sin args

```bash
grep -rn "DateTime\.Now\b" ../Educa.API/Educa.API/ --include="*.cs" 2>/dev/null | grep -v "// OK" | grep -v "PeruNow"
```

Regla: Usar `DateTimeHelper.PeruNow()`.

### C5.7 IEmailService directo en BE (moderado) — solo si `-back` o sin args

```bash
grep -rn "IEmailService" ../Educa.API/Educa.API/Services/ --include="*.cs" 2>/dev/null | grep -v "IEmailOutboxService\|IEmailNotificationService\|EmailOutboxWorker"
```

Regla: Usar `IEmailOutboxService.EnqueueAsync()`.

### C5.8 String interpolation en logger BE (moderado) — solo si `-back` o sin args

```bash
grep -rn 'Log\(Information\|Warning\|Error\|Debug\).*\$"' ../Educa.API/Educa.API/ --include="*.cs" 2>/dev/null
```

Regla: Structured logging con placeholders.

### C5.9 AsNoTracking faltante en queries read-only BE (informativo) — solo si `-back` o sin args

Buscar métodos `Listar*`, `Obtener*`, `Get*` en repositories que no usen `AsNoTracking()`.

### C5.10 Filtro _Estado faltante en tablas de relación BE (CRÍTICO) — solo si `-back` o sin args

```bash
grep -rn "ProfesorSalon\|EstudianteSalon\|CursoGrado" ../Educa.API/Educa.API/ --include="*.cs" 2>/dev/null | grep -v "_Estado\|Estado\|ListarTodas\|IncludeInactive"
```

---

## C6 — Sincronización Cross-Repo

Verificar consistencia entre frontend y backend. Solo si se auditan ambos repos.

### C6.1 Endpoints FE vs Controllers BE (moderado)

Buscar URLs de API en services del frontend (`/api/...`). Verificar que existe un controller BE con ruta correspondiente.

### C6.2 api-endpoints.md vs controllers reales (moderado)

Comparar endpoints documentados en `.claude/context/api-endpoints.md` con los `[Http*]` reales en controllers.

### C6.3 Tipos semánticos FE vs constantes BE (informativo)

Verificar que tipos como `AprobacionEstado`, `AttendanceStatus` tengan equivalentes en `Constants/` del BE.

---

## Formato del Reporte

Generar `.claude/reporte-drift-check/drift-report.md` con este formato:

```markdown
# Drift Check Report

**Fecha**: YYYY-MM-DD HH:MM
**Scope**: ambos / frontend / backend
**Autor**: Claude (automated)

## Resumen

| Categoría | Checks | Pasaron | Drift | Críticos | Moderados | Info |
|-----------|--------|---------|-------|----------|-----------|------|
| C1 Refs   | X      | X       | X     | X        | X         | X    |
| ...       |        |         |       |          |           |      |
| **Total** | **X**  | **X**   | **X** | **X**    | **X**     | **X**|

## Detalle

### C1 — Integridad de Referencias

#### C1.1 @-refs en CLAUDE.md — [PASS/DRIFT]
> Severidad: crítico
> ...detalle...

(repetir para cada check)

---

## Acciones Sugeridas

1. [CRÍTICO] ...
2. [MODERADO] ...
3. [INFO] ...
```

## Después del reporte

Mostrar al usuario un resumen inline con los hallazgos críticos y moderados. No sugerir correcciones automáticas — el usuario decide qué hacer.
