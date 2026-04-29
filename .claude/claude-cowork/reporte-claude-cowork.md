# Reporte Claude Cowork — educa-web

Diario de sesiones QA ejecutadas por Cowork. Cada sesión cerrada anexa un bloque al final de este archivo (no sobreescribe).

Formato del bloque: ver `C:\devtest\setup-cowork-template.md` sección "Reporte de sesión Cowork".

---

## Sesión QA — 2026-04-29 (cierre)

**Operador**: Cowork (Claude)
**Áreas exploradas**: home intranet, menú Ctrl+K (desktop + móvil 400px), módulo Seguimiento (4 vistas: asistencia cross-role, admin gestión, admin reportes, permisos salud)
**Roles probados**: Director (DNI 74125896)

### Resumen
0 críticos · 2 altos · 3 medios · 6 bajos

### Hallazgos nuevos abiertos en esta sesión
- F-001 · Bajo · Jerarquía visual ambigua entre items y subgrupos del menú
- F-002 · Medio · FAB Reportar tapa el footer del drawer móvil
- F-003 · Alto · SignalR `/asistenciahub` 404 en cada vista de asistencia
- F-004 · Medio · Cross-role asistencia sin notice de filtro INV-C11
- F-005 · Bajo · Title del navegador no refleja sub-pestaña `?tab=reportes`
- F-006 · Bajo · Permisos de Salud — layout de CTAs confuso
- F-007 · Bajo · Estado "X" se renderiza pero no está en la leyenda
- F-008 · Medio · Tooltip "Clic para justificar" sobre estudiantes con A
- F-009 · Bajo · Tab Estudiantes vs Profesores con UI de acciones inconsistente
- F-010 · Bajo · Deep-link a admin no auto-abre dialog de edición
- F-011 · Alto · Filtro `search` de `/asistencia-admin/dia` no busca por DNI

### Hallazgos verificados en esta sesión (cerrados)
- *Ninguno (primera sesión QA del proyecto)*

### Drift detectado contra reportes previos
- *Sin reporte previo de Cowork — esta es la primera sesión QA registrada*

### Limitaciones de la sesión
- Viewport móvil mínimo en Chrome MCP ~1300px en Windows; el usuario forzó DevTools device mode manualmente para probar a 400×800
- No se probaron otros roles (Profesor, Estudiante, Apoderado) por falta de credenciales de prueba para esos roles

### Próximos pasos sugeridos
1. Pasar F-011 (Alto, BE) y F-003 (Alto, BE) a Claude Code primero — son los que rompen funcionalidad
2. Luego F-002, F-004, F-008 (Medios)
3. Cerrar Bajos en batch al hacer cleanup visual del módulo asistencia
4. Probar otros roles cuando el usuario provea credenciales

---
