# Módulos del Menú — Distribución y Pertenencia

## Arquitectura del menú

El menú de la intranet se organiza en **módulos**. Cada módulo responde una sola pregunta: **"¿quién sos?"** (antes brief 444: era "¿qué necesitás hacer?", ver Historia abajo). Los items del menú se declaran flat en `intranet-menu.config.ts` con un campo `modulo` que determina en qué módulo aparecen.

**Archivos clave**:
- `@shared/constants/module-registry.ts` — Definición de módulos (id, label, icon, orden)
- `@intranet-shared/config/intranet-menu.config.ts` — Catálogo flat de items + builder
- Layout desktop: pills de módulo + nav items circulares (3 visibles)
- Layout mobile: pills + nav items en drawer hamburguesa

---

## Los 5 módulos (brief 444, 2026-07-16)

| Módulo | Pregunta | Quién lo ve |
|--------|----------|-------------|
| **Inicio** | — | Solo la landing `/intranet`. Sin dropdown. |
| **Estudiante** | "¿Qué necesita un estudiante?" | Rol Estudiante |
| **Profesor** | "¿Qué necesita un profesor?" | Rol Profesor |
| **Administrador** | "¿Qué necesita el cluster administrativo?" | Director, Asistente Administrativo, Promotor, Coordinador Académico, Administrador |
| **Apoderado** | "¿Qué necesita un apoderado?" | Rol Apoderado |

**Por qué "cluster administrativo" y no un módulo por rol individual**: Director/Asistente/Promotor/Coordinador comparten prácticamente el mismo set de capabilities administrativas (ver `quick-access.config.ts`) — partirlos en 4 módulos separados no resuelve ninguna ambigüedad real y multiplica el mantenimiento. `soloParaRol: ADMIN_ROLES` en `intranet-menu.config.ts` codifica este cluster explícitamente.

---

## Ítems de capability compartida (sin dueño de rol fijo)

Algunas capabilities (`ASISTENCIA`, `CALENDARIO`, `VIDEOCONFERENCIAS`) son 100% configurables por admin vía "Permisos por Rol/Usuario" — en teoría cualquier rol puede tenerlas. No tienen una ruta separada por rol (a diferencia de "Mi Asistencia" que sí es exclusiva de Profesor/Estudiante vía `PROFESOR_ASISTENCIA`/`ESTUDIANTE_ASISTENCIA`).

**Decisión de diseño (brief 444, no reabrir)**: se **duplica** el `MenuItemDef` (mismo `route`+`capability`, distinto `modulo`) en cada módulo donde el item tiene sentido, en vez de crear un módulo "Compartido" — mantiene la regla "un módulo = un rol" sin excepciones. Cada duplicado lleva `soloParaRol: UserRole[]` para que la capability compartida no dispare el módulo equivocado en cuentas que la tengan por otro motivo (ver comentarios en `intranet-menu.config.ts`).

| Item | Capability | Duplicado en |
|---|---|---|
| Asistencia diaria | `ASISTENCIA` | `administrador`, `apoderado` |
| Calendario | `CALENDARIO` | `estudiante`, `profesor`, `administrador`, `apoderado` |
| Videoconferencias | `VIDEOCONFERENCIAS` | `estudiante`, `profesor`, `administrador` |

**`findMenuItemDefByUrl(url, moduloId?)`** recibe el módulo activo para resolver el duplicado correcto en el breadcrumb — sin `moduloId` cae al primer match declarado en `MENU_ITEMS` (comportamiento legado).

---

## Test de pertenencia para un item nuevo (aplicar en orden)

| # | Pregunta | Si SÍ → |
|---|----------|---------|
| 1 | ¿Es exclusivo de un rol (tiene su propia capability `ROL_X`)? | Ese módulo de rol |
| 2 | ¿La capability es compartida entre roles sin ruta separada por rol? | Duplicar `MenuItemDef` en cada módulo relevante + `soloParaRol` (ver tabla arriba) |
| 3 | ¿Solo lo usa el cluster administrativo? | `administrador` |
| 4 | ¿No encaja en ninguno? | **Nuevo módulo** (definir en `module-registry.ts`) |

---

## Agrupación (`group`) dentro de un módulo

Items con el mismo `group.label` dentro de un módulo se renderizan como dropdown.

### Grupos estándar (post brief 444)

| Módulo | Grupo | Items |
|--------|-------|-------|
| Estudiante | Mi Aula | Mis Cursos, Mis Salones, Mi Horario |
| Estudiante | Mi Seguimiento | Mis Calificaciones, Mi Asistencia |
| Estudiante | Mensajes | Foro, Mensajería |
| Estudiante | — (suelto) | Calendario, Videoconferencias |
| Profesor | Mi Aula | Mis Cursos, Mis Salones, Mi Horario |
| Profesor | Mi Seguimiento | Mis Calificaciones, Mi Asistencia, Notas y Asistencia |
| Profesor | Mensajes | Foro, Mensajería |
| Profesor | — (suelto) | Calendario, Videoconferencias |
| Administrador | Académico | Cursos, Salones, Horarios |
| Administrador | Asistencia | Gestión, Reportes, Permisos Salud, Asistencia diaria |
| Administrador | Calendario | Eventos, Notificaciones, Calendario |
| Administrador | Gestión | Usuarios |
| Administrador | Permisos | Por Rol, Por Usuario |
| Administrador | Diagnóstico | Salud del runtime, Diagnóstico de BD |
| Administrador | Herramientas | Campus, Test k6 |
| Administrador | — (suelto) | Monitoreo, Videoconferencias |
| Apoderado | — (todo suelto) | Cursos, Horarios, Notificaciones, Asistencia diaria, Calendario |

### Cuándo agrupar / no agrupar / naming

Sin cambios respecto al criterio previo: agrupar cuando 2+ items comparten entidad, función de rol o dominio conceptual; label del grupo = concepto que agrupa (no repetir el nombre del módulo).

---

## Crecimiento

| Si la nueva feature... | Dónde va |
|------------------------|----------|
| Es exclusiva de un rol | Ese módulo de rol, agrupar si comparte entidad con item existente |
| La usa el cluster administrativo | `administrador`, agrupar si comparte sección |
| Compartida entre roles sin ruta propia por rol | Duplicar + `soloParaRol` (ver tabla de ítems compartidos) |
| No encaja en ningún rol existente | **Nuevo módulo** — definir en `module-registry.ts` |

---

## Límites

| Concepto | Límite |
|----------|--------|
| Nav items visibles (carousel circular) | 3 |
| Pills visibles (carousel circular) | 5 |
| Items por grupo (dropdown) | Idealmente ≤ 7, si supera considerar dividir |
| Módulos totales | Idealmente 5-7 |

---

## Historia

- **2026-07-16 (brief 444)**: reorg de "por dominio" (académico/seguimiento/comunicación/sistema) a "por rol" (estudiante/profesor/administrador/apoderado). Motivo: cuentas con múltiples capabilities a la vez (Director, Administrador, QA) veían labels idénticos de Profesor y Estudiante mezclados dentro del mismo módulo de dominio (ej. "Mis Cursos" x2 sin distinción visual). El rol como módulo top-level elimina la ambigüedad de raíz porque Profesor y Estudiante nunca están en pantalla al mismo tiempo.
