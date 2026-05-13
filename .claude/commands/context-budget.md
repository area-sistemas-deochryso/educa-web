---
description: Modo Presupuesto de contexto — auditar qué carga el proyecto en CADA chat y mover lo raro a un índice bajo demanda.
---

# Modo: Presupuesto de contexto

**Objetivo**: bajar el prefijo fijo que este proyecto inyecta en cada chat. Clasificar cada pieza de contenido auto-cargado en *siempre activa* vs *bajo demanda*, fusionar duplicados, borrar lo muerto. Variante de [`/audit`](audit.md) con scope fijo: `.claude/` (no código fuente).

## El problema que resuelve

`CLAUDE.md` (y lo que trae con `@import`) puede arrastrar cientos de líneas de reglas/docs/índices al prefijo de **todos** los chats, incluyendo cosas con triggers raros (worktrees, merge paralelo, layout de carpetas, frescura de docs, reglas meta). Eso encarece cada conversación y acelera el riesgo de error 500. Solución: prefijo liviano + índice de punteros de una línea que Claude lee cuando el trigger aplica — mismo patrón que `MEMORY.md` para memorias.

## Qué audito

1. `CLAUDE.md` y todo lo que importa con `@import` (recursivo).
2. Otros archivos que se carguen siempre: output styles, settings que inyecten contexto, READMEs auto-incluidos.
3. Costo actual en líneas: `(Get-ChildItem <paths> | Get-Content | Measure-Object -Line).Lines`.

## Clasificación (por cada regla / sección / doc importado)

- **SIEMPRE ACTIVA** — aplica a >70% de los chats del proyecto. Ej: convención de commits, idioma de código, flujo de modos, chequeo de git al inicio, reglas de cierre. Test: *"¿un chat de consulta de 2 mensajes necesita esto?"* — si no, no es siempre-activa.
- **BAJO DEMANDA** — tiene trigger identificable y raro. Pasa a línea de índice: `- ruta/archivo.md — <hook accionable: "vas a X" / "el repo tiene Y" / "detectás Z">`. El contenido sale del contexto.
- **FUSIONABLE** — dos+ piezas con el mismo trigger o tema solapado. Proponer fusión en un checklist antes de decidir always-on vs on-demand.
- **MUERTA** — ya no aplica, está duplicada con una regla global `~/.claude/`, o describe algo que ya no existe. Proponer borrarla.

## Reglas del índice

- Una línea por ítem; el hook tiene que decir **exactamente cuándo** abrir el archivo. Hooks vagos ("info de testing") no sirven; concretos ("vas a tocar la config de vitest o escribir un test nuevo") sí.
- Agrupar por tema con `###`, no lista plana de 20.
- El `@import` y el índice viven en el MISMO `CLAUDE.md`, separados por un encabezado y una nota de 3-4 líneas que explica los dos tipos.

## Qué NO hago

- Tocar código fuente (sigue la arquitectura del proyecto, no este comando).
- Partir archivos grandes en varios (eso es otra pasada — `coding.md`/`large-files`).
- Mover `commands/` a subcarpetas (Claude Code namespacea por subfolder — se queda plano).
- Auto-reescribir docs con LLM — solo clasifico y propongo; el usuario confirma.
- Duplicar una política universal que ya vive en `~/.claude/rules/` — acá queda solo el override con los números/paths locales.

## Entregable

1. **Tabla**: cada pieza actual → clasificación (SIEMPRE / DEMANDA / FUSIONAR / MUERTA) + por qué. **Mostrarla y esperar confirmación ANTES de tocar archivos.**
2. `CLAUDE.md` reescrito con los dos bloques.
3. Archivos fusionados/borrados con referencias actualizadas (grep del nombre viejo en todo `.claude/` antes de borrar).
4. Antes/después en líneas de contexto fijo.
5. Commit aparte del trabajo funcional. Si el repo linkea `~/.claude/` (regla `claude-config-sync` o equivalente): commit + push, y re-correr el script de links si se editó `CLAUDE.md`.

## Override por proyecto

`<repo>/.claude/commands/context-budget.md` puede ajustar el umbral del 70%, listar qué archivos cuentan como "siempre cargados" en este stack, o nombrar subsistemas cuyos docs nunca deberían ser always-on.
