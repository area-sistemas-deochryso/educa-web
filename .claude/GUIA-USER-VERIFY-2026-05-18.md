# Guía de verificación manual — awaiting-prod 2026-05-18

> **Para vos** (lo que Cowork no puede). Cowork tiene su parte en [`claude-cowork/verify-awaiting-prod-2026-05-18.md`](claude-cowork/verify-awaiting-prod-2026-05-18.md) — esto es lo complementario.

**Total awaiting-prod hoy**: 14 briefs FE/BE+FE. Cowork agarra 8 (Director read-only). Vos quedás con **6**:

1. **143** — Vista asistencia uniforme 4 roles administrativos (login con Promotor / CoordAcad / AA)
2. **134** — AA self-service + tab director-profesores (mismas credenciales)
3. **140** — Bug fix F-018 botón "Registrar" disabled en dialog asistencia manual AA (acción mutativa)
4. **119** — Audit walDelete soft vs hard (~15 facades — DELETE reales)
5. **137** — Hardening wrappers barrel + lint (sanity navegacional cross-app)
6. **153** — Correlation id unificado E2E (consistencia de formato cross-tabla)

Orden recomendado: **140 primero** (es el que bloquea Plan 28), después **143 + 134 juntos** (mismo flow de roles), después **119 + 137 + 153** (sanity general). Tiempo estimado total: **40-60 min** si los logins están a mano.

---

## 1. Brief 140 — Fix F-018: botón "Registrar" disabled en dialog asistencia manual AA

**Por qué vos**: requiere crear una asistencia real (mutación). Hoy bloquea el cierre de Plan 28.

### Repro del bug original (debería estar arreglado)

1. Login Director.
2. `/intranet/admin/asistencias` → tab "Asistentes Administrativos".
3. Click **"+ Nueva asistencia"** → abre dialog "Registrar asistencia manual".
4. Completar:
   - Tipo persona: **Asistente Admin**
   - Tipo registro: **Solo entrada**
   - AA: seleccionar uno (ej. YARUPAITA MALASQUEZ RICARDO REY DNI `72884913`)
   - Hora de entrada: hoy a alguna hora válida (ej. 14:30)
   - Observación: "smoke verify 2026-05-18"

### Qué esperar (post-fix)

- Botón **"Registrar" se habilita** apenas todos los campos requeridos estén completos (antes quedaba disabled aunque todo estuviera OK).
- Click → toast verde "Asistencia registrada" y la fila aparece en la tabla.

### Si sigue disabled

1. F12 → Console → inspeccionar:
   ```js
   $0  // sobre el botón seleccionado en Elements
   ```
2. Probable que `isFormValid` computed siga sin actualizarse al elegir AA en el `p-select`. Capturar el ariaDisabled y el computed actual.
3. Reportar `❌ F-018 sigue activo` y movemos el brief 140 a `running/` con `/block-chat` técnico.

### Limpieza

Si el registro se creó, podés dejarlo (no rompe nada). O ir al panel admin de asistencias, abrir esa fila y eliminarla — sabiendo que el DELETE backend para asistencia puede ser soft o hard (eso lo audita el brief 119, ver abajo).

---

## 2. Brief 143 — Vista asistencia uniforme para 4 roles administrativos

**Por qué vos**: requiere login con Promotor, Coordinador Académico y AA — Cowork solo tiene Director.

### Pre-work

Conseguir credenciales (DNIs + password) de 1 usuario por rol:

- **Promotor** (existe LUZMILA MEDINA — pedirle al jefe el DNI si no lo tenés a mano)
- **Coordinador Académico** (existe MEDALITH TREJO — idem)
- **Asistente Administrativo** (varios — `72884913` YARUPAITA está confirmado por brief 134)

### Test por rol (3 logins separados)

Para **cada** rol:

#### A. `/intranet` (home)

- Widget de asistencia debe ser **igual al del Director** (no la versión simplificada "Mi asistencia de hoy" que tenía el AA antes).
- Stats: total asistieron, tardanzas, faltas, justificados — los 4 contadores.
- Network: `GET /api/ConsultaAsistencia/director/estadisticas` debe responder 200 (antes los no-Director iban a un endpoint distinto).

#### B. `/intranet/asistencia`

- Mismo panel admin del Director: dropdown Grado+Sección, tabla con tabs Estudiantes/Profesores/AAs, leyenda, botones de export.
- Probar el dropdown a "5TO PRIMARIA - A" (dentro de INV-C11) y validar que la tabla carga.
- Verificar Network: endpoints `/director/*` responden 200 para los 3 roles no-Director.

### Excepción: AA en `/intranet/asistencia`

Atención — el brief 134 (que va separado) hace que `/intranet/asistencia` para AA muestre **su propia asistencia** (self-service), no el panel admin. Si después del brief 143 el AA ve el panel admin, hay conflicto entre 134 y 143. **Reportarme** si lo ves — uno de los dos pisa al otro.

### Reportar

Matriz 3 roles × 2 pantallas (home + asistencia) con ✅/❌ por celda.

---

## 3. Brief 134 — Self-service AA + tab director-profesores

**Por qué vos**: requiere login AA (parte 4a) y reproducir creación de asistencias (parte 4b-tab, sigue bloqueada por 140).

### Parte 4a — AA viendo su propia asistencia (ya validado 2026-05-12, re-confirmar)

Login AA DNI `72884913`:

1. `/intranet` (home) → widget **"Mi asistencia de hoy"** (NO el panel admin completo del brief 143 — ojo con el conflicto que mencioné arriba).
2. `/intranet/asistencia` → vista self-service con leyenda y empty state legítimo si no hay asistencia hoy.
3. Network: `GET /api/asistente-administrativo/me/dia` y `/me/mes` deben responder 200.
4. **NO** debe haber botones de edición / "Nueva asistencia" / etc. — read-only del propio AA.

### Parte 4b-tab — Director viendo tab AA en director-profesores

Login Director:

1. `/intranet/asistencia` → debe existir el submenu con 3 opciones: Estudiantes / Profesores / **Asistentes Administrativos**.
2. Click tab AAs → tabla con los AAs registrados, mismo patrón que profesores.
3. Cross-link a admin con `tipoPersona='A'` funciona (click pencil → `/admin/asistencias?tab=gestion&tipoPersona=A&dni=<x>`).

Esta parte queda parcialmente bloqueada por **140** — el botón Registrar del dialog asistencia manual AA estaba disabled. Si 140 ya está verde, validar 4b-tab también.

### Reportar

✅ 4a confirmado (login AA OK) + ✅ 4b-tab confirmado (Director ve tab AA) + nota si hay conflicto con 143.

---

## 4. Brief 119 — Audit walDelete soft vs hard (~15 facades)

**Por qué vos**: requiere ejecutar DELETEs reales en producción sobre ~15 entidades distintas y observar counters. Cowork puede hacer DELETE pero la decisión "este BE es soft o hard" requiere cruzar con código BE — más rápido vos.

### Heurística rápida

El bug original (curso 42) era: BE hace soft (`_Estado = false`) pero FE optimistic decrementa `total` (counter del header). Síntoma: borrás un activo → `total` baja, `inactivos` no sube.

**Test universal por facade**:

1. Crear (o usar) un registro **activo**.
2. Anotar `total` y `inactivos` del header (o equivalente).
3. Click eliminar → confirmar.
4. Esperar 1-2 seg (commit WAL).
5. Re-leer counters.
   - **Si BE hace soft**: `total` debe seguir igual, `inactivos += 1`.
   - **Si BE hace hard**: `total -= 1`, `inactivos` igual.
6. Si los counters mienten → ❌ + nombre del facade.

### Lista priorizada (los 15 del brief)

Mirar el brief 119 para el listado completo. Empezar por los que más uso reciben:

| # | Facade | Ruta UI |
| --- | --- | --- |
| 1 | `cursos.facade.ts` (ya arreglado) | `/intranet/admin/cursos` — usar como control ✅ |
| 2 | `attendances-crud.facade.ts` | `/intranet/admin/asistencias` |
| 3 | `blacklist-crud.facade.ts` | `/intranet/admin/monitoreo/email-blacklist` |
| 4 | `attachments-modal.facade.ts` | algún dialog con adjuntos |
| 5… | …el resto del brief | varios |

### Atajo

Si querés delegar el grueso: pedile a Claude Code que haga el cruce código-BE (lee `Eliminar*` controllers, lista cuáles son soft vs hard) y produzca un mapa. Después vos solo validás 2-3 visuales para confirmar el mapa.

### Reportar

Tabla con `[facade, BE soft/hard, FE optimistic OK?, captura si rompe]`. Como mínimo: validar 3-5 críticos en lugar de los 15 si tiempo apremia.

---

## 5. Brief 137 — Hardening de wrappers (barrel + lint)

**Por qué vos**: el cambio es estructural (barrel exports cerrados). El test es **navegar la app y que nada crashee** — Cowork puede pasar el listado, pero el juicio "no se rompió funcionalidad" es tuyo.

### Pasos

1. Login Director.
2. Hacer una pasada por las **rutas críticas** que usan `@core/services/storage`, `@core/services/wal`, `@core/services/session`:
   - `/intranet/login` (storage para token)
   - `/intranet` (home — wal queue al cargar)
   - `/intranet/admin/usuarios` (CRUD con WAL)
   - `/intranet/admin/cursos` (CRUD con WAL)
   - Cualquier feature con dialog (session refresh)
3. En cada una: F12 → Console → buscar errores rojos tipo `is not a function`, `Cannot read property`, `undefined import`.
4. Cerrar sesión → re-login → confirmar que la sesión coordina bien (no se queda colgado).

### Reportar

✅ smoke navegacional limpio. ❌ si alguna ruta tira import error / componente crashea / WAL no procesa entries.

---

## 6. Brief 153 — Correlation id unificado E2E

**Por qué vos**: requiere SQL cross-tabla en prod o lectura de samples para confirmar que el formato GUID-36 ya es uniforme. Cowork no tiene acceso DB.

### Pasos

1. Login Director.
2. Trigger ≥1 evento en cada carril (un GET cualquiera para ErrorLog, un email enviado en EmailOutbox, etc.).
3. Pedirle al admin BD (o ejecutar vos mismo) el SELECT del brief 153:

```sql
SELECT TOP 10 'ErrorLog' AS Tabla, EL_CorrelationId AS CorrId, LEN(EL_CorrelationId) AS Len FROM ErrorLog ORDER BY EL_FechaCreacion DESC
UNION ALL
SELECT TOP 10 'EmailOutbox', EO_CorrelationId, LEN(EO_CorrelationId) FROM EmailOutbox ORDER BY EO_FechaCreacion DESC
UNION ALL
SELECT TOP 10 'RateLimitEvent', RLE_CorrelationId, LEN(RLE_CorrelationId) FROM RateLimitEvent WHERE RLE_CorrelationId IS NOT NULL ORDER BY RLE_Fecha DESC
UNION ALL
SELECT TOP 10 'ReporteUsuario', REU_CorrelationId, LEN(REU_CorrelationId) FROM REU_ReporteUsuario ORDER BY REU_FechaCreacion DESC
```

### Qué esperar (post-fix)

- **Todos los nuevos registros** deben tener `Len = 36` (GUID-36 con guiones).
- Los registros **viejos** (pre-deploy) pueden tener `Len = 32` — esto es histórico, no bug.

### Validar el hub

1. Tomar un correlation id reciente (cualquier carril, formato GUID-36).
2. Ir a `/intranet/admin/correlation/<id>`.
3. El hub debe encontrar el evento. Si pega más de un carril (errors + emails + rate-limit en la misma request), aparecen las secciones correspondientes.

### Reportar

✅ tabla SQL con todos `Len=36` para nuevos. ⚠️ si hay mezcla post-deploy (el fix no entró aún).

---

## Cierre del barrido

Cuando termines los 6:

1. Para cada brief con resultado ✅ → ejecutar `/verify <NNN>` (mueve el brief de `awaiting-prod/` a `closed/`).
2. Para cada ❌ → `/verify <NNN>` con motivo de rollback → mueve a `running/` para retrabajar.
3. Para los ⚠️ → me lo decís y decidimos: a veces es "no reproducible sin más data" y queda en `awaiting-prod/` un round más.

Si todo va bien, `awaiting-prod/` baja de 23 → ~10 briefs. Buen progreso.

---

**Generado**: 2026-05-18 · `/go` cross-repo de verificación post-deploy.
