<!-- created: 2026-08-11 -->

# estudiante-audit-foro-solo-lectura ✅ Resuelto

> **Origen**: F1 audit funcional del plan [`audit-estudiante-navegacion-2026-08.md`](../plan/audit-estudiante-navegacion-2026-08.md).
> **Severidad**: 🟡 (expectativa de la nomenclatura vs. función real).
> **Tipo**: decisión de producto tomada (2026-08-12) — listo para `/execute` directo (cambio de copy, no requiere `/design`).
> **Implementado**: commits `4003fd5b` + `39a19c49` (2026-08-12) — menú estudiante, quick-access de Inicio, título/breadcrumb de la página, y título de la pestaña del navegador renombrados a "Anuncios". Lint/build/test FE en verde (2505 pass / 0 fail).
> **Validado en prod**: 2026-08-12, FE+BE locales contra DB de prod, sesión real de estudiante (ALCALA SANDOVAL DANIELA) vía session switcher en `/intranet/login`. Confirmado en vivo: dropdown "Mensajes" muestra "Anuncios", breadcrumb "Estudiante > Mensajes > Anuncios", header de página "Anuncios", tab del navegador "Intranet - Anuncios". Sin mutaciones de datos (verificación read-only).

## Reproducción

1. Loguear como estudiante, ir a "Más" → "Mensajes" → "Foro" (`/intranet/estudiante/foro`).
2. Ver publicaciones de la profesora ("Bienvenidos al foro del salón...", etc.).
3. Intentar hacer clic sobre una publicación o buscar un cuadro de respuesta/comentario.

**Actual**: no hay ninguna forma de responder, comentar o reaccionar a las publicaciones. La sección se llama "Foro" (sección "Publicaciones del profesor") pero funciona como un tablón de anuncios unidireccional profesor→estudiante. Confirmado también desde `Mensajería`, donde el mismo hilo aparece etiquetado "21 participantes" — sugiere que técnicamente es un grupo, pero sin UI de respuesta grupal expuesta al estudiante.

**Por qué importa**: "Foro" como nombre genera expectativa de discusión/interacción. Si la función real es solo anuncios, el nombre desalinea expectativa. Si la intención original era permitir respuestas y no se implementó, es un gap de feature, no solo de naming.

## Perspectiva de rol — por qué no es un "simplemente agregar botón de responder"

- **Inicial/primaria (3-11 años)**: un foro de texto libre sin moderación activa es un riesgo real (compartir datos personales, comentarios inapropiados, bullying de bajo grado) en un grupo de 20+ menores. Cualquier interactividad acá necesitaría moderación previa (aprobación docente, o reacciones no-texto tipo 👍/❤️ en vez de texto libre).
- **Secundaria (12-17 años)**: preguntas cortas al profesor en el foro grupal (visible para todo el curso, evita que 5 alumnos manden la misma pregunta por Mensajería 1:1) sí tendría valor real y es más viable moderarlo a esa edad.

## Decisión tomada (2026-08-12)

Renombrar a **"Anuncios"** — la función se mantiene unidireccional (profesor→estudiante), sin agregar interactividad. Descartadas por ahora: reacciones simples y respuestas moderadas para secundaria (quedan como posible mejora futura, no bloquean este cierre).

## Criterio de cierre

- Copy consistente en el menú "Más → Mensajes → Anuncios" y en el breadcrumb/título de la página.
- Sin cambios de lógica — publicaciones siguen siendo solo del profesor.

## Out-of-scope

- Mensajería 1:1 (`estudiante/mensajeria`) — ya es bidireccional y funciona correctamente, no está en cuestión.
