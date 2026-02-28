# Convenciones de Datos

## Transformaciones Backend → Frontend

| Campo Backend | Transformacion Frontend | Notas |
| --- | --- | --- |
| `EST_DNI` | `.padLeft(8, '0')` | DNI siempre 8 digitos con ceros a la izquierda |
| `EST_Estado` | `boolean` | `true` = Activo, `false` = Inactivo |
| `EST_CorreoApoderado` | `string` | Email para notificaciones de asistencia |
| `ASI_Estado` | `"Incompleta" / "Completa"` | Incompleta = solo entrada, Completa = entrada + salida |
| Fechas | `DateTime` (ISO 8601) | Backend en UTC, frontend convierte a local |
| `WorkNo` (CrossChex) | `EST_DNI` | Numero de empleado = DNI del estudiante |

## Headers Especiales

| Header | Direccion | Proposito |
| --- | --- | --- |
| `Authorization: Bearer {token}` | Request | JWT auth (automatico via interceptor) |
| `X-Idempotency-Key` | Request | UUID para retries seguros (WAL mutations) |
| `X-Request-Id` | Request | Trace ID para correlacion de requests |
| `X-Correlation-Id` | Response | ID de correlacion del backend |

## Convenciones de API Response

```typescript
// Exito con datos
{ data: T, mensaje?: string }

// Exito con lista
T[]  // Array directo, sin wrapper

// Error
{ error: string, mensaje?: string }

// Status codes
200 - OK (GET, PUT exitoso)
201 - Created (POST exitoso)
400 - Bad Request (validacion)
401 - Unauthorized (sin token o expirado)
403 - Forbidden (sin permisos)
404 - Not Found
409 - Conflict (idempotency duplicate o version conflict)
500 - Internal Server Error
```

## WAL Entry Conventions

```typescript
// Cada mutacion WAL genera:
{
  id: crypto.randomUUID(),         // Unico por operacion
  idempotencyKey: crypto.randomUUID(), // Para header X-Idempotency-Key
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  resourceType: 'Usuario' | 'Horario' | 'Curso' | ...,
  status: 'PENDING' | 'IN_FLIGHT' | 'COMMITTED' | 'FAILED' | 'CONFLICT',
  retries: number,                 // Max 3, backoff exponencial
}
```

## DayOfWeek Mapping

C# `DayOfWeek` enumera Sunday=0, pero la BD usa Sunday=7.

```csharp
// Formula en backend
int dbDay = ((int)DateTime.Now.DayOfWeek == 0) ? 7 : (int)DateTime.Now.DayOfWeek;
```
