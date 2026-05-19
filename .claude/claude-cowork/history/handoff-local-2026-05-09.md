# Handoff Cowork — Verificación LOCAL pre-deploy · 2026-05-09 (sábado)

> **Objetivo**: validar en localhost los briefs de `awaiting-prod/` que **aún no se desplegaron a prod**, antes del próximo deploy. Esto adelanta hallazgos y reduce riesgo del round post-deploy.
>
> **Operador**: Cowork (browser QA local). El usuario debe levantar BE y FE locales antes.
> **Tiempo estimado**: ~1.5-2 h.
> **Restricción Saturday**: hoy NO hay datos frescos de asistencia diaria (CrossChex sólo M-F). Los casos que dependen de fecha de hoy se validan con datos histórico-recientes (jueves 2026-05-08 o viernes 2026-05-09 si CrossChex corrió antes de mediodía) o se posponen al próximo lunes.

## Setup local (1 vez)

| Servicio | Cómo | Verificación |
|---|---|---|
| BE Educa.API local | `dotnet run` desde `Educa.API/Educa.API/` (puerto 7102 HTTPS) | `https://localhost:7102/api/sistema/warmup` → 200 |
| FE educa-web local | `npm run start` desde `educa-web/` (puerto 4201) | `http://localhost:4201` carga login |
| BD | Apuntar al ambiente de **test** (no prod). Confirmar `appsettings.Development.json` en BE | Login Director funciona |
| Browser | Chrome perfil Sistemas, MCP `work aqui m`, sesión guardada | DevTools abierto desde primer paso (Network + Console) |

> ⚠️ **Si dotnet run falla** o el puerto está ocupado, pedir al usuario antes de tocar. NO matar procesos sin confirmar.

## Briefs a validar (6 — recientes, no desplegados aún)

Ordenados por dependencia: primero los que NO requieren deploy coordinado (independientes), luego los que sí.

---

### Bloque A — FE-only (no requiere BE local nuevo)

#### LOCAL-1 · brief 131 · Plan 41 Chat 1 — Correlation timeline cronológico

**Cubre**: hub `/intranet/admin/correlation/<id>` ahora renderiza timeline unificado en orden cronológico (era listado por fuente).

**Pasos**:
1. Login Director.
2. Navegar a `/intranet/admin/correlation` o tomar un `correlationId` real desde `/intranet/admin/error-groups` (drill a un grupo, copiar id).
3. Pegar id en el input → cargar.
4. Confirmar timeline ordenado por fecha ascendente con marcadores visuales por fuente (ErrorLog · RateLimitEvent · ReporteUsuario · EmailOutbox).

**Pasa**: timeline mezclado en orden temporal, no agrupado por fuente.
**Falla**: agrupado por fuente o vacío con error en consola.

---

#### LOCAL-2 · brief 134 · Plan 28 Chat 4 — AA self-service tab

**Cubre**: nueva tab AA (`Asistente Administrativo`) en `/intranet/asistencia` (cross-role) + widget home AA + tab director "Asistentes Admin".

⚠️ **Saturday-aware**: este brief depende de datos de asistencia. Validar con sesión de un AA que tenga marcaciones de jueves/viernes. Si la BD test no tiene datos, pedir al usuario un fixture mínimo (1 marca AA día anterior).

**Pasos** (con cuenta AA o impersonando vía toggle de rol si está disponible):
1. Login como Asistente Administrativo (DNI según test fixture).
2. Home → confirmar widget "Mi asistencia hoy" simplificado (sin sección salón). Hoy sábado mostrará "—" o "no registrada".
3. Navegar a `/intranet/asistencia` → debería redirigir/mostrar la tab self-service propia (vista mes).
4. Cambiar a sesión Director.
5. Navegar a `/intranet/admin/asistencias` → nueva pestaña/opción submenu "Asistentes Admin" con `pi pi-id-card`.
6. Click → tabla día-only. Confirmar que muestra los AAs registrados.
7. Click pencil en una fila → cross-link admin con `tipoPersona='A'`.

**Pasa**: 4 puntos verdes; mes degradado en tab director-AAs es esperado (no-op silencioso).
**Falla**: 404 en ruta nueva, widget AA no aparece, o tab director crashea.

---

#### LOCAL-3 · brief 130 · Coordinador Académico en dashboard usuarios

**Cubre**: stat card nueva "Coordinador Académico" + bug "Total Directores" baja de 4 a 2.

**Pasos**:
1. Login Director, navegar a `/intranet/admin/usuarios`.
2. Inspeccionar stats cards arriba.
3. Confirmar:
   - Tarjeta "Total Directores" muestra **2** (no 4).
   - Tarjeta nueva "Coordinador Académico" presente con **1**.
   - "Asistente Administrativo" muestra 4.
   - "Promotor" muestra 1.
   - Total general suma correcto (no oculta Promotor+CoordAcad como antes).
4. Network → `GET /api/usuarios/estadisticas` retorna `totalCoordinadoresAcademicos: 1`.

**Pasa**: stats coinciden con snapshot 2026-05-08 (Director=2, AA=4, Promotor=1, CoordAcad=1).
**Falla**: tarjeta missing, total Directores sigue en 4, o BE no devuelve el campo nuevo.

---

### Bloque B — Requiere BE local con deploy nuevo

> Cowork verifica que el FE local esté apuntando a un BE local con el binario nuevo (commits `9598e18`, `d6635a4`, `9ca33da` ya en master local). Si el dotnet run NO incluye estos commits, este bloque queda fuera y se valida sólo en post-deploy.

#### LOCAL-4 · brief 132 · Plan 41 Chat 2 — Correlation DTO ampliado

**Cubre**: snapshot DTO suma `errorGroupCode` (12 chars del fingerprint) + `relatedCorrelationIds` (últimos 5 distinct del mismo usuario en ventana 2h).

**Pasos**:
1. Login Director, navegar a `/intranet/admin/correlation/<id>` con un correlationId que tenga ErrorGroup asociado.
2. Network → response del GET `/api/sistema/correlation/<id>` incluye:
   - `errorGroupCode` (string 12 chars o null si no hay group).
   - `relatedCorrelationIds` (array hasta 5 strings o vacío).
3. UI: el FE Chat 1 (timeline) ya consume estos campos opcionalmente. Confirmar que no rompe si el BE los devuelve.

**Pasa**: campos presentes en response sin romper render.
**Falla**: response 200 pero campos missing → BE no incluye Boundary `CorrelationRelatedResolver`. 500 → DI faltante.

---

#### LOCAL-5 · brief 133 · Plan 28 Chat 3d — AA self-service endpoints

**Cubre**: nuevo `AsistenteAdministrativoController` con `/me/dia`, `/me/mes` + `director/asistentes-admin-asistencia-dia`.

**Pasos**:
1. Login como AA (sesión test).
2. Console:
   ```js
   await fetch('/api/asistente-administrativo/me/dia?fecha=2026-05-08', { credentials:'include' }).then(r => r.json());
   // Esperado: data con la asistencia del AA del jueves (DNI extraído de claim)
   ```
3. ⚠️ Probar que el endpoint **NO acepta `dni` en query/route** — sólo claim. Forzar como Director:
   ```js
   await fetch('/api/asistente-administrativo/me/dia?fecha=2026-05-08&dni=<dniAA>', { credentials:'include' }).then(r => r.json());
   // Esperado: 403 o el endpoint devuelve la asistencia del Director (claim), NO del DNI pasado
   ```
4. Login Director, probar `/api/ConsultaAsistencia/director/asistentes-admin-asistencia-dia?fecha=2026-05-08` → lista de AAs del día.

**Pasa**: 3 puntos verdes; AA solo ve la propia, Director ve agregado.
**Falla**: AA puede ver asistencia ajena (INV-AD08 violado) o endpoint 404.

---

#### LOCAL-6 · brief 136 · Plan 26 F3 — Time-of-day modifier

**Cubre**: rate-limiting con multiplier x1.5 en horario escolar entrada y x1.2 en salida; cap 5x. Roles administrativos (Director/AA/Promotor/CoordAcad) afectados.

**Pasos**:
1. Login Director.
2. Navegar a `/intranet/admin/rate-limit-events` (si el panel está activo).
3. Console — confirmar que requests dentro de horario escolar (07:30-09:30 o 13:55-16:00) tienen un cap más alto que fuera. Esto requiere disparar carga sintética o esperar logs.
4. ⚠️ **Validación primaria del F3 es post-deploy + 1-2 semanas de observación**. En local sólo confirmamos que el código no rompe rutas existentes y que `SchoolHoursResolver` no tira errores de DI.

**Pasa**: app no rompe, panel admin carga, sin errores rojos en consola.
**Falla**: 500 en cualquier request → DI roto en `RateLimitPartitionResolver`.

---

## Cierre del round local

Reportar al usuario en formato resumen:

```
Local validation 2026-05-09:
- LOCAL-1 (131): ✅ / ❌ <motivo>
- LOCAL-2 (134): ✅ / ❌ / ⚠️ pospuesto a lunes (sin datos AA)
- LOCAL-3 (130): ✅ / ❌
- LOCAL-4 (132): ✅ / ❌ / N/A (BE local sin commit nuevo)
- LOCAL-5 (133): ✅ / ❌ / N/A
- LOCAL-6 (136): ✅ / ❌
```

**Si todo pasa**: dar luz verde para deploy + ejecutar handoff prod (`handoff-prod-saturday-2026-05-09.md`) post-deploy.
**Si algo falla**: anexar bloque a `reporte-claude-cowork.md` con detalle. Brief queda en `awaiting-prod/` esperando fix.

## Notas operativas

- ⚠️ **No mezclar BD test con prod**: confirmar `appsettings.Development.json` apunta a SQL test antes de empezar.
- ⚠️ **Datos AA históricos**: si la BD test no tiene un AA con marcaciones, pedir al usuario fixture sintético antes de bloquear LOCAL-2/LOCAL-5.
- ⚠️ **DevTools desde paso 1**: si arranca después, `read_console_messages`/`read_network_requests` no capturan los GETs iniciales.
- ⚠️ **Reload mata `window.fetch` overrides**: re-inyectar tras cada F5 (limitación SETUP §6.3).
