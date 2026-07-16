---
exclusive: false
isolation: worktree
touches: [src/app/shared/constants/module-registry.ts, src/app/features/intranet/shared/config/intranet-menu.config.ts, src/app/features/intranet/shared/components/layout/intranet-layout/]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: — · **Chat**: — · **Fase**: — · **Creado**: 2026-07-15 · **Estado**: ✅ implementado, awaiting-prod.
> **Validación prod**: ⏳ pendiente desde 2026-07-16. Falta confirmar el módulo `apoderado` con una cuenta real de ese rol (no había ninguna disponible en TEST DB durante el smoke test). Resto (Estudiante/Profesor/Administrador multi-capability) verificado en vivo contra TEST DB — ver sección DISEÑO CERRADO / CRITERIOS DE CIERRE abajo.

---

# Reorganizar módulos de la intranet: de "por dominio" a "por rol"

## OBJETIVO

Hoy los 4 módulos de la intranet (`academico`, `seguimiento`, `comunicacion`, `sistema`) responden **una pregunta de dominio** ("qué se enseña", "cómo van los estudiantes", "qué comunicar", "cómo se configura"), y cada uno mezcla ítems de distintos roles adentro (ej. "Académico" tiene grupo "Administración" y grupo "Mi Aula" con Profesor+Estudiante mezclados).

Esto genera un problema real y verificado en cuentas con múltiples capabilities a la vez (Director, Administrador, o cuentas QA con acceso total, brief 428/detectado en sesión 2026-07-15): dentro del mismo grupo aparecen labels **idénticos** para Profesor y Estudiante (`Mis Cursos`, `Mis Salones`, `Mi Horario`, `Mis Calificaciones`, `Mi Asistencia`, `Foro`, `Mensajería`) — indistinguibles a simple vista salvo por orden alfabético.

**Decisión ya tomada** (discutida y aprobada en sesión 2026-07-15, no re-abrir el debate): en vez de sufijar labels (`"Mis Cursos (Profesor)"` / `"(Estudiante)"` — funciona pero es un parche), reestructurar para que el **rol sea el módulo top-level** y el dominio sea el grupo interno. Esto elimina el problema de raíz porque Profesor y Estudiante dejan de compartir espacio visual.

## MODO SUGERIDO

`/investigate` primero (obligatorio, ver PRE-WORK) → `/design` para cerrar el detalle de la tensión "ítems compartidos" (ver más abajo) → `/execute` → `/validate`. Es un cambio de arquitectura de IA (information architecture), no un fix puntual — no saltar el investigate.

## PRE-WORK OBLIGATORIO

- Buscar **todas** las referencias a los valores string `'academico'`, `'seguimiento'`, `'comunicacion'`, `'sistema'` en `src/` — no asumir que solo viven en `intranet-menu.config.ts` / `module-registry.ts`. Búsqueda hecha el 2026-07-15 encontró 12 archivos con matches, pero varios probablemente NO son `ModuloId` (ej. `notifications.config.ts`/`notifications.types.ts` parecen usar `'sistema'` como categoría de notificación, no como módulo — hay que diferenciar caso por caso antes de tocar nada).
- Revisar `intranet-layout.component.spec.ts` — tiene matches, probablemente testea `selectedModuloId`/`MODULOS` con los IDs actuales; va a necesitar actualizarse.
- Confirmar si `reference/permissions.md` o `reference/menu-modules.md` (niche, mencionado en `.claude/CLAUDE.md`) documentan los 4 módulos actuales — si sí, actualizar en el mismo PR (ver `doc-freshness.md`).

## ALCANCE

### 1. Nuevo registro de módulos (`module-registry.ts`)

Reemplazar `MODULO_IDS`/`MODULOS`:
- `inicio` (sin cambios)
- `estudiante` (antes disperso en academico/seguimiento/comunicacion → grupo "Mi Aula"/"Mi Seguimiento"/"Mensajes" de estudiante)
- `profesor` (ídem, versión profesor)
- `administrador` (concentra: Académico→Administración, Seguimiento→Asistencia(admin), Comunicación→Calendario(admin: Eventos/Notificaciones), Sistema completo)
- **Pendiente de decisión en `/design`**: qué hacer con los ítems cross-rol (`Calendario`, `Asistencia diaria`, `Videoconferencias`) — ¿módulo `compartido` (rompe la regla "cada módulo responde una pregunta") o se duplican dentro de cada módulo de rol que corresponda? Mockup de la sesión 2026-07-15 los puso en un módulo "Compartido" como placeholder, pero no está cerrado — resolver en `/design` antes de tocar código.

### 2. `intranet-menu.config.ts`

- Reasignar el campo `modulo:` de cada `MenuItemDef` al nuevo `ModuloId`.
- Los `group:` internos de cada ítem pasan a ser el dominio (ej. dentro de `profesor`: grupos "Mi Aula", "Mi Seguimiento", "Mensajes"; dentro de `administrador`: grupos "Académico", "Asistencia", "Comunicación", "Gestión", "Herramientas", "Diagnóstico", "Permisos" — ver mockup completo abajo).
- **Fix de colisión de nombre** (independiente del reorg de rol, aplicar igual): el grupo que hoy se llama `"Monitoreo"` (contiene "Salud del runtime" + "Diagnóstico de BD", líneas ~104-106 actuales) choca de nombre con el ítem suelto `"Monitoreo"` (hub, línea ~102). Renombrar el **grupo** a `"Diagnóstico"`.
- Mover `Notas y Asistencia` (profesor) de su grupo actual (`Mi Aula`, dominio académico) a `Mi Seguimiento` (dominio seguimiento) — es una actividad de seguimiento (notas+asistencia por salón), no de "qué se enseña". Este movimiento es independiente del reorg por rol y ya estaba acordado antes de la propuesta de módulos por rol.
- `LABEL_OVERRIDE_POR_ROL` (override de labels por rol específico, ej. `ADMIN_ASISTENCIAS`) sigue funcionando igual, no depende de esta reestructuración.

### 3. Mockup de referencia (acordado en sesión 2026-07-15, ver detalle completo en el historial del chat que generó este brief)

```
▼ 🧑‍🎓 ESTUDIANTE (5)
  Mi Aula: Mi Horario, Mis Cursos, Mis Salones
  Mi Seguimiento: Mi Asistencia, Mis Calificaciones
  Mensajes: Foro, Mensajería

▼ 👨‍🏫 PROFESOR (7)
  Mi Aula: Mi Horario, Mis Cursos, Mis Salones, Notas y Asistencia
  Mi Seguimiento: Mi Asistencia, Mis Calificaciones
  Mensajes: Foro, Mensajería

▼ ⚙ ADMINISTRADOR (13)
  Académico: Cursos, Horarios, Salones
  Asistencia: Gestión, Permisos Salud, Reportes
  Comunicación: Eventos, Notificaciones
  Gestión: Usuarios
  Herramientas: Campus, Test k6
  Diagnóstico: Salud del runtime, Diagnóstico de BD
  Monitoreo: Monitoreo
  Permisos: Por Rol, Por Usuario

▼ 🔗 COMPARTIDO (3) — PENDIENTE DE DECISIÓN, ver ALCANCE §1
  Calendario, Asistencia diaria, Videoconferencias
```

### 4. Componentes a revisar (usan `MODULOS`/`ModuloId` directa o indirectamente)

- `module-selector.component.ts` — `megaColumns`, iconografía por módulo.
- `intranet-layout.component.ts` — `selectModulo()`, breadcrumb (`MODULOS[this._selectedModuloId()]`, ya construido en brief de breadcrumbs funcionales del 2026-07-15 — no debería requerir cambios de lógica, solo hereda los labels/ids nuevos).
- `mobile-menu` (usa `modulosToNavItems`).
- Cualquier guard o lógica de permisos que hardcodee `ModuloId` (buscar en `permissions.md`/guards).

## TESTS MÍNIMOS

- `bun run build` sin errores de tipos (los 4 `ModuloId` viejos van a dejar de existir — el compilador debería marcar cada uso residual).
- `bun run test` — actualizar specs que referencien los IDs viejos (`intranet-layout.component.spec.ts` confirmado con matches).
- Verificación manual en browser: abrir sesión con cuenta multi-capability (la del admin que reportó el problema) y confirmar que ya no hay labels duplicados visualmente en ningún módulo.

## REGLAS OBLIGATORIAS

- No perder ningún ítem existente — el usuario fue explícito: "no para que dejen de existir las actuales, sino para mejorar dónde vive cada uno". Este brief es 100% reorganización, cero pages nuevas ni eliminadas.
- Actualizar `module-registry.ts` comment block (líneas 21-30) que documenta "cada módulo responde una pregunta" — la nueva pregunta que responde cada módulo es "¿quién sos?" en vez de "¿qué necesitás hacer?". Si el módulo `compartido` sobrevive el `/design`, documentar explícitamente por qué es la excepción a la regla.

## FUERA DE ALCANCE

- No tocar el fix de breadcrumbs funcionales (brief ya cerrado en la sesión 2026-07-15, commit aparte).
- No resolver el sufijo de labels por rol (`LABEL_OVERRIDE_POR_ROL`) — sigue vigente tal cual, no es parte de este cambio.
- No es este brief el que decide iconografía final de los 3 módulos de rol — usar un ícono razonable (ej. estudiante: `pi-user`, profesor: `pi-graduation-cap`, administrador: `pi-cog`) y dejar que un ajuste visual posterior lo pula si hace falta.

## VALIDACIÓN FINAL

- `bun run lint` — 0 errores.
- `bun run build` — sin errores.
- `bun run test` — sin nuevas fallas, specs actualizados.
- Smoke test manual en browser con cuenta multi-rol.

## CRITERIOS DE CIERRE

- [x] `/design` resolvió la tensión de ítems compartidos (§1) antes de tocar código. Ver sección DISEÑO CERRADO abajo.
- [x] Validación final pasa: `bun run build` ✅, `bun run lint` ✅ (0 errores), `bun run test` ✅ (2349/2349 — 1 timeout de `eslint-config-guards.spec.ts` no relacionado, confirmado flaky al aislar).
- [x] Smoke test manual multi-rol en browser — **ejecutado**. Backend levantado (`Educa.API` con `UseTestEnv:true`, contra TEST DB) + FE (`bun run start`, :4201), login con sesiones guardadas reales:
  - Cuenta "CODE CLAUDE" (Administrador, multi-capability — el escenario exacto que motivó el brief): módulos `Inicio(1)/Estudiante(7)/Profesor(8)/Administrador(19)` correctos, grupos correctos (Académico/Asistencia/Calendario/Diagnóstico/Gestión/Herramientas/Permisos), "Asistencia diaria" agrupada correctamente en Administrador→Asistencia. **Clave**: Estudiante(7) y Profesor(8) NO mostraron Calendario/Videoconferencias pese a que la cuenta SÍ tiene esas capabilities (confirmado visible en Administrador) — `soloParaRol` filtrando correctamente por el rol real de la cuenta.
  - Cuenta "RIVERA PEYRONE ALVARO" (Estudiante real, single-role): módulo Estudiante(8) con Videoconferencias visible (capability propia de esta cuenta) y sin Calendario (no la tiene) — comportamiento correcto.
  - Breadcrumb (`findMenuItemDefByUrl(url, moduloId)`) resuelve el duplicado del módulo activo: navegando a `/intranet/asistencia` con Administrador activo mostró "Administrador › Asistencia › Asistencia diaria" (no el genérico sin grupo). Dropdown de grupo del breadcrumb (feature de la sesión previa) también verificado, lista los 4 ítems del grupo correctamente.
  - **No verificado**: módulo `apoderado` — ninguna de las 5 sesiones guardadas es de ese rol. Sin credenciales de prueba de Apoderado en este entorno.
  - Servidores de verificación (backend :7102, FE :4201) apagados al terminar.
- [x] Brief movido `running/` → `awaiting-prod/` (falta validación en vivo del módulo `apoderado` — ver nota arriba). `/verify 444` lo mueve a `closed/` cuando se confirme.
- [x] Commit del reorg en `chat/444-menu-reorganizacion-modulos-por-rol` (worktree) — pendiente de `/wt-merge` a `main`.

**Riesgo de merge detectado**: brief 456 (`chat/456-usuarios-admin-buscador-tilde-logout`, activo en paralelo) también toca `intranet-layout.component.ts`. No bloquea este chat (worktrees aislados) pero va a requerir merge manual atento cuando ambos integren a `main`.

## CIERRE

Brief grande — considerar partir en 2 chats si el `/design` revela que la tensión de "compartidos" requiere su propia sub-decisión extensa (ej. si se termina optando por duplicar ítems cross-rol en cada módulo, eso son cambios de datos adicionales no triviales).

## DISEÑO CERRADO (2026-07-16)

### Hallazgo del investigate que cambia el alcance

`Apoderado` es un rol activo real (usa `IntranetLayoutComponent` + `MENU_ITEMS`, capabilities propias vistas en `quick-access.config.ts`: `ASISTENCIA`, `ADMIN_CURSOS`, `ADMIN_HORARIOS`, `ADMIN_NOTIFICACIONES`, potencialmente `CALENDARIO`). El brief original solo definía 3 módulos de rol (estudiante/profesor/administrador) — Apoderado quedaba sin hogar. **Decisión del usuario: agregar un 4to módulo `apoderado`.**

### Decisión §1 — ítems de capability única compartida

**Duplicar el `MenuItemDef`** (mismo `route`+`capability`, distinto `modulo`) en vez de un módulo "Compartido" dedicado. Razón: cada módulo sigue respondiendo una sola pregunta de rol; el filtro real de visibilidad sigue siendo `userCapabilities.has(item.capability)`, así que duplicar solo amplía "en qué módulo puede aparecer si el usuario tiene esa capability" — no hay riesgo de fuga de permisos ni de colisión visual (nunca dos módulos están en pantalla a la vez).

Placement de las 3 duplicadas (evidencia: `quick-access.config.ts` no incluye `ASISTENCIA` para Profesor/Estudiante — ellos tienen `PROFESOR_ASISTENCIA`/`ESTUDIANTE_ASISTENCIA` en rutas distintas):

| Item | Capability | Módulos donde se duplica |
|---|---|---|
| Asistencia diaria | `ASISTENCIA` | `administrador` (grupo "Asistencia", junto a Gestión/Reportes/Permisos Salud), `apoderado` (suelto) |
| Calendario | `CALENDARIO` | `estudiante`, `profesor`, `administrador` (grupo "Calendario", junto a Eventos/Notificaciones), `apoderado` (suelto) |
| Videoconferencias | `VIDEOCONFERENCIAS` | `estudiante`, `profesor`, `administrador` (suelto) — **no** `apoderado` (no hay evidencia de uso; ajustable si corresponde) |

### Contenido del módulo `apoderado` (nuevo, derivado de `quick-access.config.ts`)

Reutiliza los MenuItemDef ya existentes de Cursos/Horarios/Notificaciones (capabilities `ADMIN_CURSOS`/`ADMIN_HORARIOS`/`ADMIN_NOTIFICACIONES`, mismas rutas que usa admin) duplicados con `modulo: 'apoderado'`, sin agrupar (sueltos) + Asistencia diaria + Calendario (ver tabla arriba). Labels quedan igual por ahora — `LABEL_OVERRIDE_POR_ROL` ya existe como mecanismo si se quiere diferenciar el texto por rol más adelante (fuera de alcance de este brief).

### Resto del reorg (mecánico, sin ambigüedad)

- `MODULO_IDS`: `['inicio', 'estudiante', 'profesor', 'administrador', 'apoderado']`.
- Iconos (placeholder, brief no cierra iconografía final): estudiante `pi-user`, profesor `pi-graduation-cap`, administrador `pi-cog`, apoderado `pi-users`.
- Fix de colisión de nombre "Monitoreo" (grupo) → "Diagnóstico" — aplicado igual.
- "Notas y Asistencia" (profesor) movido de "Mi Aula" a "Mi Seguimiento" — aplicado igual.
- `intranet-layout.component.spec.ts` línea 150: `'academico'` → `'estudiante'` (o el ID válido que corresponda al test).
