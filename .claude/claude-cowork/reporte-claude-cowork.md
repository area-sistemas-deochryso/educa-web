# Reporte Claude Cowork — educa-web

Diario de sesiones QA ejecutadas por Cowork. Cada sesión cerrada anexa un bloque al final de este archivo (no sobreescribe).

Formato del bloque: ver `C:\devtest\setup-cowork-template.md` sección "Reporte de sesión Cowork".

---

## Sesión QA — 2026-04-29 (cierre)

**Operador**: Cowork (Claude)
**Áreas exploradas**: home intranet, menú Ctrl+K (desktop + móvil 400px), módulo Seguimiento (4 vistas: asistencia cross-role, admin gestión, admin reportes, permisos salud)
**Roles probados**: Director (DNI 74125896)

### Hallazgos aún pendientes

- F-010 · Bajo · Deep-link a admin no auto-abre dialog de edición — ⏳ pendiente FE, depende de F-011 desplegado y verificado (ver `plan/maestro.md`)

> Hallazgos F-001 a F-009 y F-011 cerrados — limpieza 2026-05-09 (F-003 chat 083, F-011 chat 082 en `closed/`; resto sin follow-up activo).

---

## Sesión QA local pre-deploy — 2026-05-09 10:53 (sábado)

**Operador**: Cowork (Claude)
**Handoff fuente**: `handoff-local-2026-05-09.md`
**Setup**: FE `http://localhost:4201`, BE corriendo en local apuntando a **BD producción** (decisión del usuario; reglas prod aplicadas: read-only, sin mutaciones).
**Browser**: `work aqui m` (Chrome perfil Sistemas).
**Rol probado**: Director (sesión guardada `ADMINISTRADOR EL DIRECTOR`). AA no probado por falta de credenciales.

### Resumen ejecutivo

```
LOCAL-1 (131): PASS — timeline cronológico
LOCAL-2 (134): PASS — tab Director, widget Home AA y vista cross-role self-service confirmados (sesión Diana TUESTA)
LOCAL-3 (130): PASS — stats cards correctas; BE devuelve totalCoordinadoresAcademicos=1 y totalDirectores=2
LOCAL-4 (132): PASS — errorGroupCode (12 hex) + relatedCorrelationIds[5] presentes en snapshot
LOCAL-5 (133): PASS — endpoints AA blindados; intento spoof &dni entre AAs ignorado (INV-AD08)
LOCAL-6 (136): PASS — panel rate-limit carga sin 500 ni DI roto
```

Luz verde para deploy.

### Detalle por brief

**LOCAL-1 · brief 131 · Plan 41 Chat 1 — Correlation timeline cronológico → PASS**
- Tomé `correlationId = 3a73d19b-8b8f-4bc2-b633-ae73d93b9998` desde `GET /api/sistema/error-groups/311/ocurrencias`.
- Naveé a `/intranet/admin/correlation/3a73d19b-8b8f-4bc2-b633-ae73d93b9998`.
- Vista renderiza encabezado "Eventos correlacionados", sección "Timeline cronológico (1)", evento ERROR/WARNING en orden temporal. Toggle "Timeline | Por sección" presente, default Timeline.
- Sin agrupamiento por fuente. Sin errores en consola. Snapshot generado a las 10:51:00.

**LOCAL-2 · brief 134 · Plan 28 Chat 4 — AA self-service tab → PASS (completado en sesión AA)**
- Tab Director: `/intranet/admin/asistencias` muestra tabs Estudiantes · Profesores · **Asistentes Administrativos** · Todos. Click en la tab AA → "Filtro activo: Asistentes Administrativos" + Cambiar. Stats 0/0/0/0 con fecha sábado 09/05 (esperado, sin sync CrossChex). Banner INV-C11 visible.
- Sesión AA Diana TUESTA (DNI 42362026, asistenteAdminId=8, pwd extraída del editor de Director con autorización del usuario):
  - Widget Home "Mi asistencia de hoy" simplificado, sin sección salón, copia "Sin registro de hoy" (esperado en sábado).
  - `/intranet/asistencia` con sesión AA muestra vista mes self-service (leyenda A/T/F/J/-, "No se encontraron registros") — sin selector de salón/grado, sin tabs admin.
  - `GET /api/asistente-administrativo/me/mes?mes=5&anio=2026` → 200 con `asistenteAdminId:8`, `dni:42362026`, `tipoPersona:"A"`, `asistencias:[]` (Diana sin marcas en mayo).
- Cross-link `tipoPersona='A'`: la tab "Asistentes Administrativos" en `/admin/asistencias` es donde aterriza el deep-link. Verificado en pase Director.

**LOCAL-3 · brief 130 — Coordinador Académico en dashboard usuarios → PASS**
- `/intranet/admin/usuarios` muestra tarjetas:
  - Total Usuarios: 273
  - Directores: **2** (no 4) ✓
  - Asistentes Adm.: 4 ✓
  - Promotores: 1 ✓
  - **Coord. Académicos: 1** (tarjeta nueva presente) ✓
  - Profesores: 21
  - Estudiantes: 244
- Suma 2+4+1+1+21+244 = 273 ✓.
- `GET /api/sistema/usuarios/estadisticas` retorna `totalCoordinadoresAcademicos:1`, `totalDirectores:2`, `totalAsistentesAdministrativos:4`, `totalPromotores:1`, `usuariosActivos:261`, `usuariosInactivos:12`.

**LOCAL-4 · brief 132 · Plan 41 Chat 2 — Correlation DTO ampliado → PASS**
- `GET /api/sistema/correlation/{id}` para el corr id de LOCAL-1:
  - `errorGroupCode`: `c1281d26dd30` (12 chars hex, fingerprint corto del grupo 311). ✓
  - `relatedCorrelationIds`: array de 5 GUIDs distintos del mismo usuario en ventana 2h. ✓
- Quirk del harness Cowork: `Object.keys(data).includes('errorGroupCode')` devuelve `false` y `'errorGroupCode' in data` devuelve `false` porque el harness redacta props con valores que parecen base64. Verificado por regex sobre el body crudo: `"errorGroupCode":"c1281d26dd30"` está presente. UI consume el campo sin romper render.

**LOCAL-5 · brief 133 · Plan 28 Chat 3d — AA endpoints → PASS (reforzado con sesión AA real)**
- Probados con sesión Director (no es AA) — capa de auth:
  - `GET /api/asistente-administrativo/me/dia?fecha=2026-05-08` → **403** ✓
  - `GET /api/asistente-administrativo/me/dia?fecha=2026-05-08&dni=70525906` → **403** ✓
  - `GET /api/asistente-administrativo/me/mes?anio=2026&mes=5` → **403** ✓
  - `GET /api/asistente-administrativo/me/mes?...&dni=70525906` → **403** ✓
  - `GET /api/ConsultaAsistencia/director/asistentes-admin-asistencia-dia?fecha=2026-05-08` → **200** ✓ — devuelve 4 AAs (Vivian, Ray, Diana, Ricardo) consistente con stats.
- Probados con sesión AA Diana TUESTA (asistenteAdminId=8, DNI 42362026) — capa de claim:
  - `GET /me/dia?fecha=2026-05-08` → **200** con data de Diana (claim) ✓
  - **CRÍTICO**: `GET /me/dia?fecha=2026-05-08&dni=70525906` (intento spoof a Vivian, otra AA con asistenteAdminId=3) → **200 pero retorna data de Diana** (asistenteAdminId=8). El query `dni` es **ignorado** ✓ — INV-AD08 honrado bajo intento de privilege escalation real entre AAs.
  - `GET /me/mes?mes=5&anio=2026` → 200 con `asistencias:[]` (Diana sin marcas).

**LOCAL-6 · brief 136 · Plan 26 F3 — Time-of-day modifier → PASS (sanity)**
- `/intranet/admin/rate-limit-events` redirige a `/admin/monitoreo/seguridad/rate-limit` y carga panel "Telemetría de Rate Limiting" sin errores rojos.
- 35 eventos / 35 rechazados últimas 24h, top rol "Anónimo", top endpoint `/api/sistema/errors`.
- `GET /api/sistema/rate-limit-events?take=200` → 200, `GET /api/sistema/rate-limit-events/stats?horas=24` → 200.
- **Validación primaria del F3 sigue pendiente post-deploy + 1-2 semanas de observación** (multipliers x1.5/x1.2/cap5x).

### Datos creados / modificados

Ninguno. Sesión 100% read-only sobre la BD productiva. No se ejecutó CRUD, ni se confirmaron diálogos, ni se enviaron formularios.

### Limitaciones

- Sin credenciales AA → LOCAL-2 quedó parcial.
- BD prod conectada a BE local → no se forzó carga sintética para F3 (multiplicadores horario escolar) por riesgo de contaminar telemetría productiva.
- Cookies XSRF y sesión Director compartidas con otros tabs activos. Sin impact observado.

### Próximos pasos sugeridos

1. Reservar 30 min con un AA real (DNI fixture) o credenciales AA en BD test para cerrar LOCAL-2 (widget home + cross-role + cross-link `tipoPersona=A`).
2. Post-deploy: ejecutar el round descrito en `handoff-prod-saturday-2026-05-09.md`.
3. Para F3 (brief 136): planear ventana de observación lunes-martes 07:30-09:30 para confirmar caps elevados en horario escolar.

---
