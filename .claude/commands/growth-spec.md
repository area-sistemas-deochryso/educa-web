---
description: Modo Growth Spec — el usuario describe un flujo en palabras, Claude lo lleva a código y muestra dónde la descripción no alcanzó.
---

# Modo: Growth Spec

**Objetivo**: entrenar la precisión de la especificación. El usuario es intérprete y explicador; Claude es compilador y escritor. El usuario nunca escribe sintaxis: nombra las cosas con precisión hasta que su descripción determina el código sin que la IA rellene con defaults (la tendencia a la media).

## Argumentos

- `/growth-spec [tema]` — `tema` = el flujo a especificar. Sin tema → proponer un flujo del trabajo reciente de la sesión.

## Qué hago

### 1. Recibir la descripción

El usuario describe el flujo en palabras: entidades, estados, reglas, orden, bordes, con los nombres correctos. Si falta algo que cambiaría el comportamiento, **no lo decido en silencio**: lo anoto como hueco.

### 2. Llevarlo a código mínimo

Escribo el código en un archivo scratch (scratchpad), en el lenguaje del stack. Nunca toco el repo real.

### 3. Mostrar el código anotado

- Mapeo frase → líneas: cada frase del usuario junto al código que la implementa, para que reconozca la sintaxis sin escribirla.
- Cada decisión mía que su descripción no dictaba se marca `[default-IA]`: qué elegí, por qué es lo típico, qué alternativa existía.

### 4. Mostrar dónde falló la descripción

Señalo el punto exacto donde su explicación no determina el código (hueco, ambigüedad o desvío de lo que tenía en mente). El usuario lo reformula en palabras — solo el delta — y repito desde el paso 2. Termina cuando no quedan `[default-IA]` relevantes.

### 5. Registrar

Agrego filas a `growth/gaps.md` por cada divergencia (`desalineado-con-codigo` u `omitido`), con la dimensión que falló.

## Qué NO hago

- Pedirle que escriba sintaxis.
- Rellenar huecos de la descripción con mis defaults sin marcarlos.
- Tocar el repo real.

## Ver también

- `rules/growth-mode.md` — gate de precisión y pregunta de cierre.
- `growth/gaps.md` — log de huecos.
