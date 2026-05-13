---
description: Modo Auditar — revisar código existente y reportar hallazgos por severidad, sin corregir.
---

# Modo: Auditar

**Objetivo**: revisar código que ya existe, identificar problemas y reportarlos clasificados. **No editar archivos**.

Distinto de [`/validate`](validate.md) (que corre lint/build/test sobre cambios recientes), `/audit` lee código existente buscando anti-patrones, violaciones de reglas, inconsistencias.

## Scope obligatorio

`/audit <scope>` requiere scope explícito: path (`src/app/core/`), módulo (`combat`), regla (`content-contract`), o ADR (`0010`). Sin scope → preguntar antes de empezar. Audits "globales" producen ruido.

## Qué hago

- Code review del scope solicitado.
- Buscar anti-patrones, código muerto, abstracciones rotas.
- Auditar contra reglas e invariantes del proyecto (`rules/*`, ADRs/decisions).
- Generar reporte priorizado por severidad.

## Qué NO hago

- Editar archivos para "arreglar" lo encontrado (salvo pedido explícito → transición a [`/execute`](execute.md)).
- Agregar features.
- Refactorear "de paso".

## Categorías de severidad

| Severidad | Significado |
|---|---|
| **Bug** | Error funcional que afecta comportamiento observable |
| **Regla violada** | Código que contradice una regla del proyecto o un ADR |
| **Riesgo** | No es bug hoy pero rompe bajo edge case / carga / concurrencia |
| **Performance** | No rompe pero hay leak, O(n²) escondido, work duplicado |
| **Inconsistencia** | Naming, patrones o convenciones no uniformes |
| **Observación** | No es error pero vale discutir (diseño, deuda) |

## Entregable

Reporte agrupado por severidad (orden: Bug → Regla violada → Riesgo → Performance → Inconsistencia → Observación). Para cada hallazgo:

- Path + línea (clickable).
- Qué encontré (1-2 líneas).
- Por qué es problema (referencia a regla/ADR si aplica).
- Sugerencia de fix (sin aplicarla).

**Sin hallazgos**: reportar `✅ sin hallazgos en <scope>` explícito (no quedar en silencio).

**Límite por severidad**: máximo 10 hallazgos por categoría. Si hay más, agrupar los menores como "y N más similares en <path>" para no convertir el reporte en ruido.

Opcionalmente, crear task en `tasks/pending/` si hay corrección pendiente (nombre sugerido: `audit-<scope>-<YYYY-MM-DD>.md`). Si el usuario pide "corregí los hallazgos", el chat transiciona a `/execute`.

## Ejecución eficiente

Como [`/validate`](validate.md): si el scope es amplio, **disparar agentes paralelos** — uno por capa o subsistema — y consolidar el reporte en un solo render. Cada agente reporta terse (<150 palabras).

## Override por proyecto

`<repo>/.claude/commands/audit.md` puede:

- Especificar reglas específicas a verificar (INV-*, content-contract, capas, etc.).
- Indicar paths típicos del scope (`src/app/core/`, `services/`, etc.).
- Refinar el formato del reporte (por capa, por archivo, por severidad).
