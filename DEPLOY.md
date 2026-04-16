# Deploy Protocol — EducaWeb

> **Regla**: Este checklist se sigue CADA VEZ que se hace deploy a produccion.
> **Principio**: "Verificable, reversible y observable."

---

## Infraestructura

| Componente | Produccion | Herramienta |
|------------|-----------|-------------|
| **Frontend** | `https://educaweb.com` | Netlify (auto-deploy en push a `main`) |
| **Backend** | `https://educa1.azurewebsites.net` | Azure App Service |
| **Base de datos** | Azure SQL Server | Azure Portal / SSMS |
| **Proxy** | Netlify → Azure (`/api/*`, `/chathub/*`, `/asistenciahub/*`) | `netlify.toml` + `src/_redirects` |

| Repo | Rama | Remote |
|------|------|--------|
| Frontend (`educa-web`) | `main` | `origin/main` |
| Backend (`Educa.API`) | `master` | `origin/master` |

---

## 1. Pre-Deploy Checklist

### Backend (Educa.API → Azure)

```
[ ] dotnet build — sin errores
[ ] dotnet test — 0 fallos
[ ] Hay scripts SQL pendientes? → Ejecutar en Azure SQL ANTES del deploy
    - Verificar con SELECT antes de ALTER/CREATE
    - Tener script de rollback preparado
[ ] Nuevas tablas/columnas/indices? → Script ejecutado y verificado
[ ] Cambios breaking en DTOs? → Coordinar con frontend (DB_VERSION del SW)
[ ] Secrets nuevos? → Configurados en Azure App Service (NO en appsettings.json)
[ ] Git: commit limpio, push a master
[ ] Azure: verificar que el deploy se completo (Deployment Center)
```

### Frontend (educa-web → Netlify)

```
[ ] npm run lint — 0 errors, 0 warnings
[ ] npm test — 0 fallos
[ ] npm run build — build OK sin errores
[ ] Cambios breaking del BE? → Incrementar DB_VERSION en public/sw.js
[ ] Nuevas rutas de proxy? → Agregar en AMBOS: netlify.toml Y src/_redirects
[ ] Feature nueva? → Flag en false en environment.ts (activar post-smoke)
[ ] Git: commit limpio, push a main
[ ] Netlify: verificar que el deploy se completo (Deploy log)
```

### Orden de Deploy

> **Siempre backend primero.**

```
1. Ejecutar scripts SQL pendientes en Azure SQL
2. Deploy backend → esperar confirmacion en Azure Portal
3. Deploy frontend → esperar confirmacion en Netlify
4. Ejecutar smoke checks (seccion 2)
5. Si hay feature flags nuevas → activar y re-deploy FE
```

**Por que backend primero**: El frontend puede tolerar API vieja brevemente (las rutas existentes siguen funcionando). La API vieja NO puede tolerar frontend nuevo que envia payloads con campos nuevos.

---

## 2. Post-Deploy Smoke Checks (<5 minutos)

### Basicos (SIEMPRE, en cada deploy)

```
[ ] Pagina publica carga (https://educaweb.com)
[ ] Login funciona con credenciales de test
[ ] Intranet home carga datos (no queda en loading infinito)
[ ] Navegacion entre modulos no da 404
[ ] API responde: GET /api/ServerTime retorna hora Peru
[ ] Console del navegador sin errores rojos criticos
[ ] Service Worker se actualizo (Application > SW en DevTools)
```

### Si se toco autenticacion

```
[ ] Login → navegacion → datos cargan con token valido
[ ] Refresh token funciona (esperar o forzar expiracion)
[ ] Logout limpia sesion (cookie educa_auth eliminada)
[ ] Login con cuenta inactiva (EST_Estado=false) → mensaje de bloqueo
[ ] Login con credenciales invalidas → mensaje de error (no 500)
```

### Si se toco asistencia

```
[ ] Vista de asistencia diaria carga lista de estudiantes
[ ] Estadisticas de asistencia muestran numeros coherentes
[ ] (Si es posible) Enviar webhook de prueba CrossChex → registro aparece
[ ] SignalR: AsistenciaHub conecta (verificar en Network > WS/SSE)
```

### Si se tocaron calificaciones/horarios

```
[ ] Horarios cargan para un salon existente
[ ] Calificaciones cargan para un curso con notas
[ ] Crear horario → validaciones de conflicto funcionan
[ ] Editar calificacion → se guarda sin error
```

### Si se tocaron permisos

```
[ ] Profesor NO ve rutas de admin (404 o redirect)
[ ] Director SI ve todas las rutas de admin
[ ] Estudiante solo ve su informacion
[ ] Permisos personalizados (si hay) reemplazan los del rol
```

### Si se toco estructura de BD

```
[ ] Ejecutar queries de validacion de datos (seccion 4)
[ ] Verificar que no hay registros huerfanos o duplicados
```

---

## 3. Rollback Protocol

### Frontend — Netlify (<1 minuto)

```
1. Netlify Dashboard → Deploys
2. Seleccionar deploy anterior (el inmediatamente previo al problemático)
3. Click "Publish deploy"
4. Verificar que la version anterior carga en https://educaweb.com
```

**Alternativa git**:
```bash
git revert HEAD
git push origin main
# Esperar auto-deploy de Netlify
```

### Backend — Azure (~3-5 minutos)

```
1. Azure Portal → App Service (educa1) → Deployment Center
2. Seleccionar deployment anterior → "Redeploy"
```

**Alternativa git**:
```bash
git revert HEAD
git push origin master
# Esperar re-deploy en Azure
```

### Base de Datos — Manual (requiere cuidado)

> **Los scripts SQL NO son reversibles automaticamente.**

```
Regla: Si no tienes script de rollback, no ejecutes el script de migracion.
```

| Tipo de cambio | Rollback |
|----------------|----------|
| `CREATE TABLE` | `DROP TABLE [NombreTabla]` |
| `ALTER TABLE ADD columna` | `ALTER TABLE [Tabla] DROP COLUMN [Columna]` |
| `CREATE INDEX` | `DROP INDEX [NombreIndice] ON [Tabla]` |
| `UPDATE datos` | Tener `SELECT` previo + `UPDATE` inverso |
| `INSERT datos` | `DELETE WHERE` con condicion exacta |

**Procedimiento**:
```
1. ANTES de ejecutar: guardar el script de rollback en un archivo .sql
2. ANTES de ejecutar: hacer SELECT para verificar estado actual
3. Ejecutar el script de migracion
4. Verificar con SELECT que los cambios son correctos
5. Si algo fallo: ejecutar script de rollback inmediatamente
```

### Cuando hacer rollback

| Situacion | Accion |
|-----------|--------|
| Smoke checks fallan en 2+ puntos | Rollback inmediato |
| Error 500 en endpoint critico (login, asistencia) | Rollback inmediato |
| Datos corruptos (estadisticas imposibles, duplicados) | Rollback BD + BE |
| Bug menor no bloqueante | NO rollback — fix forward en siguiente deploy |
| Feature flag rota | Desactivar flag (environment.ts false) + re-deploy FE |

### Orden de rollback (inverso al deploy)

```
1. Rollback frontend (Netlify — 1 min)
2. Rollback backend (Azure — 3-5 min)
3. Rollback BD (solo si se ejecutaron scripts SQL)
4. Re-ejecutar smoke checks para confirmar que todo volvio al estado anterior
```

---

## 4. Validacion de Datos Post-Deploy

> Ejecutar manualmente en Azure SQL despues de deploys que toquen estructura de BD.

### Estudiantes huerfanos (activos sin salon)

```sql
SELECT COUNT(*) AS EstudiantesHuerfanos
FROM Estudiante e
WHERE e.EST_Estado = 1
  AND NOT EXISTS (
    SELECT 1 FROM EstudianteSalon es
    WHERE es.ESS_EST_CodID = e.EST_CodID AND es.ESS_Estado = 1
  );
-- Esperado: 0 (o un numero conocido y justificado)
```

### Salones duplicados

```sql
SELECT SAL_GRA_CodID, SAL_SEC_CodID, SAL_SED_CodID, SAL_Anio, COUNT(*) AS Duplicados
FROM Salon
WHERE SAL_Estado = 1
GROUP BY SAL_GRA_CodID, SAL_SEC_CodID, SAL_SED_CodID, SAL_Anio
HAVING COUNT(*) > 1;
-- Esperado: 0 filas
```

### Horarios con profesor inactivo

```sql
SELECT h.HOR_CodID, h.HOR_PRO_CodID, p.PRO_Estado
FROM Horario h
INNER JOIN Profesor p ON h.HOR_PRO_CodID = p.PRO_CodID
WHERE h.HOR_Estado = 1 AND p.PRO_Estado = 0;
-- Esperado: 0 filas (INV-AS04 previene esto)
```

### Asistencias recientes sin estudiante activo

```sql
SELECT COUNT(*) AS AsistenciasHuerfanas
FROM Asistencia a
WHERE NOT EXISTS (
    SELECT 1 FROM Estudiante e
    WHERE e.EST_CodID = a.ASI_EST_CodID AND e.EST_Estado = 1
  )
  AND a.ASI_Fecha > DATEADD(month, -1, GETDATE());
-- Esperado: 0 (o bajo — pueden ser estudiantes dados de baja durante el mes)
```

### ProfesorSalon sin profesor activo

```sql
SELECT ps.PRS_CodID, ps.PRS_PRO_CodID, p.PRO_Estado
FROM ProfesorSalon ps
INNER JOIN Profesor p ON ps.PRS_PRO_CodID = p.PRO_CodID
WHERE ps.PRS_Estado = 1 AND p.PRO_Estado = 0;
-- Esperado: 0 filas
```

**Si alguna query retorna resultados inesperados**:
1. No es causa automatica de rollback (pueden ser datos pre-existentes)
2. Documentar el hallazgo
3. Si los numeros son altos o incoherentes con lo esperado → investigar antes de continuar

---

## 5. Feature Flags como Safety Net

### Patron para features nuevas

```
1. Agregar flag en environment.ts = false (produccion)
2. Agregar flag en environment.development.ts = true (desarrollo)
3. Deploy a produccion con flag desactivada
4. Ejecutar smoke checks basicos
5. Activar flag en environment.ts = true
6. Re-deploy solo frontend
7. Verificar feature especifica
8. Si falla: desactivar flag → re-deploy FE (rollback parcial sin tocar BE)
```

### Flags actuales (referencia)

Las flags se definen en `src/app/config/environment.ts` y `environment.development.ts`.
Ver `@.claude/rules/feature-flags.md` para el catalogo completo.

---

## 6. Notas Importantes

### Service Worker (cache)

- Cambios breaking del backend → **incrementar `DB_VERSION`** en `public/sw.js`
- Esto fuerza recreacion de IndexedDB y limpia todo el cache
- Sin esto, usuarios existentes ven datos stale del cache SWR

### Netlify proxy

- **TODA** ruta de proxy debe estar en `netlify.toml` Y en `src/_redirects`
- El fallback SPA `/*` apunta a `/loader.html` (NO a `/index.html`)
- SignalR usa LongPolling en produccion (Netlify no soporta WebSocket)

### Azure SQL

- **NUNCA** ejecutar scripts SQL sin SELECT previo para verificar estado actual
- **SIEMPRE** tener script de rollback preparado antes de ejecutar migracion
- Secrets van en Azure Key Vault / App Service config, NUNCA en appsettings.json
- User Secrets para desarrollo local

### Coordinar deploy cuando hay cambios en ambos repos

```
Escenario: Backend tiene endpoint nuevo + Frontend lo consume

1. Deploy BE con endpoint nuevo (el FE viejo simplemente no lo llama)
2. Verificar que BE responde: curl https://educa1.azurewebsites.net/api/nuevo-endpoint
3. Deploy FE que consume el endpoint nuevo
4. Smoke check del flujo completo
```

```
Escenario: Backend cambia estructura de DTO existente (breaking)

1. Incrementar DB_VERSION en public/sw.js del FE
2. Deploy BE con DTO nuevo
3. Deploy FE inmediatamente despues (minimizar ventana de incompatibilidad)
4. Smoke check — verificar que cache no sirve datos viejos
```
