# Plan — Audit funcional Intranet Estudiante (2026-08-11)

> **Creado**: 2026-08-11 — audit funcional en browser (no code-audit estático), disparado desde `educa-coord` pero de scope 100% `educa-web`.
> **Complementa** (no repite) [`intranet-fe-polish-W21.md`](intranet-fe-polish-W21.md): aquel cubrió 5 módulos (cursos, salones, horarios, archivos, evaluaciones) vía lectura estática de código. Este audit cubre **asistencia, foro, mensajería, videoconferencias y "Mi Rendimiento"** — los módulos que W21 marcó explícitamente fuera de su scope o que no llegó a mapear — vía recorrido real en browser, logueado como estudiante de prueba.
> **Lente adicional**: cada hallazgo se evalúa también desde la perspectiva de quién usa esto en la vida real — niños de inicial (~3-5 años, muchos aún no leen con fluidez), primaria (~6-11) y secundaria (~12-17). No es solo "¿está roto?" sino "¿un chico de esa edad lo entendería o lo usaría bien solo?".

---

## Contexto de la sesión de audit

- **Rol probado**: Estudiante — ALCALA SANDOVAL DANIELA (DNI 91708691), salón `1RO PRIMARIA A - 2026`, curso único `QA E2E Curso Prueba` (dato de prueba, no alumna real).
- **Profesora del curso**: MENDO CALDERON MARIELA.
- **Método**: recorrido manual en browser (Chrome, extensión Claude), front `ng serve :4201` + back `dotnet run :5139` contra `TestConnection`.
- **Cobertura**: Inicio (accesos rápidos), Mi Horario, Mis Cursos (+ modal Contenido/Notas/Información), Mis Salones (Grupos/Notas+Simulador/Asistencia/Ubicación), Foro, Mensajería, Historial de Asistencia, Mi Asistencia, Mi Rendimiento, Mis Calificaciones, Videoconferencias, FAB "Acciones", menú de usuario.

## Out-of-scope

- No repite el audit estático de W21 (design-system tokens, `appendTo`, skeletons, aria-labels ya cubiertos ahí — ver su matriz F1.Resultados).
- No incluye el audit de profesor (sub-plan hermano pendiente, mismo formato, a correr después).
- No implica que se vaya a construir cada mejora sugerida — varios hallazgos son preguntas de producto/pedagogía a validar, no tickets directos.

## Perspectiva de rol — nota transversal

Dos hallazgos (`estudiante-audit-promedio-rojo-confuso`, `estudiante-audit-videoconf-estado-vivo`) suben de severidad respecto a lo que parecería un bug puramente visual, porque el usuario real es un niño:

- Un promedio en rojo grande puede leerse como "estoy reprobando" aunque la nota real sea 18/20 — impacto en autoestima/ansiedad, no solo estética.
- Un botón "Unirse a Sala" siempre habilitado (sin indicar si la clase está en vivo) invita a un niño a entrar a una videollamada sin supervisión fuera de horario — cuestión de seguridad, no solo UX.

Un tercer hallazgo (`estudiante-audit-justificacion-inasistencia`) se reencuadra en sentido contrario: no se recomienda que el propio estudiante justifique su inasistencia (eso es responsabilidad de un tutor/adulto), sino aclarar la UI para que no parezca una función rota.

## Hallazgos — resumen

| Task | Módulo | Severidad | Tipo |
|---|---|---|---|
| [`estudiante-audit-horario-overlap-texto.md`](../tasks/estudiante-audit-horario-overlap-texto.md) | Horarios | 🟡 | Bug visual |
| [`estudiante-audit-icono-archivo-incorrecto.md`](../tasks/estudiante-audit-icono-archivo-incorrecto.md) ✅ | Cursos (archivos) | 🟢 | Bug menor — resuelto brief 550 |
| [`estudiante-audit-contraste-rendimiento.md`](../tasks/estudiante-audit-contraste-rendimiento.md) | Mi Rendimiento | 🔴 | Bug accesibilidad |
| [`estudiante-audit-rendimiento-sin-datos.md`](../tasks/estudiante-audit-rendimiento-sin-datos.md) | Mi Rendimiento | 🔴 | Bug de datos/consistencia |
| [`estudiante-audit-promedio-rojo-confuso.md`](../tasks/estudiante-audit-promedio-rojo-confuso.md) | Evaluaciones | 🔴 | UX / impacto en menores |
| [`estudiante-audit-evaluaciones-pendientes-texto.md`](../tasks/estudiante-audit-evaluaciones-pendientes-texto.md) | Evaluaciones | 🟡 | UX / lenguaje |
| [`estudiante-audit-foro-solo-lectura.md`](../tasks/estudiante-audit-foro-solo-lectura.md) | Foro | 🟡 | UX / expectativa vs función |
| [`estudiante-audit-asistencia-duplicada.md`](../tasks/estudiante-audit-asistencia-duplicada.md) ✅ | Asistencia | 🟢 | Consistencia — no-op, brief 552 |
| [`estudiante-audit-videoconf-estado-vivo.md`](../tasks/estudiante-audit-videoconf-estado-vivo.md) | Videoconferencias | 🔴 | UX / seguridad de menores |
| [`estudiante-audit-justificacion-inasistencia.md`](../tasks/estudiante-audit-justificacion-inasistencia.md) | Asistencia | 🟡 | UX / responsable incorrecto |

## Fases

### F1 — Investigate · Audit funcional en browser ✅ 2026-08-11

Hecho. Resultado: 10 tasks arriba, creadas en `.claude/tasks/`.

### F2 — Design · Priorizar y decidir qué se materializa como brief numerado

**Pendiente.** Antes de convertir cada task en un brief de `chats/open/` (vía `/next-chat`):

1. Validar con producto/pedagogía los hallazgos marcados "pregunta de producto" (`promedio-rojo-confuso`, `justificacion-inasistencia`, `foro-solo-lectura`) — no son bugs de código, son decisiones de diseño.
2. Los bugs puros (`contraste-rendimiento`, `rendimiento-sin-datos`, `horario-overlap-texto`, `icono-archivo-incorrecto`, `asistencia-duplicada`) pueden pasar directo a brief sin esa validación.
3. `videoconf-estado-vivo` amerita chequear primero si el proveedor de videoconferencia expone algún estado "sala activa" vía API antes de diseñar la solución.

### F3 — Execute · Uno o varios briefs según priorización de F2

`estudiante-audit-icono-archivo-incorrecto` ✅ cerrado directo sin pasar por F2 (bug puro, sin ambigüedad de producto) — brief [`550`](../chats/closed/550-fe-icono-archivo-tipo-color.md), commit `bdc3fee1`.

`estudiante-audit-asistencia-duplicada` ✅ cerrado directo como no-op (investigación de código + verificación en vivo confirmaron que el selector ya existía y el diseño "por curso" era correcto) — brief [`552`](../chats/closed/552-fe-asistencia-duplicada-noop.md), sin commit de código. Resto de tasks: no arrancado.

## Referencias

- Hermano estático: [`intranet-fe-polish-W21.md`](intranet-fe-polish-W21.md).
- Maestro local FE: [`maestro.md`](maestro.md).
- Origen de sesión: chat en `educa-coord` (checkpoint de 3 cuentas en switcher — admin/estudiante/profesor — previo a este audit).
