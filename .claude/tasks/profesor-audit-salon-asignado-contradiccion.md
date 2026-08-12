<!-- created: 2026-08-11 -->

# profesor-audit-salon-asignado-contradiccion

> **Origen**: F1 audit funcional del plan [`audit-profesor-navegacion-2026-08.md`](../plan/audit-profesor-navegacion-2026-08.md).
> **Severidad**: 🔴 (información contradictoria sobre qué salones gestiona el profesor — puede llevar a no usar una función que sí existe).

## Reproducción

1. Loguear como profesor con 2 salones tutorados (probado: MENDO CALDERON MARIELA, tutora de "INICIAL 3 AÑOS B" y "1RO PRIMARIA A").
2. En el Home (`/intranet`), ver el widget "Asistencia de Hoy" → "MI SALÓN: INICIAL 3 AÑOS B" (singular, solo muestra 1).
3. Ir a "Mi Seguimiento" → "Historial de Asistencia" (`/intranet/asistencia`) → tab "Mis estudiantes".
4. Ver: **"No tiene salones asignados."**
5. Ir a "Mi Seguimiento" → "Resumen de Salones" (`/intranet/profesor/final-salones`).
6. Ver ambos salones listados, cada uno con badge **"Tutor"** — confirma que sí es tutora de los 2.

**Actual**: 3 pantallas distintas dan 3 respuestas distintas a la misma pregunta ("¿de qué salones es tutora este profesor?"): una dice 1 (Home), otra dice 0 (Historial de Asistencia → Mis estudiantes), y la fuente que parece más confiable (Resumen de Salones, con badge explícito por salón) dice 2.

**Esperado**: las 3 pantallas deberían coincidir. La hipótesis de trabajo es que "Mis estudiantes" en Historial de Asistencia fue escrito asumiendo "el profesor tiene como máximo 1 salón tutorado" (el mismo supuesto implícito que el widget del Home, que sí lo maneja sin fallar del todo, mostrando simplemente "el primero").

## Componente probable

- Home: widget "Asistencia de Hoy" — probablemente toma el primer salón tutorado de una lista, sin indicar que puede haber más.
- Historial de Asistencia → tab "Mis estudiantes" (`/intranet/asistencia`): posible filtro roto que busca un único salón tutorado por alguna propiedad singular (ej. `salonTutorId`) en vez de una lista, y al no encontrar coincidencia exacta retorna vacío.
- Resumen de Salones (`/intranet/profesor/final-salones`): fuente que sí maneja bien el caso de múltiples salones — usar como referencia de la lógica correcta.

## Criterio de cierre

- Confirmado en código (no solo por UI) cuál es el supuesto roto — ver fase F2 del plan.
- Las 3 superficies muestran información consistente para un profesor con 2+ salones tutorados.
- Regresión: un profesor con 1 solo salón tutorado (caso más común) sigue funcionando igual que hoy.

## Out-of-scope

- Cambiar el modelo de datos de "tutoría de salón" — solo corregir las vistas que no lo leen correctamente.

## Diseño (F2/F3 — confirmado en código, ver `/investigate` previo)

### Problema (revisado)

La hipótesis original ("un solo componente asume 1 salón tutorado") no explica las 3 pantallas — son **dos bugs independientes**, no uno:

1. **Home** sí asume "máximo 1 salón tutorado": toma el primero que encuentra vía tutoría y descarta el resto en silencio, sin indicar que puede haber más.
2. **"Mis estudiantes"** no asume eso — mergea correctamente todos los salones tutorados/con horario. El problema ahí es otro: filtra por alcance biométrico (grados por debajo de 5to Primaria no tienen asistencia diaria vía CrossChex) y, cuando ese filtro deja la lista en cero, muestra el mismo mensaje genérico de "sin salones" que usaría si el profesor de verdad no tuviera ninguno — sin distinguir "cero salones" de "salones fuera de alcance".
3. **Resumen de Salones** no tiene bug: es la pantalla de notas finales, no filtra por alcance biométrico porque ese filtro no le aplica a su dominio. Queda como está.

### Opciones

**Home**
- **A — Indicador "+N salones" con link** (recomendada): mantener el salón principal mostrado hoy (mismo criterio de selección), agregar un indicador visible cuando el profesor tutora más de 1 salón, enlazando a la pantalla que ya lista todos. Cambio acotado, no altera el layout compacto del widget.
- B — Selector multi-salón dentro del widget (como en "Mis estudiantes"): resuelve el problema pero duplica una capacidad que ya existe en 2 pantallas, y multiplica llamadas HTTP en Home (una por salón) solo para un widget de resumen diario.
- C — Agregar estadísticas de todos los salones tutorados en una sola cifra: cambia el significado de "mi asistencia de hoy" (mezclaría salones con cantidades de estudiantes muy distintas), no es lo que pide el hallazgo.

**"Mis estudiantes"**
- **A — Distinguir "sin salones" de "fuera de alcance"** (recomendada): antes de aplicar el filtro de alcance biométrico, chequear si el profesor tiene salones sin filtrar. Si los tiene pero el filtro los deja en cero, mostrar el mismo aviso de "fuera de alcance" que ya existe para cuando se selecciona un único salón fuera de alcance, en vez del empty-state genérico. Si de verdad no tiene ningún salón, se mantiene el mensaje actual.
- B — Reescribir el texto del empty-state genérico a algo ambiguo que cubra ambos casos: no reutiliza el componente de aviso ya construido para el caso de 1 salón, deja el mensaje impreciso igual.

### Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Cómo comunica Home que hay más de 1 salón tutorado | Indicador "+N" con link, no selector completo | El widget es de resumen diario; el selector multi-salón ya existe en 2 pantallas — duplicarlo en Home es redundante y más caro en llamadas HTTP |
| Mensaje de "Mis estudiantes" cuando el filtrado por alcance da cero | Reutilizar el aviso de "fuera de alcance" ya usado para 1 salón, en vez del empty-state genérico | El mensaje actual es engañoso (dice "no asignado" habiendo 2 salones fuera de alcance) — el patrón correcto ya está resuelto para el caso de 1 salón, solo falta aplicarlo cuando el filtro deja la lista completa en cero |
| Resumen de Salones | No se toca | Es dominio de notas finales; el filtro de alcance biométrico no le aplica — no es una inconsistencia real, es una diferencia de propósito |

### Fases funcionales

**F1 — Home: señalizar cuando hay más de 1 salón tutorado**
Qué logra: cuando el profesor tutora más de un salón, el widget deja de aparentar que solo tiene uno — sigue mostrando el salón principal con el mismo criterio de hoy, pero agrega una señal clara de cuántos salones tutora en total y un enlace a la pantalla que los lista todos.
`depends_on: []`

**F2 — "Mis estudiantes": distinguir "sin salones" de "salones fuera de alcance"**
Qué logra: cuando el filtro de alcance biométrico deja la lista de salones en cero pero el profesor sí tiene salones tutorados o asignados por horario, se muestra el aviso de "fuera de alcance" (el mismo que ya existe para el caso de 1 salón seleccionado) en vez del mensaje genérico de "sin salones asignados". Ese mensaje genérico queda reservado al caso real de cero salones.
`depends_on: []`

F1 y F2 son independientes entre sí (componentes y fuentes de datos distintas) — pueden ejecutarse en paralelo o en cualquier orden.

### Done-when

- Con el profesor de prueba (2 salones tutorados, ambos fuera de alcance biométrico): Home muestra el salón principal + indicador de que tutora 2 salones en total; "Mis estudiantes" muestra el aviso de "fuera de alcance" (no el genérico de "sin salones"); Resumen de Salones sigue mostrando ambos con badge "Tutor", sin cambios.
- Regresión — profesor con 1 solo salón tutorado dentro del alcance biométrico: comportamiento idéntico al actual en las 3 pantallas (sin indicador de "+N" en Home, tabla de asistencia normal en "Mis estudiantes").
- Regresión — profesor con 1 solo salón tutorado fuera de alcance biométrico: sigue viendo el aviso de "fuera de alcance" que ya existe hoy (sin cambios de comportamiento, solo se generaliza el chequeo).

### Dependencias

Ninguna cross-repo — cambio 100% frontend (`educa-web`), no toca backend ni modelo de datos.

### Fuera de alcance

- Cambiar el modelo de datos de tutoría de salón (ya excluido arriba).
- Relajar o rediscutir el umbral de alcance biométrico (grado ≥ 5to Primaria) — es una decisión de producto distinta, ya tomada en otro plan.
- Selector multi-salón completo dentro del widget de Home (opción B descartada).
- Los demás hallazgos del audit de navegación profesor — cada uno tiene su propio task file.

### Reglas/invariantes aplicables

- Tutor pleno (`esTutor` en `SalonProfesor`) — el fix no cambia ese modelo, solo cómo lo lee cada vista.
- Umbral de alcance biométrico (grado ≥ 5to Primaria) — el fix respeta el umbral, solo corrige qué mensaje se muestra cuando el filtro deja la lista en cero.

### Worktree strategy

- **Isolation**: worktree (default)
- **Exclusive**: false — F1 y F2 tocan componentes distintos dentro de `intranet`, sin overlap entre sí ni con otro trabajo activo conocido.
- **Touches**: componentes de asistencia del rol profesor (widget de Home y vista "Mis estudiantes" de Historial de Asistencia).
- **Parallel risk**: ninguno detectado.

## Contract checklist

- [x] Home muestra un indicador de "N salones tutorados" cuando el profesor tutora más de 1 salón (no solo el primero).
- [x] El indicador de Home enlaza a la pantalla que lista todos los salones tutorados.
- [x] "Mis estudiantes" muestra el aviso de "fuera de alcance biométrico" (mismo componente usado para 1 salón) cuando el profesor tiene salones asignados pero todos quedan fuera del umbral de alcance.
- [x] "Mis estudiantes" conserva el mensaje "No tiene salones asignados" solo cuando el profesor no tiene ningún salón (ni tutoría ni horario) — sin cambios de código en ese camino.
- [x] Un profesor con 1 salón tutorado dentro de alcance no ve cambios visuales en ninguna de las 3 pantallas (regresión) — verificado por lectura de código (camino no tocado); sin cuenta de prueba disponible para verificación en vivo.
- [x] Resumen de Salones no se modifica — verificado en vivo, sin diff.

## Cierre

Cerrado en chat 553 (`educa-web`, branch `chat/553-fe-salon-tutorado-home-mis-estudiantes`). Verificado en vivo con la cuenta MENDO CALDERON MARIELA (dataset local: 3 salones tutorados, no 2 — diferencia de seed data, no afecta el fix):

- Home: "MI SALÓN: INICIAL 3 AÑOS B" + indicador "Tutoría en 3 salones →" enlazando a `/intranet/asistencia?salonId=<id>`.
- "Mis estudiantes": aviso "Este alumno aún no usa asistencia biométrica" en vez de "No tiene salones asignados".
- Resumen de Salones: sin cambios.

**Bug encontrado y corregido durante la implementación**: el link nuevo de Home apuntaba inicialmente a `/intranet/profesor/asistencia` (pantalla de registro de asistencia por curso, `TeacherAttendanceComponent`) en vez de `/intranet/asistencia` (la vista con tabs "Mi asistencia"/"Mis estudiantes", `AttendanceComponent`) — corregido antes de cerrar.

**Hallazgo fuera de alcance, corregido después (commit `8d26d71f`)**: el link pre-existente "Ver detalle" del mismo widget de Home tenía el mismo problema de ruta (apuntaba a `/intranet/profesor/asistencia` en vez de `/intranet/asistencia`) — quedó anotado como fuera de alcance al cerrar 553, se corrigió en un commit aparte inmediatamente después, mismo día.
