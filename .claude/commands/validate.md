# Modo: Validar

Revisar lo que existe. Reportar sin corregir.

## Reglas del modo

- **SÍ**: Code review, buscar anti-patrones, auditar contra reglas e invariantes (INV-*), generar reporte
- **NO**: Editar archivos, corregir lo encontrado (salvo que el usuario lo pida explícitamente), agregar features

## Al iniciar

1. Confirmar qué archivos/módulos auditar
2. Confirmar contra qué reglas/invariantes (o auditoría general)
3. Investigar a fondo antes de reportar

## Formato del reporte

Categorizar hallazgos por severidad:

| Severidad | Significado |
|-----------|-------------|
| **Bug** | Error funcional que afecta comportamiento |
| **Regla violada** | Código que contradice una regla del proyecto |
| **Inconsistencia** | Naming, patrones o convenciones no uniformes |
| **Observación** | No es error pero vale discutir (diseño, deuda) |

## Entregable

Reporte con hallazgos priorizados. Opcionalmente, crear task en `.claude/tasks/` si hay trabajo de corrección.

## Transición a Ejecutar

Si el usuario dice "corrige los hallazgos" después del reporte, el chat transiciona a modo Ejecutar. Aplicar las reglas de ese modo desde ese punto.
