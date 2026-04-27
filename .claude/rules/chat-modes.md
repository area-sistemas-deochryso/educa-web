# Modos de Chat

## Principio

> **"Cada chat tiene una intención. La intención define qué herramientas uso y qué NO hago."**

## Flujo diario — solo 2 comandos

Uso normal: **abrís un chat, tipeás `/go`, trabajás, al final tipeás `/end`**. El resto es interno.

| Comando | Para qué |
|---|---|
| `/go` | **Entrada única**. Detecta qué hay que hacer (brief en `running/`, en `open/`, o top de la cola del maestro) y drivea los modos internos sin intervención hasta completar, bloquearse o necesitar una decisión. |
| `/end` | **Salida única**. Decide entre commit completo (delegando en `/commit-front`/`/commit-back`/`/commit-local`), pausa, abort, commit aparte o sin-op según el estado. |
| `/retomar` | Variante segura de `/go`: solo continúa lo que está en `running/`. No hace pull de cola. Útil para reabrir un chat sin riesgo de arrancar trabajo nuevo. |

Los modos internos se invocan automáticamente desde `/go`, pero también podés llamarlos directo si querés control fino:

## Modos internos

| Comando | Modo | Intención |
|---------|------|-----------|
| `/investigate` | Investigar | Entender sin tocar |
| `/design` | Diseñar | Decidir qué y cómo, sin código |
| `/execute` | Ejecutar | Implementar con diseño claro |
| `/validate` | Validar | Revisar y reportar sin corregir |

## Comandos de gestión del ciclo de vida del chat

Un brief atraviesa `chats/open/` → `running/` → (`waiting/` | `troubles/`)? → `closed/`. Los comandos que transicionan cada estado:

| Comando | Transición |
|---|---|
| `/start-chat` | `open/` → `running/`. Arrancar un brief leyéndolo, moviéndolo, aplicando su modo sugerido. Gate duro: solo 1 en `running/`. |
| `/block-chat` | `running/` → `waiting/` (decisión/dependencia externa) o `troubles/` (obstáculo técnico). |
| `/end` | `running/` → `closed/` junto con el commit final del trabajo. |
| `/next-chat` | Genera el brief del siguiente chat en `open/` (handoff). |
| `/triage` | Barrido manual de los 6 backlogs ([rules/backlog-hygiene.md](backlog-hygiene.md)). |
| `/progress` | Reporte de avance del proyecto (sparklines de commits/briefs/sem, churn, zonas muertas). |

Los comandos viven en `.claude/commands/` y cargan las reglas completas del modo.

## Si el usuario no usa comando

Si el mensaje no empieza con un comando pero la intención es clara, preguntar:

> "¿Esto es modo Investigar, Diseñar, Ejecutar o Validar? Puedes usar `/investigate`, `/design`, `/execute` o `/validate` para activar el modo."

**Excepción**: Pedidos triviales (1-2 archivos, cambio obvio) no requieren comando — ejecutar directo.

## Transiciones válidas dentro de un chat

| Transición | Válido | Ejemplo |
|------------|--------|---------|
| Investigar → Diseñar | Sí | "Ahora planifiquemos el cambio" |
| Diseñar → Ejecutar | Sí | "OK, implementa" |
| Validar → Ejecutar | Sí (si el usuario lo pide) | "Corrige los hallazgos" |
| Ejecutar → Investigar de otro módulo | No | Cambio de contexto → chat nuevo |

## Regla de diseño obligatorio

`/design` es obligatorio antes de `/execute` cuando la tarea toca **3+ archivos** o implica decisiones de arquitectura. Si el usuario pide ejecutar directamente algo complejo, sugerir `/design` primero.
