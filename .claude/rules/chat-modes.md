# Modos de Chat

## Principio

> **"Cada chat tiene una intención. La intención define qué herramientas uso y qué NO hago."**

## Cómo activar un modo

Usar el comando slash al inicio del chat:

| Comando | Modo | Intención |
|---------|------|-----------|
| `/investigate` | Investigar | Entender sin tocar |
| `/design` | Diseñar | Decidir qué y cómo, sin código |
| `/execute` | Ejecutar | Implementar con diseño claro |
| `/validate` | Validar | Revisar y reportar sin corregir |

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
