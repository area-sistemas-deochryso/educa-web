<!-- created: 2026-08-11 -->

# Audit funcional — navegación profesor (2026-08)

> **Creado**: 2026-08-11
> **Complementa**: [`audit-estudiante-navegacion-2026-08.md`](audit-estudiante-navegacion-2026-08.md) — mismo método (recorrido funcional con cuenta real), ahora desde el rol docente.
> **Lente adicional**: razonamiento explícito desde la perspectiva de quien enseña y gestiona un salón — carga de trabajo diaria, riesgo de comunicarle mal el desempeño de un alumno a un padre, y responsabilidad de supervisión (videoconferencias).

## Contexto de la sesión de audit

- Cuenta de prueba: MENDO CALDERON MARIELA (profesora), dicta 2 cursos: "Arte" (salón INICIAL 3 AÑOS B, 2 estudiantes) y "QA E2E Curso Prueba" (salón 1RO PRIMARIA A, 20 estudiantes) — tutora de ambos salones.
- Mismo dato de prueba que el audit de estudiante: ALCALA SANDOVAL DANIELA, 1 evaluación calificada (18/20, peso 20% del curso).

## Out-of-scope

- Todo lo ya cubierto por `intranet-fe-polish-W21.md` (cursos/salones/horarios/archivos/evaluaciones a nivel de código estático) — este audit es funcional/UX, no repite ese trabajo.
- Ciclo "Verano" visto en el toggle de "Mis Salones" — no se probó, fuera de foco de esta sesión.
- Ejecutar "Nueva Evaluación" o "Eliminar todo el contenido" — se vieron los formularios/botones pero no se dispararon, para no alterar datos de prueba de los otros 19 estudiantes del curso compartido con el audit de estudiante.

## Perspectiva de rol — nota transversal

Dos hallazgos se elevan a 🔴 al releerlos con ojos de profesor, no solo como "hay un dato raro":

- **Promedio confuso (compartido con estudiante)**: el profesor ve el mismo "3.6" engañoso que el estudiante — si no lo nota, puede comunicarle mal a un padre el desempeño real de su hijo. Decisión ya tomada (ver brief), no es una pregunta abierta.
- **Videoconferencias sin control docente**: no es solo que el botón esté siempre verde para el estudiante — el profesor tampoco tiene ninguna forma de señalar "la sala está abierta" o "cerrada". El síntoma se ve en la pantalla del estudiante, pero la causa (falta de capacidad de control) vive del lado del profesor.

Un hallazgo se reencuadra: la contradicción sobre "salón asignado" no es un detalle de copy — es información con la que el profesor decide dónde buscar a sus alumnos; si una pantalla dice "no tiene salones asignados" cuando en realidad tiene 2, puede llevar a no usar una función que sí existe.

## Inventario (resumen)

| Task | Módulo | Severidad | Tipo |
|---|---|---|---|
| [profesor-audit-salon-asignado-contradiccion.md](../tasks/profesor-audit-salon-asignado-contradiccion.md) | Home / Historial de Asistencia / Resumen de Salones | 🔴 | Bug de datos/lógica — ✅ cerrado (chat 553) |
| [profesor-audit-promedio-confuso.md](../tasks/profesor-audit-promedio-confuso.md) | Mis Salones → Notas por Estudiante / Notas del Salón | 🔴 | Decisión ya tomada — ejecutar |
| [profesor-audit-videoconf-control-sala.md](../tasks/profesor-audit-videoconf-control-sala.md) | Videoconferencias | 🔴 | Gap de feature (seguridad/supervisión) |
| [profesor-audit-resumen-asistencia-en-cero.md](../tasks/profesor-audit-resumen-asistencia-en-cero.md) | Mi Asistencia → tab Resumen | 🟡 | Bug a confirmar (FE o BE) |
| [profesor-audit-resumen-salones-contador-ambiguo.md](../tasks/profesor-audit-resumen-salones-contador-ambiguo.md) | Resumen de Salones | 🟢 | UX menor |
| [profesor-audit-notas-select-placeholder.md](../tasks/profesor-audit-notas-select-placeholder.md) | Mis Cursos / Mis Salones → Calificar | 🟢 | UI menor |

## Fases

### F1 — Recorrido funcional ✅ (2026-08-11)

Objetivo: mapear todas las páginas alcanzables desde el nav del profesor (Mensajes, Mi Aula, Mi Seguimiento, Más) y registrar cualquier comportamiento inesperado.
Done cuando: cada entrada del nav fue visitada al menos una vez y los hallazgos quedaron documentados en un task file.

### F2 — Validación y decisión de producto (pendiente)

Objetivo: para los hallazgos que dependen de una decisión o de leer código (no solo UI), confirmar alcance exacto antes de pasar a `/design`.
Pasos:
- `profesor-audit-videoconf-control-sala.md`: definir con quien corresponda (producto + posiblemente proveedor de videoconferencia) qué control mínimo viable se construye.
- `profesor-audit-salon-asignado-contradiccion.md`: confirmar en código si el componente de "Mis estudiantes" en Historial de Asistencia asume un solo salón tutorado, antes de decidir el fix.
Done cuando: ambos briefs tienen su alcance técnico confirmado y pueden pasar a `/design`.

### F3 — Implementación (no iniciada)

Materializar briefs en `chats/open/` vía `/next-chat` a medida que se prioricen.

## Criterios de éxito

- Ningún hallazgo 🔴 queda como "pregunta abierta sin dueño" al cerrar este audit.
- El fix de promedio confuso se implementa una sola vez, compartido entre estudiante y profesor — no 3 implementaciones duplicadas.

## Notas operativas

- Los hallazgos de este audit comparten datos de prueba con `audit-estudiante-navegacion-2026-08.md` (mismo curso "QA E2E Curso Prueba", mismos 20 estudiantes) — cualquier cambio en esos datos afecta a ambos audits.

## Referencias

- [`audit-estudiante-navegacion-2026-08.md`](audit-estudiante-navegacion-2026-08.md)
- [`intranet-fe-polish-W21.md`](intranet-fe-polish-W21.md)
