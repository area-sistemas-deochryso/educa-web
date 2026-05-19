# Brief 200 — F-022 · AA pierde vista self-service en `/intranet/asistencia` (regresión brief 134)

> **Creado**: 2026-05-19 · **Estado**: ⏳ pendiente arrancar · **Modo sugerido**: `/investigate` → `/execute`
> **Repo**: `educa-web` (FE)
> **Severidad**: Alto
> **Origen**: Cowork local BD prueba 2026-05-19 — brief 143 verificación uniformidad 4 roles. Ver `claude-cowork/reporte-cowork-2026-05-19.md` §2 F-022.

## Síntoma

Login local con AA YARUPAITA RICARDO REY (DNI 72884913 / pwd YA4913 / rol Asistente Administrativo) → `/intranet/asistencia` muestra el mismo panel admin que el Director:

- Tabs Estudiantes / Profesores / Asistentes Admin.
- Leyenda completa (A/T/F/J/-).
- Filtro INV-C11 banner.
- Dropdown Grado y Sección con todos los grados.
- **Ninguna sección self-service** (no "Mi asistencia", "Mis registros", "Marcar entrada").

El brief 143 (uniformidad 4 roles) y el brief 134 parte 4a (AA self-service) están en conflicto. El doc `verify-awaiting-prod-2026-05-19.md §1.4` anticipa exactamente este caso:

> "Conflicto conocido con 134: AA en `/intranet/asistencia` debería ver self-service (no panel admin). Si ve panel admin, hay regresión. Reportar."

## Causa probable

El unificador del brief 143 expandió el componente cross-role de asistencia a los 4 roles administrativos (Director, Promotor, Coord. Académico, AA) sin preservar la rama AA → self-service del brief 134.

Verificar primero qué componente self-service tenía el AA antes del brief 143:

```bash
git log --all --oneline -- 'src/app/features/intranet/pages/aa/**' \
                          'src/app/features/intranet/pages/asistente-administrativo/**'
git log --oneline --grep "134" --grep "AA self-service" --all
```

## Sugerencia de fix

En el componente cross-role de asistencia, branch por rol:

```typescript
const rol = this.authService.usuarioActual()?.rol;
const esAdminCompleto = ['Director', 'Promotor', 'Coordinador Académico'].includes(rol);
const esAa = rol === 'Asistente Administrativo';

if (esAdminCompleto) {
  // panel admin uniforme (estado actual brief 143)
} else if (esAa) {
  // delegar a AaSelfServiceComponent (brief 134 parte 4a)
}
```

Decidir antes de implementar: ¿el self-service AA es un componente separado o una variante de visibilidad del mismo panel? La salida del `/investigate` debe responder esto.

## Verificación

Local con BD prueba, las 4 credenciales:

| Rol | DNI | pwd | `/intranet/asistencia` esperado |
|---|---|---|---|
| Director ADMINISTRADOR | 74125896 | 12349898 | Panel admin (estado actual OK) |
| Promotor MEDINA | 09766543 | ME6543 | Panel admin (estado actual OK) |
| Coord.Académico TREJO | 41163676 | TR3676 | Panel admin (estado actual OK) |
| **AA YARUPAITA** | 72884913 | YA4913 | **Self-service** (regresión hoy: muestra admin) |

Test de integración: componente cross-role con `rol = 'Asistente Administrativo'` debe renderizar self-service, no panel admin.

## Archivos esperados

- Componente cross-role de asistencia (`src/app/features/intranet/pages/cross-role/attendance-component/...` o el feature unificado).
- Posiblemente reactivar `AaSelfServiceComponent` si fue removido por el brief 143.

## Dependencias

Ninguna externa. Cambio FE puro. Sale a awaiting-prod tras deploy y se verifica en próxima sesión Cowork local.

## Plan asociado

Reconciliar Plan 28 Chat 4a (AA self-service) con Plan 43 (vista uniforme 4 roles). El brief 143 queda en `awaiting-prod/` con anotación de regresión hasta que F-022 cierre.

---

## 🔎 Investigación 2026-05-19 (handoff) — FALSO POSITIVO

> Investigado en chat read-only sin cambios al código. **F-022 NO es una regresión** — el comportamiento actual es el estado deliberado post-brief 145.

### Evidencia

**Git log de [attendance.component.html](src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.html)** (commits relevantes en orden cronológico):

- `b01e805` — `feat(asistencia): plan 28 chat 4 — AA self-service UI + director tab (4a + 4b-tab)` (brief 134, agregó AA self-service)
- `329500f` — `feat(intranet): unify attendance view for the 4 administrative roles` (brief 143, unificó 4 admin)
- `b9901da` — **`chore(intranet): sync invariants and remove orphan AA self-service code`** (brief 145, eliminó AA self-service deliberadamente)

**Brief 145** (en `chats/closed/145-be-fe-sync-invariantes-cleanup-post-143.md`) lo dice explícito:

> "Texto §1.8 ('Self-service AA es read-only') reemplazado por la realidad post-143."
> "INV-AD08 → aflojada a `Roles.Administrativos`. AA puede mutar `AsistenciaPersona` con `TipoPersona='A'` igual que los demás administrativos."
> "Eliminar archivos huérfanos: `home-component/components/asistente-admin-attendance-widget/`, `attendance-component/attendance-asistente-admin/`, `shared/services/attendance/asistencia-asistente-admin-api.service.ts`..."

**Estado actual de [attendance.component.html:25-27](src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.html#L25-L27)**:

```html
@case ('Asistente Administrativo') {
    <app-attendance-director />
}
```

Y `[attendance.component.ts:113-121](src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.ts#L113-L121)`:

```ts
private isAdministrativeRole(role: string): boolean {
    return (
        role === APP_USER_ROLES.Director ||
        role === APP_USER_ROLES.AsistenteAdministrativo ||
        role === APP_USER_ROLES.Promotor ||
        role === APP_USER_ROLES.CoordinadorAcademico
    );
}
```

**Comentario residual en `asistencia-asistente-admin-api.service.ts:11`** confirma:

> "Tras brief 145 quedó únicamente el endpoint agregado por sede; el flujo self-service `/me/*` fue eliminado."

### Por qué el brief 200 reportó regresión

El brief 200 cita `verify-awaiting-prod-2026-05-19.md §1.4` como fuente del esperado "AA self-service". Ese documento (que ya no existe en `claude-cowork/`) fue redactado **antes del cierre del brief 145** asumiendo que Plan 28 Chat 4a seguía vivo. Cuando Cowork ejecutó el verify el 2026-05-19, comparó la realidad post-145 contra una expectativa pre-145.

### Acción recomendada

**Cerrar brief 200 sin código**:

1. Mover `chats/open/200-...md` → `chats/closed/` con commit que apunte a este handoff.
2. Re-verificar brief 143 con el criterio correcto: los 4 admin (Director, Promotor, Coord. Académico, AA) ven el **mismo panel admin uniforme**. AA no tiene self-service.
3. Actualizar/eliminar referencia stale al "AA self-service" en `verify-awaiting-prod-*.md` (si rebrota en doc del próximo Cowork).
4. Considerar agregar nota en el componente `attendance.component.ts` o en `business-rules.md §1.8` que diga "AA self-service revertido en brief 145 — si futuro Cowork lo espera, está mirando doc obsoleta".

### Decisión necesaria antes de cerrar

¿El usuario quiere mantener self-service para AA pese al cleanup del brief 145?

- **Si sí** → reabrir Plan 28 Chat 4a, restaurar archivos eliminados (necesita brief nuevo de re-implementación + reabrir INV-AD08 más estricto). Costo alto, requiere decisión arquitectónica.
- **Si no** (esperado, brief 145 fue intencional) → cerrar 200 como wontfix/duplicado de 143.

### Estado al cerrar el handoff

Chat de investigación cerrado read-only. Brief 200 queda en `chats/open/` con esta sección anexada. Próximo `/start-chat 200` arranca con `/ask` al usuario para confirmar cierre, no `/execute`.
