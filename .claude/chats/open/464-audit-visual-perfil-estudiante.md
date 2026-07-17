# 464 — Auditoría visual + funcional: Perfil Estudiante

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/design` (hay al menos 2 decisiones de arquitectura de navegación antes de ejecutar)
> **Plan**: —
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - `src/app/features/intranet/shared/config/intranet-menu.config.ts` (línea 68)
>   - `src/app/features/intranet/pages/estudiante/notas/services/estudiante-notas.store.ts`
>   - `src/app/features/intranet/pages/profesor/utils/calificacion.utils.ts` (línea 4-12, compartido profesor+estudiante)
>   - `src/app/features/intranet/pages/estudiante/notas/components/notas-curso-card/notas-curso-card.component.html`
>   - `src/app/features/intranet/pages/estudiante/notas/components/simulador-notas/simulador-notas.component.html`
>   - `src/app/features/intranet/pages/cross-role/mensajeria/services/mensajeria.facade.ts` (línea 324, revisar origen de `salonDescripcion`)

## Contexto

Continuación de la sesión de auditoría visual (ver brief 463, Login + Header). El usuario pidió enfocar el perfil **Estudiante** por ser el rol más numeroso y con mayor probabilidad de encontrar problemas. Recorrido completo: Inicio → Mi Horario → Mis Cursos (modal completo, 3 tabs) → Mis Salones (modal, 4 tabs) → Foro → Mensajería → Mi Seguimiento (Asistencia/Calificaciones) → Videoconferencias. Cuenta de prueba: `RIVERA PEYRONE ALVARO` (Estudiante, salón `INICIAL 3 AÑOS B - 2026`, curso único `Arte`).

Todos los hallazgos de código fueron verificados leyendo el archivo fuente, no solo observados en pantalla.

## Scope

### 1. Ruta de "Mis Calificaciones" apunta a Salones, no a una vista de notas (alto — arquitectura de navegación)

`intranet-menu.config.ts:68`:
```ts
{ route: '/intranet/estudiante/salones', label: 'Mis Calificaciones', ..., description: 'Consultar tus calificaciones (tab Notas en tu salón)' }
```

Es una decisión **intencional y documentada en el código** (la `description` lo explica), pero esa explicación nunca llega al usuario. En la práctica: el estudiante hace clic en "Mis Calificaciones" (menú "Mi Seguimiento") o "Mis Notas" (acceso rápido del dashboard) y aterriza en una pantalla titulada **"Mis Salones"** — sin ninguna pista de que debe abrir el salón y cambiar al tab "Notas" para ver lo que buscaba. Confirmado navegando desde 2 puntos de entrada distintos (dashboard y menú), ambos con labels diferentes ("Mis Notas" vs "Mis Calificaciones") para el mismo destino.

**Asimetría con el rol Profesor**: `intranet-menu.config.ts:80` — el profesor sí tiene una ruta dedicada `/intranet/profesor/calificaciones`. El estudiante no. Mismo concepto, arquitectura distinta entre roles.

**Decisión a tomar en `/design`**: ¿se crea una ruta dedicada `/intranet/estudiante/calificaciones` (simétrica con profesor), o se resuelve con una redirección explícita + mensaje ("te llevamos a tu salón, pestaña Notas") cuando se navega desde el acceso directo?

### 2. Bug de cálculo confirmado: el Simulador de Notas no pondera igual que la vista real (alto)

- Vista real (`curso.promedios.general`, viene del backend): con 1 evaluación de peso 20% y nota 18.0, el "Promedio General" mostrado es **3.6** (severidad "danger", rojo).
- Simulador de Notas (mismo curso, sin cambiar nada): "Promedio simulado" muestra **18.0**. Reproducido dos veces (con nota original 18.0 → 18.0 simulado; bajando a 17.5 → 17.5 simulado, no 3.5).
- Causa: `calcularPromedioPonderado` en `profesor/utils/calificacion.utils.ts:4-12` normaliza `suma(nota*peso) / sumaPesos` — es decir, promedia **solo sobre el peso ya evaluado**, ignorando cuánto del curso sigue pendiente. La vista real (backend) no aplica esta misma normalización.
- Efecto: dos números de "promedio" distintos y contradictorios para el mismo dato, dependiendo de qué pantalla los muestre. Confunde a cualquier estudiante que abra el simulador para proyectar su nota.

### 3. Chip "General" duplicado por bug de template (medio)

`notas-curso-card.component.html:15-32`: cuando el curso no tiene períodos configurados, `periodoGroups()` genera un único grupo llamado `"General"` (línea 57 del `.ts`), que se renderiza vía `@for` en la fila de chips (líneas 15-24). **Además**, el template tiene un chip fijo hardcodeado fuera del loop (líneas 25-32) con el mismo label `"General"`. Resultado: dos chips idénticos "General — 3.6" lado a lado, sin diferenciarse. No es coincidencia de datos, es duplicación de template.

### 4. Promedio ponderado sin indicar % de peso evaluado (medio-alto, UX — depende del fix del punto 2)

El "Promedio General" se colorea con severidad (rojo/verde) según el valor final, sin ningún indicador de "80% del curso aún sin evaluar". Un estudiante/apoderado que vea "3.6 en rojo" sin ese contexto lo lee como reprobado, cuando en realidad sacó 18/20 en lo único evaluado. El componente ya tiene un patrón de mensaje aclaratorio para el caso "sin ninguna evaluación" (`"Sin notas aún"`, con ícono info) pero no para el caso intermedio (parcialmente evaluado).

### 5. Inconsistencia de separador decimal (bajo)

En el panel "Simulador de Notas": el badge de arriba muestra `18.0` (punto), el input editable de abajo muestra `18,0` (coma) — mismo panel, dos separadores distintos.

### 6. Doble guión en nombre de salón generado automáticamente (bajo)

Mensaje de bienvenida del foro (y su reflejo en Mensajería): `"Bienvenidos al foro del salón INICIAL 3 AÑOS B - - 2026."` — doble guión. Origen: `mensajeria.facade.ts:324` interpola `salonDescripcion` directo (`` `Bienvenidos al foro del salón ${salonDescripcion}.` ``); el doble guión ya viene dentro del valor de `salonDescripcion` (que en sí mismo ya trae `"... B - "` y se le concatena `"- 2026"` en otro punto de la cadena de datos, no localizado en esta sesión). Revisar en qué capa se compone `salonDescripcion` — probablemente backend o mapeo de DTO, no este archivo.

## Verificado, NO es bug (no tocar)

- **Tab "Ubicación" / mapa de campus** en el modal de salón: ya está correctamente gateado por `environment.features.campusNavigation` en los 3 entornos (`environment.ts` prod = `false`, `environment.development.ts` = `true`, `environment.capacitor.ts` = `false`). Lo que se vio en esta sesión (mapa vacío/"Cargando...") es exclusivo del entorno de desarrollo local y no aparece en producción ni en el build nativo. **No requiere cambio.**
- El badge "🕐 4d 15h" en "Mi Horario" es una cuenta regresiva legítima hacia el inicio del bloque de clases (confirmado por el usuario) — no es un bug.
- "Sin clases este día" en la grilla de horario: comportamiento esperado cuando no hay clases asignadas ese día — no es un bug.

## Out of scope

- Fix del origen de `salonDescripcion` (backend/DTO) — solo se documenta el síntoma, la causa raíz requiere investigar backend, que no se tocó en esta sesión.
- Rediseño de la navegación de "Mi Seguimiento" para otros roles (Profesor, Administrador) — este brief es solo Estudiante.
- Videoconferencias, Foro y Mensajería: revisados, sin hallazgos — no requieren cambios.

## Criterio de cierre

- [ ] Decisión tomada y aplicada sobre la ruta de "Mis Calificaciones" (ruta dedicada vs. redirección explícita comunicada al usuario).
- [ ] Simulador de Notas calcula el mismo promedio (mismo algoritmo/normalización) que la vista real cuando no se modifica ninguna nota.
- [ ] Chip "General" duplicado eliminado — un solo chip por grupo/período.
- [ ] Indicador de "% de peso evaluado" visible junto al promedio cuando el curso está parcialmente evaluado (criterio de umbral a definir en `/design`).
- [ ] Separador decimal consistente (punto o coma, no ambos) en el Simulador de Notas.
- [ ] Build + lint OK. Verificado en vivo contra el mismo escenario (`RIVERA PEYRONE ALVARO`, curso `Arte`, TEST DB).

## Tiempo estimado

~3-4h (incluye `/design` para la decisión de ruteo de calificaciones y el criterio de "% evaluado", más `/execute` de los 5 fixes de código confirmados).
