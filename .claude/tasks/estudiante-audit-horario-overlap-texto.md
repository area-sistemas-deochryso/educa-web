<!-- created: 2026-08-11 -->

# estudiante-audit-horario-overlap-texto ✅ Resuelto

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🟡 (bug visual, sin pérdida de datos, pero rompe legibilidad).
> **Resuelto**: commit `6119d17b` (2026-08-12) — `estudiante-horarios.component.scss`. Causa real: `.curso-nombre`/`.block-salon` tenían `overflow: hidden`, lo que en Flexbox habilita tamaño mínimo automático `0` — el navegador comprimía el texto (no lo desbordaba/superponía) para que entrara en el bloque. Fix: `flex-shrink: 0` en ambas filas + paddings/gaps/fuentes compactados para que las 4 líneas (curso, salón, alumnos, badge) quepan sin overlap en un bloque de 1h. Verificado en vivo (sesión estudiante ALCALA SANDOVAL DANIELA) con el bloque real, un nombre de curso largo (ellipsis OK) y un bloque de 30min simulado (sin overlap incluso en el peor caso).

## Reproducción

1. Loguear como estudiante con al menos un curso asignado (usado: ALCALA SANDOVAL DANIELA, curso `QA E2E Curso Prueba`, salón `1RO PRIMARIA A - 2026`, bloque Lunes 07:00-08:00).
2. Ir a `/intranet/estudiante/horarios` ("Mi Horario").
3. Observar el bloque de clase en la grilla semanal.

**Actual**: el nombre del curso ("QA E2E Curso") se renderiza superpuesto sobre el nombre del salón ("1RO PRIMARIA A - ..."), ambos textos compitiendo por la misma línea/espacio dentro del bloque. Ver zoom capturado en la sesión de audit (región del bloque, 228x95px) — texto ilegible.

**Esperado**: cada línea de texto (curso, salón, contador de estudiantes, badge de tiempo) tiene su propio renglón sin solaparse, con truncamiento (`ellipsis`) si el nombre es largo, en vez de overlap.

## Componente probable

`pages/estudiante/schedules/estudiante-horarios.component.ts` / `.scss` — confirmado como el componente de esta página en el plan hermano `intranet-fe-polish-W21.md` (F1.Resultados marcó esta página con paleta hex inline en líneas 39-40 y 217-228 de ese entonces; verificar si el fix de tokens de `polish-W21-tokens-colors.md` tocó también el layout interno del bloque o solo el color).

## Perspectiva de rol

Un estudiante de primaria (6-11 años) escaneando su horario depende mucho de leer rápido "¿qué materia tengo ahora?" — con el texto solapado no puede leerlo ni él ni un adulto ayudándolo a distancia (ej. por screenshot). No es solo estético: rompe el propósito de la página.

## Criterio de cierre

- Bloque de horario muestra curso + salón en líneas separadas, cada una con `text-overflow: ellipsis` si excede el ancho disponible, sin overlap en ningún breakpoint (probar con nombres de curso largos, no solo con datos de prueba cortos).
- Verificar en al menos 2 anchos de bloque distintos (día con 1 clase vs. día con varias clases apiladas, si el grid las comprime).

## Out-of-scope

- Rediseño completo del bloque de horario (colores, iconografía) — solo el layout de texto que causa el overlap.
