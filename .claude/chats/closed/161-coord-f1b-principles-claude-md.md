# 161 — Coord F1b: poblar `principles/` con `claude.md` mínimos + `human.md` skeletons

> **Repo destino**: `educa-coord/` (creado en chat 160)
> **Plan**: [migracion-arquitectura-claude.md §F1b](../../plan/migracion-arquitectura-claude.md)
> **Depende de**: chat 160 cerrado.
> **Creado**: 2026-05-14 · **Estado**: ⏳ pendiente arrancar.
> **MODO SUGERIDO**: `/execute`

## Scope

Para cada uno de los 17 elementos (`01-function-objective` … `17-heuristics`):

1. Escribir `educa-coord/principles/NN-<slug>/claude.md` con la **estructura fija** de §2.1.1:
   - **Frase 1**: qué optimiza este principio.
   - **Trigger de lectura**: cuándo Claude debe abrirlo.
   - **Regla operativa**: 3-5 bullets accionables (qué hacer / qué no hacer).
   - **Puntero**: `Para razonamiento extendido ver [human.md](human.md).`
   - Límite duro: ≤40 líneas.
2. Crear `educa-coord/principles/NN-<slug>/human.md` con esqueleto mínimo:
   - Heading.
   - Sección "Contexto / Por qué importa".
   - Sección "Ejemplos en este proyecto" (vacía con TODO).
   - Sección "Cuándo NO aplica" (vacía con TODO).
3. Validar que la suma de los 17 `claude.md` ≤ 700 líneas totales.

Los 17 elementos están listados en la tabla de §2.1.2 del plan con su "función" y "trigger típico" que orientan el contenido del `claude.md` correspondiente.

## Out of scope

- Llenar el cuerpo narrativo de `human.md` (eso es F8, deuda voluntaria).
- Vincular los principios al `CLAUDE.md` de FE/BE → F5.
- Poblar `invariants/`, `contracts/`, `fitness/` → fases posteriores.

## Criterio de cierre

- `ls educa-coord/principles/*/claude.md | wc -l` retorna `17`.
- `ls educa-coord/principles/*/human.md | wc -l` retorna `17`.
- Cada `claude.md` ≤40 líneas (`wc -l` por archivo).
- Suma total `claude.md` ≤700 líneas.

## Tiempo estimado

~60-90 min (volumen × 17, pero cada uno chico).

## Nota

Si se descubre que un principio se solapa con otro (ej: 05-cohesion y 06-coupling), documentar el solape en ambos `claude.md` con cross-link, no fusionar — los 17 vienen del marco de referencia y deben quedar enumerados.
