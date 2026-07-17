# 466 — Auditoría visual + funcional: Perfil Director

> **Repo destino**: `educa-web`
> **Creado**: 2026-07-17 · **Modo sugerido**: `/execute` (ambos hallazgos son fixes acotados, sin decisiones de arquitectura pendientes)
> **Plan**: —
> **exclusive**: `false`
> **isolation**: `false`
> **touches**:
>   - `src/app/features/intranet/shared/config/intranet-menu.config.ts` (línea 132-138, `LABEL_OVERRIDE_POR_ROL`)
>   - `src/app/features/intranet/pages/cross-role/attendance-reports/components/reports-filters/reports-filters.component.html`
>   - Ver también brief **458** (`calificar-dialog-selector-literal.md`) — actualizado en esta misma sesión con la causa raíz confirmada del bug de literales, verificada desde el diálogo "Config Calificaciones" (solo accesible por Director/Administrador).

## Contexto

Continuación de la sesión de auditoría (ver briefs 463 Login/Header, 464 Estudiante, 465 Profesor). Cuenta de prueba: `SANCHEZ QUISPE MARIA OTILIA` (Director). El usuario señaló que, dentro de los perfiles administrativos, Director es el más completo funcionalmente (sin contar Administrador real, que no se audita por ser de uso exclusivo del usuario). Recorrido: Inicio (dashboard institucional agregado) → menú "Administrador" (13 ítems) → Asistencia diaria → Gestión/Reportes de Asistencia → Permisos de Salud → Usuarios → Eventos → Notificaciones → Videoconferencias → Salones (incluye diálogo "Config Calificaciones").

## Scope

### 1. Sufijo interno "(admin)" filtrado a labels visibles al usuario (medio)

El menú de Director (grupo "Asistencia") muestra 3 ítems con el label crudo: **"Gestión (admin)"**, **"Reportes (admin)"**, **"Permisos Salud (admin)"** — confirmado también en breadcrumb (`Administrador > Asistencia > Gestión (admin)`, con zoom). El código expone la causa exacta: `intranet-menu.config.ts` ya tiene un mecanismo de override por rol (`LABEL_OVERRIDE_POR_ROL`, líneas 132-138) que resuelve este mismo problema para otros 3 roles compartiendo la misma `capability` `ADMIN_ASISTENCIAS`:

```ts
const LABEL_OVERRIDE_POR_ROL: Partial<Record<CapabilityCode, Partial<Record<UserRole, string>>>> = {
	ADMIN_ASISTENCIAS: {
		'Asistente Administrativo': 'Gestión (secretaría)',
		'Coordinador Académico': 'Gestión (académica)',
		Promotor: 'Gestión (dirección)',
	},
};
```

`Director` está incluido en `ADMIN_ROLES` (línea 48, por lo que sí ve estos ítems) pero **no tiene entrada en el mapa de overrides** — cae al label base literal `'Gestión (admin)'` / `'Reportes (admin)'` / `'Permisos Salud (admin)'`, que lee como un placeholder de desarrollo, no como texto pensado para el usuario final. El comentario de la sección (línea 129) confirma que el override "solo cubre los casos detectados en la auditoría 417-F6" — Director no estaba cubierto en esa auditoría anterior.

**Fix acotado**: agregar entrada `Director: 'Gestión (dirección)'` (o equivalente) al mapa `LABEL_OVERRIDE_POR_ROL` para `ADMIN_ASISTENCIAS`, y decidir si `ADMIN_PERMISOS_SALUD` (capability separada, usada solo por "Permisos Salud (admin)") necesita su propia entrada — actualmente esa capability no está en el mapa en absoluto, para ningún rol.

### 2. Botón "Visualizar tabla" en Reportes de Asistencia queda inerte sin explicar por qué (medio)

En `Asistencia > Reportes` (`/intranet/admin/asistencias?tab=reportes`), al elegir "Reportar sobre: Estudiantes/Profesores/Todos", el botón **"Visualizar tabla"** permanece deshabilitado hasta seleccionar al menos un salón en "Alcance" — pero no hay ningún indicio visual de esa dependencia (sin asterisco, sin texto de ayuda, sin tooltip). El usuario ve un botón con color de acción (verde) pero que no responde al clic.

Confirmado en código (`reports-filters.component.ts:56-64`):

```ts
readonly showSalones = computed(() => {
	const t = this.selectedTipoPersona();
	return t !== 'P' && t !== 'A' && t !== 'C' && t !== 'M';
});
readonly disableGenerar = computed(() => {
	const t = this.selectedTipoPersona();
	if (t === 'P' || t === 'A' || t === 'C' || t === 'M') return false;
	return this.selectedSalones().length === 0;
});
```

El template (`reports-filters.component.html:66-103`) no tiene ningún mensaje asociado a esta regla. **Contraste con un patrón mejor ya existente en el mismo proyecto**: la página "Permisos de Salud" (`/intranet/admin/permisos-salud`) sí comunica explícitamente el requisito con un mensaje central ("Seleccione un salón para gestionar permisos de salud") en vez de dejar un control inerte sin contexto — usar ese patrón como referencia para el fix acá.

**Fix acotado**: agregar un texto de ayuda bajo el `p-multiselect` de Salones (visible solo cuando `showSalones()` es `true` y `selectedSalones().length === 0`), del estilo "Selecciona al menos un salón para generar el reporte".

## Verificado, NO es bug (puntos positivos a preservar)

- **Dashboard institucional agregado en Inicio**: métricas de asistencia del día (Estudiantes, Profesores, Asist. Admin, Coordinadores) en 0% porque el día actual (17/07/2026) aún no tiene registros — comportamiento esperado, no error.
- **Guard de permisos correcto en `/intranet/admin/monitoreo`**: pese a que `soloParaRol: ADMIN_ROLES` incluye a Director en el config del menú (por eso el ítem no aparece filtrado ahí), el capability check real bloquea el acceso con un modal claro ("Acceso denegado — No cuenta con los permisos necesarios... Ruta solicitada: intranet/admin/monitoreo") en vez de un error genérico o pantalla en blanco. Buen patrón de manejo de rutas fuera del alcance real del rol.
- **Videoconferencias con visión institucional completa**: Director ve todas las salas de todos los cursos/salones (no solo los propios), coherente con su rol de supervisión — no es un bug de scoping.
- **Filtro temporal de asistencia bien comunicado**: el banner "Filtro temporal activo — Solo se registra asistencia diaria biométrica de 5to Primaria en adelante..." en Gestión/Reportes de Asistencia explica correctamente por qué el selector de salones solo lista 8 secciones (5to Primaria en adelante) en vez de las 14 totales del colegio — no es un bug, es la regla CrossChex ya documentada.
- Cursos, Horarios, Eventos, Notificaciones, Usuarios: sin hallazgos nuevos — administración funcional, breadcrumbs correctos, contadores consistentes (277 usuarios = 245 estudiantes + 24 profesores + 8 admin).
- Campus (Editor de Campus): fuera de scope — ya gateado por `environment.features.campusNavigation` (solo `true` en dev), confirmado en brief 464. El error 400 visto en esta sesión es exclusivo del entorno local de desarrollo y no se documenta como bug de producto.

## Out of scope

- Fix del bug de clasificación aprobado/desaprobado y de los inputs faltantes de `notaMinima`/`notaMaxima` en "Config Calificaciones" — ejecutar contra brief 458 (actualizado en esta sesión con la causa raíz confirmada desde este mismo recorrido).
- Rol Administrador real — no se audita, uso exclusivo del usuario según indicó.
- Permisos granulares de Director vs Administrador (ej. si Director debería tener acceso a "Migrar Contraseñas" en Gestión de Usuarios) — pregunta de diseño de permisos, no de UI/UX visual; se deja anotado para una sesión de auditoría de permisos si se decide abordarla.

## Criterio de cierre

- [ ] `Director` (y decisión sobre `ADMIN_PERMISOS_SALUD`) agregado a `LABEL_OVERRIDE_POR_ROL` — labels de menú y breadcrumb sin sufijo "(admin)" crudo.
- [ ] Mensaje de ayuda visible en "Reportes de Asistencia" cuando el reporte requiere salones y no hay ninguno seleccionado.
- [ ] Build + lint OK. Verificado en vivo contra el mismo escenario (`SANCHEZ QUISPE MARIA OTILIA`, TEST DB).

## Tiempo estimado

~30-45 min (2 fixes acotados, sin decisiones de diseño pendientes).
