<!-- created: 2026-08-11 -->

# estudiante-audit-videoconf-estado-vivo

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🔴 (seguridad/supervisión de menores, no solo UX).
> **Pre-requisito**: confirmar con el proveedor de videoconferencia si expone un estado "sala activa/con host presente" vía API antes de diseñar la solución — sin eso, el fix de FE es solo cosmético.

## Reproducción

1. Loguear como estudiante, ir a "Más" → "Videoconferencias" (`/intranet/videoconferencias`).
2. Ver la tarjeta del curso `QA E2E Curso Prueba` con horario "Lunes 07:00 - 08:00" y botón **"Unirse a Sala"** en verde.
3. Probar en un momento fuera de ese horario (ej. cualquier otro día/hora).

**Actual**: el botón "Unirse a Sala" se muestra siempre habilitado y en verde (color que normalmente comunica "disponible ahora"), sin distinguir si es horario de clase, si el profesor ya está conectado, o si es una sala vacía sin moderador. No se probó el click real (fuera de scope de este audit no interactuar con salas de video en vivo), por lo que no se confirma qué pasa al entrar fuera de horario — el hallazgo es la falta de señal visual previa al click.

**Esperado**: el botón debería comunicar estado real antes del click — al menos diferenciar "clase en curso ahora" vs. "próxima clase: Lunes 07:00" vs. "sala vacía, sin profesor conectado". Idealmente deshabilitado o con confirmación adicional fuera de horario.

## Perspectiva de rol — por qué es 🔴 y no solo 🟡

Para un estudiante de inicial o primaria temprana, un botón siempre verde invita a clickear "porque está prendido", sin noción de horario. Si al hacer click igual se entra a una sala de videollamada (aunque esté vacía o fuera de horario), es una superficie de exposición de un menor a una sala de video sin supervisión activa — el problema no es solo "confunde al usuario", es "puede exponer a un chico a una situación no supervisada". Esto amerita involucrar al equipo de seguridad/producto antes de decidir el fix, no solo a FE.

## Preguntas a resolver antes de implementar

1. ¿Qué pasa hoy si un estudiante hace click fuera de horario? (¿Entra a una sala vacía? ¿Error? ¿Redirige a un lobby?) — probar en un chat dedicado, no en este audit.
2. ¿El proveedor de videoconferencia (Zoom/Meet/Jitsi/otro — confirmar cuál usa Educa.API) expone un webhook o endpoint de "host has joined" / "meeting is live"?
3. ¿Hay algún control existente del lado del profesor para "cerrar sala" o solo se autogestiona por horario?

## Próximo paso decidido (2026-08-12)

Abrir un chat `/investigate` nuevo en `educa-web` para responder las 3 preguntas desde el código/config de `Educa.API` (qué proveedor se usa, qué expone su API/webhooks) antes de recién ahí pasar a `/design`. Compartir la investigación con [`profesor-audit-videoconf-control-sala.md`](profesor-audit-videoconf-control-sala.md) — no duplicar.

## Criterio de cierre

- Respuestas a las 3 preguntas documentadas.
- Decisión de diseño (bloquear fuera de horario vs. solo advertir vs. requerir que el profesor "abra" la sala explícitamente) tomada con el equipo correspondiente, no unilateral de FE.

## Out-of-scope

- Cualquier cambio al proveedor de videoconferencia en sí (SDK, permisos de sala) — este task es sobre la señal en la UI de Educa, no sobre la herramienta de video subyacente.
