# Plan 12 — Backend: Test Gaps Críticos

> **Fecha**: 2026-04-16
> **Objetivo**: Cubrir las capas del backend que hoy tienen 0 tests: controllers (contrato HTTP), repositories (queries EF reales), seguridad/autorización y workers/jobs.
> **Estado actual**: 49 test files existentes cubren domain validators, services core y helpers. Gaps: 0 controller tests, 0 repository tests, 0 security boundary tests, 0 worker/job tests.
> **Coordinación**: Complementa Plan 7 (Error Trace) y Plan 2/B (State Machines).

---

## Diagnóstico

| Capa | Tests existentes | Riesgo sin cobertura |
|------|-----------------|---------------------|
| **Controllers** (35) | 0 | Routing incorrecto, status codes erróneos, autorización bypass, mapping de excepciones roto |
| **Repositories** (31) | 0 | Queries EF incorrectas, includes faltantes, filtros soft-delete omitidos (INV-D09), paginación rota |
| **Workers/Jobs** (5+) | 0 | EmailOutboxWorker doble envío, purge jobs borrando datos activos, cleanup destruyendo idempotency keys en uso |
| **Security boundaries** | 0 | Cross-role access, elevación de privilegios, recursos de otro salón/sede, replay de tokens |
| **Integraciones** | 0 | CrossChex webhook parsing, blob storage, email outbox enqueue |

---

## Fases

### F1 — Controller Contract Tests (CRÍTICO)

> Los controllers son la frontera pública. Si un controller retorna 200 en vez de 401, o 500 en vez de 422, el frontend se rompe silenciosamente.

**Enfoque**: Tests de integración ligeros con `WebApplicationFactory<Program>` (TestServer in-memory). No tocan BD real — mockean services.

**Prioridad de controllers** (por riesgo de negocio):

| Prioridad | Controller | Por qué |
|-----------|-----------|---------|
| P0 | AuthController | Login, refresh, logout — si falla, nadie entra |
| P0 | AsistenciaController | Webhook CrossChex — si falla, pierde marcaciones |
| P0 | AprobacionEstudianteController | Batch masivo — si falla, corrompe progresión |
| P1 | UsuariosController | CRUD admin — roles, estados, datos sensibles |
| P1 | HorarioController | Validaciones de conflicto (INV-U03/U04/U05) |
| P1 | CalificacionController | Ventana de edición, bloqueo por periodo |
| P1 | PermisosRolController, PermisosUsuarioController | Override de permisos (INV-S03/S04) |
| P2 | Resto de controllers | Cobertura básica de contrato |

**Qué testear por controller**:
- [ ] Status codes correctos (200, 201, 400, 401, 403, 404, 409, 422, 429)
- [ ] `[Authorize]` presente → request sin token retorna 401
- [ ] `[Authorize(Roles = "X")]` → rol incorrecto retorna 403
- [ ] Request body inválido → 400 con detalles
- [ ] Excepciones tipadas (NotFoundException → 404, BusinessRuleException → 422)
- [ ] Response shape = `ApiResponse<T>` siempre
- [ ] Rate limiting headers presentes en endpoints decorados

**Entregable**: ~15 archivos de test cubriendo P0+P1.

### F2 — Repository Integration Tests

> Queries EF sin test pueden devolver datos soft-deleted, incluir entidades equivocadas, o fallar en producción por diferencias entre LINQ-to-Objects y LINQ-to-SQL.

**Enfoque**: Tests con `DbContext` in-memory (SQLite in-memory o EF InMemory provider). Seed data controlado.

**Prioridad de repositories** (por INV-D09 y complejidad de queries):

| Prioridad | Repository | Qué validar |
|-----------|-----------|-------------|
| P0 | AsistenciaRepository | Filtro por fecha/sede, coherencia horaria, soft-delete |
| P0 | EstudianteSalonRepository | Unicidad por año (INV-U01), filtro _Estado |
| P0 | ProfesorSalonRepository | Filtro _Estado en todas las queries excepto reconciliación (INV-D09) |
| P1 | HorarioRepository | Detección de superposición (INV-C06), filtros activos |
| P1 | CalificacionRepository | Ventana de edición, filtro por periodo |
| P1 | AprobacionEstudianteRepository | Progresión, sección V (INV-V01/V02) |
| P2 | Resto | Cobertura básica CRUD + soft-delete |

**Qué testear por repository**:
- [ ] Queries read-only NO retornan registros con `_Estado = false` (INV-D09)
- [ ] `AsNoTracking()` en queries de lectura (INV-D05) — verificar via interceptor o reflection
- [ ] Paginación correcta (offset, total, order)
- [ ] Includes/joins cargan las relaciones esperadas
- [ ] Filtros compuestos (fecha + sede + estado) funcionan correctamente

**Entregable**: ~10 archivos de test.

### F3 — Security Boundary Tests

> Hoy no hay ninguna prueba que verifique que un Profesor no puede ver datos de otro salón, o que un Estudiante no puede editar calificaciones.

**Enfoque**: Tests de integración con `WebApplicationFactory` + tokens JWT fabricados con claims específicos.

**Escenarios críticos**:

| # | Escenario | Endpoint | Esperado |
|---|-----------|----------|----------|
| 1 | Profesor accede a salón donde NO es tutor | GET /api/horarios?salonId=X | 403 o lista vacía |
| 2 | Estudiante intenta POST calificación | POST /api/calificaciones | 403 |
| 3 | Apoderado accede a estudiante que NO es su hijo | GET /api/estudiantes/{id}/notas | 403 |
| 4 | Request con token expirado | Cualquier [Authorize] | 401 |
| 5 | Request con token válido pero cuenta inactiva | Cualquier endpoint | 401 (INV-S01) |
| 6 | Director de Sede A accede a datos de Sede B | GET /api/asistencias?sedeId=B | 403 o filtrado |
| 7 | Permiso a `intranet` pero NO a `intranet/admin` | GET /api/admin/* | 403 (INV-S04) |
| 8 | Doble submit con misma idempotency key | POST /api/X + POST /api/X | 409 (INV-S06) |

**Entregable**: ~5 archivos de test con ~40 escenarios.

### F4 — Workers/Jobs Tests

> Un worker que falla silenciosamente o que procesa duplicados puede enviar emails dobles, purgar datos activos, o dejar la outbox bloqueada.

**Workers a testear**:

| Worker | Riesgo | Test clave |
|--------|--------|-----------|
| EmailOutboxWorker | Doble envío, retry infinito | Retry con backoff, no reprocesa éxito, marca fallo después de N intentos |
| ReporteUsuarioPurgeJob | Borra reportes RESUELTOS | Nunca borra estado RESUELTO (INV-RU01), respeta 180 días |
| ErrorLogPurgeJob | Borra logs recientes | Respeta ventana de retención |
| IdempotencyCleanupJob | Borra keys en uso | No borra keys dentro de TTL |

**Entregable**: ~4 archivos de test.

### F5 — Concurrencia e Idempotencia

> El sistema tiene RowVersion, outbox, webhooks y operaciones batch. Sin tests de concurrencia, los bugs aparecen solo en producción bajo carga.

**Escenarios**:
- [ ] Dos requests simultáneas actualizan la misma entidad → una gana, la otra recibe 409
- [ ] Webhook CrossChex duplicado en <30 min → segundo es ignorado (anti-duplicación)
- [ ] Batch de aprobación con ítem inválido → los válidos se procesan, el inválido falla con audit
- [ ] RowVersion conflict → retry hasta 3 veces, luego error (INV-S05)

**Entregable**: ~3 archivos de test.

---

## Orden de ejecución

```
F1 (Controllers P0) → F3 (Security) → F2 (Repos P0) → F4 (Workers) → F5 (Concurrencia) → F1 (Controllers P1-P2) → F2 (Repos P1-P2)
```

Razón: F1 P0 + F3 son los más críticos para producción. F2 valida datos. F4-F5 previenen bugs silenciosos.

---

## Métricas de éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Controller tests | 0 | ~15 archivos, ~120 tests |
| Repository tests | 0 | ~10 archivos, ~60 tests |
| Security tests | 0 | ~5 archivos, ~40 tests |
| Worker tests | 0 | ~4 archivos, ~20 tests |
| Concurrency tests | 0 | ~3 archivos, ~15 tests |
