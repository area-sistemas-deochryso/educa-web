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

- [x] Decisión tomada y aplicada sobre la ruta de "Mis Calificaciones": **ruta dedicada reactivada** (`estudiante/notas`), no redirección. Ver Decisiones tomadas abajo.
- [x] Simulador de Notas calcula el mismo promedio (mismo algoritmo/normalización) que la vista real cuando no se modifica ninguna nota. Verificado en vivo: 18.0 sin modificar → 3.6 (coincide con Promedio General); 17.5 modificado → 3.5.
- [x] Chip "General" duplicado eliminado — un solo chip por grupo/período. Verificado en vivo.
- [x] Indicador de "% de peso evaluado" visible junto al promedio cuando el curso está parcialmente evaluado (criterio: binario, `<100%`). Verificado en vivo: "20% del curso evaluado".
- [x] Separador decimal consistente (punto) en el Simulador de Notas. Verificado en vivo (`17.5`, no `17,5`).
- [x] Build + lint OK (`npm run build`, `npm run lint`, 2360 tests OK). Verificado en vivo contra el mismo escenario (`RIVERA PEYRONE ALVARO`, curso `Arte`, TEST DB, vía switcher de sesiones guardadas + backend local levantado en `:5139`).

## Decisiones tomadas en `/design`

1. **Ruteo "Mis Calificaciones"**: la ruta dedicada `estudiante/notas` ya existía (componente `EstudianteNotasComponent` con soporte standalone/embedded) y fue desactivada intencionalmente en `P83 F5` (commit `22ebf782`, 2026-07-08) a favor de un `redirectTo: 'estudiante/salones'`. Se revirtió esa decisión: `intranet.routes.ts` vuelve a `loadComponent`, y `intranet-menu.config.ts:68` apunta a `/intranet/estudiante/notas`. El modo embebido (tab "Notas" del diálogo de salón) queda intacto — conviven ambas vistas (global y contextual).
2. **Fix de `calcularPromedioPonderado`**: causa raíz confirmada contra `INV-C04` (backend, `PromedioPonderadoCalculator.Calcular`: "Σ(nota × peso), pesos NO se normalizan"). La función FE en `profesor/utils/calificacion.utils.ts` normalizaba dividiendo entre `sumaPesos` — violaba el invariante documentado. El bug no era exclusivo del Simulador de Estudiante: la misma función alimenta el simulador de notas del Profesor (`salon-notas-estudiante-tab.component.ts`). Se corrigió una sola vez (root cause compartido), beneficiando ambos roles. Se reescribió `calificacion.utils.spec.ts` (el comentario y los tests afirmaban la fórmula incorrecta).
3. **Umbral "% evaluado"**: binario — se muestra siempre que `% evaluado < 100`, oculto si el curso está 100% evaluado. Calculado client-side desde `evaluaciones[].peso`/`.nota` (no requirió cambio de backend).

## Archivos modificados

- `src/app/features/intranet/intranet.routes.ts` — ruta `estudiante/notas` de `redirectTo` a `loadComponent`.
- `src/app/features/intranet/shared/config/intranet-menu.config.ts` — item de menú apunta a `estudiante/notas`.
- `src/app/features/intranet/pages/profesor/utils/calificacion.utils.ts` — `calcularPromedioPonderado` sin normalización (INV-C04).
- `src/app/features/intranet/pages/profesor/utils/calificacion.utils.spec.ts` — tests reescritos para reflejar INV-C04 correctamente.
- `src/app/features/intranet/pages/estudiante/notas/components/notas-curso-card/notas-curso-card.component.{ts,html,scss}` — chip "General" condicional + indicador "% evaluado".
- `src/app/features/intranet/pages/estudiante/notas/components/simulador-notas/simulador-notas.component.html` — `locale="en-US"` en `p-inputNumber`.

## Tiempo estimado

~3-4h (incluye `/design` para la decisión de ruteo de calificaciones y el criterio de "% evaluado", más `/execute` de los 5 fixes de código confirmados).
