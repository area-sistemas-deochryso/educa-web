# 129 · Plan 28 Chat 5 docs — Formalizar INV-AD08, INV-AD09 + nota INV-AD06 + §1.1 + §17

> **Creado**: 2026-05-07 · **Cerrado**: 2026-05-07 · **Estado**: ✅ ship · **Repo**: `educa-web` (rules/business-rules.md)
> **Origen**: minimal-from-go al confirmar el usuario que no puede deployar; tomó item #4 de la cola del maestro (Plan 28 Chat 5 docs).

## Modo sugerido

`/execute → /validate`. Cambios docs + 1 constante C# trivial. Patrón ya validado por Chat 1 (decisiones 7 y 8) y Chat 3a/3b (código que materializa los invariantes).

## Contexto

El Plan 28 cerró su parte funcional (Chat 3a + 3b en awaiting-prod, Chat 3c en open). El Chat 5 cierra el plan al 100% formalizando las invariantes en docs y agregando la constante de roles supervisores.

## Alcance estricto

### 1. `business-rules.md §15.9` — agregar INV-AD08 + INV-AD09

**INV-AD08** (texto del principio general — decisión 7 Chat 1):

> "Ningún rol administrativo corrige asistencia de su propio rol. El Asistente Administrativo NO puede mutar `AsistenciaPersona` con `TipoPersona='A'` (propia ni de un colega AA). Jurisdicción sobre `'A'` = `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}`. Generaliza el patrón ya establecido para profesor (INV-AD06)."
> Enforcement pendiente Chat 6 BE (autorización condicional por `TipoPersona` del target). Hoy el controller-level `Roles.Administrativos` es necesario pero no suficiente — un AA con rol `Asistente Administrativo` técnicamente puede llegar al endpoint admin; el guard fino lo agregará Chat 6.

**INV-AD09** (simetría INV-AD05 ampliada a AA):

> "Mutaciones admin sobre `AsistenciaPersona` con `TipoPersona='A'` envían correo de corrección al propio AA (`Director.DIR_Correo`) como destinatario único. Etiquetas outbox: `EO_Tipo='ASISTENCIA_CORRECCION_ASISTENTE_ADMIN'`, `EO_TipoEntidadOrigen='AsistenciaAsistenteAdmin'`. Sin BCC, sin apoderado. Plantilla azul administrativa con saludo `'Estimado/a {nombre}'` y descripción `'su asistencia administrativa fue {operacion} manualmente por la dirección del colegio'`. Si `DIR_Correo` está vacío, se omite silenciosamente (fire-and-forget INV-S07). Implementado en Chat 3b BE (`AsistenciaAdminEmailNotifier.NotificarCorreccionAsistenteAdminAsync` + `NotificarEliminacionAsistenteAdminAsync`)."

### 2. `business-rules.md §15.9` — ampliar nota INV-AD06

Agregar una línea al final de la fila INV-AD06: *"Principio general formalizado en INV-AD08: ningún rol administrativo corrige asistencia de su propio rol. INV-AD06 es la instancia profesor; INV-AD08 es la generalización + instancia AA."*

### 3. `business-rules.md §1.1` — tabla de ventanas horarias

Cambiar la columna "Tipo persona" del periodo regular para reflejar que `'A'` reusa los thresholds de profesor:

| Periodo | Tipo persona | Meses | ... |
|---------|--------------|-------|-----|
| Regular | Estudiante (E) | Mar-Dic | ... |
| Regular | Profesor (P) **o Asistente Admin (A)** | Mar-Dic | `[05:00, 07:31)` / ... |
| Verano | Ambos (E/P/A) | Ene-Feb | ... |

Y agregar una nota debajo: *"`'A'` reusa los thresholds de `'P'` (decisión 6 Plan 28 Chat 1). INV-C09 (salida temprana <13:55) es `'E'`-only, no aplica a P ni A."*

### 4. `business-rules.md §15.4 INV-C11` — nota Plan 27

Agregar al texto de INV-C11 que `'A'` no aplica al filtro de grado: *"Filtro por `GRA_Orden` aplica solo a `TipoPersona='E'`. `'P'` y `'A'` están exentos por construcción (no tienen grado)."* (Chat 3a ya implementó este comportamiento — esto solo lo documenta.)

### 5. `business-rules.md §17` — paridad Excel para reportes con `'A'`

Agregar una línea al inventario actual (sección 17.3): *"Plan 28 Chat 3a (2026-05-07) extendió los 14 endpoints PDF/Excel a `tipoPersona='A'`. La paridad estructural se mantiene (mismo data service, mismas columnas, badge textual 'Asistente Admin' en lugar de 'Profesor')."*

### 6. `Educa.API/Constants/Auth/Roles.cs` — constante `SupervisoresAsistenteAdmin`

Agregar:

```csharp
/// <summary>
/// Roles con jurisdicción sobre asistencia de Asistentes Administrativos (TipoPersona='A').
/// Ver INV-AD08 en business-rules.md §15.9.
/// </summary>
public static readonly string[] SupervisoresAsistenteAdmin = { Director, Promotor, CoordinadorAcademico };
```

Si `Promotor` o `CoordinadorAcademico` no existen como constantes en el archivo todavía, agregarlos también — son roles ya operativos (mencionados en `Roles.Administrativos`).

## Lo que NO entra en Chat 5

- ❌ Implementar el guard condicional de INV-AD08 en controllers — eso es Chat 6 BE.
- ❌ Tests nuevos — esto es solo docs + 1 constante.
- ❌ Tocar plantillas de correo, services, repos — todo eso ya está en Chat 3b.

## Validación esperada

- Build BE limpio (la constante `SupervisoresAsistenteAdmin` se agrega; nadie la consume aún, no rompe nada).
- Lint del frontend no aplica (solo se toca `.claude/rules/business-rules.md`, no `src/`).
- Lectura humana de los párrafos agregados — coherentes con INV-AD05/06, sin contradicciones, sin tipos.

## Salida esperada

- Plan 28 al 100% de docs (queda solo Chat 6 gap-fix BE reservado, opcional según patrón Plan 27).
- Chat 4 FE puede arrancar referenciando INV-AD08/AD09 directos.
- Cierre con commit cross-repo: 1 archivo educa-web (`business-rules.md`) + 1 archivo Educa.API (`Roles.cs`).

## Referencias

- Plan 28 fila en `.claude/plan/maestro.md` (Chat 1 decisiones 6, 7, 8).
- Brief 126 (Chat 3a awaiting-prod) — material de referencia para §17.
- Brief 127 (Chat 3b awaiting-prod) — material de referencia para INV-AD09.
- Brief 128 (Chat 3c open) — referencia para alcance que NO entra (bandeja, notif).
- INV-AD05/06 en `business-rules.md §15.9` — punto de inserción para INV-AD08/09 + nota cruzada.

## Cierre 2026-05-07

### Cambios aplicados

Solo `educa-web/.claude/rules/business-rules.md` (un archivo, 5 ediciones, +12/-6 líneas):

1. **§1.1 ventanas horarias**: columna "Tipo persona" del periodo regular ahora dice "Profesor (P) **o Asistente Admin (A)**"; verano "Ambos (E/P/A)". Nota Plan 28 Chat 1 decisión 6 agregada (`'A'` reusa thresholds de `'P'`, zero branch nuevo). INV-C09 documentado como `'E'`-only.
2. **§15.4 INV-C11**: agregado "Profesores y Asistentes Administrativos no aplican (exentos por construcción — no tienen `GRA_Orden`)".
3. **§15.9 INV-AD05**: ampliado destinatario `'A'` → `Director.DIR_Correo` filtrado por rol; mención del helper `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin()`.
4. **§15.9 INV-AD06**: nota cruzada "instancia profesor del principio general formalizado en INV-AD08".
5. **§15.9 INV-AD08** (nuevo): principio general anti-conflicto-de-interés + jurisdicción `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}` + nota Chat 6 BE pendiente (controller-level + autorización condicional por `TipoPersona` del target).
6. **§15.9 INV-AD09** (nuevo): correo correctivo AA — etiquetas outbox (`EO_Tipo='ASISTENCIA_CORRECCION_ASISTENTE_ADMIN'`, `EO_TipoEntidadOrigen='AsistenciaAsistenteAdmin'`), plantilla, simetría INV-AD05 ampliado.
7. **§17.3**: entrada Plan 28 Chat 3a (paridad PDF/Excel a `tipoPersona='A'`, badge "Asistente Administrativo").

### Hallazgo

`Roles.SupervisoresAsistenteAdmin` **ya existía** en `Educa.API/Constants/Auth/Roles.cs:34` — el Chat 2 BE la dejó preparada con comentario apuntando al Chat 3 (que fue spliteado en 3a/3b/3c). El brief original asumía que faltaba; el pre-work descubrió que no. Cero cambios C# en este chat.

### Aprendizajes transferibles

- **Constantes "preparadas para chat futuro" merecen leerse antes de planificar trabajo derivado**: el brief minimal-from-go listaba "agregar `SupervisoresAsistenteAdmin`" como item 6, pero un grep rápido al `Roles.cs` lo encontró ya hecho. Generalizable: cuando un Chat N decide y un Chat N+k materializa, si Chat N "dejó preparada" infraestructura (constantes, enums, scaffolding), validar que sigue ahí antes de duplicar trabajo.
- **Cross-references entre invariantes son baratas y multiplican valor**: agregar la línea "instancia profesor del principio general formalizado en INV-AD08" a INV-AD06 cuesta 30 segundos pero hace que un futuro lector de INV-AD06 entienda que es un caso particular de un patrón mayor. Hacerlo siempre que se formaliza un invariante "padre" sobre uno preexistente.
- **Brief minimal-from-go funcionó bien para docs**: 5 ediciones planificadas explícitamente en el brief, todas aplicadas sin desviación. Los modes-cuesta-bajos (docs, refactors mecánicos) son el caso ideal para `/go` minimal — no requieren `/design` previo porque las decisiones ya viven en otros artefactos (briefs de Chat 1, código de Chat 3a/3b).

### Validación

- Lint/build N/A (solo `.claude/rules/`, sin código compilable).
- Coherencia cross-section verificada por `grep`: INV-AD05 menciona los 3 destinatarios E/P/A; INV-AD06 referencia INV-AD08; INV-AD08 referencia INV-AD06; INV-AD09 referencia INV-AD05. Sin contradicciones.

### Estado del Plan 28

- ✅ Chat 1 (`/design`)
- ✅ Chat 2 BE (modelo + dispatch)
- ✅ Chat 3a BE (reportes PDF/Excel) — awaiting-prod brief 126
- ✅ Chat 3b BE (correos AA + dispatcher) — awaiting-prod brief 127
- ⏳ Chat 3c BE (bandeja + notif) — open brief 128, esperar deploy 3b para validar
- ⏳ Chat 4 FE (admin UI + self-service AA + widget) — bloqueado por deploy Chat 3
- ✅ Chat 5 docs — **este chat**, ship 2026-05-07
- ⏳ Chat 6 BE (gap-fix opcional, autorización condicional INV-AD08) — patrón Plan 27, reservado

Plan 28 docs al 100%. Faltan deploys + Chat 3c + Chat 4 FE para alcanzar 100% funcional.
