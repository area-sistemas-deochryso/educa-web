# Pendientes de verificación post-deploy — 2026-05-21

> 8 briefs en `awaiting-prod/`. 5 tienen código shipped esperando testeo en prod. 3 no deberían estar aquí (nunca se ejecutaron o solo investigación).

---

## A. LISTOS PARA TESTEAR EN PROD (código ya deployado)

---

### 1. Brief 213 — Login: cookie cleanup + error handling
**Commit**: `5471fdc` (2026-05-20)
**Impacto**: CRÍTICO — fix del HTTP 0 en login por cookies expiradas

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 1 | Login normal (sin cookies previas) | Abrir incógnito → `/intranet/login` → credenciales válidas → Enter | Login exitoso, redirige a home | |
| 2 | Login con cookie expirada | Cerrar sesión → esperar a que `educa_auth` expire → intentar login de nuevo | Login exitoso sin HTTP 0 ni errores en consola | |
| 3 | Login → cerrar tab → reabrir → login | Login → cerrar pestaña → abrir de nuevo → login | Funciona sin estado roto | |
| 4 | GET /sessions no dispara forceLogout | Abrir `/intranet/login` con cookie expirada en DevTools | La página de login carga normal, no redirige a logout ni muestra error | |
| 5 | Switch session | Login → cambiar de sesión (si hay múltiples) | Funciona normalmente | |
| 6 | Refresh flow mid-navegación | Estar navegando la intranet → esperar que token expire → hacer una acción | El refresh automático funciona, no se pierde la sesión | |
| 7 | Storage lleno (edge case) | Llenar localStorage hasta el límite → intentar login | Login funciona en memoria (puede perder sesión al cerrar tab, no crashea) | |

---

### 2. Brief 140 — Fix F-018: botón "Registrar" asistencia manual AA
**Commit**: shipped pre-2026-05-12
**Impacto**: ALTO — desbloquea cierre Plan 28

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 1 | Registrar asistencia manual AA | Director → `/intranet/admin/asistencias` → tab "Asistentes Administrativos" → "+ Nueva asistencia" → Tipo persona: Asistente Admin → Tipo registro: Solo entrada → seleccionar un AA → hora válida → observación | Botón "Registrar" se habilita y al clickear crea la fila | |
| 2 | Verificar fila creada | Después del test 1, consultar BD | Fila en `AsistenciaPersona` con `ASP_TipoPersona='A'`, `ASP_OrigenManual=true` | |
| 3 | Registrar asistencia manual Estudiante (regresión) | Mismo flujo con Tipo persona: Estudiante | Botón se habilita, registro se crea normalmente | |
| 4 | Registrar asistencia manual Profesor (regresión) | Mismo flujo con Tipo persona: Profesor | Botón se habilita, registro se crea normalmente | |

---

### 3. Brief 134 — Plan 28 Chat 4: Self-service AA + tab director
**Commit**: shipped pre-2026-05-09
**Impacto**: ALTO — AA viendo su propia asistencia + director viendo AAs
**Nota**: 4a ya verificada parcialmente 2026-05-12. 4b-tab estaba bloqueada por F-018 (brief 140).

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 1 | ~~4a: AA ve su asistencia~~ | ~~Login AA → `/intranet/asistencia`~~ | ~~Ve "Mi asistencia de hoy"~~ | ✅ 2026-05-12 |
| 2 | ~~4a: API AA responde~~ | ~~GET `/api/asistente-administrativo/me/mes` y `/me/dia`~~ | ~~200 OK~~ | ✅ 2026-05-12 |
| 3 | ~~4a: Widget home AA~~ | ~~Login AA → home intranet~~ | ~~Widget "Mi asistencia de hoy" visible~~ | ✅ 2026-05-12 |
| 4 | 4b-tab: Director ve AAs | Login Director → `/intranet/admin/asistencias` → pestaña/submenu "Asistentes Admin" (icono `pi pi-id-card`) | Lista de AAs con asistencia del día actual | |
| 5 | 4b-tab: Cross-link admin | En la vista director-AAs, click en un AA | Navega a `/intranet/admin/asistencias?tab=gestion&tipoPersona=A&dni=...&fecha=...` | |
| 6 | 4a: AA NO ve panel admin | Login AA → `/intranet/asistencia` | Ve vista self-service, NO panel admin con tablas de gestión | |

**Depende de**: brief 140 (F-018) cerrado para poder testear 4b-tab completo.

---

### 4. Brief 169 — SMTP response en drawers de monitoreo
**Commit**: shipped pre-2026-05-15
**Impacto**: MEDIO — visibilidad de errores SMTP en blacklist/quarantine
**Nota**: Validación parcial 2026-05-19. Quarantine sin datos reales en prod.

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 1 | ~~Drawer blacklist: sección SMTP~~ | ~~Director → `/intranet/admin/monitoreo/correos/blacklist` → abrir detalle de un bloqueado~~ | ~~Sección "SMTP response" arriba + "Causa interna" abajo~~ | ✅ 2026-05-19 |
| 2 | Drawer quarantine: tabla hits | Director → `/intranet/admin/monitoreo/correos/quarantine` → abrir detalle | Tabla "Histórico de hits" con hasta 3 entries (timestamp + código SMTP + mensaje). Si no hay registros: empty-state "Sin hits previos registrados" | |
| 3 | Badge "(reconstruido)" | Abrir un item de blacklist/quarantine cuyo `originalSmtpResponseSource === 'reconstructed'` | Badge amarillo/neutral `(reconstruido)` visible | |
| 4 | Source unavailable | Item con source = `unavailable` | Texto "—" + tooltip "Sin trazas disponibles" | |

**Bloqueante para tests 2-4**: necesita tráfico real que genere quarantine entries y/o items con source `reconstructed`/`unavailable`. Si no hay datos orgánicos, se puede inyectar un caso de prueba en staging.

---

### 5. Brief 147 — Badge transiente + textarea blacklist + link auditoría
**Commit**: shipped pre-2026-05-12
**Impacto**: MEDIO — 3 mejoras UX en monitoreo de correos

#### G.1 — Badge "Pendiente reintento" en PROCESSING

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 1 | Key en JSON | DevTools → GET `/api/sistema/email-outbox/listar?estado=PROCESSING&pageSize=5` | Cada item incluye key `"ultimoErrorTransiente"` (valor puede ser `null`) | |
| 2 | Badge render (cuando haya dato) | Esperar a que un correo PROCESSING tenga `ultimoErrorTransiente != null` (defer SMTP 4.x.x) → refrescar bandeja | Fila muestra badge gris "Pendiente reintento" con tooltip del error truncado a 80 chars | |

**Nota**: si tras 1 semana no aparece caso orgánico, inyectar defer artificial en staging.

#### G.2 — Textarea obligatoria en blacklist manual

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 3 | Submit disabled <20 chars | Director → blacklist → "Bloquear manualmente" → motivo MANUAL → escribir <20 chars en observación | Botón submit disabled + contador `X/20 min` visible | |
| 4 | Submit enabled >=20 chars | Escribir >=20 caracteres | Botón se habilita | |
| 5 | Error 422 del backend | Enviar con <20 chars (si se logra bypassear el FE) | Toast con mensaje `BLACKLIST_MOTIVO_REQUERIDO` del backend | |

#### G.3 — Link auditoría → usuarios (TIENE BUG F-021)

| # | Test | Pasos | Esperado | OK? |
|---|------|-------|----------|-----|
| 6 | Deep-link por userId (flujo real) | Desde `/intranet/admin/auditoria-correos` → click en item afectado | Navega a `/intranet/admin/usuarios?autoOpen=true&openUserId=N&openUserRol=...&openUserName=...`, filtra y abre drawer | |
| 7 | ~~Deep-link por DNI~~ | ~~`/intranet/admin/usuarios?dni=X&autoOpen=true`~~ | **NO IMPLEMENTADO** — el contrato usa `openUserId`, no `dni`. Ver brief 199 (F-021) | |

---

## B. NO LISTOS — Briefs que no deberían estar en `awaiting-prod/`

Estos briefs nunca se ejecutaron o solo tienen investigación. Deberían moverse a `open/` o `waiting/`.

| Brief | Título | Estado real | Acción sugerida |
|-------|--------|-------------|-----------------|
| 119 | Audit DELETE optimistic (WAL soft/hard) | "⏳ pendiente arrancar" — nunca ejecutado | Mover a `open/` |
| 137 | F5 wrapper hardening (barrel + lint) | "⏳ pendiente arrancar" — nunca ejecutado | Mover a `open/` |
| 199 | F-021 deep-link autoOpen por DNI | Solo investigación hecha, ejecución pendiente. Decisión: Opción A (extender contrato con `?dni=`) vs Opción B (cerrar como falso positivo) | Mover a `open/` |

---

## C. RESUMEN EJECUTIVO

| Prioridad | Brief | Qué testear | Dependencia |
|-----------|-------|-------------|-------------|
| **1 (CRÍTICO)** | 213 | Login con cookies expiradas ya no da HTTP 0 | Ninguna |
| **2 (ALTO)** | 140 | Botón "Registrar" asistencia manual AA funciona | Ninguna |
| **3 (ALTO)** | 134 (4b-tab) | Director ve pestaña AAs en asistencia | Brief 140 cerrado |
| **4 (MEDIO)** | 147 G.1 | Badge "Pendiente reintento" en bandeja PROCESSING | Deploy BE con binary `6960f24`+ |
| **5 (MEDIO)** | 147 G.2 | Textarea blacklist manual >=20 chars | Próxima sesión con BD prueba |
| **6 (MEDIO)** | 147 G.3 | Link auditoría→usuarios (flujo real, no por DNI) | Ninguna |
| **7 (MEDIO)** | 169 | Drawers SMTP response en blacklist/quarantine | Tráfico real para quarantine |
| **8 (DECISIÓN)** | 199 | Decidir si extender contrato `?dni=` o cerrar F-021 | Decisión tuya |

### Orden de ejecución sugerido

1. **Sesión rápida (15 min)**: tests 213 (login) + 140 (botón AA) + 134-4b-tab + 147-G.3. Son los que se pueden verificar inmediatamente sin data especial.
2. **Sesión con BD (30 min)**: 147-G.1 (verificar key JSON) + 147-G.2 (textarea blacklist) + 169 (drawers quarantine si hay datos).
3. **Limpieza**: mover briefs 119, 137, 199 fuera de `awaiting-prod/`.
