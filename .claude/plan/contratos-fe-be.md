# Plan 14 — Contratos FE-BE y Validación de Drift

> **Fecha**: 2026-04-16
> **Objetivo**: Detectar automáticamente cuando un cambio en el backend rompe el frontend (o viceversa) antes de que llegue a producción.
> **Problema**: Los repos son independientes (educa-web + Educa.API). Un cambio de DTO, enum, status code o endpoint en el backend no genera error en el frontend hasta que un usuario lo encuentra en runtime.
> **Coordinación**: Complementa Plan 12 (Backend Tests) y Plan 13 (Frontend Tests).

---

## Diagnóstico

| Riesgo | Ejemplo concreto | Impacto |
|--------|-----------------|---------|
| DTO rename/remove field | Backend cambia `nombre` → `nombreCompleto` en UsuarioListaDto | Frontend muestra `undefined` en la columna |
| Enum value change | Backend agrega estado `"SUSPENDIDO"` a AprobacionEstado | Frontend switch/case no lo maneja → cae en default silencioso |
| Status code change | Endpoint retornaba 200 → ahora retorna 204 | Frontend `.subscribe(data => ...)` recibe null |
| Endpoint URL change | `/api/ConsultaAsistencia` → `/api/asistencia/consulta` | Frontend 404 en todas las llamadas |
| Response wrapper change | Nuevo campo en ApiResponse<T> o cambio en unwrap | Interceptor no extrae `.data` correctamente |

---

## Estrategia: Contract Tests Bidireccionales

No se trata de un schema registry complejo. Se trata de **archivos de contrato** que ambos repos pueden verificar independientemente.

### Nivel 1 — Snapshot de DTOs (mínimo viable)

**Concepto**: El backend genera un archivo JSON con la estructura de cada DTO público. El frontend tiene un test que importa ese JSON y verifica que sus interfaces TypeScript matchean.

```
Educa.API/
  contracts/
    dtos.snapshot.json    ← generado por test del backend

educa-web/
  src/test/
    contracts/
      dtos.snapshot.json  ← copia del backend (manual o CI)
      dto-contract.spec.ts ← verifica que interfaces FE matchean
```

**Implementación Backend** (F1):
- Test que usa reflection para listar todas las clases `*Dto` con sus propiedades (nombre, tipo, nullable)
- Output: `dtos.snapshot.json` con schema por DTO
- Se ejecuta en CI y genera el artifact

**Implementación Frontend** (F2):
- Test que lee `dtos.snapshot.json`
- Compara contra las interfaces TypeScript declaradas en `@data/models/`
- Falla si: campo faltante, tipo incompatible, campo extra no opcional

### Nivel 2 — Snapshot de Endpoints

**Concepto**: El backend genera un listado de endpoints con método, ruta, parámetros y tipo de respuesta. El frontend verifica que sus services usan las rutas correctas.

```json
// endpoints.snapshot.json
[
  {
    "method": "GET",
    "route": "/api/ConsultaAsistencia/resumen-mensual",
    "params": ["estudianteId: int", "mes: int", "anio: int"],
    "responseType": "ApiResponse<ResumenMensualDto>",
    "auth": "Authorize",
    "roles": ["Director", "Profesor", "Apoderado"]
  }
]
```

**Implementación Backend** (F3):
- Test que usa reflection sobre controllers: `[HttpGet]`, `[Route]`, parámetros, `[Authorize]`
- Output: `endpoints.snapshot.json`

**Implementación Frontend** (F4):
- Test que escanea services (`*.service.ts`) buscando URLs hardcodeadas
- Verifica que cada URL existe en `endpoints.snapshot.json`
- Verifica que el método HTTP coincide

### Nivel 3 — Snapshot de Enums/Constantes

**Concepto**: Valores fijos del backend (roles, estados, tipos) que el frontend replica.

```json
// enums.snapshot.json
{
  "AprobacionEstado": ["APROBADO", "DESAPROBADO", "PENDIENTE"],
  "AttendanceStatus": ["A", "T", "F", "J", "-", "X"],
  "NivelEducativo": ["Inicial", "Primaria", "Secundaria"],
  "Roles": ["Director", "Profesor", "Apoderado", "Estudiante", "Asistente Administrativo"]
}
```

**Implementación Frontend** (F5):
- Test que compara cada `const array` del frontend contra el snapshot
- Falla si el frontend tiene valores que el backend no reconoce (o viceversa)

---

## Fases

### F1 — Backend: Generador de snapshots de DTOs
- [ ] F1.1 Test de reflection que lista todas las clases `*Dto` + propiedades
- [ ] F1.2 Output a `contracts/dtos.snapshot.json`
- [ ] F1.3 Test pasa en CI y genera artifact

### F2 — Frontend: Verificador de DTOs
- [ ] F2.1 Copiar `dtos.snapshot.json` al frontend (manual por ahora)
- [ ] F2.2 Test que mapea interfaces TS a snapshots
- [ ] F2.3 Alertas por campos faltantes, tipos incompatibles, campos extra

### F3 — Backend: Generador de snapshots de endpoints
- [ ] F3.1 Test de reflection sobre controllers
- [ ] F3.2 Output a `contracts/endpoints.snapshot.json`

### F4 — Frontend: Verificador de endpoints
- [ ] F4.1 Escaneo de URLs en services
- [ ] F4.2 Verificación contra snapshot

### F5 — Enums y constantes
- [ ] F5.1 Backend genera `contracts/enums.snapshot.json`
- [ ] F5.2 Frontend verifica contra sus `const` arrays

### F6 — Automatización
- [ ] F6.1 Script que copia snapshots entre repos
- [ ] F6.2 Pre-push hook que regenera y verifica

---

## Orden de ejecución

```
F1 (DTOs BE) → F2 (DTOs FE) → F5 (Enums) → F3 (Endpoints BE) → F4 (Endpoints FE) → F6 (Automatización)
```

F1+F2 son el mínimo viable. Con solo eso ya detectas el 80% del drift.

---

## Métricas de éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| DTOs verificados FE↔BE | 0 | Todos los públicos (~50) |
| Endpoints verificados | 0 | Todos los consumidos por FE |
| Enums sincronizados | 0 (confianza manual) | Todos los compartidos (~12) |
| Tiempo de detección de drift | Runtime (usuario reporta) | Build time (test falla) |
