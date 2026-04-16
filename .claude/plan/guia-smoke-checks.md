# Guía de Smoke Checks Post-Deploy

> **Qué es un smoke check**: Verificación rápida y manual de que las funciones críticas del sistema funcionan después de un deploy. No reemplaza tests — verifica que el sistema **integrado** y **desplegado** responde correctamente.
>
> **Cuándo hacerlo**: Después de CADA deploy a producción (frontend o backend).
>
> **Tiempo total**: 5-8 minutos.

---

## Preparación

Necesitas:
- Navegador con DevTools abierto (pestaña Network + Console)
- Credenciales de test para cada rol (al menos Director y Profesor)
- Acceso a Azure Portal (para rollback de backend si falla)
- Acceso a Netlify Dashboard (para rollback de frontend si falla)

**URLs de producción**:
- Frontend: tu dominio Netlify
- Backend: `https://educa1.azurewebsites.net`
- Warmup: `https://educa1.azurewebsites.net/api/warmup`
- ServerTime: `https://educa1.azurewebsites.net/api/servertime`

---

## Nivel 1 — Infraestructura (1 minuto)

> Verificar que frontend y backend están levantados y conectados.

### 1.1 Backend responde

Abrir en el navegador o con curl:

```
GET https://educa1.azurewebsites.net/api/warmup
```

- **OK**: Responde 200 con JSON
- **FALLO**: Timeout, 500, o no responde → **ROLLBACK backend**

```
GET https://educa1.azurewebsites.net/api/servertime
```

- **OK**: Responde 200 con hora de Perú (UTC-5)
- **FALLO**: Hora incorrecta o no responde → investigar

### 1.2 Frontend carga

Abrir la URL del frontend en navegador (pestaña incógnito para evitar cache).

- **OK**: Página pública carga, sin errores en Console
- **FALLO**: Pantalla blanca, errores JS en Console → **ROLLBACK frontend**

### 1.3 Proxy funciona

En DevTools > Network, verificar que las llamadas a `/api/*` desde el frontend llegan al backend (no 502, no CORS errors).

- **OK**: Requests a `/api/*` retornan 200 o 401 (esperado sin auth)
- **FALLO**: 502, CORS error, o requests colgados → revisar `netlify.toml` y proxy config

---

## Nivel 2 — Autenticación (2 minutos)

> Verificar que el flujo de login funciona de extremo a extremo.

### 2.1 Login Director

1. Navegar a `/intranet/login`
2. Seleccionar rol **Director**
3. Ingresar DNI y contraseña de test
4. Clic en "Ingresar"

- **OK**: Redirige a `/intranet`, muestra home con datos del usuario
- **FALLO**: Error de credenciales (y son correctas) → problema de auth backend
- **FALLO**: Login OK pero redirect a página en blanco → problema de routing frontend
- **FALLO**: Login OK pero "Sin permisos" → problema de permisos backend

**En DevTools verificar**:
- Request `POST /api/auth/login` retorna 200
- Cookie `educa_auth` se setea (pestaña Application > Cookies)
- Siguiente request a API incluye la cookie

### 2.2 Navegación básica autenticado

Sin salir de la sesión:
1. Navegar al módulo **Académico** (clic en el menú)
2. Verificar que carga sin error
3. Navegar al módulo **Sistema** > **Usuarios**
4. Verificar que la tabla de usuarios carga datos

- **OK**: Datos cargan, tabla se muestra
- **FALLO**: Spinner infinito → API no responde o interceptor roto
- **FALLO**: Tabla vacía con datos en BD → problema de query o DTO

### 2.3 Logout

1. Clic en logout
2. Verificar que redirige a login
3. Intentar navegar a `/intranet` directo

- **OK**: Redirige a login (guard funciona)
- **FALLO**: Accede a intranet sin sesión → guard roto

---

## Nivel 3 — Funcionalidad crítica (3-4 minutos)

> Verificar las operaciones que más duelen si fallan.

### 3.1 Carga de datos principales

Logueado como Director, verificar que cargan:

| Página | Qué verificar | Señal de fallo |
|--------|--------------|----------------|
| `/intranet` (Home) | Stats, accesos rápidos | Stats en 0 o spinner infinito |
| Usuarios | Tabla con datos | Tabla vacía, error toast |
| Horarios (si hay) | Vista semanal o lista | Sin datos o error |
| Asistencia | Vista del día actual | Sin datos o error |

No necesitas verificar TODOS los módulos. Solo los que tocaste en este deploy + los 4 anteriores como baseline.

### 3.2 Operación de escritura (si tocaste CRUDs)

1. Ir a un módulo CRUD (ej: Eventos Calendario)
2. Crear un registro de prueba
3. Verificar que aparece en la lista
4. Editar el registro
5. Verificar que el cambio persiste
6. Eliminar el registro de prueba

- **OK**: CRUD completo funciona
- **FALLO**: Create falla → revisar endpoint POST y DTOs
- **FALLO**: Create OK pero no aparece → mutación quirúrgica rota o refetch fallido

### 3.3 Verificar Service Worker (si tocaste cache o SW)

1. En DevTools > Application > Service Workers: verificar que el SW está registrado
2. Recargar la página (F5)
3. Verificar en Network que algunas requests salen de "(service worker)"

- **OK**: SW activo, cache funciona
- **FALLO**: SW no registrado → revisar `sw.js` y `ngsw-config.json`

---

## Nivel 4 — Específico del deploy (1-2 minutos)

> Solo verificar lo que cambió en ESTE deploy.

### Si tocaste autenticación/permisos
- [ ] Login con cada rol funciona (Director, Profesor, Estudiante)
- [ ] Permisos por rol: Profesor NO ve rutas de admin
- [ ] Login con cuenta inactiva → rechazado

### Si tocaste asistencia
- [ ] Vista de asistencia diaria carga correctamente
- [ ] Filtros por fecha/sede funcionan
- [ ] Si hay datos de hoy, se muestran

### Si tocaste calificaciones
- [ ] Calificaciones cargan para un curso
- [ ] Promedios se calculan (no NaN, no null)

### Si tocaste horarios
- [ ] Vista semanal renderiza correctamente
- [ ] Datos del salón visibles en detalle

### Si ejecutaste scripts SQL
- [ ] Los datos migrados son correctos (verificar 2-3 registros manualmente)
- [ ] No hay registros huérfanos o duplicados

---

## Decisión: OK vs Rollback

### Deploy es OK si:

- Nivel 1 pasa completo (infra conectada)
- Nivel 2 pasa completo (auth funciona)
- Nivel 3 no tiene fallos críticos (datos cargan)
- Nivel 4 no muestra regresiones en lo que tocaste

### Hacer ROLLBACK si:

| Síntoma | Acción |
|---------|--------|
| Backend no responde (warmup falla) | Rollback backend en Azure |
| Frontend pantalla blanca | Rollback frontend en Netlify |
| Login roto para todos los roles | Rollback backend (auth) |
| Datos corruptos (valores imposibles) | Rollback backend + investigar BD |
| Solo 1 módulo roto, el resto OK | NO rollback. Crear issue, fix rápido en siguiente deploy |
| Error cosmético (layout, texto) | NO rollback. Fix en siguiente deploy |

### Cómo hacer rollback

**Frontend (Netlify)** — ~30 segundos:
1. Netlify Dashboard → tu sitio → **Deploys**
2. Buscar el deploy anterior (el penúltimo)
3. Clic en él → **Publish deploy**
4. Esperar ~15 segundos
5. Verificar que la versión anterior carga

**Backend (Azure)** — ~3 minutos:
1. Azure Portal → App Service → **Deployment Center**
2. Seleccionar el deployment anterior → **Redeploy**
3. Esperar que el status cambie a "Success"
4. Verificar con `GET /api/warmup`

**Base de datos** — NO es automático:
- Si ejecutaste un script SQL y necesitas revertirlo, usa el script de rollback que preparaste ANTES del deploy
- Si no preparaste script de rollback: no toques la BD, investiga primero

---

## Registro

Después de cada deploy, anotar brevemente:

```
## Deploy 2026-04-17
- BE: commit abc123 (feat: X)
- FE: commit def456 (fix: Y)
- SQL: script-Z ejecutado
- Smoke: OK / Fallo en [qué]
- Rollback: No / Sí (motivo)
```

Esto sirve para correlacionar si un problema aparece días después.

---

## Checklist rápida (para copiar y pegar)

```
## Smoke Check — [fecha]

### Nivel 1 — Infra
- [ ] GET /api/warmup → 200
- [ ] GET /api/servertime → hora correcta
- [ ] Frontend carga (sin pantalla blanca)
- [ ] Proxy /api/* funciona (sin CORS errors)

### Nivel 2 — Auth
- [ ] Login Director → OK
- [ ] Navegación a 2+ módulos → datos cargan
- [ ] Logout → redirige a login
- [ ] URL directa sin sesión → redirige a login

### Nivel 3 — Funcionalidad
- [ ] Home intranet → stats cargan
- [ ] Tabla de usuarios → datos visibles
- [ ] 1 operación de escritura → persiste
- [ ] SW activo (si aplica)

### Nivel 4 — Específico
- [ ] [Lo que tocaste en este deploy]

### Resultado
- [ ] OK — deploy confirmado
- [ ] FALLO — rollback ejecutado (motivo: ___)
```
