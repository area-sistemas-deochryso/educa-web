# Modo: Validar

Revisar lo que existe. Reportar sin corregir.

## Cómo correrlo: agentes paralelos

Cuando la validación implica varios chequeos lentos e independientes (`npm run lint` ~30s, `npm run build` ~2min, `npm test` ~30s, `dotnet build` ~1min, `dotnet test` ~1min), lanzarlos secuenciales en foreground via Bash es ineficiente y satura el contexto con su output.

**Patrón**: en una sola llamada, disparar todos los chequeos aplicables como **`Agent` (subagent_type=general-purpose)** en paralelo. Cada agente:

- Corre uno (o varios afines) de los comandos.
- Reporta **terse** (<150 palabras): pasó / falló + qué falló si falló.
- Mantiene el contexto principal limpio.

Ejemplo (mensaje único con 3 Agent calls en paralelo para FE):

```text
Agent(description: "Lint check FE", prompt: "Corré `npm run lint` en cwd. Reportá pasó/falló + warnings count. <100 palabras.")
Agent(description: "Build check FE", prompt: "Corré `npm run build`. Reportá éxito/falla + último error si falló. <100 palabras.")
Agent(description: "Test suite FE", prompt: "Corré `npm test`. Reportá `N pass / M fail` + nombres de los que fallaron. <100 palabras.")
```

Para BE (en `Educa.API/`), el equivalente:

```text
Agent(description: "Build BE", prompt: "Corré `dotnet build` en cwd. Reportá éxito/falla + errores. <100 palabras.")
Agent(description: "Test BE", prompt: "Corré `dotnet test --no-build`. Reportá `N pass / M fail`. <100 palabras.")
```

**Excepción**: durante implementación, un `tsc --noEmit` puntual via Bash directo es razonable — el spawning de un agente no compensa para una verificación rápida. El patrón aplica a la **fase de validación final** (cierre o pre-commit, típicamente invocado por `/end`).

Si alguno falla, después se itera con Bash directo para diagnosticar.

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
