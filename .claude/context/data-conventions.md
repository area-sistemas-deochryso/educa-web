# Convenciones de Datos

## Transformaciones Backend → Frontend

| Campo Backend | Transformación Frontend | Notas |
| --- | --- | --- |
| `EST_DNI` | `.padLeft(8, '0')` | DNI siempre 8 dígitos con ceros a la izquierda |
| `EST_Estado` | `boolean` | `true` = Activo, `false` = Inactivo |
| `EST_CorreoApoderado` | `string` | Email para notificaciones de asistencia |
| `ASI_Estado` | `"Incompleta" / "Completa"` | Incompleta = solo entrada, Completa = entrada + salida |
| Fechas | `DateTime` (ISO 8601) | Backend en UTC, frontend convierte a local |
| `WorkNo` (CrossChex) | `EST_DNI` | Número de empleado = DNI del estudiante |
