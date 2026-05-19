# 198 — FE fix F-020 (dependiente): path del service de reportes-usuario

> **Creado**: 2026-05-19 · **Estado**: ⏳ pendiente · **Depende de**: [`Educa.API/202-be-fix-f020-reportes-usuario-listar.md`](../../../Educa.API/.claude/chats/open/202-be-fix-f020-reportes-usuario-listar.md)
> **Modo sugerido**: `/execute → /validate` (decisión la toma el chat BE 202)
> **Origen**: Cowork session 2026-05-19 — hallazgo F-020 medio.

## Contexto

El FE de `/intranet/admin/monitoreo/incidencias/reportes` llama a `GET /api/sistema/reportes-usuario/listar?page=&pageSize=` y recibe 404. El chat BE 202 va a decidir si:

- **Opción A**: BE agrega el endpoint `/listar` → este chat queda **no-op** (cerrar como tal, sin cambios FE).
- **Opción B**: FE debe migrar al endpoint canónico root paginado (`GET /api/sistema/reportes-usuario?page=&pageSize=`) → este chat ejecuta el cambio.

## Disparador

Solo arrancar este brief **después de que el BE 202 esté en `awaiting-prod/` o `closed/`** y la decisión esté documentada. Mientras tanto, mantener en `open/`.

## Scope (si la opción es B)

- Localizar el service FE que llama `/listar`:
  ```bash
  grep -rn "reportes-usuario/listar" src/
  grep -rn "reportes-usuario" src/app/features/intranet/pages/admin/monitoreo/
  ```
- Cambiar el path a root + ajustar el shape de la response al `PaginatedResult<T>` real que devuelva BE (per `rules/pagination.md` variante A).
- Si el store/facade desempaca data como array plano `T[]`, aplicar el patrón "doble unwrap mal hecho" — ver `rules/pagination.md` §"Anti-pattern: doble unwrap mal hecho" para evitar regresión tipo `bfa96f0`.
- Smoke local: tabla carga con 4 filas reales.

## Criterios de cierre

- [ ] BE 202 cerrado con decisión documentada.
- [ ] Si opción A → cerrar este brief como no-op con commit `chore(.claude): close 198 — BE absorbió F-020`.
- [ ] Si opción B → service actualizado, lint ✅, smoke manual en `monitoreo/incidencias/reportes` mostrando 4 filas.
- [ ] Mover a `awaiting-prod/` con nota del smoke post-deploy.

## Riesgo

Bajo. 1 cambio puntual de path, sin impacto en otros features.

## Referencias

- BE root: `Educa.API/.claude/chats/open/202-be-fix-f020-reportes-usuario-listar.md`.
- `rules/pagination.md` — patrones canónicos del proyecto.
- Cowork hallazgo F-020.
