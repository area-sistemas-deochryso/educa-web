# Modo: Progress (reporte de avance)

**Objetivo**: ver de un vistazo cómo avanza el proyecto educa-web — tendencia de commits y briefs cerrados/semana, subsistemas con más actividad, zonas muertas. Cero mutación.

## Qué hago

- Correr [`.claude/scripts/progress.sh`](../scripts/progress.sh) con `Bash`.
- Devolver la salida tal cual (markdown con sparklines y tablas con emoji status).
- Si el reporte revela algo accionable (zona muerta crítica, churn concentrado en una sola carpeta, regresión), señalarlo en una línea al final.

## Qué reporta el script

| Sección | Qué muestra | Cómo se calcula |
|---|---|---|
| **Volumen general** | Sparklines de commits y briefs cerrados/semana en ventana 12w | `git log --since="12 weeks ago"`, escala log |
| **Subsistemas con churn** | Top 8 carpetas más modificadas en `src/app/{core,features,shared}/*/` | `git log --name-only` agrupado |
| **Zonas muertas** | Subsistemas FE sin commits en >42d | `git log -1` por carpeta vs threshold |
| **Cola del maestro** | Top 5 items de "📋 Próximos chats" del maestro | parse del archivo |

## Iconos de churn

| Ícono | Cuándo |
|---|---|
| 🔥 | Top 3 (subsistemas más activos) |
| 🟢 | Posiciones 4-6 |
| 🟡 | Posiciones 7-8 |

## Iconos de zonas muertas

| Ícono | Días sin commit |
|---|---|
| 🟡 | 42-60d |
| 🔴 | 60-90d |
| 💀 | >90d |

## Limitaciones conocidas

- **Solo mide el repo `educa-web` (FE)**. El BE (`Educa.API/`) tiene su propia historia git, fuera del alcance de este reporte.
- **Sin tabla de flujos**. La versión original del script (en otro proyecto) parsea `plans/<flow>/<step>.md` y agrega briefs por flujo. educa-web no usa esa convención (planes flat en `plan/`), así que esa sección se omite. Si en el futuro se quiere implementar, requiere convención nueva.
- **Sparklines aplastados al inicio**: si el sistema de briefs cerrados arrancó hace pocas semanas, la serie es corta hasta acumular más historia.

## Qué NO hago

- Modificar archivos, encolar tareas, mutar maestro.
- Reemplazar `/triage` (eso barre buckets de chats/tasks; progress mira tendencia y churn).
- Generar reporte de plans/maestro completo — solo el top 5 de la cola.

## Argumentos

- `/progress` (sin arg) — reporte completo, ventana default **12 semanas**.
- `/progress --weeks 4` — ventana custom de 4 semanas (el script acepta `--weeks N`).

## Cuándo correrlo

- Antes de planificar — saber qué subsistema está stalled y por qué.
- Tras cerrar un chat grande — confirmar que el churn refleja lo que esperabas.
- Si una carpeta lleva >60d sin tocar pero es importante — investigar drift.
- Como parte del flujo `/end` se corre automáticamente al final del cierre.
- Como parte del flujo `/go` se corre automáticamente al inicio.

## Ver también

- [scripts/progress.sh](../scripts/progress.sh) — implementación.
- [commands/triage.md](triage.md) — visión del estado de chats/tasks (complementaria).
- [hooks/backlog-check.sh](../hooks/backlog-check.sh) — snapshot puntual de buckets en SessionStart.
