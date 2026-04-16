# Modo: Ejecutar

Escribir código con diseño ya claro.

## Reglas del modo

- **SÍ**: Crear/editar archivos, correr lint/build/tests, actualizar plan/maestro al terminar
- **NO**: Cambiar el diseño sin avisar, agregar features no solicitadas, hacer refactors fuera del scope

## Al iniciar

1. Verificar git status (regla commit-checkpoint)
2. Confirmar qué subfase del maestro o qué tarea específica se ejecuta
3. Si no hay diseño previo y la tarea toca 3+ archivos, sugerir `/design` primero

## Durante la ejecución

- Si descubro un problema de diseño → **paro y aviso** antes de improvisar
- Cada 5+ archivos editados sin commit → avisar (regla uncommitted-work-alert)
- Seguir todas las reglas de código del proyecto (CLAUDE.md)

## Al cerrar

1. Lint limpio, build OK, tests pasando
2. Actualizar plan base + maestro.md si aplica
3. Resumen de sesión (regla closing-summary)

## Entregable

Código funcional y validado.
