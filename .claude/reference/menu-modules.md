# Módulos del Menú — Distribución y Pertenencia

## Arquitectura del menú

El menú de la intranet se organiza en **módulos**. Cada módulo responde una sola pregunta. Los items del menú se declaran flat en `intranet-menu.config.ts` con un campo `modulo` que determina en qué módulo aparecen.

**Archivos clave**:
- `@shared/constants/module-registry.ts` — Definición de módulos (id, label, icon, orden)
- `@intranet-shared/config/intranet-menu.config.ts` — Catálogo flat de items + builder
- Layout desktop: pills de módulo + nav items circulares (3 visibles)
- Layout mobile: pills + nav items en drawer hamburguesa

---

## Los 5 módulos

| Módulo | Pregunta | Qué contiene |
|--------|----------|-------------|
| **Inicio** | — | Solo la landing `/intranet`. Sin dropdown. |
| **Académico** | "¿Qué se enseña, dónde y cuándo?" | Lo que EXISTE en el colegio: cursos, salones, horarios, asignaciones |
| **Seguimiento** | "¿Cómo van los estudiantes?" | Lo que se MIDE: asistencia, calificaciones, reportes, aprobación |
| **Comunicación** | "¿Qué necesito saber o decir?" | Lo que se COMUNICA: mensajes, eventos, calendario, foros, videollamadas |
| **Sistema** | "¿Cómo se configura la plataforma?" | Lo que se CONFIGURA: usuarios, permisos, vistas, herramientas admin |

---

## Test de pertenencia (aplicar en orden, el primero que aplique gana)

| # | Pregunta | Si SÍ → |
|---|----------|---------|
| 1 | ¿Existiría sin estudiantes matriculados? | **Académico** |
| 2 | ¿Produce o consulta una métrica sobre un estudiante? | **Seguimiento** |
| 3 | ¿Su propósito principal es transmitir información entre personas? | **Comunicación** |
| 4 | ¿Solo un admin la usa y no produce datos del negocio educativo? | **Sistema** |
| 5 | ¿No encaja en ninguna? | **Nuevo módulo** (definir en `module-registry.ts`) |

---

## Páginas actuales con justificación

### Académico — "¿Existiría sin estudiantes matriculados?"

| Página | Rol | Justificación |
|--------|-----|---------------|
| Cursos | Admin | Define qué materias existen. Sin alumnos, los cursos siguen existiendo. |
| Salones | Admin | Define qué aulas hay. El salón existe vacío. |
| Horarios | Admin | Define cuándo se dicta cada curso. Existe antes de que alguien asista. |
| Mis Cursos | Prof/Est | Consultan la estructura asignada (contenido/materiales), NO métricas de rendimiento. |
| Mis Salones | Prof/Est | Consultan en qué aulas están asignados. Estructura personal. |
| Mi Horario | Prof/Est | Consultan su agenda semanal. Estructura temporal que les aplica. |
| Administrar Salones | Prof | La unidad primaria es el salón (estructura). Las notas son acción secundaria dentro del salón. |

**Test negativo**: "Mis Calificaciones" NO es Académico porque sin estudiantes evaluados no tiene datos.

### Seguimiento — "¿Produce o consulta una métrica sobre un estudiante?"

| Página | Rol | Justificación |
|--------|-----|---------------|
| Asistencia (diaria) | Cross-role | Muestra quién vino y quién no. Métrica por estudiante por día. |
| Asistencias admin — Gestión | Admin | Edita/corrige registros de asistencia. Opera sobre la métrica. |
| Asistencias admin — Reportes | Admin | Estadísticas y exportación. Analiza la métrica. |
| Mis Calificaciones | Prof | Registra notas. Produce la métrica de rendimiento. |
| Mis Calificaciones | Est | Consulta sus notas. Lee la métrica de rendimiento. |
| Mi Asistencia | Prof | Pasa lista en sus cursos. Produce la métrica por curso. |
| Mi Asistencia | Est | Consulta su registro. Lee la métrica. |

**Test negativo**: "Horarios" NO es Seguimiento. El horario no mide a nadie — solo define cuándo ocurre algo.

### Comunicación — "¿Transmite información entre personas?"

| Página | Rol | Justificación |
|--------|-----|---------------|
| Calendario | Compartido | Muestra feriados y eventos. No es estructura académica — es información publicada para la comunidad. |
| Eventos | Admin | Crea eventos para informar. El admin publica, los demás leen. |
| Notificaciones | Admin | Envía avisos masivos. Comunicación pura. |
| Foro | Prof/Est | Discusión entre personas. |
| Mensajería | Prof/Est | Mensajes directos entre personas. |
| Videoconferencias | Compartido | Reunión en vivo entre personas. |

**Test negativo**: "Calendario" NO es Académico. Los cursos tienen horarios (Académico), pero feriados y eventos culturales no son estructura académica — son información que se comunica.

### Sistema — "¿Solo admin, no produce datos del negocio?"

| Página | Rol | Justificación |
|--------|-----|---------------|
| Usuarios | Admin | Gestiona cuentas. Configura quién accede, no produce datos educativos. |
| Vistas | Admin | Configura rutas/menú. Metadato de la plataforma. |
| Permisos por Rol | Admin | Configura accesos. Infraestructura. |
| Permisos por Usuario | Admin | Override de accesos. Infraestructura. |
| Bandeja de Correos | Admin | Monitorea si los emails se entregaron. Monitoreo de infraestructura, no comunicación. |
| Campus | Admin | Herramienta de visualización 3D. Configuración/exploración. |
| Test k6 | Admin | Testing de carga. Herramienta de desarrollo. |

**Test negativo**: "Notificaciones" NO es Sistema aunque solo admin la usa. Produce datos de negocio (avisos que apoderados leen). "Bandeja de Correos" monitorea la entrega (infraestructura), "Notificaciones" crea el contenido (comunicación).

---

## Desambiguaciones resueltas

| Caso | Decisión | Razón clave |
|------|----------|-------------|
| Mis Cursos/Salones/Horario | **Académico** | Consultan estructura asignada, no métricas de rendimiento |
| Administrar Salones (prof) | **Académico** | Unidad primaria es el salón (estructura), notas son acción secundaria |
| Calendario/Eventos | **Comunicación** | Feriados y eventos son información publicada, no estructura de clases |
| Bandeja de Correos | **Sistema** | Monitorea infraestructura de envío, no crea contenido comunicativo |
| Campus | **Sistema** | Herramienta de visualización admin, no define estructura educativa |
| Notificaciones | **Comunicación** | Crea contenido que otros leen, aunque solo admin la use |

---

## Agrupación (group)

Items con el mismo `group.label` dentro de un módulo se renderizan como dropdown.

### Cuándo agrupar

| Criterio | Ejemplo |
|----------|---------|
| 2+ items comparten la misma entidad/página | Gestión + Reportes → "Asistencias (admin)" |
| 2+ items son la misma función para el mismo rol | Mis Cursos + Mis Salones + Mi Horario → "Mi Aula" |
| 2+ items operan sobre el mismo dominio conceptual | Calendario + Eventos + Notificaciones → "Calendario" |
| 2+ items son sub-vistas de la misma configuración | Por Rol + Por Usuario → "Permisos" |

### Cuándo NO agrupar

Items sueltos que no tienen relación directa (ej: "Usuarios" y "Vistas" son de Sistema pero no se relacionan).

### Naming dentro de grupos

| Contexto | Naming | Ejemplo |
|----------|--------|---------|
| Dentro de grupo | Label corto, sin prefijo "Mi" | "Foro", "Mensajería", "Gestión" |
| Item suelto | Label descriptivo completo | "Asistencia", "Videoconferencias" |
| Label del grupo | Nombre del concepto que agrupa | "Mi Aula", "Permisos", "Calendario" |

### Grupos estándar

| Módulo | Grupo | Items | Roles |
|--------|-------|-------|-------|
| Académico | Administración | Cursos, Salones, Horarios | Admin |
| Académico | Mi Aula | Mis Cursos, Mis Salones, Mi Horario | Prof/Est |
| Seguimiento | Asistencia | Asistencia diaria, Gestión, Reportes, Permisos Salud | Cross-role + Admin |
| Seguimiento | Mi Seguimiento | Mis Calificaciones, Mi Asistencia | Prof/Est |
| Comunicación | Calendario | Calendario, Eventos, Notificaciones | Admin (Eventos/Notif), Compartido (Calendario) |
| Comunicación | — (suelto) | Videoconferencias | Compartido |
| Comunicación | Mensajes | Foro, Mensajería | Prof/Est |
| Sistema | Gestión | Usuarios, Vistas | Admin |
| Sistema | Permisos | Por Rol, Por Usuario | Admin |
| Sistema | Monitoreo | Errores, Bandeja de Correos, Reportes de Usuarios | Admin |
| Sistema | Herramientas | Campus, Test k6 | Admin |

---

## Crecimiento

| Si la nueva feature... | Módulo | Grupo |
|------------------------|--------|-------|
| Define algo que existe en el colegio (materia, aula, periodo) | Académico | Nuevo o existente según entidad |
| Mide progreso de estudiantes (notas, conducta, logros) | Seguimiento | Agrupar si comparte entidad con item existente |
| Permite comunicar información (avisos, chat, encuestas) | Comunicación | Agrupar si comparte canal/UI |
| Configura la plataforma (roles, integraciones, logs) | Sistema | Agrupar si comparte sección de config |
| No encaja en ninguna pregunta | **Nuevo módulo** | Definir nueva pregunta en `module-registry.ts` |

**Ejemplos futuros**:
- Pagos/Matrícula → Nuevo módulo **Finanzas** ("¿Cómo va el pago?")
- Biblioteca → Académico (recurso de enseñanza)
- Encuestas → Comunicación, grupo "Feedback" si hay 2+ items
- Logs de auditoría → Sistema, suelto o grupo "Monitoreo" si hay 2+

---

## Límites

| Concepto | Límite |
|----------|--------|
| Nav items visibles (carousel circular) | 3 |
| Pills visibles (carousel circular) | 5 |
| Items por grupo (dropdown) | Idealmente ≤ 7, si supera considerar dividir |
| Módulos totales | Idealmente 5-7 |
