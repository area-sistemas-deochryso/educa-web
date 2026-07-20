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

- [x] Walkthrough completo de las 3 superficies de rol (Administrador/Profesor/Estudiante) + login, siguiendo el método de las 5 preguntas.
- [x] Lista de hallazgos con severidad (Alto/Medio/Bajo), cada uno con: pantalla, qué se esperaba entender, qué se entendió en realidad, captura si aplica.
- [x] Para los hallazgos de severidad Alto: propuesta concreta de fix (no implementación, solo la idea) para poder derivarlos a un brief de ejecución.
- [x] Resumen ejecutivo: 3-5 líneas con la conclusión general (¿la intranet es autoexplicativa hoy, o depende de que alguien te la explique?).

## Resumen ejecutivo

La intranet **no es autoexplicativa en el primer contacto**, aunque sí lo es una vez que el usuario ya está dentro de un módulo. Dentro de las secciones la organización es razonable: breadcrumbs claros (`Administrador > Gestión > Usuarios`), etiquetas en primera persona para Estudiante (`Mi Horario`, `Mis Cursos`, `Mi Asistencia`) y estados vacíos ejemplares (`No hay evaluaciones configuradas / Crea una evaluación para comenzar a calificar`). El problema grave está en la **puerta de entrada**: la pantalla de Inicio —la primera que ve cualquier usuario nuevo, en cualquier rol— no muestra el menú de navegación real. Ese menú (organizado por categorías: Académico, Asistencia, Gestión, Más) solo aparece una vez que el usuario ya entró a un módulo, y la única forma de acceder a él desde Inicio es un botón etiquetado **"Inicio"** con un badge secundario "Ctrl+K" — nombre que no comunica "acá está todo el sistema". Un usuario sin guía probablemente se queda limitado a las 4 tarjetas de "Accesos Rápidos" sin saber que existen 15-19 funciones más a un clic de un botón que, por su nombre, sugiere lo contrario (ir a home, no abrir un buscador).

## Hallazgos

### 1. La navegación completa está escondida detrás de un botón llamado "Inicio" (Alto)

**Pantalla**: Inicio (`/intranet`), los 3 roles (Administrador, Profesor, Estudiante).

**Se esperaba**: un menú persistente visible desde el primer momento (como el que sí existe dentro de cualquier submódulo: dropdowns "Académico"/"Asistencia"/"Gestión"/"Más" en el header).

**Se entendió en realidad**: en Inicio ese menú **no existe** — solo hay un pill "Inicio · Ctrl+K" y las tarjetas "Accesos Rápidos" (4 por rol). Al entrar a cualquier submódulo (ej. `/intranet/admin/usuarios`), recién ahí aparece el header completo con dropdowns. Verificado en vivo comparando Inicio vs. dentro de un módulo, para Administrador (CODE CLAUDE), Estudiante (RIVERA PEYRONE ALVARO) y Profesor (OBLITAS HERMOSA FRANCISCO).

Además, el pill que sí existe en Inicio no comunica lo que hace: al hacer clic sobre el texto "Inicio" (no solo sobre el badge "Ctrl+K") se abre un panel de búsqueda/navegación de pantalla completa con todos los módulos del rol (19 para Administrador, 8 para Profesor, 7 para Estudiante), agrupados por categoría. Verificado con clics directos en ambas zonas del pill — las dos abren el mismo panel; ninguna navega a "Inicio" literalmente.

**Propuesta de fix**: mostrar el mismo header con dropdowns por categoría también en la pantalla de Inicio (consistencia con el resto de la app), y separar visualmente el link real a Inicio (ícono casa) del control que abre el buscador/panel de navegación (ícono lupa + texto "Buscar módulo..." en vez de "Inicio").

### 2. Mensaje automático sobre contraseñas en texto plano, sin contexto, al entrar a Usuarios (Medio-Alto)

**Pantalla**: `/intranet/admin/usuarios`, rol Administrador.

**Se esperaba**: al entrar a la gestión de usuarios, ver la tabla de usuarios directamente.

**Se entendió en realidad**: aparece automáticamente un mensaje: *"Hay contraseñas en texto plano que pueden migrarse al campo encriptado"*, sin explicar qué implica ni qué acción tomar en ese momento (existe un botón "Migrar Contraseñas" en la página, pero el mensaje emergente no lo referencia directamente). Para un administrador no técnico, un mensaje sobre "contraseñas en texto plano" suena a alerta de seguridad grave y puede generar ansiedad injustificada o directamente ser ignorado por no entenderse.

**Propuesta de fix**: si el mensaje es solo informativo para que el admin sepa que existe el botón "Migrar Contraseñas", reformularlo en términos no alarmantes (ej. "Podés actualizar contraseñas antiguas al nuevo formato de seguridad") o moverlo a un badge/tooltip sobre el propio botón en lugar de un mensaje emergente automático al cargar la página.

### 3. Jerga técnica interna en el menú de Administrador ("Diagnóstico de BD", "Salud del runtime", "Test k6") (Medio)

**Pantalla**: menú "Más" / panel Ctrl+K, rol Administrador, categorías "Diagnóstico" y "Herramientas".

**Nota de contexto**: el brief 467 (sesión anterior) ya revisó estos mismos ítems desde el ángulo de "¿a qué rol deberían estar restringidos?" (concluyó que Administrador los necesita ver, Director no). Este hallazgo es distinto: incluso estando correctamente restringidos a Administrador, sus **nombres siguen siendo jerga de desarrollo** ("BD", "runtime", "k6") que un director/administrador de colegio —sin perfil técnico— no va a reconocer sin que alguien se lo explique.

**Propuesta de fix**: si estos ítems son de uso exclusivo del equipo técnico/dev (no del personal real del colegio), considerar sacarlos del menú de navegación estándar y moverlos a una ruta separada sin entrada visible en el menú. Si en cambio sí están pensados para que el admin del colegio los use (ej. para reportar un problema a soporte), renombrarlos en términos de negocio: "Diagnóstico de BD" → "Estado de la base de datos", "Salud del runtime" → "Estado del sistema"; "Test k6" probablemente no debería estar visible fuera de un entorno de desarrollo.

### 4. Selector de rol en el login sin explicación (Medio)

**Pantalla**: Login → "Usar otra cuenta".

**Se esperaba**: ingresar DNI + contraseña y entrar directamente (comportamiento típico de login).

**Se entendió en realidad**: hay un tercer campo obligatorio, un dropdown de rol (Estudiante, Profesor, Asistente Administrativo, Coordinador Académico, Director, Administrador...) sin ningún texto de ayuda sobre cuándo o por qué elegirlo. Tiene sentido para cuentas con más de un rol asociado, pero eso no se comunica en ningún lado — un usuario con un solo rol tiene que "adivinar" cuál elegir antes incluso de haber escrito su contraseña.

**Propuesta de fix**: agregar texto de ayuda bajo el campo ("Si tenés más de un rol en el sistema, elegí con cuál querés ingresar") y, si es técnicamente posible, autoseleccionar el único rol disponible una vez que el DNI tiene un solo rol asociado.

### 5. Ícono "Cerrar sesión" en sesiones guardadas es engañoso (Medio)

**Pantalla**: Login → Sesiones guardadas.

**Se esperaba**: que el ícono X en cada tarjeta de sesión guardada tuviera un label que refleje su función real.

**Se entendió en realidad**: el tooltip dice "Cerrar sesión", el mismo texto que usa el dropdown de usuario ya autenticado para cerrar sesión de verdad. Pero en la pantalla de login nadie está logueado — lo que ese ícono realmente hace es remover la cuenta de la lista de sesiones guardadas (confirmado por el ícono visual: X roja de "eliminar/quitar", no de "salir").

**Propuesta de fix**: renombrar el tooltip a "Olvidar cuenta" o "Quitar de la lista" para no confundirlo con un cierre de sesión real.

### 6. Acciones icon-only en tablas sin tooltip visible (Medio)

**Pantalla**: `/intranet/admin/usuarios`, columna "Acciones" (editar / desactivar / copiar DNI).

**Se esperaba**: al pasar el mouse sobre cada ícono, un tooltip visible que confirme su función (ya usan PrimeNG, que lo soporta de forma nativa).

**Se entendió en realidad**: los 3 botones tienen `aria-label` correcto ("Editar usuario", "Desactivar usuario", "Copiar DNI al portapapeles" — bien para accesibilidad con lector de pantalla) pero **ningún tooltip visible** aparece al hover para un usuario que ve la pantalla. El ícono de "desactivar" (círculo con diagonal) es ambiguo a simple vista — podría leerse como "bloquear" o "pausar".

**Propuesta de fix**: agregar `pTooltip` a los 3 botones (mismo patrón que ya usa el resto de la app), consistente con `reference/a11y.md`.

### 7. Terminología inconsistente: "Mis Notas" vs "Mis Calificaciones" (Bajo)

**Pantalla**: Estudiante — tarjeta de Accesos Rápidos vs. breadcrumb/menú/título de página.

La tarjeta en Inicio dice "Mis Notas"; el breadcrumb (`Estudiante > Mi Seguimiento > Mis Calificaciones`), el ítem de menú y el título de la página dicen "Mis Calificaciones"/"Calificaciones". Mismo destino, dos nombres distintos.

**Propuesta de fix**: unificar en un solo término (3 de 4 lugares ya dicen "Calificaciones").

### 8. Botón "Simular" sin contexto previo (Bajo)

**Pantalla**: Estudiante → Mis Calificaciones.

El botón "Simular" no tiene tooltip ni subtítulo — recién al hacer clic se entiende que abre un "Simulador de Notas" (que, una vez abierto, sí se autoexplica bien: "Los cambios son solo simulación. No se guardan ni afectan tus notas reales."). Impacto bajo porque la acción es no-destructiva y reversible.

**Propuesta de fix**: agregar tooltip tipo "Simular qué nota necesitás para aprobar".

### Nota aparte (fuera de scope estricto — higiene de datos, no descubribilidad de UI)

En la cuenta de prueba de Estudiante (RIVERA PEYRONE ALVARO), la única evaluación visible en el curso "Arte" se llama **"Test verificacion 409"** — parece dato de QA filtrado en lo que debería ser una cuenta de demostración limpia. No es un problema de UI, pero un estudiante real viendo ese nombre no entendería de qué evaluación se trata.

## Positivo (no requiere cambio)

- Breadcrumbs dentro de los módulos responden bien "¿dónde estoy?" (`Administrador > Gestión > Usuarios`).
- Etiquetas en primera persona para Estudiante (`Mi Horario`, `Mis Cursos`, `Mi Asistencia`) son claras e intuitivas, sin jerga.
- El estado vacío de "Calificaciones" en Profesor (`No hay evaluaciones configuradas / Crea una evaluación para comenzar a calificar` + botón `+ Nueva Evaluación`) es un ejemplo a seguir.
- El menú de Profesor no tiene jerga técnica (a diferencia de Administrador) — limpio para ese rol.
- Los 3 sistemas de navegación (panel Ctrl+K, dropdowns del header, breadcrumb) son estructuralmente consistentes entre sí — el problema es de descubribilidad del punto de entrada, no de contradicción entre ellos.
