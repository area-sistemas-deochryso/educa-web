# 324 — P66 F1: Map all dependency chains
<!-- minimal-from-go -->

- **Plan**: [xrepo-66-dependency-guidance.md](../../../educa-coord/plans/xrepo-66-dependency-guidance.md)
- **Fase**: F1 — Map all dependency chains
- **Repo**: educa-web
- **Modo sugerido**: `/investigate`

## Objetivo

Para cada página admin, identificar qué entidades necesita para funcionar, cuándo queda inútil sin ellas, y adónde llevar al usuario para crearlas.

## Estado

- [x] Mapear páginas admin y sus dependencias de entidades
- [x] Catalogar target pages de creación
- [x] Documentar hallazgos en este brief

## Hallazgos F1

### Cadena de dependencias crítica (orden de setup recomendado)

```
Grados → Cursos → Horarios
Salones → Horarios, Asistencia, Usuarios (filtro), Permisos Salud
Usuarios → Permisos por Usuario
```

### Mapa completo de dependencias

| Página | Depende de | Cómo se usa | Target si falta |
|---|---|---|---|
| **Horarios** | Salones | Dropdown filtro + form | `/intranet/admin/salones` |
| **Horarios** | Cursos | Picker dialog en form | `/intranet/admin/cursos` |
| **Horarios** | Profesores | Dropdown en form | `/intranet/admin/usuarios` |
| **Cursos** | Grados | Multi-select en form | (no hay página admin de grados aún) |
| **Salones** | Períodos | Cierre de período | (gestionado internamente) |
| **Asistencia** | Salones | Filtro dropdown | `/intranet/admin/salones` |
| **Usuarios** | Salones | Filtro dropdown asignación | `/intranet/admin/salones` |
| **Permisos Salud** | Salones | Dropdown selección salón | `/intranet/admin/salones` |
| **Permisos por Usuario** | Usuarios | Búsqueda para asignar permisos | `/intranet/admin/usuarios` |

### Páginas sin dependencias externas

- Eventos Calendario — CRUD standalone
- Notificaciones — CRUD standalone
- Campus — editor de grafo standalone
- Registro de Vistas — catálogo de referencia read-only
- Permisos por Rol — catálogo de sistema

### Rescope (post-F1)

Grados y Sedes son datos semilla/infraestructurales — si faltan, el sistema no está inicializado. Fuera de scope de P66.

### F2 — Diseño (decidido)

**Estrategia híbrida**:
- 1 dependencia faltante → inline junto al control vacío (card `⚠` + link)
- ≥2 dependencias faltantes → banner consolidado arriba de la página (checklist `✅`/`❌`)

Componente shared: `<app-dependency-guidance>` con input `DependencyCheck[]`. Links abren en new tab.
