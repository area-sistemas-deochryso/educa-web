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
