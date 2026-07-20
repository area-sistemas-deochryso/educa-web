# 468 — Auditoría de descubribilidad: ¿un usuario nuevo entiende la intranet a la primera?

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-20 · **Modo sugerido**: `/investigate` (es una auditoría de hallazgos, no ejecución — decidir fixes en un brief aparte según lo que se encuentre)
> **Plan**: —
> **exclusive**: `false`
> **isolation**: `false`
> **touches**: ninguno todavía — este brief es 100% observación. Los hallazgos que requieran cambio de código se derivan a brief(s) nuevos.

## Contexto

Sesión anterior (brief 467 y trabajo de estilos posterior) dejó la intranet visualmente más consistente (tokens de color, paleta de acciones en tablas, contraste). Ahora el usuario quiere pasar de "¿se ve bien?" a "¿se entiende?" — evaluar **descubribilidad**: si alguien que usa el sistema por primera vez (sin onboarding, sin que nadie le explique) puede orientarse, encontrar lo que busca y entender qué hace cada cosa sin fricción.

Esto es distinto de una auditoría visual (467) o de accesibilidad de color (sesión de hoy) — acá no importa si algo "se ve lindo", importa si **se entiende sin ayuda**.

## Método

Dado que no hay un usuario real disponible para testear, la auditoría se hace vía **walkthrough cognitivo estructurado**: navegar cada superficie simulando ser un usuario nuevo del rol correspondiente (sin memoria de sesiones anteriores) y, para cada pantalla, responder explícitamente:

1. **¿Qué es esto?** — ¿el título/encabezado deja claro qué hace esta pantalla, o hace falta adivinar?
2. **¿Qué puedo hacer acá?** — ¿las acciones disponibles son obvias (botones/íconos con label o tooltip claro) o hay que probar a ciegas?
3. **¿Dónde estoy?** — ¿el breadcrumb/menú activo/título deja claro en qué parte de la intranet está parado?
4. **¿Cómo llego a X?** — para 3-4 tareas típicas del rol (ej. estudiante: "ver mis notas de este bimestre"; profesor: "calificar una evaluación"; admin: "desactivar un usuario"), ¿la ruta para llegar es intuitiva desde el menú, o requiere conocimiento previo?
5. **¿Qué significa este ícono/label sin tooltip?** — íconos solos (sin texto) que no tengan pTooltip explícito son candidatos a hallazgo.

Cada hallazgo se clasifica por severidad:
- **Alto**: bloquea o hace fallar la tarea (el usuario no encuentra cómo hacer algo, o hace algo distinto a lo que cree que está haciendo).
- **Medio**: genera duda o requiere prueba-y-error, pero se resuelve solo.
- **Bajo**: mejora cosmética/de claridad, no bloquea nada.

## Scope

Cubrir al menos:
- **Login** (selector de sesiones, "usar otra cuenta") — primera impresión, cero contexto previo.
- **Dashboard de Inicio** por cada rol (Administrador, Profesor, Estudiante) — el punto de entrada, más importante que cualquier otra pantalla.
- **Navegación principal** (menú superior, dropdowns "Académico"/"Asistencia"/etc.) — ¿la agrupación de items tiene sentido para alguien que no conoce la app?
- **3-4 tareas típicas por rol** (ver método punto 4), cronometrando mentalmente cuántos clics/decisiones le toma a un usuario nuevo vs. cuántos debería tomarle.
- **Terminología**: ¿los nombres de módulos/acciones usan jerga interna (ej. "WAL", "capability", nombres de tablas) que un usuario real no reconocería?

Fuera de scope: accesibilidad de color/contraste (ya cubierto hoy), performance, bugs funcionales (a menos que un bug funcional sea también un problema de descubribilidad, ej. un botón que parece hacer algo pero no hace nada).

## Criterio de cierre

- [ ] Walkthrough completo de las 3 superficies de rol (Administrador/Profesor/Estudiante) + login, siguiendo el método de las 5 preguntas.
- [ ] Lista de hallazgos con severidad (Alto/Medio/Bajo), cada uno con: pantalla, qué se esperaba entender, qué se entendió en realidad, captura si aplica.
- [ ] Para los hallazgos de severidad Alto: propuesta concreta de fix (no implementación, solo la idea) para poder derivarlos a un brief de ejecución.
- [ ] Resumen ejecutivo: 3-5 líneas con la conclusión general (¿la intranet es autoexplicativa hoy, o depende de que alguien te la explique?).
