> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Origen**: handoff cross-repo del task BE `educa.API/.claude/tasks/sp-estadisticas-usuarios-promotor-mismatch.md` (cerrado en commit `d850026`, retro-validado 2026-05-13).
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.

---

# FE — Dashboard de Usuarios: agregar Promotor y Coordinador Académico

## CONTEXTO

El backend ya emite las 4 categorías de roles supervisores (commit `d850026`, prod `sp_EstadisticasUsuarios` aplicado el 2026-05-08).

`GET /api/usuarios/estadisticas` hoy devuelve `UsuariosEstadisticasDto`:

```jsonc
{
  "totalUsuarios": 0,
  "totalDirectores": 2,                  // antes: 4 (mentía — incluía Promotor + CoordAcad)
  "totalAsistentesAdministrativos": 4,
  "totalPromotores": 1,                  // ← campo nuevo (antes silencioso = 0)
  "totalCoordinadoresAcademicos": 1,     // ← campo nuevo
  "totalProfesores": 0,
  "totalApoderados": 0,
  "totalEstudiantes": 0,
  "usuariosActivos": 0,
  "usuariosInactivos": 0
}
```

Datos prod 2026-05-08:
- Director: 2 (MARIA SANCHEZ QUISPE, EL DIRECTOR ADMINISTRADOR)
- Asistente Administrativo: 4
- Promotor: 1 (LUZMILA MEDINA)
- Coordinador Académico: 1 (MEDALITH TREJO)

## OBJETIVO

Renderizar las 4 categorías en la tarjeta de estadísticas del dashboard `/intranet/admin/usuarios`. Hoy solo aparece "Directores: 4 activos" (mentira) — pasar a 2 reales + 1 Promotor + 1 CoordAcad.

## ALCANCE

1. **Tipos TS** — actualizar el modelo del DTO (típicamente `*.model.ts` o `*.dto.ts`) para incluir `totalPromotores` y `totalCoordinadoresAcademicos`. Verificar si el archivo está en `core/models/usuario*` o equivalente.
2. **Componente** — la tarjeta de estadísticas (probablemente `features/intranet/admin/usuarios/...`). Agregar 2 stat-cards nuevas para Promotor y CoordAcad. Patrón a seguir: `rules/design-system.md` §B3 (icon-right 48×48, valor grande, label).
3. **Cambio breaking visible** — el número de "Directores" pasa de 4 a 2. Anotar en el commit y en el QA visual.
4. **Sin tocar** — tabla de listado de usuarios, drawer, filtros, lógica de roles. Solo la tarjeta de stats.

## ICONOS SUGERIDOS

- 👑 Directores (existente)
- 📋 Asistentes Administrativos (existente)
- 🎯 Promotores (nuevo)
- 🎓 Coordinadores Académicos (nuevo)
- (resto sin cambios)

## VALIDACIÓN

- `npm run lint`
- `npm run build`
- Smoke visual en `/intranet/admin/usuarios` con un Director logueado.
- Confirmar que el endpoint trae `totalPromotores=1` y `totalCoordinadoresAcademicos=1` con datos prod actuales (snapshot 2026-05-08).

## POST-DEPLOY GATE

Sí — verificación visual. Confirmar que MEDALITH (CoordAcad) y LUZMILA (Promotor) ya no aparecen contadas como Director.

## REGLAS

- `rules/design-system.md` §B3 (stat-card pattern).
- `rules/crud-patterns.md` — no tocar funcionalidad fuera de scope.

## MODO SUGERIDO

`/execute → /validate` — el cambio es mecánico (2 stat-cards + 2 campos de modelo). Sin design necesario.

## SIBLING TASK (informativo, no bloquea)

`educa.API/.claude/tasks/auth-token-verify-coordacad-default.md` — bug hermano en el verify-token del backend. Si el FE usa el rol del verify-token para gating de UI/permisos, MEDALITH puede estar viendo pantallas de Director hasta que ese task se ejecute. No bloquea este chat, pero anotar en el QA.
