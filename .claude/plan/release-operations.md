# Plan 15 — Release Protocol y Operaciones

> **Fecha**: 2026-04-16
> **Objetivo**: Establecer un protocolo de release que garantice que cada deploy a producción sea verificable, reversible y observable. Hoy no existe ningún mecanismo formal.
> **Problema**: El proyecto está a punto de push a producción sin: smoke checks post-deploy, protocolo de rollback, validación de datos reales, ni alertas de degradación.
> **Coordinación**: Complementa Plan 7 (Error Trace) para la parte de observabilidad.

---

## Diagnóstico de lo que falta

| Área | Estado actual | Riesgo |
|------|-------------|--------|
| **Smoke checks post-deploy** | No existe | Deploy roto pasa desapercibido hasta que un usuario reporta |
| **Rollback** | No documentado | Si algo falla, no hay procedimiento claro para volver atrás |
| **Feature flags para rollout gradual** | Existen pero no se usan para mitigar riesgo de deploy | Feature nueva rompe algo → afecta al 100% de usuarios |
| **Validación de datos post-deploy** | No existe | Migración rompe datos → se descubre días después |
| **Monitoreo de salud** | Solo logs manuales | Degradación silenciosa (queries lentas, outbox bloqueada, jobs muertos) |
| **Checklist de deploy** | No existe | Pasos manuales se olvidan o se hacen en orden incorrecto |

---

## Fases

### F1 — Checklist de Deploy (documento operativo) ✅ (2026-04-16)

Archivo `DEPLOY.md` creado en la raíz de `educa-web/` con:

- **F1.1** Pre-deploy checklist (BE + FE + orden de deploy + coordinación cross-repo)
- **F1.2** Post-deploy smoke checks (~20 verificaciones organizadas por área: básicos, auth, asistencia, calificaciones/horarios, permisos, BD)
- **F1.3** Rollback protocol (FE <1min, BE ~3-5min, BD manual con script inverso + criterios de cuándo hacer rollback)
- **Extra**: Sección de validación de datos post-deploy (5 queries SQL de consistencia)
- **Extra**: Sección de feature flags como safety net (patrón activar/desactivar)
- **Extra**: Notas de coordinación (SW cache, Netlify proxy, Azure SQL, deploys cross-repo)

### F2 — Health Check Endpoint (Backend)

> Un endpoint que valide que el backend está realmente sano, no solo "levantado".

- [ ] F2.1 `GET /api/health` — endpoint público (no auth) que verifica:
  - BD accesible (query simple)
  - Outbox no bloqueada (no hay emails pendientes > 1 hora)
  - Jobs activos (último run de cleanup < 24h)
  - Tiempo de respuesta < 2s
- [ ] F2.2 Response: `{ status: "healthy" | "degraded" | "unhealthy", checks: {...} }`
- [ ] F2.3 Netlify/monitoring puede poll este endpoint como heartbeat

### F3 — Validación de Datos Post-Deploy

> Queries que detectan datos inconsistentes ANTES de que un usuario los reporte.

- [ ] F3.1 Script SQL de validación (ejecutar manualmente post-deploy):
  ```sql
  -- Estudiantes activos sin salón
  SELECT COUNT(*) FROM Estudiante e WHERE e.EST_Estado = 1 AND NOT EXISTS (SELECT 1 FROM EstudianteSalon es WHERE es.ESS_EST_CodID = e.EST_CodID AND es.ESS_Estado = 1);
  
  -- Salones duplicados (mismo grado+sección+sede+año)
  SELECT GRA_CodID, SEC_CodID, SED_CodID, SAL_Anio, COUNT(*) FROM Salon WHERE SAL_Estado = 1 GROUP BY GRA_CodID, SEC_CodID, SED_CodID, SAL_Anio HAVING COUNT(*) > 1;
  
  -- Horarios con profesor inactivo
  SELECT h.* FROM Horario h INNER JOIN Profesor p ON h.HOR_PRO_CodID = p.PRO_CodID WHERE h.HOR_Estado = 1 AND p.PRO_Estado = 0;
  
  -- Registros de asistencia sin estudiante activo
  SELECT COUNT(*) FROM Asistencia a WHERE NOT EXISTS (SELECT 1 FROM Estudiante e WHERE e.EST_CodID = a.ASI_EST_CodID AND e.EST_Estado = 1) AND a.ASI_Fecha > DATEADD(month, -1, GETDATE());
  ```

- [ ] F3.2 Documentar qué hacer si cada query retorna > 0

### F4 — Feature Flags como Safety Net

> Los flags ya existen. Falta usarlos como mecanismo de rollback parcial.

- [ ] F4.1 Para cada feature nueva, agregar flag en `environment.ts` = `false` en producción inicialmente
- [ ] F4.2 Después de smoke check exitoso, cambiar flag a `true` y re-deploy solo el frontend
- [ ] F4.3 Si algo falla, cambiar flag a `false` sin tocar código
- [ ] F4.4 Documentar patrón en `DEPLOY.md`

### F5 — Monitoreo Básico de Performance

> No necesitas Datadog. Necesitas saber si una query pasó de 200ms a 5s.

- [ ] F5.1 `RequestMetricsMiddleware` ya existe — verificar que logea a un destino consultable
- [ ] F5.2 Dashboard mínimo: top 10 endpoints más lentos por día (query sobre logs)
- [ ] F5.3 Alerta manual: revisar logs de performance 1x/semana los primeros meses

---

## Orden de ejecución

```
F1 (Checklist) → F2 (Health endpoint) → F3 (Validación datos) → F4 (Feature flags) → F5 (Performance)
```

F1 es proceso puro, se puede hacer HOY. F2 es 1 endpoint. F3 son queries SQL. F4 es documentación + disciplina. F5 es verificar lo que ya existe.

---

## Métricas de éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Protocolo de deploy documentado | No | Sí (DEPLOY.md) |
| Smoke checks post-deploy | 0 | ~15 checks en <5 min |
| Tiempo de rollback documentado | Indefinido | <5 min FE, <5 min BE |
| Health check endpoint | No | Sí, polleable |
| Validación de datos post-deploy | No | ~5 queries de consistencia |
| Feature flags como safety net | No usado | Patrón documentado |
