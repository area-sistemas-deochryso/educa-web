# Handoff Cowork — Verificación PROD sábado · 2026-05-09

> **Objetivo**: validar en **producción** los briefs de `awaiting-prod/` que ya cumplen el requisito de tiempo en prod (≥3 días desplegados) y NO dependen de datos frescos de día hábil.
>
> **Operador**: Cowork (browser QA prod). Login Chrome perfil `Sistemas`, browser MCP `work aqui m`.
> **Tiempo estimado**: ~1.5 h browser + ~30 min coordinación con humano (queries SQL Azure, Hangfire).
>
> **Restricción Saturday**: hoy NO hay datos frescos de asistencia diaria (CrossChex sólo M-F).
> Esto deja **2 grupos**:
>
> - **Grupo VERDE (validar hoy)**: briefs de infraestructura/UX que NO dependen de marcaciones del día. Se validan con datos históricos.
> - **Grupo ROJO (posponer al lunes)**: briefs cuya validación necesita comparar marcación de hoy con resultado esperado. Se documentan acá pero NO se tocan hoy.

## Setup global (1 vez)

1. Chrome perfil Sistemas → URL FE prod (pedir al usuario antes de tocar) → login Director (sesión guardada).
2. DevTools abierto desde paso 1 (Network filtro Fetch/XHR + Console + Application IndexedDB para casos WAL).
3. Hard reload (Ctrl+Shift+R) si el deploy es reciente.
4. Confirmar SW activo: `Application → Service Workers` → `activated and is running`.

## Pre-flight (5 min)

| Check | Cómo | Si falla |
|---|---|---|
| BE Azure responde | Login dispara `POST /api/auth/login` 200 | Pedir al usuario confirmación de App Service |
| FE Netlify build nuevo | Console: `WAL_DEFAULTS.schemaVersion` o build hash conocido | Hard reload + `_redirects`/`netlify.toml` |
| Hangfire dashboard | ⚠️ no-browser — pedir screenshot `/hangfire` con jobs activos | Bloquea casos email |

---

## 🟢 Grupo VERDE — Validar hoy (12 briefs · ~1 h)

### Plan 40 Load Control (briefs 103-112) — BE infrastructure

> **Cubre**: 9 briefs BE de Plan 40 (concurrency global F1, bulkheads F2, timeouts F3+F3b, backpressure F4, resilience HttpClient F5, calibración sintética F6a). Ya desplegados ≥7 días en prod. NO dependen de datos M-F — son rate-limiting y health checks.

#### PROD-1 · brief 103 · Concurrency global (F1)

**Cubre**: cap global de requests concurrentes con throttle.

**Pasos**:
1. Navegar a `/intranet/admin/rate-limit-events`.
2. Console — disparar 10 requests concurrentes a un endpoint cualquiera (ej `/api/sistema/usuarios?page=1`):
   ```js
   await Promise.allSettled(Array.from({length:10}, () =>
     fetch('/api/sistema/usuarios?page=1', { credentials:'include' })
   ));
   ```
3. Esperar todas 200; ninguna debe morir con 503 si el cap global es 50+.
4. Headers de respuesta: `X-Concurrent-Inflight` o equivalente si el middleware lo emite.

**Pasa**: 10/10 OK, sin 503.
**Falla**: ≥1 con 503 → cap demasiado bajo.

#### PROD-2 · briefs 104-105 · Bulkheads + Timeouts (F2 + F3)

**Cubre**: bulkheads por categoría (`concurrency:reports`, `concurrency:notif`, etc.) + timeouts HttpClient 30s.

**Pasos**:
1. Login Director, abrir `/intranet/admin/asistencias` → tab Reportes.
2. Generar PDF de un mes histórico (marzo 2026).
3. Network → headers de la respuesta deben incluir `Retry-After` si se satura, o 200 con el PDF.
4. Probar generar 8 PDFs concurrentes — el 9no debe recibir 503 con `Retry-After` (cap `concurrency:reports` = 8).

**Pasa**: cap se honra, 503 con `Retry-After` correcto.
**Falla**: 8 PDFs concurrentes pasan sin throttle → bulkhead no aplica.

#### PROD-3 · brief 106 · Backpressure (F4)

**Cubre**: cuando un bulkhead está al 100%, calcular `Retry-After` dinámico = `max(1, ceil(p95 × 1.5))`.

**Pasos**:
1. Saturar el bulkhead `concurrency:reports` (PROD-2).
2. Inspeccionar el header `Retry-After` del 9no request.
3. Body del 503 incluye `retryAfterSeconds` numérico (típico 1-5).

**Pasa**: header presente, valor coherente con tiempos de PDF actuales.
**Falla**: header missing o valor estático (sin p95 dinámico).

#### PROD-4 · brief 107 · Resilience HttpClient (F5)

**Cubre**: timeouts de HttpClient propagados con CancellationToken.

**Pasos**:
1. Navegar a `/intranet/admin/asistencias` → cargar listado pesado (mes completo).
2. Si tarda >30s, debería abortar con respuesta tipada (no hang infinito).
3. Probar cancelación: navegar fuera de la página antes de que termine.

**Pasa**: respuestas siempre <30s o aborto limpio.
**Falla**: requests cuelgan >30s sin cancelar.

#### PROD-5 · briefs 108, 111, 112 · Calibración F6a

**Cubre**: load tests sintéticos k6 + escenarios 04/05/06 + Polly CrossChex (esc 06).

⚠️ **no-browser** — requiere ejecución de k6 contra prod desde una máquina del usuario. Acción: pedir al usuario un round k6 con los escenarios documentados en `claude-cowork/f6a-k6-calibration.md` y comparar p95/p99 con baseline.

**Pasa**: p95 dentro de SLO documentado.
**Falla**: regresión >20% vs baseline → escalar.

#### PROD-6 · brief 110 · F3b cancellation cascade

**Cubre**: cancelación propagada repos → service → controller (CT-aware).

**Pasos**:
1. `/intranet/admin/asistencias` → cargar reporte mensual.
2. Antes de que termine, navegar a otra ruta.
3. Server logs (pedir al usuario) deberían mostrar `OperationCanceledException` como `Information` (no `Error`).

**Pasa**: log nivel Info, sin ruido en logs de error.
**Falla**: exception propaga como Error → middleware mal configurado.

---

### Plan 28 Chat 3a/3b (briefs 126, 127) — BE reportes + correos AA

> ⚠️ **Saturday-aware parcial**: estos briefs extienden funcionalidad existente a `TipoPersona='A'`. Los reportes pueden validarse hoy con datos AA históricos (jueves/viernes). Los correos de corrección AA requieren ejecutar una corrección admin sobre un AA — se puede hacer hoy con datos viejos.

#### PROD-7 · brief 126 · Plan 28 Chat 3a — Reportes PDF/Excel AA

**Cubre**: 14 endpoints PDF/Excel ahora devuelven sección dedicada para `TipoPersona='A'` con badge "Asistente Administrativo".

**Pasos**:
1. Login Director, navegar a `/intranet/admin/asistencias` → tab Reportes.
2. Generar reporte filtrado mes anterior (abril 2026), filtro `tipoPersona = Asistente Administrativo`.
3. PDF descarga → confirmar sección dedicada con badge textual.
4. Mismo filtro → click "Descargar Excel" → archivo `.xlsx` con misma estructura.

**Pasa**: ambos formatos presentan AAs separadas de Profesores con badge distintivo.
**Falla**: AA mezclado con Profesor o sin badge → BE no extendió la query.

#### PROD-8 · brief 127 · Plan 28 Chat 3b — Correos diferenciados AA

**Cubre**: cuando admin corrige asistencia de AA → correo va al propio AA (`Director.DIR_Correo` filtrado por rol AA), tag outbox `ASISTENCIA_CORRECCION_ASISTENTE_ADMIN`.

**Pasos**:
1. Login Director, navegar a `/intranet/admin/asistencias` → tab Gestión, filtro `tipoPersona='A'`.
2. Editar una asistencia AA histórica (cambiar observación o estado).
3. Guardar.
4. ⚠️ **no-browser** — pedir al usuario:
   ```sql
   SELECT TOP 5 EO_Tipo, EO_TipoEntidadOrigen, EO_Destinatario, EO_Estado, EO_FechaCreacion
   FROM EmailOutbox
   WHERE EO_Tipo = 'ASISTENCIA_CORRECCION_ASISTENTE_ADMIN'
   ORDER BY EO_CodID DESC;
   ```
5. Esperado: ≥1 fila reciente con destinatario = correo del AA editado, sin BCC.

**Pasa**: outbox tiene la fila con tag correcto.
**Falla**: tag genérico `ASISTENCIA_CORRECCION` o destinatario incorrecto → INV-AD09 violado.

---

### FE WAL (briefs 118, 119) — soft delete cursos

#### PROD-9 · brief 118 · walDelete soft default + stats cursos

**Cubre**: `walDelete()` por default ahora hace soft delete; stats de cursos no decrementan en delete.

**Pasos**:
1. Login Director, `/intranet/admin/cursos`.
2. Crear curso de prueba `smoke-cowork-2026-05-09`.
3. Eliminar.
4. Confirmar:
   - Fila desaparece de la tabla.
   - Stat "Total Cursos" NO decrementa (soft delete).
   - Network → `DELETE /api/sistema/cursos/<id>` 200.
5. ⚠️ **no-browser** — pedir SQL para confirmar `CUR_Estado=0`:
   ```sql
   SELECT TOP 5 CUR_CodID, CUR_Nombre, CUR_Estado FROM Curso WHERE CUR_Nombre LIKE 'smoke-cowork%';
   ```

**Pasa**: fila estado=0 en BD, no purga física.
**Falla**: registro purgado o error en delete → walDelete no honra soft default.

#### PROD-10 · brief 119 · walDelete callers audit (soft vs hard)

**Cubre**: audit de los callers directos de `walDelete()` para confirmar que ningún módulo lo llama con `hard: true` por error.

⚠️ **Audit cerrado** — el brief documenta que el audit no encontró callers hard. Validación reducida a confirmar que módulos críticos siguen haciendo soft:

**Pasos**: repetir PROD-9 con: Salones, Vistas, Notificaciones admin. Confirmar que ninguno purga físicamente.

**Pasa**: 3 módulos hacen soft.
**Falla**: alguno purga → revisar caller específico.

---

### Plan 41 Chat 1 (brief 131) — Correlation timeline FE

> ⚠️ Este brief es de hoy (commit `b9543ed` del 2026-05-08). Si ya está en prod (Netlify deploys auto al push), incluir acá. Si no, se valida en handoff local.

#### PROD-11 · brief 131 · Correlation timeline cronológico

**Cubre**: ver detalle en `handoff-local-2026-05-09.md` LOCAL-1.

**Pasos**: idénticos a LOCAL-1 pero contra FE prod.

**Pasa/Falla**: igual que LOCAL-1.

---

## 🔴 Grupo ROJO — Posponer al lunes (5 briefs · ~30 min)

> Estos casos requieren datos frescos de marcación de día hábil. Hoy sábado no hay marcas → validación queda en cola para lunes 2026-05-11.

### Briefs pospuestos

| Brief | Por qué necesita lunes | Acción lunes |
|---|---|---|
| **130** · Coord Académico dashboard | Stats se calculan con base usuarios activos del día. Si el usuario activa el toggle "solo activos", hoy puede mostrar 0 si los AA no tienen actividad reciente | Validar con login real del CoordAcad lunes |
| **132** · Correlation DTO ampliado | `relatedCorrelationIds` cap 5 ventana 2h — necesita ≥2 correlations recientes del mismo usuario, lo que solo ocurre con tráfico real | Lunes con sesión normal |
| **133** · AA self-service endpoints | `/me/dia` con `fecha=hoy` retorna vacío sábado (sin marcaciones esperables) | Lunes con AA logueado |
| **134** · Plan 28 Chat 4 AA UI | Widget home AA + tab director-AAs muestran datos del día. Sábado no hay datos | Lunes M-F |
| **136** · Plan 26 F3 time-of-day modifier | El modifier x1.5/x1.2 requiere observar 429s dentro vs fuera de horario escolar. Sábado: solo se mide "fuera" | Lunes M-V durante horario 07:30-09:30 + 13:55-16:00 |

### Acción del usuario hoy

Para los briefs 130 y 132, **no es 100% imprescindible esperar lunes**:

- **130** — Si el usuario quiere validar la stat sin esperar, ejecutar la query SQL del brief para confirmar shape del DTO en prod hoy.
- **132** — Si el usuario navegó normalmente esta semana, ya hay correlations en BD. Verificar con el endpoint manual desde DevTools.

Los briefs 133, 134, 136 son **bloqueantes hasta lunes** sin excepciones operativas.

---

## Cierre del round prod sábado

### Si todos los VERDES pasan ✅

Tipear:

```
/verify 103
/verify 104
/verify 105
/verify 106
/verify 107
/verify 108
/verify 110
/verify 111
/verify 112
/verify 118
/verify 119
/verify 126
/verify 127
/verify 131    # si Netlify auto-deploy ya pasó
```

13 briefs cierran. `awaiting-prod/` queda en 6 briefs (los del grupo ROJO).

### Si algún VERDE falla ❌

`/verify <NNN> ❌ rollback <motivo>` → mueve a `running/` con motivo. Casos típicos:

- **PROD-2/PROD-3 (bulkheads/backpressure)**: posible mismatch entre `appsettings` prod y la baseline calibrada. Pedir al usuario screenshot del config + p95 actual.
- **PROD-7 (Plan 28 3a reportes AA)**: si no hay AAs con marcaciones abril, el reporte sale vacío (no es bug). Marcar como "verificación extendida con datos sintéticos".
- **PROD-8 (Plan 28 3b correos AA)**: si el outbox no tiene fila, posible que el AA editado no tenga `DIR_Correo` poblado. Verificar fixture.

### Lunes 2026-05-11

Ejecutar las 5 validaciones del grupo ROJO con datos M-F frescos. Tiempo estimado adicional: ~45 min.

---

## Notas operativas

- **Saturday context**: cualquier hallazgo "datos vacíos" en prod hoy NO es bug automáticamente — verificar primero que el caso depende o no de día hábil.
- **DevTools desde paso 1**: clave para tracking inicial.
- **Hangfire/SQL queries**: marcadas `⚠️ no-browser` — coordinar con usuario antes.
- **No mezclar handoff local con prod**: si ambos rounds corren el mismo sábado, hacer prod primero (los locales pueden cambiar config y romper sesión).
- **Reporte final**: anexar bloque a `reporte-claude-cowork.md` con resumen de los dos handoffs.
