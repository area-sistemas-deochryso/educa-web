> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo. **No toca código** — es puramente `/design`. Decisiones quedan documentadas en `educa-web/.claude/plan/maestro.md` sección "Plan 28".
> **Plan**: 28 · **Chat**: 1 · **Fase**: `/design` · **Estado**: ⏳ pendiente arrancar.

---

# Plan 28 Chat 1 — `/design` Inclusión de Asistentes Administrativos en reportes de profesores

## PLAN FILE

`.claude/plan/maestro.md` → sección **"🔴 Plan 28 — Inclusión de Asistentes Administrativos en reportes de profesores"** (insertada 2026-04-22, antes del Plan 27).

Toda la información de partida (qué se quiere, las 7 preguntas, alcance preliminar IN/OUT, plan de ejecución estimado de 5 chats, reversibilidad por opción, dependencias y checklist pre-inicio) está ya consolidada en esa sección. Este chat **resuelve** las 7 decisiones y deja la sección actualizada con las respuestas elegidas.

## OBJETIVO

Resolver las **7 decisiones bloqueantes** del Plan 28 antes de habilitar cualquier `/execute`. Confirmar si el plan se mantiene inline en el maestro o se promueve a archivo dedicado `plan/asistente-admin-reportes-profesor.md`. Sin esto, los Chats 2-5 no pueden arrancar — el modelo de datos, el dispatch del webhook CrossChex y el alcance del término "reportes" condicionan **todo** el código posterior.

## PRE-WORK OBLIGATORIO

Antes de entrar a las preguntas, confirmar con el usuario los **5 datos del checklist pre-inicio** que el maestro pide:

```text
[ ] Horario real de entrada/salida del asistente admin (input para Pregunta 6)
[ ] Cantidad de asistentes admin que existen hoy en producción (input para Pregunta 4 — volumen de correos)
[ ] ¿Los asistentes admin marcan en CrossChex físicamente hoy? Si sí, ¿qué pasa con esas marcaciones? (input para Pregunta 3)
[ ] Lista de reportes/listados que hoy muestran profesores (input para Pregunta 1 — alcance "todo reporte" vs "solo asistencia")
[ ] ¿El usuario quiere extender el alcance más allá de la cita literal o queda acotado a "reportes que muestran profesores"?
```

Sugerencia: pedírselos al usuario en el primer mensaje del chat con esa lista numerada. Sin esos datos, las decisiones quedan sin base.

**Inventario sugerido de "reportes que muestran profesores" hoy** (para validar con el usuario en pre-work, opción B de Pregunta 1):

| Categoría | Vistas/endpoints candidatos |
|-----------|----------------------------|
| Asistencia (Plan 21+23 ya hechos) | `attendance-director-profesores`, vista admin tab "Profesores", reporte mensual profesor PDF/Excel, día puntual profesor, widget home director |
| Administración | `/intranet/admin/usuarios` filtro rol = Profesor, listado de tutores en `/intranet/admin/salones` |
| Académico | Horarios por profesor, asignaciones `ProfesorCurso` (Plan 6), salones tutoreados |
| Comunicación | Bandeja de correos filtro destinatario, notificaciones a profesores |
| Permisos | `/intranet/admin/permisos-usuario` filtro rol Profesor |

El usuario confirma cuáles SÍ deben incluir al asistente admin y cuáles NO.

## ALCANCE

Este chat **no toca código**. Su entregable es:

| Output | Ubicación |
|--------|-----------|
| Las 7 decisiones resueltas con justificación breve | Sección Plan 28 del maestro, agregar bloque "Las 7 decisiones (Chat 1 cerrado AAAA-MM-DD)" análogo a Plan 27 Chat 1 |
| Plan de ejecución refinado (chats reales, no estimados) | Tabla "Plan de ejecución estimado" del maestro → renombrada a "Plan de ejecución (confirmado post-Chat 1)" con chats actualizados |
| Decisión inline vs archivo dedicado | Línea "Plan:" del bloque del Plan 28 |
| Invariantes confirmados (`INV-AD08`, `INV-AD09`, posibles ajustes a INV-AD06) | Sección "Invariantes potenciales" → renombrada a "Invariantes a formalizar en Chat 5" con texto final |
| Checklist pre-Chat 2 actualizado | Reemplaza el checklist pre-Chat 1 actual |

## TESTS MÍNIMOS

No aplican — chat de diseño puro. La validación del entregable es: el usuario aprueba las 7 respuestas y firma "OK arrancar Chat 2".

## REGLAS OBLIGATORIAS

- **Modo `/design`** según `.claude/rules/chat-modes.md`: decidir qué y cómo, sin código. No leer archivos del codebase salvo para verificar nombres exactos de constantes/clases mencionadas en las preguntas (ej: confirmar que `Roles.Administrativos` agrupa los 4 roles que el maestro menciona).
- **No tocar `business-rules.md` aún** — INV-AD08/AD09 se formalizan en Chat 5, no en Chat 1. Solo dejarlos enunciados como "potenciales" en el maestro.
- **Respetar `.claude/rules/business-rules.md` §0** ("Núcleo: el Salón") y **§1.0** (modelo polimórfico Plan 21). Cualquier decisión sobre `TipoPersona` debe respetar el dispatch existente y no romper INV-D09 (filtro por `_Estado=true` en tablas de relación).
- **No comprometer Plan 27** (cerrado en docs, pendiente validación del jefe). Las decisiones sobre `EmailNotificationService` deben preservar el early-return de INV-C11 sin tocarlo.
- **Coordinación temporal**: dejar **explícito** que Chat 2 NO arranca hasta que el jefe valide Plan 27 post-deploy (evitar PRs simultáneos sobre los mismos archivos `AsistenciaPersona` + `EmailNotificationService`).

## APRENDIZAJES TRANSFERIBLES (del chat actual)

1. **Modelo polimórfico Plan 21 ya estable**: `AsistenciaPersona` con `TipoPersona = 'E' | 'P'`, dispatch `Profesor → Estudiante → rechazar` documentado en `business-rules.md §1.0`. Cualquier extensión a `'A'` debe agregar un 3er paso al dispatch (no insertar al medio) y respetar el invariante "DNI_COLISION_CROSS_TABLE" extendido al 3er bucket.
2. **Asistentes Administrativos viven en tabla `Director`** — mismo login, campo de rol los distingue. Constante `Roles.Administrativos` agrupa Director + Asistente Administrativo + Promotor + Coordinador Académico (INV-AD06 los menciona explícitamente). El maestro asume esto al diseñar Pregunta 7.
3. **Plan 21+23 cerrados ayer mismo (2026-04-22)** — la tabla, dispatch y vistas admin ya soportan el 2do tipo persona. Plan 28 es la 3ra extensión natural en una secuencia: estudiante → profesor → asistente admin.
4. **Plan 27 INV-C11 es `'E'`-only por construcción** — no afecta a profesores ni a un futuro `'A'`. El early-return de `EmailNotificationService` consulta `GraOrden` solo cuando `TipoPersona = 'E'`. Plan 28 puede ignorar INV-C11 en sus decisiones.
5. **Plan 22 Chat A multi-sender (200/h por dominio)** — si Pregunta 4 = A o B y se agrega un nuevo tipo de correo, el throttle saliente tiene cabeza para ~150-180 correos/h adicionales sin tocar infraestructura. Confirmar volumen real (cuántos asistentes admin × cuántas correcciones/día) en pre-work para validar.
6. **Plan 26 Chat 1 F2 (cerrado 2026-04-22)** — el rol "Asistente Administrativo" ya tiene multiplier 2.5 en `RoleMultipliers`. No hay riesgo de 429 cuando empiece a usar reportes pesados. Sin trabajo adicional aquí.
7. **Reportes PDF/Excel: regla §17 Plan 25** — INV-RE01/02/03 obligan paridad PDF↔Excel. Chat 3 del Plan 28 debe extender la paridad a los reportes que sumen al asistente admin. Si Pregunta 1 = B (alcance amplio), pueden ser 5-10 reportes adicionales, no solo los 14 de §17.
8. **Cap 300 ln backend (`backend.md`)**: si Pregunta 2 = B (rol-derivado en proyección), las queries de `ConsultaAsistenciaRepository` y `AsistenciaAdminQueryRepository` van a sumar JOINs que pueden empujar archivos sobre 300 líneas. Anticipar split por patrón (Query/Stats/Crud) en Chat 1, no descubrirlo a mitad de Chat 2.
9. **No hay archivo dedicado del Plan 28 todavía** — vive inline en el maestro. Decisión de promoción a archivo dedicado es **output explícito** del Chat 1: si el plan crece a 6+ chats con dependencias múltiples, promover; si quedan los 5 chats estimados sin ramificación, mantener inline (igual que Plan 27).

## FUERA DE ALCANCE

- **No leer código del backend ni del frontend** — chat de diseño puro. Solo confirmar nombres de constantes/archivos mencionados si hay duda de existencia.
- **No modificar `business-rules.md`** — los invariantes se formalizan en Chat 5, no aquí.
- **No tocar Plan 27** ni intentar coordinar su validación del jefe — son trabajos independientes.
- **No empezar el inventario completo de "reportes que muestran profesores"** si Pregunta 1 termina siendo opción A (mínimo). El inventario solo se hace si el usuario confirma alcance amplio.
- **No rediseñar Plan 21/23** — sus decisiones (polimorfismo, INV-AD05, INV-AD06) son punto de partida estable.
- **No abrir Chats 2-5** — eso es output del comando `/next-chat` al cerrar este Chat 1.

## CRITERIOS DE CIERRE

```text
[ ] 5 datos del pre-work confirmados con el usuario
[ ] Pregunta 1 (alcance) — opción elegida + justificación de 1 línea
[ ] Pregunta 2 (modelo de datos) — opción elegida + impacto en migración SQL anticipado
[ ] Pregunta 3 (webhook CrossChex) — opción elegida + cómo afecta el dispatch polimórfico
[ ] Pregunta 4 (correos INV-AD05) — opción elegida + plantilla nueva (sí/no)
[ ] Pregunta 5 (self-service) — opción elegida + impacto FE
[ ] Pregunta 6 (ventanas horarias §1) — opción elegida + valores absolutos si aplica (HH:mm tardanza/falta)
[ ] Pregunta 7 (permisos INV-AD06) — opción elegida + ¿INV-AD06 cambia o se agrega INV-AD08?
[ ] Decisión inline vs archivo dedicado — registrada en línea "Plan:" del Plan 28
[ ] Plan de ejecución actualizado en el maestro (chats reales con scope confirmado)
[ ] Checklist pre-Chat 2 actualizado en el maestro
[ ] Línea "Foco" del maestro actualizada con estado post-Chat 1
[ ] Línea de fecha del header del maestro actualizada con cierre Chat 1
[ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat
[ ] Generar prompt de Chat 2 con `/next-chat` (probable: BE modelo + dispatch + queries)
```

## COMMIT MESSAGE sugerido

Solo hay 1 commit (FE, sobre `educa-web/main`) — el chat solo edita `maestro.md`:

```
docs(maestro): Plan 28 Chat 1 — close /design with 7 decisions resolved
```

Body opcional con el resumen de las 7 respuestas (1 línea por pregunta), siguiendo el patrón usado en Plan 27 Chat 1.

**Reglas commit (`.claude/skills/commit/SKILL.md`)**:

- Inglés, modo imperativo (`close`, no `closed`).
- Términos de dominio entre comillas si van en español: `"Asistente Administrativo"`, `"AsistenciaPersona"`.
- Subject ≤ 72 caracteres ✅ (este lo cumple).
- **NUNCA** agregar `Co-Authored-By:` — la skill lo prohíbe.

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 1:

1. **Confirmación de las 7 respuestas** una por una, en orden. No avanzar a la siguiente sin OK explícito de la anterior — son interdependientes (Pregunta 2 condiciona 3, Pregunta 4 condiciona 5).
2. **¿Promover a archivo dedicado?** Si las decisiones revelan complejidad mayor (ej: Pregunta 1 = B con 8+ reportes a tocar, Pregunta 7 = B con cambio de jurisdicción INV-AD06), recomendar archivo dedicado y pedir OK.
3. **¿Esperar Plan 27 o arrancar Chat 2 BE en paralelo?** Default sugerido: esperar (evita merge conflicts en `AsistenciaPersona` y `EmailNotificationService`). Confirmar.
4. **¿Hay algún reporte fuera del inventario sugerido** que el usuario quiere incluir explícitamente? Capturar antes de cerrar Chat 1 para que Chat 4 FE no descubra vistas a último momento.
5. **Decisiones no obvias para próximos chats**: si alguna respuesta tiene aristas (ej: Pregunta 6 = horario propio del asistente admin), documentar el "por qué" en el bloque del maestro — no solo la decisión, también el contexto que la motivó.