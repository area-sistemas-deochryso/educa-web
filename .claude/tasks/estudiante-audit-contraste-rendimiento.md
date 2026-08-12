<!-- created: 2026-08-11 -->

# estudiante-audit-contraste-rendimiento

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🔴 (accesibilidad — WCAG contraste, no solo estética).

## Reproducción

1. Loguear como estudiante, modo oscuro activo (default de la sesión de audit).
2. Ir a "Mi Seguimiento" → "Mi Rendimiento" (`/intranet/estudiante/rendimiento`).
3. Observar la fila con el nombre del curso y el año, justo debajo del título "Mi Rendimiento".

**Actual**: el texto "QA E2E Curso Prueba" se renderiza en gris muy oscuro sobre fondo oscuro — contraste insuficiente, casi ilegible (confirmado con zoom en la sesión de audit). El texto "2026" en la misma fila sí usa un color claro/legible. Ambos textos están en el mismo contenedor, por lo que probablemente uno usa una clase de color hardcodeada (texto "oscuro" pensado para fondo claro) y el otro usa el token correcto de texto sobre fondo oscuro.

**Esperado**: ambos textos usan el mismo token de color de texto secundario del design-system, legible en modo oscuro y claro.

## Componente probable

Página "Mi Rendimiento" no está mapeada en el inventario de `intranet-fe-polish-W21.md` (ese plan cubrió `estudiante/notas` pero no `estudiante/rendimiento` como página separada) — ubicar bajo `pages/estudiante/` buscando el componente de "rendimiento" (nombre a confirmar; el routing es `/intranet/estudiante/rendimiento`).

## Perspectiva de rol

Contraste bajo afecta a cualquier usuario con baja visión, independientemente de la edad — pero además, si un padre/tutor revisa el rendimiento del hijo desde el celular con brillo bajo o luz solar directa, el nombre del curso desaparece literalmente. Es el tipo de bug que un adulto reporta como "la página no carga bien" sin saber describir el problema real.

## Criterio de cierre

- Grep de hex/clases de color en el componente de rendimiento — reemplazar por tokens del design-system (`rules/design-system.md` §7-8), mismo criterio que `polish-W21-tokens-colors.md` usó para otras páginas.
- Verificar contraste ≥ 4.5:1 (WCAG AA) en modo oscuro y claro.

## Out-of-scope

- El resto del audit de tokens de color en esta página (si hay más, loguear aparte) — este task es específico al hallazgo del nombre de curso.
