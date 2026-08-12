<!-- created: 2026-08-11 -->

# profesor-audit-resumen-salones-contador-ambiguo

> **Origen**: F1 audit funcional del plan [`audit-profesor-navegacion-2026-08.md`](../plan/audit-profesor-navegacion-2026-08.md).
> **Severidad**: 🟢 (UX menor — puede leerse como "solo tengo 1 salón" cuando en realidad hay salones en otro nivel).

## Reproducción

1. Loguear como profesor con salones en 2 niveles distintos (probado: 1 en Inicial, 1 en Primaria).
2. Ir a "Mi Seguimiento" → "Resumen de Salones" (`/intranet/profesor/final-salones`).
3. Ver contadores superiores: "Salones: 1, Estudiantes: 2" con el tab "Inicial" activo.
4. Cambiar al tab "Primaria": los contadores cambian a "Salones: 1, Estudiantes: 20".

**Actual**: los contadores de arriba reflejan solo el tab de nivel seleccionado, no el total real de salones del profesor (que en este caso es 2). El número "1" es correcto para ese tab, pero leído sin notar que hay más tabs comunica "tengo 1 solo salón en total".

**Esperado**: o los contadores muestran el total agregado de todos los niveles (con el desglose por tab debajo), o llevan una etiqueta que aclare que son "de este nivel" (ej. "Salones (Inicial): 1").

## Componente probable

Página "Resumen de Salones" (`/intranet/profesor/final-salones`) — los contadores de cabecera probablemente se recalculan al cambiar de tab en vez de mostrar un total fijo agregado.

## Criterio de cierre

- Un profesor con salones en 2+ niveles ve, sin necesidad de cambiar de tab, que tiene más de 1 salón en total.

## Out-of-scope

- El resto del contenido de "Resumen de Salones" (tabla de aprobados/desaprobados) — funciona correctamente, no está en cuestión.
